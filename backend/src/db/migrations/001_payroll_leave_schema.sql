-- ============================================================
-- 001_payroll_leave_schema.sql
-- Payroll & Leave schema for Employee Management System
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
-- Safe to re-run: all statements use IF NOT EXISTS / ON CONFLICT DO NOTHING
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- PT SLABS  (professional-tax lookup, no employee FK needed)
-- UNIQUE (state_code, min_gross) makes seed INSERT idempotent.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pt_slabs (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  state_code VARCHAR(3)  NOT NULL,
  min_gross  INTEGER     NOT NULL,
  max_gross  INTEGER,
  pt_amount  INTEGER     NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (state_code, min_gross)
);

CREATE INDEX IF NOT EXISTS idx_pt_slabs_state ON pt_slabs (state_code);

-- ────────────────────────────────────────────────────────────
-- EMPLOYEE SALARY CONFIG
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS employee_salary_config (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id       UUID        NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  basic_salary      INTEGER     NOT NULL CHECK (basic_salary > 0),
  insurance_premium INTEGER     NOT NULL DEFAULT 0 CHECK (insurance_premium >= 0),
  pt_state          VARCHAR(3)  NOT NULL DEFAULT 'KA',
  loan_emi          INTEGER     NOT NULL DEFAULT 0 CHECK (loan_emi >= 0),
  effective_from    DATE        NOT NULL,
  created_by        UUID        REFERENCES employees(id),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (employee_id, effective_from)
);

-- ────────────────────────────────────────────────────────────
-- PAYROLL RUNS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payroll_runs (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  pay_month        INTEGER     NOT NULL CHECK (pay_month BETWEEN 1 AND 12),
  pay_year         INTEGER     NOT NULL,
  status           VARCHAR(20) NOT NULL DEFAULT 'draft'
                               CHECK (status IN ('draft','computed','locked','disbursed')),
  total_gross      BIGINT      NOT NULL DEFAULT 0,
  total_net        BIGINT      NOT NULL DEFAULT 0,
  total_deductions BIGINT      NOT NULL DEFAULT 0,
  total_employees  INTEGER     NOT NULL DEFAULT 0,
  initiated_by     UUID        REFERENCES employees(id),
  locked_at        TIMESTAMPTZ,
  locked_by        UUID        REFERENCES employees(id),
  disbursed_at     TIMESTAMPTZ,
  disbursed_by     UUID        REFERENCES employees(id),
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (pay_month, pay_year)
);

-- ────────────────────────────────────────────────────────────
-- PAYSLIPS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payslips (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id              UUID         NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
  employee_id         UUID         NOT NULL REFERENCES employees(id),
  working_days        INTEGER      NOT NULL,
  present_days        DECIMAL(5,2) NOT NULL,
  sl_used             DECIMAL(5,2) NOT NULL DEFAULT 0,
  el_used             DECIMAL(5,2) NOT NULL DEFAULT 0,
  lop_days            DECIMAL(5,2) NOT NULL DEFAULT 0,
  basic_salary        INTEGER      NOT NULL,
  ot_hours            DECIMAL(5,2) NOT NULL DEFAULT 0,
  ot_pay              INTEGER      NOT NULL DEFAULT 0,
  bonus               INTEGER      NOT NULL DEFAULT 0,
  gross_salary        INTEGER      NOT NULL,
  lop_deduction       INTEGER      NOT NULL DEFAULT 0,
  pt_deduction        INTEGER      NOT NULL DEFAULT 0,
  insurance_deduction INTEGER      NOT NULL DEFAULT 0,
  loan_deduction      INTEGER      NOT NULL DEFAULT 0,
  total_deductions    INTEGER      NOT NULL,
  net_salary          INTEGER      NOT NULL,
  is_override         BOOLEAN      NOT NULL DEFAULT FALSE,
  override_reason     TEXT,
  override_by         UUID         REFERENCES employees(id),
  override_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ  DEFAULT NOW(),
  UNIQUE (run_id, employee_id)
);

