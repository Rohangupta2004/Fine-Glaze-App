/**
 * Edge Function: send-whatsapp
 * Sends a WhatsApp message via WhatsApp Cloud API (Meta Business).
 * Secured with service_role_key verification.
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const WHATSAPP_API_BASE = 'https://graph.facebook.com/v18.0';

interface SendRequest {
  to: string;
  template: string;
  params?: string[];
  languageCode?: string; // default 'en', or 'hi' / 'mr' for regional
  fallbackSms?: string;
}

interface TemplateConfig {
  language: string;
  namespace?: string;
}

const TEMPLATE_DEFAULTS: Record<string, TemplateConfig> = {
  salary_credited: { language: 'en_US' },
  leave_approved: { language: 'en_US' },
  leave_rejected: { language: 'en_US' },
  payment_milestone: { language: 'en_US' },
  site_reminder: { language: 'en_US' },
  task_assigned: { language: 'en_US' },
  dpr_approved: { language: 'en_US' },
  dpr_rejected: { language: 'en_US' },
};

function normalizePhone(raw: string): string | null {
  if (!raw) return null;
  let p = raw.replace(/[^\d]/g, '');
  if (p.length === 10) p = '91' + p;
  else if (p.length === 11 && p.startsWith('0')) p = '91' + p.slice(1);
  else if (p.length === 12 && p.startsWith('91')) p = p;
  else if (p.length === 13 && p.startsWith('910')) p = '91' + p.slice(3);
  if (p.length < 10 || p.length > 15) return null;
  return p;
}

async function sendWhatsApp(req: SendRequest): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const token = Deno.env.get('WHATSAPP_TOKEN');
  const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');

  if (!token || !phoneNumberId) {
    return { success: false, error: 'WhatsApp credentials not configured' };
  }

  const to = normalizePhone(req.to);
  if (!to) {
    return { success: false, error: `Invalid phone number: ${req.to}` };
  }

  const cfg = TEMPLATE_DEFAULTS[req.template] || { language: 'en_US' };
  const languageCode = req.languageCode ? (req.languageCode === 'hi' ? 'hi_IN' : req.languageCode === 'mr' ? 'mr_IN' : 'en_US') : cfg.language;

  const body: any = {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name: req.template,
      language: { code: languageCode },
    },
  };

  if (req.params && req.params.length > 0) {
    body.template.components = [{
      type: 'body',
      parameters: req.params.map(p => ({ type: 'text', text: String(p) })),
    }];
  }

  try {
    const resp = await fetch(`${WHATSAPP_API_BASE}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const result = await resp.json();

    if (!resp.ok) {
      console.error('[send-whatsapp] API error:', result);
      return { success: false, error: result?.error?.message || `HTTP ${resp.status}` };
    }

    return {
      success: true,
      messageId: result?.messages?.[0]?.id,
    };
  } catch (e: any) {
    console.error('[send-whatsapp] Network error:', e);
    return { success: false, error: e.message };
  }
}

async function sendSmsFallback(phone: string, message: string): Promise<boolean> {
  const smsUrl = Deno.env.get('SMS_GATEWAY_URL');
  const smsToken = Deno.env.get('SMS_GATEWAY_TOKEN');
  if (!smsUrl || !smsToken) return false;

  try {
    const to = normalizePhone(phone);
    if (!to) return false;
    await fetch(smsUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${smsToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ to, message, sender: 'FINEGLZ' }),
    });
    return true;
  } catch (e) {
    console.error('[send-whatsapp] SMS fallback failed:', e);
    return false;
  }
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

    const body: SendRequest = await req.json();

    if (!body.to || !body.template) {
      return new Response(
        JSON.stringify({ error: 'to and template are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await sendWhatsApp(body);

    let smsSent = false;
    if (!result.success && body.fallbackSms) {
      smsSent = await sendSmsFallback(body.to, body.fallbackSms);
    }

    return new Response(
      JSON.stringify({
        ...result,
        smsFallback: smsSent,
      }),
      {
        status: result.success ? 200 : 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (e: any) {
    console.error('[send-whatsapp] Unhandled error:', e);
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
