create extension if not exists pgcrypto;

create table if not exists holidays (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  date date not null,
  country text,
  created_at timestamptz default now()
);