-- ────────────────────────────────────────────────────────────
-- PAYROLL ONE-TIME ITEMS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payroll_one_time_items (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id      UUID        NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
  employee_id UUID        NOT NULL REFERENCES employees(id),
  item_type   VARCHAR(20) NOT NULL CHECK (item_type IN ('bonus','deduction')),
  amount      INTEGER     NOT NULL CHECK (amount > 0),
  label       TEXT        NOT NULL,
  added_by    UUID        REFERENCES employees(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- EMPLOYEE LEAVE BALANCES
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS employee_leave_balances (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id   UUID         NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  year          INTEGER      NOT NULL,
  sl_entitled   DECIMAL(5,2) NOT NULL DEFAULT 6,
  sl_used       DECIMAL(5,2) NOT NULL DEFAULT 0,
  el_opening    DECIMAL(5,2) NOT NULL DEFAULT 0,
  el_accrued    DECIMAL(5,2) NOT NULL DEFAULT 0,
  el_used       DECIMAL(5,2) NOT NULL DEFAULT 0,
  el_lapsed_eoy DECIMAL(5,2) NOT NULL DEFAULT 0,
  updated_at    TIMESTAMPTZ  DEFAULT NOW(),
  created_at    TIMESTAMPTZ  DEFAULT NOW(),
  UNIQUE (employee_id, year)
);

-- ────────────────────────────────────────────────────────────
-- LEAVE REQUESTS
-- Column name is 'type' (not 'leave_type') — matches leave.controller.ts.
-- Values are the full words used by the controller's leaveTypeMap.
-- Review columns match controller: reviewed_by / reviewed_at / review_note.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leave_requests (
  id                 UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id        UUID         NOT NULL REFERENCES employees(id),
  type               VARCHAR(20)  NOT NULL
                                  CHECK (type IN ('sick','earned','casual','maternity','lop')),
  from_date          DATE         NOT NULL,
  to_date            DATE         NOT NULL,
  days               DECIMAL(5,2) NOT NULL CHECK (days > 0),
  reason             TEXT,
  status             VARCHAR(20)  NOT NULL DEFAULT 'pending'
                                  CHECK (status IN ('pending','approved','rejected','cancelled')),
  reviewed_by        UUID         REFERENCES employees(id),
  reviewed_at        TIMESTAMPTZ,
  review_note        TEXT,
  applied_to_payroll BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at         TIMESTAMPTZ  DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- LEAVE TRANSACTIONS
-- leave_type uses short codes ('SL','EL') — matches leaveAccrual.ts inserts.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leave_transactions (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id      UUID         NOT NULL REFERENCES employees(id),
  transaction_type VARCHAR(20)  NOT NULL
                                CHECK (transaction_type IN (
                                  'accrual','taken','lapse','carry_forward','proration','adjustment'
                                )),
  leave_type       VARCHAR(5)   NOT NULL CHECK (leave_type IN ('SL','EL')),
  days             DECIMAL(5,2) NOT NULL,
  balance_after    DECIMAL(5,2) NOT NULL,
  reference_id     UUID,
  notes            TEXT,
  created_by       UUID         REFERENCES employees(id),
  created_at       TIMESTAMPTZ  DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- DISABLE ROW LEVEL SECURITY (service-role key bypasses anyway,
-- but explicit disable prevents accidental RLS blocks)
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
-- PT SLAB SEED DATA (all monetary values in paise)
-- UNIQUE (state_code, min_gross) makes ON CONFLICT DO NOTHING safe to re-run.
-- ────────────────────────────────────────────────────────────
INSERT INTO pt_slabs (state_code, min_gross, max_gross, pt_amount) VALUES
  ('KA', 0,       1500000, 0),
  ('KA', 1500001, 2500000, 15000),
  ('KA', 2500001, NULL,    20000),
  ('MH', 0,       750000,  0),
  ('MH', 750001,  1000000, 17500),
  ('MH', 1000001, 2000000, 20000),
  ('MH', 2000001, NULL,    25000),
  ('TN', 0,       2100000, 0),
  ('TN', 2100001, NULL,    18000),
  ('AP', 0,       1500000, 0),
  ('AP', 1500001, 2000000, 15000),
  ('AP', 2000001, NULL,    20000),
  ('TS', 0,       1500000, 0),
  ('TS', 1500001, NULL,    20000),
  ('DL', 0,       NULL,    0)
ON CONFLICT (state_code, min_gross) DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- DEV SEED DATA — seeds salary config and leave balances for
-- all active employees. Safe to re-run (ON CONFLICT DO NOTHING).
-- ────────────────────────────────────────────────────────────
INSERT INTO employee_salary_config
  (employee_id, basic_salary, insurance_premium, pt_state, loan_emi, effective_from)
SELECT
  id,
  CASE
    WHEN designation ILIKE '%senior%' OR designation ILIKE '%lead%' THEN 8000000
    WHEN designation ILIKE '%manager%' OR designation ILIKE '%head%' THEN 12000000
    ELSE 4500000
  END,
  50000,
  'KA',
  0,
  '2026-01-01'
FROM employees
WHERE status = 'active'
ON CONFLICT (employee_id, effective_from) DO NOTHING;

INSERT INTO employee_leave_balances
  (employee_id, year, sl_entitled, sl_used, el_opening, el_accrued, el_used)
SELECT
  id,
  2026,
  6,
  ROUND((RANDOM() * 2)::numeric, 1),
  CASE WHEN RANDOM() > 0.5 THEN ROUND((RANDOM() * 10)::numeric, 1) ELSE 0 END,
  ROUND((7 * 1.5)::numeric, 1),
  ROUND((RANDOM() * 3)::numeric, 1)
FROM employees
WHERE status = 'active'
ON CONFLICT (employee_id, year) DO NOTHING;

INSERT INTO payroll_runs (pay_month, pay_year, status)
VALUES (6, 2026, 'draft')
ON CONFLICT (pay_month, pay_year) DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- VERIFICATION — expected: 8 rows
-- ────────────────────────────────────────────────────────────
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'pt_slabs', 'employee_salary_config', 'payroll_runs', 'payslips',
    'payroll_one_time_items', 'employee_leave_balances',
    'leave_requests', 'leave_transactions'
  )
ORDER BY table_name;
