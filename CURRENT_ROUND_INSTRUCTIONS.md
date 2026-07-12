# Fine Glaze COS — Current Focused Coding Round

## Owner instruction
Complete only the checklist below, follow PRD v2.7 and the supplied UI references/design system, verify locally, and push code. Do not trigger an EAS/Android build until Rohan explicitly says to build.

## Base and branch
- Latest base pulled from `origin/main`: `6e5f5f4`
- Working branch/worktree: `feat/focused-operations-round`
- Main PRD: `/work/temp/fine_glaze_prd/FINE_GLAZE_APP_PRD.md`
- Repository handover: `HANDOVER_REPORT.md`

## Verify these already-reported items against latest main
- Admin dashboard revamp: two major management cards, notification badge/action, tool icons
- Profile button navigation/fix
- Project workspace upload buttons for documents and photos
- Client info displayed in project overview
- Admin DPR creation with photo upload
- Client portal construction stage tracker and approvals
- Client More menu redesign

## Implement/finish this round
- Client can initiate the project chat, including creating/joining the allowed project conversation when one does not exist
- Supervisor can request an employee from Admin
- Emergency contacts shown on the relevant dashboard
- Safety checklist integrated into the punch-in flow before final confirmation
- Delivery challan photos/files visible to supervisor
- DPR UI polished to match owner references (step flow, cards, status, uploads/review presentation)
- Materials quantity field fixed with valid positive decimal quantity and unit support/display

## Locked constraints
- No scope creep; ask Rohan before adding anything outside this list/PRD
- Design: `#F9F9F8` cream, `#695030` bronze, Poppins, 8pt grid, 48dp targets; match reference images
- Chat remains text + attachments only; no voice notes, pins, or group-chat expansion
- Keep role/RLS restrictions intact
- Do not expose credentials or tokens
- Do not run an EAS build

## Required verification before reporting done
1. `rm -rf node_modules`
2. `npm ci --include=dev`
3. `npx tsc --noEmit`
4. `npx expo export --platform web`
5. Review git diff and confirm no unrelated changes
6. Commit and push the feature branch; provide the owner the PR link or merge status

## Owner communication
Rohan is budget/credit sensitive. Give concise, honest progress. If credits are close to exhaustion, stop before losing context and post a detailed handover with exact completed/remaining work. Do not claim device testing without a new APK; no APK is authorized in this round.
