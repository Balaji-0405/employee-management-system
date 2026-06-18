-- Migration: add_payroll_breakdown_columns
-- Safe to run multiple times (uses IF NOT EXISTS)
-- Run in Supabase SQL Editor or psql

ALTER TABLE payroll
  ADD COLUMN IF NOT EXISTS hra               NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS special_allowance NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gross_salary      NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS overtime_hours    NUMERIC(8,2)  DEFAULT 0,
  ADD COLUMN IF NOT EXISTS overtime_pay      NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS late_count        INTEGER       DEFAULT 0,
  ADD COLUMN IF NOT EXISTS late_penalty      NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pf_employee       NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pf_employer       NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS esi_employee      NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS esi_employer      NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS professional_tax  NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS insurance         NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tds               NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_deductions  NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payslip_notes     TEXT;

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS insurance_amount NUMERIC(12,2) DEFAULT 0;
