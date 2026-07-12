import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.110.2';
import * as XLSX from 'https://esm.sh/xlsx@0.18.5';

serve(async (req) => {
  try {
    const id = new URL(req.url).searchParams.get('id');
    if (!id) throw new Error('id is required');
    const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: quote, error } = await db.from('quote_calculations').select('*').eq('id', id).single();
    if (error) throw error;
    const rows = (quote.line_items || []).map((item: any) => ({ Description: item.description || '', Quantity: item.quantity || 0, Rate: item.rate || 0, Amount: (item.quantity || 0) * (item.rate || 0) }));
    rows.push({ Description: 'Subtotal', Quantity: '', Rate: '', Amount: quote.subtotal });
    rows.push({ Description: `GST (${quote.tax_pct}%)`, Quantity: '', Rate: '', Amount: quote.total - quote.subtotal });
    rows.push({ Description: 'Total', Quantity: '', Rate: '', Amount: quote.total });
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Quote');
    const body = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const path = `exports/quote-${id}.xlsx`;
    const { error: uploadError } = await db.storage.from('documents').upload(path, body, { contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', upsert: true });
    if (uploadError) throw uploadError;
    const { data } = await db.storage.from('documents').createSignedUrl(path, 3600);
    return Response.json({ success: true, downloadUrl: data?.signedUrl, fileName: `${quote.title}.xlsx` });
  } catch (e) { return Response.json({ error: e.message }, { status: 400 }); }
});
