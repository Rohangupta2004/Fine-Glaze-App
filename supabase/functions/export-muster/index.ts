/**
 * export-muster Edge Function
 * PRD §29 — Muster & Salary Excel export
 *
 * Generates an .xlsx file with attendance + computed salary per employee
 * for a given month. Returns a signed download URL.
 * Query params: ?month=2026-07 (YYYY-MM format)
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.110.2';
import * as XLSX from 'https://cdn.sheetjs.com/xlsx-0.20.2/package/xlsx.mjs';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ── 1. Authenticate caller ──────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Missing or invalid Authorization header' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const token = authHeader.split(' ')[1];
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Validate JWT
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Load profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Profile not found' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify admin role
    const isAdmin = ['owner', 'project_manager', 'hr', 'accounts'].includes(profile.role);
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden: Admin access only' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const companyId = profile.company_id;

    // ── 2. Validate params ──────────────────────────────────────────────────
    const url = new URL(req.url);
    const month = url.searchParams.get('month'); // e.g. "2026-07"
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return new Response(JSON.stringify({ error: 'month param required (YYYY-MM)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse month range
    const [year, mon] = month.split('-').map(Number);
    const startDate = `${month}-01`;
    const lastDay = new Date(year, mon, 0).getDate();
    const endDate = `${month}-${String(lastDay).padStart(2, '0')}`;

    // ── 3. Fetch scoped company data ────────────────────────────────────────
    // Fetch salary data from the monthly_salary view (strictly filtered by company)
    const { data: salaryData, error: salError } = await supabase
      .from('monthly_salary')
      .select('*')
      .eq('company_id', companyId)
      .gte('month', `${startDate}T00:00:00`)
      .lte('month', `${endDate}T23:59:59`);

    if (salError) throw salError;

    // Fetch profiles of workers/supervisors in the company
    const { data: staffProfiles, error: profError } = await supabase
      .from('profiles')
      .select('id, full_name, phone, role, worker_id')
      .eq('company_id', companyId)
      .in('role', ['worker', 'supervisor'])
      .order('full_name');

    if (profError) throw profError;

    const staffIds = (staffProfiles || []).map(p => p.id);
    const secureIds = (ids: string[]) => ids.length > 0 ? ids : ['00000000-0000-0000-0000-000000000000'];

    // Fetch daily rates from profile_financials
    const { data: financials, error: finError } = await supabase
      .from('profile_financials')
      .select('id, daily_rate')
      .in('id', secureIds(staffIds));

    if (finError) throw finError;

    const finMap = new Map((financials || []).map((f: any) => [f.id, f.daily_rate]));
    const mergedProfiles = (staffProfiles || []).map((p: any) => ({
      ...p,
      daily_rate: finMap.get(p.id) || 0
    }));

    // Fetch all attendance records for these staff profiles
    const { data: attendance, error: attError } = await supabase
      .from('attendance')
      .select('profile_id, date, status, check_in_at, check_out_at, work_duration_min, ot_min')
      .in('profile_id', secureIds(staffIds))
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date');

    if (attError) throw attError;

    // --- Build Muster Sheet ---
    const musterRows: any[] = [];
    const days = Array.from({ length: lastDay }, (_, i) => i + 1);

    for (const employee of mergedProfiles) {
      const row: any = {
        'Worker ID': employee.worker_id || '',
        'Name': employee.full_name,
        'Phone': employee.phone,
        'Role': employee.role,
        'Daily Rate': employee.daily_rate,
      };

      let presentCount = 0;
      let halfDayCount = 0;
      let totalOT = 0;
      for (const day of days) {
        const dateStr = `${month}-${String(day).padStart(2, '0')}`;
        const att = (attendance || []).find(
          (a: any) => a.profile_id === employee.id && a.date === dateStr
        );
        if (att) {
          row[`Day ${day}`] = att.status === 'present' ? 'P' : att.status === 'half_day' ? 'H' : att.status === 'leave' ? 'L' : 'A';
          if (att.status === 'present') presentCount++;
          if (att.status === 'half_day') halfDayCount++;
          totalOT += att.ot_min || 0;
        } else {
          row[`Day ${day}`] = '-';
        }
      }

      row['Present'] = presentCount;
      row['Half Days'] = halfDayCount;
      row['OT Hours'] = (totalOT / 60).toFixed(1);

      musterRows.push(row);
    }

    // --- Build Salary Sheet ---
    const salaryRows = (salaryData || []).map((s: any) => ({
      'Name': s.full_name,
      'Daily Rate': s.daily_rate,
      'Present Days': s.present_days,
      'Half Days': s.half_days,
      'OT Hours': Number(s.ot_hours).toFixed(1),
      'Advances Taken': s.advances_taken,
      'Payable': Number(s.payable).toFixed(2),
    }));

    // --- Create Workbook ---
    const wb = XLSX.utils.book_new();

    const musterSheet = XLSX.utils.json_to_sheet(musterRows);
    XLSX.utils.book_append_sheet(wb, musterSheet, 'Muster');

    if (salaryRows.length > 0) {
      const salarySheet = XLSX.utils.json_to_sheet(salaryRows);
      XLSX.utils.book_append_sheet(wb, salarySheet, 'Salary');
    }

    // Write to buffer
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Upload to Storage
    const fileName = `muster-salary-${month}.xlsx`;
    const storagePath = `exports/${fileName}`;
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(storagePath, buf, {
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        upsert: true,
      });

    if (uploadError) throw uploadError;

    // Create signed URL (1 hour)
    const { data: signedData, error: signError } = await supabase.storage
      .from('documents')
      .createSignedUrl(storagePath, 3600);

    if (signError) throw signError;

    return new Response(
      JSON.stringify({
        success: true,
        downloadUrl: signedData.signedUrl,
        fileName,
        month,
        employeeCount: mergedProfiles.length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
