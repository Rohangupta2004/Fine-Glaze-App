/**
 * Edge Function: evening-site-reminder
 * PRD §6.8 / §29f — Daily evening reminder sent to workers/supervisors
 * about tomorrow's site assignment.
 *
 * ── IMPORTANT ────────────────────────────────────────────────────────────
 * This function ONLY inserts rows into the notifications table. It does NOT
 * send Expo pushes directly — the `trg_dispatch_notification` trigger on
 * the notifications table will fire and call `send-notification` to deliver
 * the push. Sending Expo pushes directly here would cause DOUBLE pushes
 * (one direct, one via trigger).
 *
 * Schedule:
 *   SELECT cron.schedule(
 *     'evening-site-reminder',
 *     '0 13 * * *',                      -- 13:00 UTC = 18:30 IST
 *     $$SELECT net.http_post(
 *       url := '<EDGE_URL>/evening-site-reminder',
 *       headers := jsonb_build_object('Authorization','Bearer <SERVICE_ROLE>','Content-Type','application/json'),
 *       body := '{}'::jsonb
 *     )$$
 *   );
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

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceKey);

  console.log('[evening-site-reminder] Running at', new Date().toISOString());

  // Tomorrow's date in IST (UTC+5:30)
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(Date.now() + istOffsetMs);
  const tomorrow = new Date(istNow.getTime() + 24 * 60 * 60 * 1000);
  const tomorrowDateStr = tomorrow.toISOString().slice(0, 10);

  // ── 1. Get all active assignments ──────────────────────────────────────
  const { data: assignments, error } = await supabase
    .from('assignments')
    .select(`
      profile_id,
      role_on_site,
      profiles!inner(id, full_name, status),
      projects!inner(id, name, address, city, geofence_radius, status)
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

  // ── 2. Insert notification rows ONLY ───────────────────────────────────
  // The trg_dispatch_notification trigger will fire on each insert and call
  // send-notification to deliver the Expo push. DO NOT send pushes directly
  // here — that would cause double notifications.
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
});
