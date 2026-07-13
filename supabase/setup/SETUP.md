# 📱 Fine Glaze COS — Phone Setup Guide

This guide shows you **exactly** how to deploy all the new backend pieces from your phone's browser in ~10 minutes. **No PC, no credentials shared.**

---

## ✅ Pre-flight Checklist

You'll need:

- [ ] Supabase Dashboard open on phone browser: https://supabase.com/dashboard
- [ ] Your project: `vxpkihnovotlwdbnuirt`
- [ ] This repo open in another tab (to copy-paste code blocks)

---

## 🚀 Step 1 — Run the One-Shot SQL (2 minutes)

1. Open Supabase Dashboard → tap **SQL Editor** (left menu)
2. Tap **+ New query**
3. Open this file from the repo: `supabase/setup/01_one_shot_sql.sql`
4. Tap "Copy" → paste into the SQL editor
5. Tap **Run** (bottom right)

You should see "Success. No rows returned." If you see errors, screenshot them and share with me.

**What this does:**
- ✅ Adds bank/PAN/UAN/ESI columns to profiles (for payslips)
- ✅ Wires DB triggers to actually fire push notifications
- ✅ Adds 6 new notification triggers (payment/task/document/approvals/employee request)
- ✅ Makes dpr-media bucket private
- ✅ Tightens documents/chat-attachments read access
- ✅ Enables `pg_net` + `pg_cron` extensions

---

## 🔑 Step 2 — Get your service_role key (1 minute)

