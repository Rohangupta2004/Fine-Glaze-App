import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.110.2';
import * as XLSX from 'https://esm.sh/xlsx@0.18.5';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const id = new URL(req.url).searchParams.get('id');
    if (!id) {
      return new Response(JSON.stringify({ error: 'id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── 1. Authenticate caller ──────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Missing or invalid Authorization header' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const token = authHeader.split(' ')[1];

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const db = createClient(supabaseUrl, serviceKey);

    // Validate JWT
    const { data: { user }, error: userError } = await db.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Load caller profile
    const { data: callerProfile, error: callerProfileErr } = await db
      .from('profiles')
      .select('id, role, company_id')
      .eq('id', user.id)
      .single();

    if (callerProfileErr || !callerProfile) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Caller profile not found' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── 2. Load quote calculation ──────────────────────────────────────────
    const { data: quote, error: quoteError } = await db
      .from('quote_calculations')
      .select('*')
      .eq('id', id)
      .single();

    if (quoteError || !quote) {
      return new Response(JSON.stringify({ error: 'Quote calculation not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── 3. Verify access authorization ──────────────────────────────────────
    const isCreator = quote.created_by === user.id;
    const isCompanyAdmin = ['owner', 'project_manager', 'hr', 'accounts'].includes(callerProfile.role) &&
                           callerProfile.company_id === quote.company_id;

    if (!isCreator && !isCompanyAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden: Insufficient privileges to export this quote' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── 4. Generate excel & upload ──────────────────────────────────────────
    const rows = (quote.line_items || []).map((item: any) => ({
      Description: item.description || '',
      Quantity: item.quantity || 0,
      Rate: item.rate || 0,
      Amount: (item.quantity || 0) * (item.rate || 0)
    }));
    
    rows.push({ Description: 'Subtotal', Quantity: '', Rate: '', Amount: quote.subtotal });
    rows.push({ Description: `GST (${quote.tax_pct}%)`, Quantity: '', Rate: '', Amount: quote.total - quote.subtotal });
    rows.push({ Description: 'Total', Quantity: '', Rate: '', Amount: quote.total });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Quote');
    const body = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const path = `exports/quote-${id}.xlsx`;

    const { error: uploadError } = await db.storage
      .from('documents')
      .upload(path, body, {
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        upsert: true
      });

    if (uploadError) throw uploadError;

    const { data: signedData, error: signError } = await db.storage
      .from('documents')
      .createSignedUrl(path, 3600);

    if (signError) throw signError;

    return new Response(JSON.stringify({
      success: true,
      downloadUrl: signedData?.signedUrl,
      fileName: `${quote.title}.xlsx`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
