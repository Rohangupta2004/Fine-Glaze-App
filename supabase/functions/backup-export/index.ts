/**
 * backup-export Edge Function
 * Exports all company data as a single JSON backup file to Storage
 * and returns a signed download URL. Owner-only feature (PRD §29f).
 */
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.110.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TABLES = [
  'companies', 'profiles', 'projects', 'assignments', 'attendance',
  'recurring_tasks', 'tasks', 'dprs', 'dpr_media', 'leave_requests',
  'advance_requests', 'materials', 'material_requests', 'deliveries',
  'documents', 'document_versions', 'expenses', 'payments',
  'client_approvals', 'client_orgs', 'conversations', 'conversation_members',
  'messages', 'safety_checks', 'audit_log', 'project_templates',
];

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { companyId } = await req.json();
    if (!companyId) {
      return new Response(JSON.stringify({ error: 'companyId is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const backup: Record<string, any> = { exportedAt: new Date().toISOString(), companyId };

    for (const table of TABLES) {
      try {
        const filterColumn = table === 'companies' ? 'id' : 'company_id';
        let query = supabase.from(table).select('*');
        if (table === 'companies') {
          query = query.eq('id', companyId);
        } else {
          // Not all tables have company_id directly; best-effort filter
          const { data: sample } = await supabase.from(table).select('*').limit(1);
          if (sample && sample[0] && 'company_id' in sample[0]) {
            query = query.eq('company_id', companyId);
          }
        }
        const { data, error } = await query;
        if (error) {
          backup[table] = { error: error.message };
        } else {
          backup[table] = data;
        }
      } catch (e: any) {
        backup[table] = { error: e.message };
      }
    }

    const json = JSON.stringify(backup, null, 2);
    const fileName = `backup-${companyId}-${Date.now()}.json`;
    const storagePath = `backups/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(storagePath, new TextEncoder().encode(json), {
        contentType: 'application/json',
        upsert: true,
      });
    if (uploadError) throw uploadError;

    const { data: signedData, error: signError } = await supabase.storage
      .from('documents')
      .createSignedUrl(storagePath, 3600);
    if (signError) throw signError;

    return new Response(JSON.stringify({
      success: true,
      downloadUrl: signedData.signedUrl,
      fileName,
      sizeBytes: json.length,
      tables: TABLES.length,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
