-- ── Project type, category, department, client ────────────────────────────────
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS project_code       TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS project_type       TEXT DEFAULT 'internal'
                           CHECK (project_type IN (
                             'internal','client','r_and_d',
                             'compliance','infrastructure','product'
                           )),
  ADD COLUMN IF NOT EXISTS category           TEXT,
  ADD COLUMN IF NOT EXISTS department         TEXT,

  -- People
  ADD COLUMN IF NOT EXISTS sponsor_id         UUID REFERENCES employees(id),
  ADD COLUMN IF NOT EXISTS client_name        TEXT,

  -- Timeline
  ADD COLUMN IF NOT EXISTS estimated_duration INTEGER,

  -- Health and visibility
  ADD COLUMN IF NOT EXISTS health             TEXT DEFAULT 'on_track'
                           CHECK (health IN (
                             'on_track','at_risk','delayed','blocked'
                           )),
  ADD COLUMN IF NOT EXISTS visibility         TEXT DEFAULT 'team'
                           CHECK (visibility IN (
                             'public','private','team'
                           )),

  -- Financials
  ADD COLUMN IF NOT EXISTS budget_currency    TEXT DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS billing_type       TEXT DEFAULT 'internal'
                           CHECK (billing_type IN (
                             'fixed','time_and_material',
                             'internal','retainer'
                           )),
  ADD COLUMN IF NOT EXISTS actual_cost        NUMERIC(14,2) DEFAULT 0,

  -- Scope
  ADD COLUMN IF NOT EXISTS objectives         TEXT,
  ADD COLUMN IF NOT EXISTS deliverables       TEXT[],

  -- Settings
  ADD COLUMN IF NOT EXISTS allow_overtime                BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS require_timesheet_approval    BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_on_milestone           BOOLEAN DEFAULT true;

-- ── Auto-generate project_code sequence ───────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS project_code_seq START 1;

-- ── Project milestones table ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS project_milestones (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  due_date    DATE NOT NULL,
  status      TEXT DEFAULT 'pending'
              CHECK (status IN ('pending','completed','missed')),
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ── Project dependencies table ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS project_dependencies (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id        UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  depends_on_id     UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  UNIQUE(project_id, depends_on_id)
);
