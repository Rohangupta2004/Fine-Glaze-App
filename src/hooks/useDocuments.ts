import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { createSignedMediaUrl } from '../lib/mediaStorage';
import type { DocumentRow, DocumentVersion } from '../types';

/** Documents for a project, company, or profile. */
export function useDocuments(ownerType: 'project' | 'profile' | 'company', ownerId: string | null | undefined) {
  return useQuery({
    queryKey: ['documents', ownerType, ownerId],
    queryFn: async (): Promise<DocumentRow[]> => {
      if (!ownerId) return [];
      const { data, error } = await supabase.from('documents').select('*').eq('owner_type', ownerType).eq('owner_id', ownerId).order('title');
      if (error) throw error;
      return data as DocumentRow[];
    },
    enabled: !!ownerId,
  });
}

/** Versions for a document (most recent first). */
export function useDocumentVersions(documentId: string | null | undefined) {
  return useQuery({
    queryKey: ['document_versions', documentId],
    queryFn: async (): Promise<DocumentVersion[]> => {
      if (!documentId) return [];
      const { data, error } = await supabase.from('document_versions').select('*').eq('document_id', documentId).order('rev_no', { ascending: false });
      if (error) throw error;
      return data as DocumentVersion[];
    },
    enabled: !!documentId,
  });
}

/** A short-lived URL for displaying the selected document or image securely. */
export function useDocumentViewerUrl(storagePath: string | null | undefined) {
  return useQuery({
    queryKey: ['document-viewer-url', storagePath],
    queryFn: () => storagePath ? createSignedMediaUrl('documents', storagePath, 3600) : Promise.resolve(null),
    enabled: !!storagePath,
    staleTime: 45 * 60 * 1000,
  });
}

/** All admin-visible company/project documents. Profile-owned client files are excluded. */
export function useAllDocuments() {
  return useQuery({
    queryKey: ['documents', 'admin'],
    queryFn: async (): Promise<DocumentRow[]> => {
      const { data, error } = await supabase.from('documents').select('*').in('owner_type', ['company', 'project']).order('created_at', { ascending: false });
      if (error) throw error;
      return data as DocumentRow[];
    },
  });
}

/** Admin deletion of a document record. */
export function useDeleteDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (documentId: string) => {
      const { error } = await supabase.from('documents').delete().eq('id', documentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
}
