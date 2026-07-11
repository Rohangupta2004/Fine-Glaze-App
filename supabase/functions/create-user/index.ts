/**
 * create-user — Supabase Edge Function
 *
 * Creates a new auth user + matching profile for the caller's company.
 *
 * Security model
 * ──────────────
 * • Caller must supply a valid JWT (Authorization: Bearer <access_token>).
 * • The function verifies the caller's role is an admin-level role
 *   (owner | project_manager | hr | accounts) via the profiles table.
 * • User creation uses the SERVICE_ROLE key server-side — the anon key is
 *   never used for privileged operations.
 * • The generated temp password is returned once in the response body and
 *   never stored in plain text.
 *
 * Request body (JSON)
 * ───────────────────
 * {
 *   full_name:   string  (required)
 *   phone:       string  (required, 10+ digits)
 *   role:        string  (required, one of the valid profile roles)
 *   daily_rate:  number  (optional)
 *   address:     string  (optional)
 * }
 *
 * Response body (JSON) on success (201)
 * ──────────────────────────────────────
 * { user_id: string, email: string, temp_password: string }
 *
 * Deployment
 * ──────────
 * supabase functions deploy create-user --no-verify-jwt
 * (JWT verification is done inside the function itself for flexibility.)
 *
 * Required secrets (set via supabase secrets set)
 * ─────────────────────────────────────────────────
 * SUPABASE_URL              (auto-injected by Supabase)
 * SUPABASE_SERVICE_ROLE_KEY (auto-injected by Supabase)
 */

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ADMIN_ROLES = new Set(['owner', 'project_manager', 'hr', 'accounts']);
const VALID_ROLES = new Set(['owner', 'project_manager', 'hr', 'accounts', 'supervisor', 'worker', 'client']);

/** Map phone → email using the same convention as authStore.ts */
function phoneToEmail(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return `${digits}@fineglazeapp.com`;
}

/** Generate a deterministic-enough temp password. */
function generateTempPassword(): string {
  const year = new Date().getFullYear();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `FG@${year}#${rand}`;
}

serve(async (req: Request) => {
  // Handle CORS pre-flight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    // ── 1. Extract and verify caller JWT ────────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return jsonError(401, 'Missing or invalid Authorization header');
    }
    const callerJwt = authHeader.slice(7);

    // Use the SERVICE_ROLE client for all database operations so RLS
    // does not block our server-side queries.
    const serviceSupabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    // Decode the caller's JWT to get their user ID without a full re-auth round-trip.
    const { data: { user: callerUser }, error: userErr } =
      await serviceSupabase.auth.getUser(callerJwt);

    if (userErr || !callerUser) {
      return jsonError(401, 'Invalid or expired token');
    }

    // ── 2. Verify caller is an admin-level profile ───────────────────────────
    const { data: callerProfile, error: profileErr } = await serviceSupabase
      .from('profiles')
      .select('id, company_id, role')
      .eq('id', callerUser.id)
      .single();

    if (profileErr || !callerProfile) {
      return jsonError(403, 'Caller profile not found');
    }

    if (!ADMIN_ROLES.has(callerProfile.role)) {
      return jsonError(403, `Role '${callerProfile.role}' is not permitted to create users`);
    }

    const companyId: string = callerProfile.company_id;

    // ── 3. Parse and validate request body ──────────────────────────────────
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return jsonError(400, 'Invalid JSON body');
    }

    const fullName = (body.full_name as string | undefined)?.trim();
    const phone = (body.phone as string | undefined)?.trim();
    const role = body.role as string | undefined;
    const dailyRate = body.daily_rate as number | null | undefined;
    const address = (body.address as string | undefined)?.trim() || null;

    if (!fullName) return jsonError(400, 'full_name is required');
    if (!phone || phone.replace(/\D/g, '').length < 10) {
      return jsonError(400, 'phone must be at least 10 digits');
    }
    if (!role || !VALID_ROLES.has(role)) {
      return jsonError(400, `role must be one of: ${[...VALID_ROLES].join(', ')}`);
    }

    const email = phoneToEmail(phone);
    const tempPassword = generateTempPassword();

    // ── 4. Create auth user (service role bypasses email confirmation) ───────
    const { data: newUserData, error: createErr } =
      await serviceSupabase.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true, // mark confirmed — no email sent (internal users)
      });

    if (createErr) {
      // Handle "already registered" gracefully — look up existing user
      if (createErr.message.toLowerCase().includes('already')) {
        return jsonError(409, `A user with phone ${phone} already exists`);
      }
      throw createErr;
    }

    const newUserId = newUserData.user.id;

    // ── 5. Create profile in same company ────────────────────────────────────
    const { error: insertErr } = await serviceSupabase.from('profiles').insert({
      id: newUserId,
      company_id: companyId,
      full_name: fullName,
      phone: phone,
      role: role,
      daily_rate: dailyRate ?? null,
      address: address,
      status: 'active',
    });

    if (insertErr) {
      // Roll back the auth user so we don't leave an orphaned auth row
      await serviceSupabase.auth.admin.deleteUser(newUserId);
      throw insertErr;
    }

    // ── 6. Write audit log entry ─────────────────────────────────────────────
    await serviceSupabase.from('audit_log').insert({
      company_id: companyId,
      actor_id: callerUser.id,
      action: 'create_user',
      ref_table: 'profiles',
      ref_id: newUserId,
      detail: { role, phone_last4: phone.slice(-4) },
    });

    return new Response(
      JSON.stringify({ user_id: newUserId, email, temp_password: tempPassword }),
      { status: 201, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[create-user] Unhandled error:', msg);
    return jsonError(500, 'Internal server error');
  }
});

function jsonError(status: number, message: string): Response {
  return new Response(
    JSON.stringify({ error: message }),
    { status, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
  );
}
