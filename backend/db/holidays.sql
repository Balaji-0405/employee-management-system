CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS holidays (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL,
  date       DATE        NOT NULL,
  country    TEXT,
  status     VARCHAR(20) NOT NULL DEFAULT 'approved',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
