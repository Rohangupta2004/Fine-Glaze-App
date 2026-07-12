/**
 * send-notification Edge Function
 * PRD §10 — Push notification delivery
 *
 * Receives notification data, stores it in the notifications table,
 * and sends push via Expo Push API.
 *
 * Called by database triggers or other Edge Functions.
 *
 * Body: {
 *   recipientId: string,
 *   kind: string,
 *   title: string,
 *   body: string,
 *   refTable?: string,
 *   refId?: string,
 *   important?: boolean,
 * }
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.110.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
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
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // 1. Store notification in database
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

    // 2. Get recipient's push token
    const { data: profile } = await supabase
      .from('profiles')
      .select('push_token')
      .eq('id', recipientId)
      .single();

    if (profile?.push_token) {
      // 3. Send push notification via Expo
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
      console.log('Push result:', pushResult);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Notification error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
