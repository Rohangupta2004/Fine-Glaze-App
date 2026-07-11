# Fine Glaze COS — Coding Handover Report

**Prepared:** 11 July 2026  
**Overall PRD completion:** approximately **70%**  
**UI/screens:** approximately **85%**  
**Repository:** `github.com/Rohangupta2004/Fine-Glaze-App`  
**Current branch:** `main`  
**Current commit:** `9fd1ba8` — selfie and DPR media Storage sync  
**App ID:** `com.fineglaze.cos`

> This report is the source of truth for switching coder/model without losing context. The PRD is a single complete delivery; there is no v2/v3 scope.

---

## 1. Locked Product Decisions

- No OTP or SMS. Login is phone number + password; Admin creates accounts.
- Phone login maps to `<digits>@fineglazeapp.com`. Do not change to `.app`; Supabase Auth rejected that fake TLD during testing.
- Punch-in verification is selfie + GPS geofence only. No AI face matching.
- English, Hindi, and Marathi must all ship.
- Salary must exist in-app and as Excel muster/salary export.
- Client portal must work on iPhone through Expo Web/PWA.
- UI source of truth is Rohan's reference image batches and design sheet.
- Design tokens: cream `#F9F9F8`, bronze `#695030`, ink `#1E1815`, Poppins, 8pt grid, minimum 48dp touch targets.
- Minimize EAS Android builds. Only build after a large, locally verified batch.
- Everything in PRD v2.7 is in the one final delivery, including Play Store launch.

---

## 2. Infrastructure and Access

### GitHub
- Repository: `github.com/Rohangupta2004/Fine-Glaze-App`
- Latest verified code is merged and pushed to `main` at `9fd1ba8`.

### Supabase
- Live project ref: `vxpkihnovotlwdbnuirt`
- Region: `ap-southeast-1`
- Full schema, RLS, seed data, security hardening, Storage migration, and account creation function are deployed.
- Deployed Edge Function: `create-user`
- Storage buckets deployed:
  - `attendance-selfies`
  - `dpr-media`
  - `documents`
  - `chat-attachments`

### Expo / EAS
- Account/project: `fine-glaze/fine-glaze-app`
- EAS project ID: `a37451d5-e433-4d64-b5bf-930111846d0b`
- Preview = APK; production = AAB.
- Required public environment variables are already registered in EAS preview and production.
- Do not put secrets or access tokens in GitHub or this report.

### Sentry
- Sentry React Native integration is wired.
- Sourcemap auto-upload is disabled until a Sentry auth token is configured.

---

## 3. Test Accounts

Password for all test users: `FineGlaze@2026`

| Role | Phone |
|---|---|
| Owner/Admin | `9876543210` |
| Supervisor | `9876543211` |
| Worker | `9876543212` |
| Worker | `9876543213` |
| Client | `9876500000` |

---

## 4. Last Android Build

**Build 8 APK:**  
`https://expo.dev/artifacts/eas/w9cDS917jXwq02-NKqedaM1tO6ulQCn12FO3FxDWKpA.apk`

- Build 8 completed successfully and was confirmed installable.
- Build 8 is based on commit `ad5b3a4`.
- The newest code on `main` (`9fd1ba8`) is **newer than this APK** and has not been built yet, to conserve Expo build quota.
- Before the next EAS build, always run:
  1. `rm -rf node_modules`
  2. `npm ci --include=dev`
  3. `npx tsc --noEmit`
  4. `npx expo export --platform web`
- Only trigger a new Android build after a major batch passes all four checks.

---

## 5. Completed Work

### Foundation
- Expo SDK 57, React Native, TypeScript, Expo Router.
- Role route groups: Auth, Worker, Supervisor, Admin, Client.
- Supabase Auth/Postgres/Storage/Realtime foundation.
- Zustand, TanStack Query, Sentry, SecureStore, SQLite, camera, location, notifications packages.
- Poppins typography and complete Fine Glaze design token files.
- Reusable Button, Input, Card, Avatar, StatusChip, PIN pad, Search Bar, Segmented Control, Banner, Progress Bar, and Sync Status Badge.
- English, Hindi, Marathi translation files exist.
- Expo Web static export dependencies and WASM Metro configuration are installed.

### Auth
- Welcome and phone/password login.
- Phone-to-email mapping.
- Six-digit PIN creation and PIN unlock.
- Biometric enable/unlock.
- Forgot PIN password re-auth flow fixed.
- Permissions flow for camera, location, media, notifications.
- Native Supabase session stored with SecureStore rather than AsyncStorage.
- Role-based dashboard routing.

