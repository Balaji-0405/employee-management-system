-- ============================================================
-- 002_upgrade_leave_requests_columns.sql
--
-- USE THIS if leave_requests already exists in Supabase with the
-- OLD column names (leave_type, approved_by, approved_at, reject_reason).
--
-- USE 001_payroll_leave_schema.sql instead if none of the 8 tables
-- exist yet (fresh database / fresh Supabase project).
--
-- This script is idempotent — safe to run multiple times and safe
-- whether tables already have the new names or the old ones.
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. Rename leave_requests columns to match leave.controller.ts
--    Each block checks information_schema before renaming so
--    re-runs are safe.
-- ────────────────────────────────────────────────────────────

-- leave_type → type
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'leave_requests'
      AND column_name  = 'leave_type'
  ) THEN
    ALTER TABLE leave_requests RENAME COLUMN leave_type TO type;
    RAISE NOTICE 'leave_requests.leave_type renamed to type';
  ELSE
    RAISE NOTICE 'leave_requests.leave_type not found — skipping (already renamed or table is fresh)';
  END IF;
END $$;

-- approved_by → reviewed_by
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'leave_requests'
      AND column_name  = 'approved_by'
  ) THEN
    ALTER TABLE leave_requests RENAME COLUMN approved_by TO reviewed_by;
    RAISE NOTICE 'leave_requests.approved_by renamed to reviewed_by';
  ELSE
    RAISE NOTICE 'leave_requests.approved_by not found — skipping';
  END IF;
END $$;

-- approved_at → reviewed_at
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'leave_requests'
      AND column_name  = 'approved_at'
  ) THEN
    ALTER TABLE leave_requests RENAME COLUMN approved_at TO reviewed_at;
    RAISE NOTICE 'leave_requests.approved_at renamed to reviewed_at';
  ELSE
    RAISE NOTICE 'leave_requests.approved_at not found — skipping';
  END IF;
END $$;

-- reject_reason → review_note
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'leave_requests'
      AND column_name  = 'reject_reason'
  ) THEN
    ALTER TABLE leave_requests RENAME COLUMN reject_reason TO review_note;
    RAISE NOTICE 'leave_requests.reject_reason renamed to review_note';
  ELSE
    RAISE NOTICE 'leave_requests.reject_reason not found — skipping';
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────
-- 2. Fix the CHECK constraint on leave_requests.type
--    Old constraint allowed only ('SL','EL').
--    New constraint must allow ('sick','earned','casual','maternity','lop').
--    We find and drop the old one by looking for 'SL' in its definition,
--    then add the new one only if it doesn't exist yet.
-- ────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_con_name TEXT;
BEGIN
  -- Find a CHECK constraint on leave_requests whose body mentions 'SL'
  -- (that's the old ('SL','EL') constraint, regardless of what it's named)
  SELECT con.conname INTO v_con_name
  FROM pg_constraint con
  JOIN pg_class     rel ON rel.oid = con.conrelid
  JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
  WHERE nsp.nspname  = 'public'
    AND rel.relname  = 'leave_requests'
    AND con.contype  = 'c'
    AND pg_get_constraintdef(con.oid) LIKE '%SL%'
  LIMIT 1;

  IF v_con_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE leave_requests DROP CONSTRAINT %I', v_con_name);
    RAISE NOTICE 'Dropped old CHECK constraint: %', v_con_name;
  END IF;
END $$;

DO $$
BEGIN
  -- Add the new CHECK constraint only if no constraint already mentions 'sick'
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint con
    JOIN pg_class     rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname  = 'public'
      AND rel.relname  = 'leave_requests'
      AND con.contype  = 'c'
      AND pg_get_constraintdef(con.oid) LIKE '%sick%'
  ) THEN
    ALTER TABLE leave_requests
      ADD CONSTRAINT leave_requests_type_check
      CHECK (type IN ('sick','earned','casual','maternity','lop'));
    RAISE NOTICE 'Added new CHECK constraint on leave_requests.type';
  ELSE
    RAISE NOTICE 'Correct CHECK constraint already present — skipping';
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────
-- 3. Add missing columns that may not exist on older tables
-- ────────────────────────────────────────────────────────────

-- leave_requests: applied_to_payroll (may be missing from oldest schema)
ALTER TABLE leave_requests
  ADD COLUMN IF NOT EXISTS applied_to_payroll BOOLEAN NOT NULL DEFAULT FALSE;

-- leave_transactions: reference_id and created_by (absent in some older versions)
ALTER TABLE leave_transactions
  ADD COLUMN IF NOT EXISTS reference_id UUID;

ALTER TABLE leave_transactions
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES employees(id);

-- pt_slabs: created_at (absent in the oldest version of this table)
ALTER TABLE pt_slabs
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- ────────────────────────────────────────────────────────────
-- 4. Add UNIQUE(state_code, min_gross) to pt_slabs if missing
--    Needed so PT slab seed data can use ON CONFLICT DO NOTHING.
-- ────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint con
    JOIN pg_class     rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'pt_slabs'
      AND con.contype = 'u'
      AND pg_get_constraintdef(con.oid) LIKE '%state_code%min_gross%'
  ) THEN
    ALTER TABLE pt_slabs
      ADD CONSTRAINT pt_slabs_state_code_min_gross_key UNIQUE (state_code, min_gross);
    RAISE NOTICE 'Added UNIQUE(state_code, min_gross) to pt_slabs';
  ELSE
    RAISE NOTICE 'UNIQUE constraint on pt_slabs already present — skipping';
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────
-- 5. Re-seed PT slabs for AP and TS if missing
--    ON CONFLICT DO NOTHING is now safe because of the UNIQUE above.
-- ────────────────────────────────────────────────────────────

INSERT INTO pt_slabs (state_code, min_gross, max_gross, pt_amount) VALUES
  ('AP', 0,       1500000, 0),
  ('AP', 1500001, 2000000, 15000),
  ('AP', 2000001, NULL,    20000),
  ('TS', 0,       1500000, 0),
  ('TS', 1500001, NULL,    20000)
ON CONFLICT (state_code, min_gross) DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- 6. Ensure RLS is disabled on all 8 tables
-- ────────────────────────────────────────────────────────────

ALTER TABLE pt_slabs               DISABLE ROW LEVEL SECURITY;
ALTER TABLE employee_salary_config  DISABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_runs            DISABLE ROW LEVEL SECURITY;
ALTER TABLE payslips                DISABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_one_time_items  DISABLE ROW LEVEL SECURITY;
ALTER TABLE employee_leave_balances DISABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests          DISABLE ROW LEVEL SECURITY;
ALTER TABLE leave_transactions      DISABLE ROW LEVEL SECURITY;

-- ────────────────────────────────────────────────────────────
-- VERIFICATION
-- Run this SELECT after the script to confirm the rename worked.
-- You should see 'type' in the column_name column, not 'leave_type'.
-- ────────────────────────────────────────────────────────────

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'leave_requests'
ORDER BY ordinal_position;
