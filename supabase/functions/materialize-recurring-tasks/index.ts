/**
 * Edge Function: materialize-recurring-tasks
 * PRD §29f — Daily cron that materializes recurring tasks into actual
 * task rows for today. Each active recurring_tasks row generates a
 * corresponding tasks row based on its frequency.
 *
 * Frequency format:
 *   'daily'                              — every day
 *   'weekly:mon,wed,fri'                 — specific weekdays
 *   'weekly:sat'                         — single weekday
 *
 * Designed to run daily at 6 AM IST.
 *
 * Schedule:
 *   SELECT cron.schedule(
 *     'materialize-recurring-tasks',
 *     '0 0 * * *',                      -- 00:00 UTC = 05:30 IST
 *     $$SELECT net.http_post(
 *       url := '<EDGE_URL>/materialize-recurring-tasks',
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

const WEEKDAY_MAP: Record<string, number> = {
  sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
};

interface RecurringTask {
  id: string;
  company_id: string;
  project_id: string;
  title: string;
  level_zone: string | null;
  priority: string;
  frequency: string;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceKey);

  console.log('[materialize-recurring-tasks] Running at', new Date().toISOString());

  // Today's date in IST
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(Date.now() + istOffsetMs);
  const todayStr = istNow.toISOString().slice(0, 10);
  const todayDow = istNow.getDay();

  // ── 1. Fetch all active recurring tasks ────────────────────────────────
  const { data: recurringTasks, error } = await supabase
    .from('recurring_tasks')
    .select('id, company_id, project_id, title, level_zone, priority, frequency')
    .eq('active', true);

  if (error) throw error;

  console.log(`[materialize-recurring-tasks] Found ${recurringTasks?.length || 0} active recurring tasks`);

  // ── 2. Filter to those that should run today ───────────────────────────
  const dueTasks: RecurringTask[] = [];
  for (const rt of (recurringTasks || []) as RecurringTask[]) {
    const freq = (rt.frequency || 'daily').toLowerCase().trim();
    if (freq === 'daily') {
      dueTasks.push(rt);
    } else if (freq.startsWith('weekly:')) {
      const daysPart = freq.slice('weekly:'.length);
      const days = daysPart.split(',').map(d => d.trim());
      const dayNums = days.map(d => WEEKDAY_MAP[d]).filter(n => n !== undefined);
      if (dayNums.includes(todayDow)) {
        dueTasks.push(rt);
      }
    }
  }

  console.log(`[materialize-recurring-tasks] ${dueTasks.length} due today (dow=${todayDow})`);

  if (dueTasks.length === 0) {
    return new Response(
      JSON.stringify({ success: true, today: todayStr, materialized: 0 }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // ── 3. Check which tasks have already been materialized today ──────────
  // Use offline_id convention: 'recurring:<recurring_id>:<date>'
  const offlineIds = dueTasks.map(t => `recurring:${t.id}:${todayStr}`);
  const { data: existing } = await supabase
    .from('tasks')
    .select('offline_id')
    .in('offline_id', offlineIds);

  const existingSet = new Set((existing || []).map((r: any) => r.offline_id));

  // ── 4. Insert new task rows for due recurring tasks ────────────────────
  const newTasks = dueTasks
    .filter(t => !existingSet.has(`recurring:${t.id}:${todayStr}`))
    .map(t => ({
      project_id: t.project_id,
      title: t.title,
      description: `Auto-generated from recurring schedule (zone: ${t.level_zone || 'all'})`,
      priority: t.priority || 'medium',
      status: 'pending',
      level_zone: t.level_zone,
      offline_id: `recurring:${t.id}:${todayStr}`,
      created_at: new Date().toISOString(),
    }));

  let inserted = 0;
  if (newTasks.length > 0) {
    const { data: insertedRows, error: insertErr } = await supabase
      .from('tasks')
      .insert(newTasks)
      .select('id');
    if (insertErr) {
      console.error('[materialize-recurring-tasks] Insert failed:', insertErr.message);
      throw insertErr;
    }
    inserted = insertedRows?.length || 0;
  }

  console.log(`[materialize-recurring-tasks] Materialized ${inserted} new tasks (${existingSet.size} already existed)`);

  return new Response(
    JSON.stringify({
      success: true,
      today: todayStr,
      todayDow,
      activeRecurring: recurringTasks?.length || 0,
      dueToday: dueTasks.length,
      alreadyMaterialized: existingSet.size,
      materialized: inserted,
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});
