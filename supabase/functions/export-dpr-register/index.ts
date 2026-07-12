/**
 * export-dpr-register Edge Function
 * Generates an Excel register of DPRs for a project/month with
 * submission id, dates, work summary, status, and reviewer notes.
 * Query: ?projectId=<uuid>&month=YYYY-MM (month optional = all time)
 */
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.110.2';
import * as XLSX from 'https://cdn.sheetjs.com/xlsx-0.20.2/package/xlsx.mjs';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const url = new URL(req.url);
    const projectId = url.searchParams.get('projectId');
    const month = url.searchParams.get('month');
    if (!projectId) {
      return new Response(JSON.stringify({ error: 'projectId is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    let query = supabase.from('dprs').select('*').eq('project_id', projectId).order('date');
    if (month && /^\d{4}-\d{2}$/.test(month)) {
      const [y, m] = month.split('-').map(Number);
      const last = new Date(y, m, 0).getDate();
      query = query.gte('date', `${month}-01`).lte('date', `${month}-${String(last).padStart(2, '0')}`);
    }
    const { data: dprs, error } = await query;
    if (error) throw error;

    const { data: project } = await supabase.from('projects').select('name').eq('id', projectId).single();

    const submitterIds = [...new Set((dprs || []).map((d: any) => d.submitted_by))];
    const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', submitterIds.length ? submitterIds : ['00000000-0000-0000-0000-000000000000']);
    const nameMap = new Map((profiles || []).map((p: any) => [p.id, p.full_name]));

    const rows = (dprs || []).map((d: any) => ({
      'Submission ID': d.submission_id || '',
      'Date': d.date,
      'Submitted By': nameMap.get(d.submitted_by) || '',
      'Work Type': d.work_type || '',
      'Level / Zone': d.level_zone || '',
      'Weather': d.weather || '',
      'Work Done': d.work_done,
      'Status': d.status,
      'Review Note': d.review_note || '',
      'Reviewed At': d.reviewed_at || '',
    }));

    const wb = XLSX.utils.book_new();
    const sheet = XLSX.utils.json_to_sheet(rows.length ? rows : [{ 'No Records': 'No DPRs found for this range' }]);
    XLSX.utils.book_append_sheet(wb, sheet, 'DPR Register');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const safeName = (project?.name || 'project').replace(/[^a-z0-9]+/gi, '-');
    const fileName = `dpr-register-${safeName}${month ? '-' + month : ''}.xlsx`;
    const storagePath = `exports/${fileName}`;
    const { error: uploadError } = await supabase.storage.from('documents').upload(storagePath, buf, {
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', upsert: true,
    });
    if (uploadError) throw uploadError;

    const { data: signedData, error: signError } = await supabase.storage.from('documents').createSignedUrl(storagePath, 3600);
    if (signError) throw signError;

    return new Response(JSON.stringify({ success: true, downloadUrl: signedData.signedUrl, fileName, count: rows.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
