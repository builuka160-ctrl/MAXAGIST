-- MAXAGIST: lead lifecycle + ad attribution fields for future offline conversions.
alter table public.leads add column if not exists created_at timestamptz;
update public.leads set created_at = received_at where created_at is null;
alter table public.leads alter column created_at set default now();

alter table public.leads add column if not exists landing_page text;
alter table public.leads add column if not exists gclid text;
alter table public.leads add column if not exists gbraid text;
alter table public.leads add column if not exists wbraid text;
alter table public.leads add column if not exists utm_source text;
alter table public.leads add column if not exists utm_medium text;
alter table public.leads add column if not exists utm_campaign text;
alter table public.leads add column if not exists utm_content text;
alter table public.leads add column if not exists utm_term text;
alter table public.leads add column if not exists status text not null default 'new';
alter table public.leads add column if not exists status_updated_at timestamptz not null default now();
alter table public.leads add column if not exists booked_at timestamptz;
alter table public.leads add column if not exists visited_at timestamptz;
alter table public.leads add column if not exists paid_at timestamptz;
alter table public.leads add column if not exists lead_value numeric(12,2);
alter table public.leads add column if not exists revenue numeric(12,2);
alter table public.leads add column if not exists currency text not null default 'EUR';

do $$ begin
  alter table public.leads add constraint leads_status_check
    check (status in ('new','qualified','booked','visited','paid','lost'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.leads add constraint leads_currency_check
    check (currency ~ '^[A-Z]{3}$');
exception when duplicate_object then null; end $$;

create index if not exists leads_status_idx on public.leads(status, received_at desc);
create index if not exists leads_gclid_idx on public.leads(gclid) where gclid is not null;

create table if not exists public.lead_status_history (
  id bigint generated always as identity primary key,
  lead_id bigint not null references public.leads(id) on delete cascade,
  status text not null check (status in ('new','qualified','booked','visited','paid','lost')),
  changed_at timestamptz not null default now(),
  changed_by bigint,
  note text
);
create index if not exists lead_status_history_lead_idx on public.lead_status_history(lead_id, changed_at desc);
alter table public.lead_status_history enable row level security;
-- No anonymous policies: service role only via Edge Functions.
