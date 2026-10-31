-- AuraHealth Pro — optional Postgres layout.
-- The mobile preview stores each account on device (AsyncStorage + SecureStore).
-- Apply this schema only if you move accounts to a server. Do not store raw card numbers.

create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text not null,
  provider text not null check (provider in ('email', 'google')),
  pass_hash text,
  created_at timestamptz not null default now()
);

create table if not exists profiles (
  user_id uuid primary key references users(id) on delete cascade,
  dob date,
  sex text,
  blood_group text,
  height_cm numeric,
  weight_kg numeric,
  conditions text,
  allergies text,
  emergency_name text,
  emergency_phone text,
  home_district text
);

create table if not exists vitals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  metric text not null,
  value numeric not null,
  value2 numeric,
  context text,
  logged_at timestamptz not null,
  sample boolean not null default false
);

create table if not exists medications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  name text not null,
  strength text,
  form text,
  times text[] not null default '{}',
  with_food boolean not null default false,
  stock integer not null default 0,
  per_dose integer not null default 1,
  notes text,
  sample boolean not null default false
);

create table if not exists dose_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  med_id uuid not null references medications(id) on delete cascade,
  slot text not null,
  status text not null check (status in ('taken', 'skipped')),
  logged_at timestamptz not null default now()
);

create table if not exists appointments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  visit_type text not null check (visit_type in ('physical', 'tele', 'lab')),
  center_id text,
  center_name text not null,
  doctor text,
  specialty text,
  at timestamptz not null,
  ref_no text,
  fee_lkr integer,
  notes text,
  status text not null check (status in ('upcoming', 'completed', 'cancelled')),
  reminder boolean not null default false,
  sample boolean not null default false
);

create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  plan text not null check (plan in ('free', 'monthly', 'yearly')),
  amount_lkr integer not null default 0,
  reference text not null,
  method text not null,
  active_until timestamptz,
  created_at timestamptz not null default now(),
  demo boolean not null default true
);

-- Health notes are sensitive. Enable row-level security before any client key is issued.
alter table profiles enable row level security;
alter table vitals enable row level security;
alter table medications enable row level security;
alter table dose_logs enable row level security;
alter table appointments enable row level security;
alter table subscriptions enable row level security;
