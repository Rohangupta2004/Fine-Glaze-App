/**
 * Edge Function: evening-site-reminder
 * PRD §6.8 / §29f — Daily evening reminder sent to workers/supervisors
 * about tomorrow's site assignment.
 * Secured with service_role_key verification.
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.110.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Assignment {
  profile_id: string;
  full_name: string;
  project_name: string;
  project_address: string | null;
  project_city: string | null;
  role_on_site: string | null;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ── 1. Service Role Authentication Check ───────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Missing or invalid Authorization header' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const token = authHeader.split(' ')[1];
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (token !== serviceKey) {
      return new Response(JSON.stringify({ error: 'Forbidden: Invalid service key' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    console.log('[evening-site-reminder] Running at', new Date().toISOString());

    // Tomorrow's date in IST (UTC+5:30)
    const istOffsetMs = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(Date.now() + istOffsetMs);
    const tomorrow = new Date(istNow.getTime() + 24 * 60 * 60 * 1000);
    const tomorrowDateStr = tomorrow.toISOString().slice(0, 10);

    // ── 2. Get all active assignments ──────────────────────────────────────
    const { data: assignments, error } = await supabase
      .from('assignments')
      .select(`
        profile_id,
        role_on_site,
        profiles!inner(id, full_name, status),
        projects!inner(id, name, address, city, geofence_radius_m, status)
      `)
      .eq('profiles.status', 'active')
      .neq('projects.status', 'completed');

    if (error) throw error;

    const tomorrowAssignments: Assignment[] = (assignments || []).map((row: any) => ({
      profile_id: row.profile_id,
      full_name: row.profiles?.full_name || 'Worker',
      project_name: row.projects?.name || 'your site',
      project_address: row.projects?.address || null,
      project_city: row.projects?.city || null,
      role_on_site: row.role_on_site || null,
    }));

    console.log(`[evening-site-reminder] Found ${tomorrowAssignments.length} assignments for ${tomorrowDateStr}`);

    // ── 3. Insert notification rows ONLY ───────────────────────────────────
    const notifRows = tomorrowAssignments.map(a => ({
      recipient_id: a.profile_id,
      kind: 'site_reminder',
      title: "Tomorrow's Site",
      body: `You're assigned to ${a.project_name} tomorrow. Remember to punch in on site.`,
      ref_table: 'projects',
      important: false,
    }));

    let inboxInserted = 0;
    if (notifRows.length > 0) {
      const { error: notifErr } = await supabase.from('notifications').insert(notifRows);
      if (notifErr) {
        console.error('[evening-site-reminder] Notif insert failed:', notifErr.message);
        throw notifErr;
      }
      inboxInserted = notifRows.length;
    }

    console.log(`[evening-site-reminder] Done. Inbox: ${inboxInserted} (push handled by trigger)`);

    return new Response(
      JSON.stringify({
        success: true,
        tomorrowDate: tomorrowDateStr,
        assignments: tomorrowAssignments.length,
        inboxInserted,
        note: 'Push delivery handled by trg_dispatch_notification trigger',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[evening-site-reminder] Evening site reminder error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
