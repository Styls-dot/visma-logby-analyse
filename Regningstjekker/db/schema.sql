-- Regningstjekker skema. Kør i Supabase SQL Editor (eller via supabase db push).

-- Uploads / indsendelser
create table if not exists submissions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  status text not null default 'received', -- received | read | needs_input | corrected | error
  file_path text,                          -- sti i storage-bucket 'bills'
  file_mime text,
  extracted jsonb,                         -- rå udtrukne felter (Plan 2)
  normalized jsonb,                        -- normaliseret (region, produkt-id) (Plan 2)
  result jsonb,                            -- besparelsesresultat
  corrections jsonb,                       -- admin-rettelser (Plan 2)
  delete_after timestamptz not null default (now() + interval '90 days')
);

-- Prissnapshot fra Strømligning (én række pr. produkt pr. region pr. forbrugs-bucket)
create table if not exists price_cache (
  id bigint generated always as identity primary key,
  fetched_at timestamptz not null default now(),
  region text not null,                    -- DK1 | DK2
  yearly_consumption integer not null,     -- bucket, fx 4000
  product_id text not null,
  company text not null,
  product text not null,
  total_cost double precision,
  subscription_monthly double precision,
  fees_monthly double precision,
  consumption_surcharge double precision,
  fixed_price double precision,
  creation_fee double precision,
  unique (region, yearly_consumption, product_id)
);

-- Mapping fra rå selskabs/produkt-tekst til Strømligning-produkt-id (fyldes af rettelser i Plan 2)
create table if not exists company_mappings (
  id bigint generated always as identity primary key,
  raw_text text not null unique,
  product_id text not null,
  created_at timestamptz not null default now()
);

-- Lead-samtykke (kun ved eksplicit samtykke; Plan 3)
create table if not exists lead_consents (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid references submissions(id) on delete set null,
  name text,
  email text,
  phone text,
  marketing_consent boolean not null default false,
  created_at timestamptz not null default now()
);

-- Row-level security: ingen anon-adgang. Service-role (backend) bypasser RLS.
alter table submissions enable row level security;
alter table price_cache enable row level security;
alter table company_mappings enable row level security;
alter table lead_consents enable row level security;
-- Ingen policies for anon/authenticated => kun service-role kan læse/skrive.

create index if not exists idx_submissions_delete_after on submissions(delete_after);
create index if not exists idx_price_cache_lookup on price_cache(region, product_id, yearly_consumption);
