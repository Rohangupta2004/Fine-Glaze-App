import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { DocumentRow, DocumentVersion } from '../types';

/** Documents for a project or profile. */
export function useDocuments(ownerType: 'project' | 'profile' | 'company', ownerId: string | null | undefined) {
  return useQuery({
    queryKey: ['documents', ownerType, ownerId],
    queryFn: async (): Promise<DocumentRow[]> => {
      if (!ownerId) return [];
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('owner_type', ownerType)
        .eq('owner_id', ownerId)
        .order('title');
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
      const { data, error } = await supabase
        .from('document_versions')
        .select('*')
        .eq('document_id', documentId)
        .order('rev_no', { ascending: false });
      if (error) throw error;
      return data as DocumentVersion[];
    },
    enabled: !!documentId,
  });
}

/** All documents in the company (admin vault) — newest first. */
export function useAllDocuments() {
  return useQuery({
    queryKey: ['documents', 'all'],
    queryFn: async (): Promise<DocumentRow[]> => {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as DocumentRow[];
    },
  });
}
