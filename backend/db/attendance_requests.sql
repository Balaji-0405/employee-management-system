create extension if not exists pgcrypto;

create table if not exists attendance_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references employees(id),
  type text not null,
  date date not null,
  reason text,
  status text default 'pending',
  reviewed_by uuid references employees(id),
  review_note text,
  reviewed_at timestamptz,
  created_at timestamptz default now()
);
