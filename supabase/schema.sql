-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  Fine Glaze COS — Supabase Schema (from PRD §5)                    ║
-- ║  Run this against a fresh Supabase project.                        ║
-- ║  Enables pgcrypto, pg_trgm for search, and creates all tables.     ║
-- ╚══════════════════════════════════════════════════════════════════════╝

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ── COMPANIES ────────────────────────────────────────────────────────
CREATE TABLE companies (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  logo_url    TEXT,
  city        TEXT,
  settings    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ── ROLE PERMISSIONS ─────────────────────────────────────────────────
CREATE TABLE role_permissions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  role        TEXT NOT NULL,
  permissions JSONB DEFAULT '{}',
  UNIQUE (company_id, role)
);

-- ── PROFILES ─────────────────────────────────────────────────────────
CREATE TABLE profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id    UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  full_name     TEXT NOT NULL,
  phone         TEXT NOT NULL UNIQUE,
  role          TEXT NOT NULL CHECK (role IN ('owner','project_manager','hr','accounts','supervisor','worker','client')),
  worker_id     TEXT,
  avatar_url    TEXT,
  status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','on_leave','on_hold','inactive')),
  joining_date  DATE,
  address       TEXT,
  reporting_to  UUID REFERENCES profiles(id),
  daily_rate    NUMERIC(10,2),
  bank_details  JSONB,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_profiles_company ON profiles(company_id);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_phone ON profiles(phone);
-- Trigram index for global search
CREATE INDEX idx_profiles_name_trgm ON profiles USING gin (full_name gin_trgm_ops);

-- ── CLIENT ORGS ──────────────────────────────────────────────────────
CREATE TABLE client_orgs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  contact_name  TEXT,
  contact_phone TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ── PROJECTS ─────────────────────────────────────────────────────────
CREATE TABLE projects (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  type              TEXT,
  city              TEXT,
  address           TEXT,
  lat               DOUBLE PRECISION,
  lng               DOUBLE PRECISION,
  geofence_radius_m INTEGER DEFAULT 100,
  client_org_id     UUID REFERENCES client_orgs(id),
  status            TEXT NOT NULL DEFAULT 'on_track' CHECK (status IN ('on_track','at_risk','delayed','completed')),
  progress_pct      INTEGER DEFAULT 0 CHECK (progress_pct BETWEEN 0 AND 100),
  stage             TEXT CHECK (stage IN ('fabrication','installation','finishing')),
  start_date        DATE,
  expected_end_date DATE,
  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_projects_company ON projects(company_id);
CREATE INDEX idx_projects_name_trgm ON projects USING gin (name gin_trgm_ops);

-- ── ASSIGNMENTS ──────────────────────────────────────────────────────
CREATE TABLE assignments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  profile_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role_on_site TEXT,
  level_zone   TEXT,
  shift_start  TIME,
  shift_end    TIME,
  active       BOOLEAN DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE (project_id, profile_id)
);

CREATE INDEX idx_assignments_profile ON assignments(profile_id);

-- ── ATTENDANCE ───────────────────────────────────────────────────────
CREATE TABLE attendance (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  project_id         UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  date               DATE NOT NULL,
  check_in_at        TIMESTAMPTZ,
  check_in_lat       DOUBLE PRECISION,
  check_in_lng       DOUBLE PRECISION,
  check_in_selfie_url TEXT,
  location_verified  BOOLEAN DEFAULT false,
  check_out_at       TIMESTAMPTZ,
  work_duration_min  INTEGER,
  ot_min             INTEGER DEFAULT 0,
  status             TEXT NOT NULL DEFAULT 'present' CHECK (status IN ('present','absent','leave','half_day')),
  synced             BOOLEAN DEFAULT false,
  created_at         TIMESTAMPTZ DEFAULT now(),
  UNIQUE (profile_id, date)
);

CREATE INDEX idx_attendance_project_date ON attendance(project_id, date);

