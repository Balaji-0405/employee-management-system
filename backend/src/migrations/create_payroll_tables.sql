-- Payroll module tables
-- Run this in: Supabase Dashboard → SQL Editor

CREATE TABLE IF NOT EXISTS employee_salary_config (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id      UUID NOT NULL,
  basic_salary     INTEGER NOT NULL CHECK (basic_salary > 0),
  insurance_premium INTEGER NOT NULL DEFAULT 0,
  pt_state         VARCHAR(3) NOT NULL DEFAULT 'KA',
  loan_emi         INTEGER NOT NULL DEFAULT 0,
  effective_from   DATE NOT NULL,
  created_by       UUID,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pt_slabs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_code VARCHAR(3) NOT NULL,
  min_gross  INTEGER NOT NULL,
  max_gross  INTEGER,
  pt_amount  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS payroll_runs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pay_month        INTEGER NOT NULL CHECK (pay_month BETWEEN 1 AND 12),
  pay_year         INTEGER NOT NULL,
  status           VARCHAR(20) NOT NULL DEFAULT 'draft'
                     CHECK (status IN ('draft','computed','locked','disbursed')),
  total_gross      BIGINT NOT NULL DEFAULT 0,
  total_net        BIGINT NOT NULL DEFAULT 0,
  total_deductions BIGINT NOT NULL DEFAULT 0,
  total_employees  INTEGER NOT NULL DEFAULT 0,
  initiated_by     UUID,
  locked_at        TIMESTAMPTZ,
  locked_by        UUID,
  disbursed_at     TIMESTAMPTZ,
  disbursed_by     UUID,
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(pay_month, pay_year)
);

CREATE TABLE IF NOT EXISTS payslips (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id               UUID NOT NULL REFERENCES payroll_runs(id),
  employee_id          UUID NOT NULL,
  working_days         INTEGER NOT NULL DEFAULT 26,
  present_days         DECIMAL(5,2) NOT NULL DEFAULT 26,
  sl_used              DECIMAL(5,2) NOT NULL DEFAULT 0,
  el_used              DECIMAL(5,2) NOT NULL DEFAULT 0,
  lop_days             DECIMAL(5,2) NOT NULL DEFAULT 0,
  basic_salary         INTEGER NOT NULL,
  ot_hours             DECIMAL(5,2) NOT NULL DEFAULT 0,
  ot_pay               INTEGER NOT NULL DEFAULT 0,
  bonus                INTEGER NOT NULL DEFAULT 0,
  gross_salary         INTEGER NOT NULL,
  lop_deduction        INTEGER NOT NULL DEFAULT 0,
  pt_deduction         INTEGER NOT NULL DEFAULT 0,
  insurance_deduction  INTEGER NOT NULL DEFAULT 0,
  loan_deduction       INTEGER NOT NULL DEFAULT 0,
  total_deductions     INTEGER NOT NULL DEFAULT 0,
  net_salary           INTEGER NOT NULL,
  is_override          BOOLEAN NOT NULL DEFAULT FALSE,
  override_reason      TEXT,
  override_by          UUID,
  override_at          TIMESTAMPTZ,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(run_id, employee_id)
);

CREATE TABLE IF NOT EXISTS payroll_one_time_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id      UUID NOT NULL REFERENCES payroll_runs(id),
  employee_id UUID NOT NULL,
  item_type   VARCHAR(20) NOT NULL CHECK (item_type IN ('bonus','deduction')),
  amount      INTEGER NOT NULL CHECK (amount > 0),
  label       TEXT NOT NULL,
  added_by    UUID,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS employee_leave_balances (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id   UUID NOT NULL,
  year          INTEGER NOT NULL,
  sl_entitled   DECIMAL(5,2) NOT NULL DEFAULT 6,
  sl_used       DECIMAL(5,2) NOT NULL DEFAULT 0,
  el_opening    DECIMAL(5,2) NOT NULL DEFAULT 0,
  el_accrued    DECIMAL(5,2) NOT NULL DEFAULT 0,
  el_used       DECIMAL(5,2) NOT NULL DEFAULT 0,
  el_lapsed_eoy DECIMAL(5,2) NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, year)
);

CREATE TABLE IF NOT EXISTS leave_requests (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id        UUID NOT NULL,
  leave_type         VARCHAR(5) NOT NULL CHECK (leave_type IN ('SL','EL')),
  from_date          DATE NOT NULL,
  to_date            DATE NOT NULL,
  days               DECIMAL(5,2) NOT NULL CHECK (days > 0),
  reason             TEXT,
  status             VARCHAR(20) NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending','approved','rejected','cancelled')),
  approved_by        UUID,
  approved_at        TIMESTAMPTZ,
  reject_reason      TEXT,
  applied_to_payroll BOOLEAN NOT NULL DEFAULT FALSE,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS leave_transactions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id      UUID NOT NULL,
  transaction_type VARCHAR(20) NOT NULL
                     CHECK (transaction_type IN (
                       'accrual','taken','lapse','carry_forward','proration','adjustment'
                     )),
  leave_type       VARCHAR(5) NOT NULL CHECK (leave_type IN ('SL','EL')),
  days             DECIMAL(5,2) NOT NULL,
  balance_after    DECIMAL(5,2) NOT NULL,
  reference_id     UUID,
  notes            TEXT,
  created_by       UUID,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- PT slab seed data (amounts in paise, thresholds in paise)
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
  ('DL', 0,       NULL,    0)
ON CONFLICT DO NOTHING;
