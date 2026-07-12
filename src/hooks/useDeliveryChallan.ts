import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import { supabase } from '../lib/supabase';
import { createSignedMediaUrl } from '../lib/mediaStorage';

const PDF_MIME = 'application/pdf';
const MAX_BYTES = 25 * 1024 * 1024;

/** Upload or replace the PDF challan for a delivery. */
export function useUploadDeliveryChallan() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (deliveryId: string) => {
      const picked = await DocumentPicker.getDocumentAsync({ type: PDF_MIME, copyToCacheDirectory: true });
      if (picked.canceled || !picked.assets?.[0]) throw new Error('File selection cancelled');
      const file = picked.assets[0];
      if (file.size && file.size > MAX_BYTES) throw new Error('Challan PDF must be 25 MB or smaller.');
      if (file.mimeType && file.mimeType !== PDF_MIME && !file.name.toLowerCase().endsWith('.pdf')) throw new Error('Please select a PDF challan.');
      const body = await (await fetch(file.uri)).arrayBuffer();
      const path = `deliveries/${deliveryId}/challan_${Date.now()}.pdf`;
      const { error: storageError } = await supabase.storage.from('documents').upload(path, body, { contentType: PDF_MIME, upsert: false });
      if (storageError) throw storageError;
      const { error } = await supabase.from('deliveries').update({ challan_pdf_path: path }).eq('id', deliveryId);
      if (error) throw error;
      return path;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ['deliveries'] }),
  });
}

/** Secure view link for a delivery challan PDF. */
export function useDeliveryChallanUrl(path: string | null | undefined) {
  return useQuery({
    queryKey: ['delivery-challan-url', path],
    queryFn: () => path ? createSignedMediaUrl('documents', path, 3600) : Promise.resolve(null),
    enabled: !!path,
    staleTime: 45 * 60 * 1000,
  });
}
