import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Material, MaterialRequest, Delivery } from '../types';

/** Materials for a project. */
export function useProjectMaterials(projectId: string | null | undefined) {
  return useQuery({
    queryKey: ['materials', projectId],
    queryFn: async (): Promise<Material[]> => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('materials')
        .select('*')
        .eq('project_id', projectId)
        .order('name');
      if (error) throw error;
      return data as Material[];
    },
    enabled: !!projectId,
  });
}

/** Material requests (all projects or specific). */
export function useMaterialRequests(projectId?: string | null) {
  return useQuery({
    queryKey: ['material_requests', projectId || 'all'],
    queryFn: async (): Promise<MaterialRequest[]> => {
      let q = supabase.from('material_requests').select('*').order('needed_by', { ascending: true });
      if (projectId) q = q.eq('project_id', projectId);
      const { data, error } = await q;
      if (error) throw error;
      return data as MaterialRequest[];
    },
  });
}

/** Deliveries for a material request. */
export function useDeliveries(materialRequestId?: string | null) {
  return useQuery({
    queryKey: ['deliveries', materialRequestId || 'all'],
    queryFn: async (): Promise<Delivery[]> => {
      let q = supabase.from('deliveries').select('*').order('delivered_at', { ascending: false });
      if (materialRequestId) q = q.eq('material_request_id', materialRequestId);
      const { data, error } = await q;
      if (error) throw error;
      return data as Delivery[];
    },
  });
}

/** Submit a material request. */
export function useSubmitMaterialRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      projectId: string;
      requestedBy: string;
      materialName: string;
      spec?: string;
      qty: number;
      neededBy?: string;
      notes?: string;
    }) => {
      const { error } = await supabase.from('material_requests').insert({
        project_id: params.projectId,
        requested_by: params.requestedBy,
        material_name: params.materialName,
        spec: params.spec || null,
        qty: params.qty,
        needed_by: params.neededBy || null,
        notes: params.notes || null,
        status: 'pending',
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['material_requests'] }),
  });
}