### Database and Security
- Full relational schema with company scoping, projects, profiles, assignments, attendance, tasks, DPR, materials, documents, expenses, payments, client approvals, chat, notifications, safety, salary view, templates, recurring tasks, and audit log.
- RLS enabled and initial policies deployed.
- Security migration deployed:
  - Client project isolation by `client_org_id`.
  - Approved-DPR client isolation.
  - Client approval decision immutability.
  - Status audit triggers.
  - DPR submission ID generation.
  - Additional write policies.
- Existing client test profile linked to Embassy Group.
- Admin employee creation moved from unsafe client-side signup to the deployed `create-user` Edge Function.
- Storage/offline migration deployed with bucket policies, DPR offline IDs, and media uniqueness indexes.

### Worker Experience
- Home with site, tasks, punch action, and safety shortcut.
- Punch-in camera selfie + live GPS geofence using project coordinates/radius.
- Punch-out with calculated work duration.
- SQLite local-first outbox with FIFO sync, retry/backoff, foreground flush, pending count, and retry screen.
- Attendance selfie uploads through Storage during outbox sync.
- My Tasks.
- Three-step DPR wizard with report info, photo/video selection, preview, and offline queue.
- DPR photos/videos upload through Storage, followed by `dpr_media` rows.
- Attendance calendar.
- My Site.
- Documents list.
- Leave request and leave history.
- Daily PPE safety checklist.
- Messages screen.
- Profile with own details, salary summary, bank data, settings links, and logout.
- Offline Sync screen with pending item list and retry.

### Supervisor Experience
- Dashboard.
- Project-scoped team attendance with daily navigation and live status.
- Project task list, task creation/assignment, priority, done/pending/blocked actions.
- Materials with Site Stock, Requests, and Deliveries tabs.
- Material request form.
- DPR list and submission form.
- Working navigation from More.

### Project Workspace
All 13 PRD sections now exist:
1. Overview
2. Tasks
3. Employees
4. Attendance
5. DPR
6. Photos
7. Documents
8. Materials
9. Expenses
10. Payments
11. Communication
12. Timeline
13. Reports

Data-backed interactions include task create/update, attendance date navigation, expense entry, payment status update, DPR list, material requests, documents, conversation links, generated timeline, and report summary cards.

### Admin Experience
- Dashboard with live stats and previews.
- Projects list and project workspace.
- Employee directory, filters, profiles, attendance/tasks/salary tabs.
- Add Employee wizard calling secure backend function.
- Approvals Inbox for DPR, leave, material, and advance.
- Notifications center with read/unread actions.
- Quick Actions hub.
- Conversations list.
- Management/finance/settings More menu.

### Client Experience
- Dashboard with project progress and payment summary.
- Approved DPR photo/video timeline using real DPR/media rows.
- Documents vault.
- Payment milestones and summary.
- Client approvals list/detail with Approve/Reject and immutable decided state.
- Realtime project text chat.
- Five-tab structure retained; approvals and chat are hidden routes reached from More.

### Verification Already Passed
- `npm ci --include=dev` passed from a clean install.
- `npx tsc --noEmit` passed after the latest media work.
- `npx expo export --platform web` passed before the latest media-only change; rerun before deployment.
- Build 8 completed successfully on EAS and was confirmed working before the latest large code batch.

---

## 6. Remaining Work — Must Complete Before Release

### Priority A — Core operational gaps
- Add real network listener rather than only AppState/interval outbox retry.
- Compress photos to max 1280px/~200KB before upload; enforce video count/duration limits.
- Complete document upload/download/versioning, typed file previews, thumbnails, and 25MB validation.
- Add attachments to worker/client/admin chat.
- Add multi-photo delivery capture and upload.
- Add leave/material reference attachment uploads.
- Tighten Storage privacy: DPR media currently uses public delivery for the timeline; final PRD requires signed URLs. Documents/chat read policies also need stricter membership/role scoping.
- Run airplane-mode end-to-end tests for punch-in and DPR, including media recovery.

### Priority B — Notifications and session controls
- Register and store Expo push tokens.
- Build notification Edge Function and database triggers for every PRD notification event.
- Add evening site reminder cron and recurring-task materialization cron.
- Add notification mute/preferences UI.
- Add 30-minute background PIN/biometric lock and seven-day full password re-auth.
- Complete language picker/settings UI and verify every screen in Hindi and Marathi.