1. In Supabase Dashboard, tap **Project Settings** (bottom of left menu)
2. Tap **API**
3. Find **`service_role` secret** — tap the eye icon to reveal it
4. **Long-press → Copy** (don't share it with anyone, including me)

You'll paste this key into the next step. **Don't paste it back to me in chat.**

---

## ⚙️ Step 3 — Activate the trigger dispatch (1 minute)

1. Go back to **SQL Editor → New query**
2. Paste this, replacing `YOUR-SERVICE-ROLE-KEY` with the actual key you copied:

```sql
ALTER DATABASE postgres SET app.edge_function_url = 'https://vxpkihnovotlwdbnuirt.functions.supabase.co/send-notification';
ALTER DATABASE postgres SET app.service_role_key = 'YOUR-SERVICE-ROLE-KEY';
```

3. Tap **Run**

**What this does:** Tells PostgreSQL where to send notification dispatch HTTP calls and what auth token to use.

---

## ⏰ Step 4 — Schedule the 2 daily crons (2 minutes)

1. **SQL Editor → New query**
2. Paste this, again replacing `YOUR-SERVICE-ROLE-KEY`:

```sql
SELECT cron.schedule(
  'evening-site-reminder',
  '0 13 * * *',
  $$SELECT net.http_post(
    url := 'https://vxpkihnovotlwdbnuirt.functions.supabase.co/evening-site-reminder',
    headers := jsonb_build_object(
      'Authorization', 'Bearer YOUR-SERVICE-ROLE-KEY',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  )$$
);

SELECT cron.schedule(
  'materialize-recurring-tasks',
  '0 0 * * *',
  $$SELECT net.http_post(
    url := 'https://vxpkihnovotlwdbnuirt.functions.supabase.co/materialize-recurring-tasks',
    headers := jsonb_build_object(
      'Authorization', 'Bearer YOUR-SERVICE-ROLE-KEY',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  )$$
);
```

3. Tap **Run**

**What this does:**
- 6:30 PM IST daily → send "tomorrow's site" reminder to all assigned workers
- 5:30 AM IST daily → turn recurring tasks into today's actual tasks

---

## 📦 Step 5 — Deploy the 4 new Edge Functions (4 minutes)

For each function below:
1. Supabase Dashboard → tap **Edge Functions** (left menu)
2. Tap **+ New function**
3. Type the function **name** (must match exactly — see below)
4. Delete the default code in the editor
5. Open the matching file from this repo, **copy all contents**, paste into editor
6. Tap **Deploy**

Deploy these 4 functions:

### Function 1: `send-notification`
- File: `supabase/functions/send-notification/index.ts`
- **Status:** Already exists, but verify it matches the latest version

### Function 2: `evening-site-reminder`
- File: `supabase/functions/evening-site-reminder/index.ts`
- **Purpose:** Daily 6:30 PM IST reminder to assigned workers

### Function 3: `materialize-recurring-tasks`
- File: `supabase/functions/materialize-recurring-tasks/index.ts`
- **Purpose:** Daily 5:30 AM IST creates task rows from recurring schedules

### Function 4: `export-payslip`
- File: `supabase/functions/export-payslip/index.ts`
- **Purpose:** Generate Indian-compliant payslip PDF (PF/ESI/PT)

### Function 5 (optional, for WhatsApp): `send-whatsapp`
- File: `supabase/functions/send-whatsapp/index.ts`
- **Purpose:** Send WhatsApp messages to workers (salary/leave/payment alerts)

---

## 🔐 Step 6 — Set Edge Function secrets (optional, only for WhatsApp)

**Skip this if you're not using WhatsApp yet.** Come back to it later.

To enable WhatsApp:
1. Get a Meta Business WhatsApp account → https://business.whatsapp.com/
2. Get the Cloud API token + Phone Number ID
3. Supabase Dashboard → **Edge Functions → Secrets**
4. Add two secrets:
   - `WHATSAPP_TOKEN` = your Meta Cloud API token
   - `WHATSAPP_PHONE_NUMBER_ID` = your WhatsApp Business phone number ID
5. Pre-approve these WhatsApp templates in Meta Business Manager:
   - `salary_credited`
   - `leave_approved`
   - `leave_rejected`
   - `payment_milestone`
   - `site_reminder`
   - `task_assigned`

---

## ✅ Step 7 — Verify it all works (1 minute)

In Supabase Dashboard → **SQL Editor → New query**, paste and run:

```sql
-- Check profiles columns exist
SELECT full_name, bank_account, pan, uan FROM profiles LIMIT 3;

-- Check all notification triggers
SELECT tgname FROM pg_trigger
WHERE tgname LIKE 'trg_%_notify' OR tgname = 'trg_dispatch_notification';

-- Check dpr-media bucket is now private
SELECT id, public FROM storage.buckets WHERE id = 'dpr-media';

-- Check crons are scheduled
SELECT jobname, schedule FROM cron.job;
```

Expected:
- 3 workers with empty `bank_account`/`pan`/`uan` (you'll fill them in admin UI)
- 8+ triggers listed (including `trg_dispatch_notification`)
- `dpr-media` row with `public = false`
- 2 cron jobs listed

---

## 📋 Step 8 — Fill employee compliance data (ongoing)

For each worker, open the Admin app → Employees → tap a worker → fill in:
- Bank account number
- IFSC code
- PAN
- UAN (EPFO)
- ESI number (if eligible — gross ≤ ₹21,000/month)

These power the payslip PDF generator. Without them, payslips will show "—" for those fields.

---

## 🎯 You're Done! What You Just Unlocked

| Feature | What it does |
|---------|--------------|
| ✅ Auto push notifications | Every DPR/leave/payment/task/approval event now actually pushes to recipients' phones |
| ✅ Daily evening site reminder | Workers get a 6:30 PM push with tomorrow's site location |
| ✅ Recurring task automation | Daily safety checks auto-create without admin babysitting |
| ✅ Indian-compliant payslips | Generate PF/ESI/PT payslips per employee per month |
| ✅ WhatsApp bridge | (Optional) Send critical alerts via WhatsApp, not just push |
| ✅ Storage security | DPR media now requires signed URLs — no more public bucket leaks |
| ✅ Tighter document/chat access | Members-only read access enforced |

---

## 🆘 Troubleshooting

**Error: "extension pg_net is not available"**
→ Supabase Free tier doesn't include pg_net. Either upgrade to Pro, or use the `pg_cron + external webhook` pattern instead.

**Error: "extension pg_cron is not available"**
→ Same as above. Run `SELECT * FROM pg_extension;` to check what's installed.

**Push notifications not arriving on phone**
→ Workers need to: (1) open the app once after this update, (2) grant notification permission, (3) have the app's push token saved to `profiles.push_token`. The token registration code is in `src/hooks/usePushNotifications.ts` — verify it runs on app open.

**Cron not firing**
→ Verify with: `SELECT jobname, last_run_status, next_run FROM cron.job;`

**Edge Function returns 500**
→ In Edge Functions list, tap the function name → **Logs** → check the latest error. Share the error message with me.

---

## 📞 Need Help?

If anything fails, **don't share credentials or connection strings**. Instead share:
- The error message text
- A screenshot of the failing step
- Which step number from above you're stuck on

I can debug from error messages alone. 🔐
