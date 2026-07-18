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
  'companies', 'profiles', 'profile_financials', 'projects', 'assignments', 'attendance',
  'recurring_tasks', 'tasks', 'dprs', 'dpr_media', 'leave_requests',
  'advance_requests', 'materials', 'material_requests', 'deliveries',
  'documents', 'document_versions', 'expenses', 'payments',
  'client_approvals', 'client_orgs', 'conversations', 'conversation_members',
  'messages', 'safety_checks', 'audit_log', 'project_templates', 'employee_requests'
];

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    // ── 1. Authenticate caller ──────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Missing or invalid Authorization header' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const token = authHeader.split(' ')[1];
    
    const serviceSupabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    
    // Validate JWT
    const { data: { user }, error: userError } = await serviceSupabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Load profile
    const { data: profile, error: profileError } = await serviceSupabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Profile not found' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── 2. Verify authorization ─────────────────────────────────────────────
    const { companyId } = await req.json();
    if (!companyId) {
      return new Response(JSON.stringify({ error: 'companyId is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (profile.role !== 'owner' || profile.company_id !== companyId) {
      return new Response(JSON.stringify({ error: 'Forbidden: Owner access only for your own company' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── 3. Resolve tenant ID lists for filtering ────────────────────────────
    const { data: profiles } = await serviceSupabase.from('profiles').select('id').eq('company_id', companyId);
    const { data: clientOrgs } = await serviceSupabase.from('client_orgs').select('id').eq('company_id', companyId);
    const { data: projects } = await serviceSupabase.from('projects').select('id').eq('company_id', companyId);
    const { data: conversations } = await serviceSupabase.from('conversations').select('id').eq('company_id', companyId);
    const { data: documents } = await serviceSupabase.from('documents').select('id').eq('company_id', companyId);

    const profileIds = (profiles || []).map(p => p.id);
    const clientOrgIds = (clientOrgs || []).map(c => c.id);
    const projectIds = (projects || []).map(p => p.id);
    const conversationIds = (conversations || []).map(c => c.id);
    const documentIds = (documents || []).map(d => d.id);

    const secureIds = (ids: string[]) => ids.length > 0 ? ids : ['00000000-0000-0000-0000-000000000000'];

    const { data: dprs } = await serviceSupabase.from('dprs').select('id').in('project_id', secureIds(projectIds));
    const dprIds = (dprs || []).map(d => d.id);

    // ── 4. Query tables with strict scope ──────────────────────────────────
    const backup: Record<string, any> = { exportedAt: new Date().toISOString(), companyId };

    for (const table of TABLES) {
      try {
        let query = serviceSupabase.from(table).select('*');

        if (table === 'companies') {
          query = query.eq('id', companyId);
        } else if (
          table === 'profiles' ||
          table === 'client_orgs' ||
          table === 'projects' ||
          table === 'recurring_tasks' ||
          table === 'leave_requests' ||
          table === 'advance_requests' ||
          table === 'documents' ||
          table === 'conversations' ||
          table === 'audit_log' ||
          table === 'project_templates' ||
          table === 'role_permissions' ||
          table === 'employee_requests'
        ) {
          query = query.eq('company_id', companyId);
        } else if (table === 'profile_financials') {
          query = query.in('id', secureIds(profileIds));
        } else if (
          table === 'assignments' ||
          table === 'attendance' ||
          table === 'tasks' ||
          table === 'dprs' ||
          table === 'materials' ||
          table === 'material_requests' ||
          table === 'expenses' ||
          table === 'payments' ||
          table === 'client_approvals' ||
          table === 'safety_checks'
        ) {
          query = query.in('project_id', secureIds(projectIds));
        } else if (table === 'dpr_media') {
          query = query.in('dpr_id', secureIds(dprIds));
        } else if (table === 'deliveries') {
          query = query.in('project_id', secureIds(projectIds));
        } else if (table === 'document_versions') {
          query = query.in('document_id', secureIds(documentIds));
        } else if (table === 'conversation_members' || table === 'messages') {
          query = query.in('conversation_id', secureIds(conversationIds));
        } else {
          query = query.eq('id', '00000000-0000-0000-0000-000000000000');
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

    const { error: uploadError } = await serviceSupabase.storage
      .from('documents')
      .upload(storagePath, new TextEncoder().encode(json), {
        contentType: 'application/json',
        upsert: true,
      });
    if (uploadError) throw uploadError;

    const { data: signedData, error: signError } = await serviceSupabase.storage
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
