/**
 * Edge Function: evening-site-reminder
 * PRD §6.8 / §29f — Daily evening reminder sent to workers/supervisors
 * about tomorrow's site assignment.
 *
 * Designed to run via Supabase's pg_cron or external scheduler at 7 PM IST.
 *
 * For each worker/supervisor with an assignment tomorrow:
 *   - Send push notification with project name, address, punch-in window
 *   - Insert into notifications table for in-app inbox
 *
 * Schedule (Supabase Dashboard → SQL Editor):
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

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface Assignment {
  profile_id: string;
  full_name: string;
  push_token: string | null;
  phone: string | null;
  project_name: string;
  project_address: string | null;
  project_city: string | null;
  geofence_radius: number | null;
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

  // Compute tomorrow's date in IST (UTC+5:30)
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(Date.now() + istOffsetMs);
  const tomorrow = new Date(istNow.getTime() + 24 * 60 * 60 * 1000);
  const tomorrowDateStr = tomorrow.toISOString().slice(0, 10);

  // ── 1. Get all active assignments (current ongoing projects) ──────────
  // We treat every active assignment as "tomorrow's site" since construction
  // projects are continuous. A worker assigned to a project works on it daily
  // until the project completes or they're reassigned.
  const { data: assignments, error } = await supabase
    .from('assignments')
    .select(`
      profile_id,
      role_on_site,
      profiles!inner(id, full_name, push_token, phone, status),
      projects!inner(id, name, address, city, geofence_radius, status)
    `)
    .eq('profiles.status', 'active')
    .neq('projects.status', 'completed');

  if (error) throw error;

  const tomorrowAssignments: Assignment[] = (assignments || []).map((row: any) => ({
    profile_id: row.profile_id,
    full_name: row.profiles?.full_name || 'Worker',
    push_token: row.profiles?.push_token || null,
    phone: row.profiles?.phone || null,
    project_name: row.projects?.name || 'your site',
    project_address: row.projects?.address || null,
    project_city: row.projects?.city || null,
    geofence_radius: row.projects?.geofence_radius || null,
    role_on_site: row.role_on_site || null,
  }));

  console.log(`[evening-site-reminder] Found ${tomorrowAssignments.length} assignments for ${tomorrowDateStr}`);

  // ── 2. Send push notifications ─────────────────────────────────────────
  const pushMessages: any[] = [];
  for (const a of tomorrowAssignments) {
    if (!a.push_token) continue;

    const locationBits = [a.project_address, a.project_city].filter(Boolean).join(', ');
    const body = `Tomorrow at ${a.project_name}${locationBits ? ` · ${locationBits}` : ''}. Remember to punch in on site.`;

    pushMessages.push({
      to: a.push_token,
      title: "📍 Tomorrow's Site",
      body,
      data: {
        kind: 'site_reminder',
        refTable: 'projects',
        tomorrowDate: tomorrowDateStr,
      },
      sound: 'default',
      priority: 'default',
    });
  }

  // Batch send to Expo (max 100 per request)
  let pushSent = 0;
  for (let i = 0; i < pushMessages.length; i += 100) {
    const batch = pushMessages.slice(i, i + 100);
    try {
      const resp = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(batch),
      });
      const result = await resp.json();
      pushSent += (result.data || []).filter((r: any) => r.status === 'ok').length;
    } catch (e) {
      console.error('[evening-site-reminder] Push batch failed:', e);
    }
  }

  // ── 3. Insert notification rows (for in-app inbox) ─────────────────────
  const notifRows = tomorrowAssignments.map(a => ({
    recipient_id: a.profile_id,
    kind: 'site_reminder',
    title: "Tomorrow's Site",
    body: `You're assigned to ${a.project_name} tomorrow. Remember to punch in on site.`,
    ref_table: 'projects',
    important: false,
  }));

  if (notifRows.length > 0) {
    const { error: notifErr } = await supabase.from('notifications').insert(notifRows);
    if (notifErr) console.error('[evening-site-reminder] Notif insert failed:', notifErr.message);
  }

  console.log(`[evening-site-reminder] Done. Push: ${pushSent}/${pushMessages.length}, Inbox: ${notifRows.length}`);

  return new Response(
    JSON.stringify({
      success: true,
      tomorrowDate: tomorrowDateStr,
      assignments: tomorrowAssignments.length,
      pushSent,
      inboxInserted: notifRows.length,
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});
