import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export interface MaterialMasterItem {
  id: string;
  company_id: string;
  name: string;
  category: string | null;
  unit: string;
  aliases: string[];
  min_stock: number;
  current_stock: number;
  created_at: string;
}

export interface ProjectBOQItem {
  id: string;
  project_id: string;
  material_master_id: string | null;
  item_name: string;
  description: string | null;
  quantity: number;
  unit: string;
  rate: number | null;
  amount: number | null;
  completed_quantity: number;
  excel_row: number | null;
  created_at: string;
}

/** Fetch company's master material list. */
export function useMaterialMaster() {
  return useQuery({
    queryKey: ['material_master'],
    queryFn: async (): Promise<MaterialMasterItem[]> => {
      const { data, error } = await supabase
        .from('material_master')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      return data as MaterialMasterItem[];
    },
  });
}

/** Fetch BOQ items list for a specific project. */
export function useProjectBOQ(projectId: string | null | undefined) {
  return useQuery({
    queryKey: ['project_boq', projectId],
    queryFn: async (): Promise<ProjectBOQItem[]> => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('project_boq_items')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as ProjectBOQItem[];
    },
    enabled: !!projectId,
  });
}

/** Update completed_quantity for a project BOQ item. */
export function useUpdateBOQItemQuantity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, completed_quantity }: { id: string; completed_quantity: number }) => {
      const { error } = await supabase
        .from('project_boq_items')
        .update({ completed_quantity })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project_boq'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project'] });
    },
  });
}

export interface ImportBOQItemInput {
  material_master_id: string | null;
  item_name: string;
  description: string | null;
  quantity: number;
  unit: string;
  rate: number | null;
  amount: number | null;
  excel_row: number;
  learn_alias?: string | null; // If set, we'll call add_material_alias helper in DB
}

/** Bulk import BOQ list & learn custom aliases. */
export function useImportBOQ() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, items }: { projectId: string; items: ImportBOQItemInput[] }) => {
      // 1. Insert BOQ items
      const insertPayload = items.map(item => ({
        project_id: projectId,
        material_master_id: item.material_master_id,
        item_name: item.item_name,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        rate: item.rate,
        amount: item.amount,
        completed_quantity: 0,
        excel_row: item.excel_row,
      }));

      const { error: insertErr } = await supabase
        .from('project_boq_items')
        .insert(insertPayload);

      if (insertErr) throw insertErr;

      // 2. Perform alias learning on database for confirmed matches (BULK)
      const aliasesToLearn = items
        .filter(item => item.material_master_id && item.learn_alias)
        .map(item => ({
          id: item.material_master_id,
          alias: item.learn_alias!.toLowerCase().trim()
        }));

      if (aliasesToLearn.length > 0) {
        const { error: aliasErr } = await supabase.rpc('add_material_aliases_bulk', {
          p_aliases: aliasesToLearn
        });
        if (aliasErr) {
          console.warn('[useImportBOQ] Failed to bulk learn aliases:', aliasErr.message);
        }
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project_boq', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['material_master'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project', variables.projectId] });
    },
  });
}