### Priority C — Admin modules still missing or partial
- Dedicated Admin/Supervisor calendar combining tasks, visits, deliveries, and DPR events.
- Attendance report by employee/site/date range.
- Muster & Salary Excel export.
- DPR detail, Request Changes with required note, weather, workers-on-site count, lifecycle timeline, client acknowledgement.
- DPR Register and photo report Excel export.
- Dedicated all-sites overview.
- Global search across employees, projects, materials, documents, tasks, clients.
- Five real analytics charts.
- Project QR generation, printing, scanning, and deep-link handling.
- Audit Log viewer with filters.
- Full document version history upload/current revision UX.
- Recurring tasks UI and cron.
- New Project from Template wizard and Save as Template.
- Backup & Restore ZIP export/import.
- Roles and Permissions editor.
- Add Employee wizard needs final reference-image polish, including document step/site assignment/temp-password presentation.
- Assign Site and Assign Workers screens.

### Priority D — Visual polish against owner references
- Dark branded auth/PIN/biometric/permissions screens where shown in reference images.
- Site photography in worker/admin/client cards.
- Proper circular progress arc component instead of simple border circles.
- Improve bottom navigation raised center action.
- Match reference counts, chips, dropdowns, date pickers, empty/loading/error states, and action placement.
- Finish project photo gallery instead of summary-only behavior.
- Complete skeleton loaders, long-list virtualization, accessibility, and performance pass.

### Priority E — PWA and release
- Final Expo Web regression test after all changes.
- Deploy PWA to Vercel/custom subdomain and test iPhone Safari install/login/chat/documents.
- Generate accurate Privacy Policy and Terms from finished data flows.
- Publish legal pages on fineglaze.com.
- Prepare Play Store description, screenshots, icon assets, feature graphic, and Data Safety answers.
- Build production AAB.
- Upload to Play Console closed testing, resolve review warnings, then production release.

---

## 7. Known Risks / Important Notes

1. **Latest code is not in an APK yet.** Build 8 is older than `main`. Do not claim newest flows are device-tested until the next batched APK is installed and smoke-tested.
2. **Do not spend EAS quota casually.** Run clean install, TypeScript, and web export first.
3. **Storage policy hardening remains.** Current media flow works, but final privacy rules need signed access and tighter document/chat membership checks.
4. **Client JWT/RLS verification is not fully completed.** A SQL verification script exists, but run real authenticated client and worker tests before release.
5. **Realtime needs live replication verification** for the `messages` table.
6. **Outbox media uses local file URIs.** Verify those files persist long enough across app restarts; copy media to permanent app storage if testing shows picker/camera temp files expire.
7. **DPR duplicate prevention** uses `offline_id`; attendance uses unique `(profile_id,date)` upsert.
8. **Push notifications are not operational yet.** The package and permissions exist, but server delivery is not built.
9. **Do not restore OTP or paid APIs.** They violate locked scope and budget decisions.
10. **Do not change the design system.** Match the supplied reference images.

---

## 8. Recommended Next Coding Order

1. Secure media access + compression + persistent local media copies.
2. Finish documents and attachment workflows.
3. Push notification registration/function/triggers/cron.
4. DPR review lifecycle and exports.
5. Muster/salary Excel export and attendance report.
6. Admin calendar, global search, analytics, audit viewer.
7. QR, recurring tasks, templates, backup/restore, permissions editor.
8. Full image-by-image UI polish.
9. Real role/RLS/offline/realtime smoke test matrix.
10. One batched preview APK and phone testing.
11. PWA deployment and iPhone test.
12. Legal pages, Play assets, production AAB, closed testing, release.

---

## 9. Next Coder Starter Prompt

> Continue the Fine Glaze COS app from GitHub `Rohangupta2004/Fine-Glaze-App`, branch `main`, commit `9fd1ba8`. Read PRD v2.7 and the owner reference images before changing UI. This is one complete delivery with no v2/v3 and no scope additions. Preserve Expo SDK 57 + React Native + TypeScript + Expo Router + Supabase + Zustand + TanStack Query + SQLite + Sentry. No OTP/SMS, no AI face recognition, and minimize EAS builds. First inspect `HANDOVER_REPORT.md`, rerun `npm ci --include=dev`, `npx tsc --noEmit`, and `npx expo export --platform web`. Continue in the Recommended Next Coding Order, starting with secure/compressed persistent media and document/attachment workflows. Never expose service-role keys or Expo tokens. Ask Rohan before deviating from the PRD.

---

## 10. Completion Definition

Do not call the app complete until:
- All PRD screens and actions work with real data.
- Client/worker RLS tests pass with real authenticated sessions.
- Offline punch-in and DPR pass airplane-mode/restart/reconnect tests.
- Push notifications work for the full event matrix.
- Hindi and Marathi switching is verified.
- Excel files open correctly on phone Excel/Sheets.
- Latest APK passes all-role smoke tests without Sentry happy-path crashes.
- PWA works on iPhone Safari.
- Privacy/Data Safety declarations match actual code.
- Production AAB is accepted by Play Console.
