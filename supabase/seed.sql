-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  Fine Glaze COS — Seed Data                                       ║
-- ║  Run AFTER schema.sql and rls.sql (as service_role).               ║
-- ║  Creates: 1 company, 1 admin, 1 supervisor, 2 workers, 1 client,  ║
-- ║  1 demo project (Embassy Tower, Mumbai) with tasks/DPRs/payments.  ║
-- ╚══════════════════════════════════════════════════════════════════════╝

-- NOTE: Auth users must be created via Supabase Auth API (Edge Function or dashboard).
-- This seed assumes those auth users exist with these UUIDs.
-- In development, create them via supabase.auth.admin.createUser().

-- ── COMPANY ──────────────────────────────────────────────────────────
INSERT INTO companies (id, name, city, settings) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Fine Glaze', 'Pune', '{"geofence_default_m": 100}');

-- ── ROLE PERMISSIONS (defaults from PRD §1) ──────────────────────────
INSERT INTO role_permissions (company_id, role, permissions) VALUES
  ('00000000-0000-0000-0000-000000000001', 'owner',           '{"all": true}'),
  ('00000000-0000-0000-0000-000000000001', 'project_manager', '{"projects": true, "tasks": true, "dpr_approvals": true, "materials": true, "clients": true, "salary_edit": false, "bank_edit": false}'),
  ('00000000-0000-0000-0000-000000000001', 'hr',              '{"employees": true, "attendance": true, "leave_approvals": true, "advance_approvals": true, "muster_export": true, "payments": false}'),
  ('00000000-0000-0000-0000-000000000001', 'accounts',        '{"salary": true, "advances": true, "payments": true, "excel_export": true, "project_edit": false}'),
  ('00000000-0000-0000-0000-000000000001', 'supervisor',      '{"team_attendance": true, "dpr_submit": true, "tasks": true, "material_requests": true}'),
  ('00000000-0000-0000-0000-000000000001', 'worker',          '{"punch": true, "tasks_own": true, "dpr_upload": true, "safety_check": true, "leave_request": true, "advance_request": true, "salary_own": true}'),
  ('00000000-0000-0000-0000-000000000001', 'client',          '{"progress_view": true, "photo_timeline": true, "documents_view": true, "payments_view": true, "approvals": true, "chat": true}');

-- ── CLIENT ORG ───────────────────────────────────────────────────────
INSERT INTO client_orgs (id, company_id, name, contact_name, contact_phone) VALUES
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'Embassy Group', 'Vikram Mehta', '9876500000');

-- ── PROJECT ──────────────────────────────────────────────────────────
INSERT INTO projects (id, company_id, name, type, city, address, lat, lng, geofence_radius_m, client_org_id, status, progress_pct, stage, start_date, expected_end_date) VALUES
  ('00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000001', 'Embassy Tower',
   'Curtain Wall', 'Mumbai', 'BKC, Mumbai', 19.0760, 72.8777, 100,
   '00000000-0000-0000-0000-000000000010', 'on_track', 45, 'installation',
   '2026-01-15', '2026-12-31');

-- ── PAYMENTS (milestones) ────────────────────────────────────────────
INSERT INTO payments (project_id, milestone_name, amount, status, due_date) VALUES
  ('00000000-0000-0000-0000-000000000020', 'Mobilization', 500000, 'paid', '2026-01-30'),
  ('00000000-0000-0000-0000-000000000020', 'Fabrication Complete', 1500000, 'paid', '2026-04-15'),
  ('00000000-0000-0000-0000-000000000020', 'Installation 50%', 2000000, 'pending', '2026-08-01'),
  ('00000000-0000-0000-0000-000000000020', 'Installation Complete', 2000000, 'pending', '2026-10-15'),
  ('00000000-0000-0000-0000-000000000020', 'Final Handover', 1000000, 'pending', '2026-12-31');

