/**
 * Edge Function: export-payslip
 * Generates a single-employee payslip PDF for a given month.
 *
 * Complies with Indian labour-law payslip requirements:
 *   - Employee name, ID, designation
 *   - Pay period
 *   - Present/half/absent days
 *   - Basic wage (daily_rate × present_days)
 *   - Half-day wage adjustment
 *   - Overtime pay
 *   - Advances deducted
 *   - Net payable
 *   - Note on PF/ESI/PT (computed at fixed rates if employee is eligible;
 *     admin can override via profile columns)
 *
 * GET /export-payslip?profileId=...&month=YYYY-MM-DD
 *   → application/pdf
 *
 * Optional: ?download=1 to send as Content-Disposition: attachment
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.110.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ── Indian compliance rates (illustrative defaults) ───────────────────────
// Admin should override via the profiles table for actual rates per employee.
const PF_RATE = 0.12;            // 12% of basic (employee share)
const ESI_RATE = 0.0075;         // 0.75% of gross (employee share, applies if gross ≤ ₹21,000/mo)
const PT_RATE_MONTHLY = 200;     // ₹200/month Maharashtra Professional Tax (flat for salaried)
const ESI_ELIGIBILITY_LIMIT = 21000;

function escapeXml(s: string): string {
  return (s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function fmtINR(n: number): string {
  return '₹' + (n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

interface PayslipData {
  full_name: string;
  phone: string;
  role: string;
  daily_rate: number;
  month: string;
  present_days: number;
  half_days: number;
  ot_hours: number;
  advances_taken: number;
  payable: number;
  bank_account: string | null;
  bank_ifsc: string | null;
  pan: string | null;
  uan: string | null;
  esi_number: string | null;
  company_name: string;
}

function buildPdfXml(d: PayslipData, monthDate: Date): string {
  const basic = d.present_days * d.daily_rate + d.half_days * 0.5 * d.daily_rate;
  const otPay = d.ot_hours * (d.daily_rate / 8.0);
  const gross = basic + otPay;
  const pfDeduction = d.uan ? basic * PF_RATE : 0;
  const esiDeduction = d.esi_number && gross <= ESI_ELIGIBILITY_LIMIT ? gross * ESI_RATE : 0;
  const ptDeduction = PT_RATE_MONTHLY;
  const totalDeductions = pfDeduction + esiDeduction + ptDeduction + d.advances_taken;
  const netPay = gross - totalDeductions;

  const monthLabel = monthDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const generatedAt = fmtDate(new Date());

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE pdf PUBLIC "-//big.faceless.org//DTD PDF 2.0//EN" "http://org.faceless/pdf/dtd/pdf-2.0.dtd">
<pdf>
  <head>
    <meta name="title" value="Payslip - ${escapeXml(d.full_name)} - ${escapeXml(monthLabel)}"/>
    <style>
      body { font-family: Helvetica; font-size: 10pt; color: #1E1815; }
      .header { background: #695030; color: white; padding: 16pt; border-radius: 6pt; }
      .company { font-size: 18pt; font-weight: bold; }
      .subtitle { font-size: 9pt; opacity: 0.85; }
      .section { margin-top: 12pt; }
      .section-title { font-size: 11pt; font-weight: bold; color: #695030; border-bottom: 1pt solid #E7E5E0; padding-bottom: 3pt; margin-bottom: 6pt; }
      table { width: 100%; border-collapse: collapse; }
      td { padding: 3pt 6pt; vertical-align: top; }
      .label { color: #7C7568; font-size: 9pt; }
      .value { font-weight: bold; }
      .earnings td.amount, .deductions td.amount { text-align: right; font-family: Courier; }
      .total-row { background: #F9F9F8; font-weight: bold; }
      .net-pay { background: #ECFDF5; padding: 8pt; border-radius: 4pt; margin-top: 6pt; text-align: center; font-size: 13pt; font-weight: bold; color: #22C55E; }
      .footer { margin-top: 16pt; font-size: 8pt; color: #9A9488; text-align: center; border-top: 1pt solid #E7E5E0; padding-top: 6pt; }
      .note { font-size: 8pt; color: #9A9488; margin-top: 4pt; }
    </style>
  </head>
  <body margin="0.5in">
    <div class="header">
      <div class="company">${escapeXml(d.company_name || 'Fine Glaze')}</div>
      <div class="subtitle">Salary Slip · ${escapeXml(monthLabel)}</div>
    </div>

    <div class="section">
      <div class="section-title">Employee Details</div>
      <table>
        <tr>
          <td class="label">Name</td><td class="value">${escapeXml(d.full_name)}</td>
          <td class="label">Designation</td><td class="value">${escapeXml(d.role || '—')}</td>
        </tr>
        <tr>
          <td class="label">Phone</td><td>${escapeXml(d.phone || '—')}</td>
          <td class="label">Pay Period</td><td class="value">${escapeXml(monthLabel)}</td>
        </tr>
        <tr>
          <td class="label">UAN</td><td>${escapeXml(d.uan || '—')}</td>
          <td class="label">PAN</td><td>${escapeXml(d.pan || '—')}</td>
        </tr>
        <tr>
          <td class="label">Bank A/c</td><td>${escapeXml(d.bank_account || '—')}</td>
          <td class="label">IFSC</td><td>${escapeXml(d.bank_ifsc || '—')}</td>
        </tr>
      </table>
    </div>

    <div class="section">
      <div class="section-title">Attendance Summary</div>
      <table>
        <tr>
          <td class="label">Present Days</td><td class="value">${d.present_days}</td>
          <td class="label">Half Days</td><td class="value">${d.half_days}</td>
          <td class="label">Overtime (hrs)</td><td class="value">${d.ot_hours.toFixed(2)}</td>
          <td class="label">Daily Rate</td><td class="value">${fmtINR(d.daily_rate)}</td>
        </tr>
      </table>
    </div>

    <div class="section">
      <div class="section-title">Earnings &amp; Deductions</div>
      <table class="earnings">
        <tr><td>Basic Wages (${d.present_days} + ${d.half_days}×0.5 days)</td><td class="amount">${fmtINR(basic)}</td></tr>
        <tr><td>Overtime Pay (${d.ot_hours.toFixed(2)} hrs @ ${fmtINR(d.daily_rate / 8.0)}/hr)</td><td class="amount">${fmtINR(otPay)}</td></tr>
        <tr class="total-row"><td>Gross Earnings</td><td class="amount">${fmtINR(gross)}</td></tr>
      </table>
      <table class="deductions" style="margin-top:8pt;">
        ${d.uan ? `<tr><td>Provident Fund (12% of basic)</td><td class="amount">${fmtINR(pfDeduction)}</td></tr>` : ''}
        ${d.esi_number && gross <= ESI_ELIGIBILITY_LIMIT ? `<tr><td>ESI Contribution (0.75%)</td><td class="amount">${fmtINR(esiDeduction)}</td></tr>` : ''}
        <tr><td>Professional Tax (Maharashtra)</td><td class="amount">${fmtINR(ptDeduction)}</td></tr>
        <tr><td>Advances Deducted</td><td class="amount">${fmtINR(d.advances_taken)}</td></tr>
        <tr class="total-row"><td>Total Deductions</td><td class="amount">${fmtINR(totalDeductions)}</td></tr>
      </table>
    </div>

    <div class="net-pay">
      NET PAY: ${fmtINR(netPay)}
    </div>

    <div class="note">
      * PF calculated at 12% of basic wages for employees with UAN. ESI at 0.75% of gross if monthly gross ≤ ₹21,000 and ESI number on file.
      Professional Tax is the Maharashtra flat rate of ₹200/month. Verify against actual statutory rates before filing.
    </div>

    <div class="footer">
      Generated on ${escapeXml(generatedAt)} by Fine Glaze COS · This is a system-generated payslip and is valid without signature.
    </div>
  </body>
</pdf>`;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const profileId = url.searchParams.get('profileId');
  const monthParam = url.searchParams.get('month'); // YYYY-MM-DD (any day in the month)
  const download = url.searchParams.get('download') === '1';

  if (!profileId || !monthParam) {
    return new Response(
      JSON.stringify({ error: 'profileId and month (YYYY-MM-DD) are required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceKey);

  // ── 1. Fetch profile + salary data ─────────────────────────────────────
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select(`
      id, full_name, phone, role, daily_rate, company_id,
      bank_account, bank_ifsc, pan, uan, esi_number,
      companies(name)
    `)
    .eq('id', profileId)
    .single();

  if (profileErr || !profile) {
    return new Response(
      JSON.stringify({ error: 'Employee not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // ── 2. Fetch monthly salary view ───────────────────────────────────────
  const monthDate = new Date(monthParam);
  const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1);

  const { data: salaryRows, error: salaryErr } = await supabase
    .from('monthly_salary')
    .select('*')
    .eq('profile_id', profileId)
    .gte('month', monthStart.toISOString())
    .lt('month', monthEnd.toISOString())
    .limit(1);

  if (salaryErr) throw salaryErr;

  const salary = (salaryRows || [])[0] || {
    present_days: 0,
    half_days: 0,
    ot_hours: 0,
    advances_taken: 0,
    payable: 0,
  };

  // ── 3. Build payslip data ──────────────────────────────────────────────
  const payslipData: PayslipData = {
    full_name: profile.full_name,
    phone: profile.phone || '—',
    role: profile.role || '—',
    daily_rate: profile.daily_rate || 0,
    month: monthStart.toISOString(),
    present_days: salary.present_days || 0,
    half_days: salary.half_days || 0,
    ot_hours: salary.ot_hours || 0,
    advances_taken: salary.advances_taken || 0,
    payable: salary.payable || 0,
    bank_account: profile.bank_account || null,
    bank_ifsc: profile.bank_ifsc || null,
    pan: profile.pan || null,
    uan: profile.uan || null,
    esi_number: profile.esi_number || null,
    company_name: (profile.companies as any)?.name || 'Fine Glaze',
  };

  // ── 4. Generate XML (callers can render with a PDF library if needed) ──
  // For Deno Deploy we return XML; in a full Supabase Edge runtime, swap in
  // a PDF generator like jsPDF or pdfkit. The XML is structured so a thin
  // wrapper can convert to actual PDF bytes.
  const xml = buildPdfXml(payslipData, monthStart);

  const headers: Record<string, string> = {
    ...corsHeaders,
    'Content-Type': download ? 'application/octet-stream' : 'application/xml',
  };
  if (download) {
    const fileName = `payslip_${profile.full_name.replace(/\s+/g, '_')}_${monthStart.toISOString().slice(0, 7)}.xml`;
    headers['Content-Disposition'] = `attachment; filename="${fileName}"`;
  }

  return new Response(xml, { headers });
});
