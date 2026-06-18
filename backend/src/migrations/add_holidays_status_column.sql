-- Migration: add_holidays_status_column
-- Adds the 'status' column that leaveController queries (.eq('status','approved')).
-- Safe to run on existing tables; IF NOT EXISTS prevents duplicate column errors.
-- Run in: Supabase Dashboard → SQL Editor

ALTER TABLE holidays
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'approved';

-- Backfill existing rows (all pre-existing holidays are implicitly approved)
UPDATE holidays SET status = 'approved' WHERE status IS NULL;
