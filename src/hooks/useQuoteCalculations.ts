import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export type QuoteLineItem = { description: string; quantity: number; rate: number };

export function useQuoteCalculations(companyId: string | null | undefined) {
  return useQuery({
    queryKey: ['quote-calculations', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase.from('quote_calculations').select('*').eq('company_id', companyId).order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });
}

export function useSaveQuoteCalculation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ companyId, userId, title, lineItems, taxPct }: { companyId: string; userId: string; title: string; lineItems: QuoteLineItem[]; taxPct: number }) => {
      const subtotal = lineItems.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.rate || 0), 0);
      const total = subtotal * (1 + Number(taxPct || 0) / 100);
      const { data, error } = await supabase.from('quote_calculations').insert({ company_id: companyId, created_by: userId, title: title.trim(), line_items: lineItems, subtotal, tax_pct: taxPct, total }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ['quote-calculations'] }),
  });
}