-- ── MATERIALS ────────────────────────────────────────────────────────
INSERT INTO materials (project_id, name, spec, unit, stock_qty) VALUES
  ('00000000-0000-0000-0000-000000000020', 'ACP Panel', '4mm PVDF Silver', 'sqft', 1200),
  ('00000000-0000-0000-0000-000000000020', 'Glass Panel', '12mm Toughened Clear', 'sqft', 800),
  ('00000000-0000-0000-0000-000000000020', 'Aluminium Frame', '100x50 Section', 'rft', 2400),
  ('00000000-0000-0000-0000-000000000020', 'Structural Silicone', 'Dow 791', 'tube', 450),
  ('00000000-0000-0000-0000-000000000020', 'Spider Fitting', '4-arm SS304', 'nos', 120);

-- ── PROJECT TEMPLATES ────────────────────────────────────────────────
INSERT INTO project_templates (company_id, name, payload) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Commercial Building', '{
    "tasks": ["Site Survey", "Fabrication", "Frame Installation", "Glass Installation", "Silicone Sealing", "Cleaning", "Handover"],
    "recurring_tasks": ["Daily Safety Check", "Site Cleanup"],
    "document_categories": ["Drawings", "BOQ", "Work Orders", "Safety", "Invoices"],
    "materials": ["ACP Panel", "Glass Panel", "Aluminium Frame", "Structural Silicone", "Hardware"],
    "milestones": ["Mobilization", "Fabrication Complete", "Installation 50%", "Installation Complete", "Final Handover"],
    "safety_items": ["Helmet", "Safety Shoes", "Reflective Vest", "Harness", "Gloves", "Eye Protection"]
  }'),
  ('00000000-0000-0000-0000-000000000001', 'Residential Facade', '{
    "tasks": ["Site Measurement", "Shop Drawing", "Fabrication", "Installation", "Sealing", "Cleaning"],
    "recurring_tasks": ["Daily Safety Check"],
    "document_categories": ["Drawings", "BOQ", "Warranty", "Invoices"],
    "materials": ["Glass Panel", "Aluminium Frame", "Silicone", "Hardware", "Spacer"],
    "milestones": ["Advance", "Material Procurement", "Installation", "Completion"],
    "safety_items": ["Helmet", "Safety Shoes", "Harness"]
  }');

-- ═══════════════════════════════════════════════════════════════════════
-- NOTE: Profile inserts require auth user UUIDs from Supabase Auth first.
-- See supabase/create_auth_users.sql for a script that creates the 5 test
-- accounts below directly (bypasses email-send rate limits — dev/demo only)
-- along with their matching profile rows. Do not run this file's profile
-- inserts on their own; they're just documentation of what was seeded on
-- the live project (2026-07-11) via that script.
--
-- Test login accounts seeded on 2026-07-11 (password shared separately, not in git):
--   Owner (Rohan):      9876543210
--   Supervisor (Amit):  9876543211
--   Worker (Rahul):     9876543212
--   Worker (Suresh):    9876543213
--   Client (Vikram):    9876500000
-- ═══════════════════════════════════════════════════════════════════════

-- Demo tasks assigned to the two test workers (Rahul, Suresh) on Embassy Tower
-- INSERT INTO tasks (project_id, assigned_to, title, level_zone, priority, status, created_by) VALUES
--   ('00000000-0000-0000-0000-000000000020', '<rahul_profile_id>', 'Glass Panel Installation', 'Level 4 - Zone B', 'high', 'pending', '<owner_profile_id>'),
--   ('00000000-0000-0000-0000-000000000020', '<rahul_profile_id>', 'Frame Alignment Check', 'Level 4 - Zone A', 'medium', 'pending', '<owner_profile_id>'),
--   ('00000000-0000-0000-0000-000000000020', '<suresh_profile_id>', 'Site Cleanup', 'Level 3', 'low', 'pending', '<owner_profile_id>');
