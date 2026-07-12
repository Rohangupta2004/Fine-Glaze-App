/**
 * useDocumentUpload.ts
 *
 * PRD §29e — Document upload with version history.
 * Handles file picking, validation (25MB max), upload to Storage,
 * and creating document + document_versions rows.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import { supabase } from '../lib/supabase';
import { uploadLocalMedia } from '../lib/mediaStorage';
import { useAuthStore } from '../stores/authStore';

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

// Accept ALL document kinds — PDFs, office files, CAD, images, video, archives, etc.
const ACCEPTED_TYPES = ['*/*'];

export interface UploadDocumentParams {
  ownerType: 'profile' | 'project' | 'company';
  ownerId: string;
  category: string;
  title?: string;
  existingDocumentId?: string; // If adding a new version
}

export function useDocumentUpload() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (params: UploadDocumentParams) => {
      const userId = useAuthStore.getState().profile?.id;
      if (!userId) throw new Error('Not authenticated');

      // Pick file
      const result = await DocumentPicker.getDocumentAsync({
        type: ACCEPTED_TYPES,
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) {
        throw new Error('File selection cancelled');
      }

      const file = result.assets[0];

      // Validate size
      if (file.size && file.size > MAX_FILE_SIZE_BYTES) {
        throw new Error(`File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is 25 MB.`);
      }

      const title = params.title || file.name || 'Untitled Document';
      const ext = file.name?.split('.').pop()?.toLowerCase() || 'bin';
      const timestamp = Date.now();
      const storagePath = `${params.ownerType}/${params.ownerId}/${timestamp}_${file.name}`;

      // Upload to Storage
      const response = await fetch(file.uri);
      const blob = await response.arrayBuffer();
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(storagePath, blob, {
          contentType: file.mimeType || 'application/octet-stream',
          upsert: false,
        });
      if (uploadError) throw uploadError;

      let documentId = params.existingDocumentId;

      if (!documentId) {
        // Create new document record
        // Get company_id
        const { data: profile } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('id', userId)
          .single();

        const { data: doc, error: docError } = await supabase
          .from('documents')
          .insert({
            company_id: profile!.company_id,
            owner_type: params.ownerType,
            owner_id: params.ownerId,
            category: params.category,
            title,
            uploaded_by: userId,
          })
          .select('id')
          .single();
        if (docError) throw docError;
        documentId = doc.id;
      }

      // Determine next revision number
      const { data: existingVersions } = await supabase
        .from('document_versions')
        .select('rev_no')
        .eq('document_id', documentId)
        .order('rev_no', { ascending: false })
        .limit(1);

      const nextRev = (existingVersions?.[0]?.rev_no || 0) + 1;

      // Mark all existing versions as not current
      await supabase
        .from('document_versions')
        .update({ is_current: false })
        .eq('document_id', documentId);

      // Create new version
      const { error: versionError } = await supabase
        .from('document_versions')
        .insert({
          document_id: documentId,
          rev_no: nextRev,
          storage_path: storagePath,
          uploaded_by: userId,
          is_current: true,
        });
      if (versionError) throw versionError;

      return { documentId, revNo: nextRev, storagePath };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['documents'] });
    },
  });
}