-- ── TASKS ────────────────────────────────────────────────────────────
CREATE TABLE recurring_tasks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  level_zone  TEXT,
  priority    TEXT DEFAULT 'medium' CHECK (priority IN ('high','medium','low')),
  assigned_to UUID REFERENCES profiles(id),
  frequency   TEXT NOT NULL, -- 'daily' or 'weekly:mon,wed,fri'
  active      BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE tasks (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  assigned_to       UUID REFERENCES profiles(id),
  title             TEXT NOT NULL,
  level_zone        TEXT,
  priority          TEXT DEFAULT 'medium' CHECK (priority IN ('high','medium','low')),
  window_start      TIMESTAMPTZ,
  window_end        TIMESTAMPTZ,
  status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','done','blocked')),
  created_by        UUID NOT NULL REFERENCES profiles(id),
  recurring_task_id UUID REFERENCES recurring_tasks(id),
  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_tasks_assigned ON tasks(assigned_to);
CREATE INDEX idx_tasks_title_trgm ON tasks USING gin (title gin_trgm_ops);

-- ── DPR (Daily Progress Reports) ─────────────────────────────────────
CREATE TABLE dprs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  submitted_by  UUID NOT NULL REFERENCES profiles(id),
  date          DATE NOT NULL,
  work_type     TEXT,
  level_zone    TEXT,
  work_done     TEXT NOT NULL,
  weather       TEXT,
  submission_id TEXT, -- e.g. DPR-EMB-16052025-001
  status        TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','approved','rejected')),
  review_note   TEXT,
  reviewed_by   UUID REFERENCES profiles(id),
  reviewed_at   TIMESTAMPTZ,
  synced        BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_dprs_project ON dprs(project_id);
CREATE INDEX idx_dprs_status ON dprs(status);

CREATE TABLE dpr_media (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dpr_id       UUID NOT NULL REFERENCES dprs(id) ON DELETE CASCADE,
  type         TEXT NOT NULL CHECK (type IN ('photo','video')),
  storage_path TEXT NOT NULL,
  duration_s   INTEGER,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- ── LEAVE REQUESTS ───────────────────────────────────────────────────
CREATE TABLE leave_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  type            TEXT NOT NULL,
  from_date       DATE NOT NULL,
  to_date         DATE NOT NULL,
  reason          TEXT,
  attachment_path TEXT,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  decided_by      UUID REFERENCES profiles(id),
  decided_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ── ADVANCE REQUESTS ─────────────────────────────────────────────────
CREATE TABLE advance_requests (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  amount      NUMERIC(10,2) NOT NULL,
  reason      TEXT,
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  decided_by  UUID REFERENCES profiles(id),
  decided_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ── MATERIALS ────────────────────────────────────────────────────────
CREATE TABLE materials (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  spec        TEXT,
  unit        TEXT,
  stock_qty   NUMERIC(10,2) DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_materials_name_trgm ON materials USING gin (name gin_trgm_ops);

CREATE TABLE material_requests (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id     UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  requested_by   UUID NOT NULL REFERENCES profiles(id),
  material_name  TEXT NOT NULL,
  spec           TEXT,
  qty            NUMERIC(10,2) NOT NULL,
  needed_by      DATE,
  notes          TEXT,
  photo_path     TEXT,
  status         TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','ordered')),
  decided_by     UUID REFERENCES profiles(id),
  decided_at     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE deliveries (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_request_id UUID REFERENCES material_requests(id),
  project_id          UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  delivery_code       TEXT,
  status              TEXT NOT NULL DEFAULT 'in_transit' CHECK (status IN ('in_transit','delivered')),
  delivered_at        TIMESTAMPTZ,
  photos              TEXT[], -- multiple photos: challan, truck, material, site unloading
  created_at          TIMESTAMPTZ DEFAULT now()
);

-- ── DOCUMENTS ────────────────────────────────────────────────────────
CREATE TABLE documents (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  owner_type  TEXT NOT NULL CHECK (owner_type IN ('profile','project')),
  owner_id    UUID NOT NULL,
  category    TEXT NOT NULL,
  title       TEXT NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES profiles(id),
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_documents_owner ON documents(owner_type, owner_id);
CREATE INDEX idx_documents_title_trgm ON documents USING gin (title gin_trgm_ops);

CREATE TABLE document_versions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id  UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  rev_no       INTEGER NOT NULL,
  storage_path TEXT NOT NULL,
  uploaded_by  UUID NOT NULL REFERENCES profiles(id),
  is_current   BOOLEAN DEFAULT false,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- ── EXPENSES ─────────────────────────────────────────────────────────
CREATE TABLE expenses (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  description       TEXT NOT NULL,
  amount            NUMERIC(12,2) NOT NULL,
  category          TEXT,
  receipt_photo_path TEXT,
  entered_by        UUID NOT NULL REFERENCES profiles(id),
  date              DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- ── PAYMENTS ─────────────────────────────────────────────────────────
CREATE TABLE payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  milestone_name  TEXT NOT NULL,
  amount          NUMERIC(12,2) NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('paid','pending')),
  due_date        DATE,
  paid_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ── CLIENT APPROVALS ─────────────────────────────────────────────────
CREATE TABLE client_approvals (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id     UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  request_code   TEXT,
  title          TEXT NOT NULL,
  details        JSONB,
  photos         TEXT[],
  requested_by   UUID NOT NULL REFERENCES profiles(id),
  status         TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  decided_at     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT now()
);

-- ── CONVERSATIONS & MESSAGES ─────────────────────────────────────────
CREATE TABLE conversations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('project','direct')),
  project_id  UUID REFERENCES projects(id),
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE conversation_members (
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  profile_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (conversation_id, profile_id)
);

CREATE TABLE messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       UUID NOT NULL REFERENCES profiles(id),
  body            TEXT,
  attachment_path TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at);

-- ── NOTIFICATIONS ────────────────────────────────────────────────────
CREATE TABLE notifications (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  kind         TEXT NOT NULL,
  title        TEXT NOT NULL,
  body         TEXT NOT NULL,
  ref_table    TEXT,
  ref_id       UUID,
  read_at      TIMESTAMPTZ,
  important    BOOLEAN DEFAULT false,
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_notifications_recipient ON notifications(recipient_id, read_at);

-- ── SAFETY CHECKS ────────────────────────────────────────────────────
CREATE TABLE safety_checks (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id       UUID NOT NULL REFERENCES profiles(id),
  project_id       UUID NOT NULL REFERENCES projects(id),
  date             DATE NOT NULL DEFAULT CURRENT_DATE,
  items            JSONB NOT NULL, -- { helmet: true, shoes: true, vest: false, ... }
  concern_reported TEXT,
  created_at       TIMESTAMPTZ DEFAULT now()
);

-- ── AUDIT LOG ────────────────────────────────────────────────────────
CREATE TABLE audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  actor_id    UUID REFERENCES profiles(id),
  action      TEXT NOT NULL,
  ref_table   TEXT,
  ref_id      UUID,
  detail      JSONB,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_audit_company ON audit_log(company_id, created_at DESC);

-- ── PROJECT TEMPLATES ────────────────────────────────────────────────
CREATE TABLE project_templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  payload     JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ── VIEW: Monthly Salary Computation ─────────────────────────────────
-- payable = present_days*daily_rate + half_days*0.5*daily_rate
--         + ot_hours*(daily_rate/8) − approved advances in month
CREATE OR REPLACE VIEW monthly_salary AS
WITH attendance_agg AS (
  SELECT
    a.profile_id,
    date_trunc('month', a.date) AS month,
    COUNT(*) FILTER (WHERE a.status = 'present') AS present_days,
    COUNT(*) FILTER (WHERE a.status = 'half_day') AS half_days,
    COALESCE(SUM(a.ot_min) FILTER (WHERE a.status IN ('present','half_day')), 0) / 60.0 AS ot_hours
  FROM attendance a
  GROUP BY a.profile_id, date_trunc('month', a.date)
),
advances_agg AS (
  SELECT
    ar.profile_id,
    date_trunc('month', ar.decided_at) AS month,
    SUM(ar.amount) AS advances_taken
  FROM advance_requests ar
  WHERE ar.status = 'approved'
  GROUP BY ar.profile_id, date_trunc('month', ar.decided_at)
)
SELECT
  p.id AS profile_id,
  p.company_id,
  p.full_name,
  p.daily_rate,
  aa.month,
  aa.present_days,
  aa.half_days,
  aa.ot_hours,
  COALESCE(adv.advances_taken, 0) AS advances_taken,
  -- Computed payable
  (aa.present_days * p.daily_rate)
  + (aa.half_days * 0.5 * p.daily_rate)
  + (aa.ot_hours * (p.daily_rate / 8.0))
  - COALESCE(adv.advances_taken, 0) AS payable
FROM profiles p
JOIN attendance_agg aa ON aa.profile_id = p.id
LEFT JOIN advances_agg adv ON adv.profile_id = p.id AND adv.month = aa.month
WHERE p.daily_rate IS NOT NULL;
