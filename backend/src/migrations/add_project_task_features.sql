-- ── 1A. project_members table ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS project_members (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'member'
              CHECK (role IN ('member','lead','reviewer')),
  added_by    UUID REFERENCES employees(id),
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, employee_id)
);

-- ── 1B. task_comments table ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS task_comments (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id     UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  author_id   UUID NOT NULL REFERENCES employees(id),
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- ── 1C. task_time_logs table ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS task_time_logs (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id     UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id),
  hours       NUMERIC(6,2) NOT NULL CHECK (hours > 0),
  description TEXT,
  logged_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ── 1D. task_attachments table ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS task_attachments (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id     UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES employees(id),
  file_name   TEXT NOT NULL,
  file_path   TEXT NOT NULL,
  file_size   INTEGER,
  mime_type   TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ── 1E. Add new columns to tasks table ───────────────────────────────────────
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS description      TEXT,
  ADD COLUMN IF NOT EXISTS estimated_hours  NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS logged_hours     NUMERIC(6,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS depends_on       UUID REFERENCES tasks(id),
  ADD COLUMN IF NOT EXISTS position         INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tags             TEXT[],
  ADD COLUMN IF NOT EXISTS completed_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_by       UUID REFERENCES employees(id);

-- ── 1F. Add new columns to projects table ────────────────────────────────────
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS priority     TEXT DEFAULT 'medium'
                           CHECK (priority IN ('low','medium','high','critical')),
  ADD COLUMN IF NOT EXISTS progress     INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS budget       NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS tags         TEXT[],
  ADD COLUMN IF NOT EXISTS created_by   UUID REFERENCES employees(id);
