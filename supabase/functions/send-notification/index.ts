/**
 * Edge Function: send-notification
 * PRD §10 — Push notification delivery
 *
 * Receives notification data, stores it in the notifications table,
 * and sends push via Expo Push API.
 * Secured with service_role_key verification.
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.110.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-trigger-dispatch',
};

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

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

    const {
      recipientId,
      kind,
      title,
      body,
      refTable,
      refId,
      important = false,
    } = await req.json();

    if (!recipientId || !kind || !title || !body) {
      return new Response(
        JSON.stringify({ error: 'recipientId, kind, title, body are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // ── Recursion guard ────────────────────────────────────────────────
    // If called by trg_dispatch_notification, the notification row already
    // exists. Skip the insert to avoid infinite recursion.
    const isTriggerDispatch = req.headers.get('x-trigger-dispatch') === '1';

    if (!isTriggerDispatch) {
      // Direct call — insert the notification row.
      // The trigger will fire, call us back with x-trigger-dispatch=1,
      // and we'll send the push on the second pass.
      const { error: insertError } = await supabase.from('notifications').insert({
        recipient_id: recipientId,
        kind,
        title,
        body,
        ref_table: refTable || null,
        ref_id: refId || null,
        important,
      });

      if (insertError) throw insertError;

      // Push will be sent when the trigger calls us back.
      return new Response(
        JSON.stringify({ success: true, dispatched_via_trigger: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Trigger-dispatched call: send the push ─────────────────────────
    const { data: profile } = await supabase
      .from('profiles')
      .select('push_token')
      .eq('id', recipientId)
      .single();

    if (profile?.push_token) {
      const pushResponse = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: profile.push_token,
          title,
          body,
          data: {
            kind,
            refTable: refTable || null,
            refId: refId || null,
          },
          sound: 'default',
          priority: important ? 'high' : 'default',
        }),
      });

      const pushResult = await pushResponse.json();
      console.log('[send-notification] Push result:', pushResult);
    } else {
      console.log(`[send-notification] No push_token for ${recipientId}, in-app only`);
    }

    return new Response(
      JSON.stringify({ success: true, push_sent: !!profile?.push_token }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[send-notification] Notification error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
