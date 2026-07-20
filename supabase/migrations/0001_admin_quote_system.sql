-- FlyUp Line — Admin Quote Management System
-- Extends the existing quote_requests table and adds versions, options,
-- responses, messages, internal notes, activity log, notifications, and the
-- admin role model with row-level security.

create extension if not exists pgcrypto;

-- updated_at helper
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- ------------------------------------------------------------------ admins
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'admin',
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid())
$$;

-- --------------------------------------------------- extend quote_requests
alter table public.quote_requests
  add column if not exists reference text,
  add column if not exists assigned_admin uuid references auth.users(id),
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists archived boolean not null default false,
  add column if not exists preferred_contact text;

update public.quote_requests
  set reference = 'FUL-' || upper(substr(md5(id::text), 1, 6))
  where reference is null;

create unique index if not exists quote_requests_reference_idx on public.quote_requests(reference);
create index if not exists quote_requests_status_idx on public.quote_requests(status);
create index if not exists quote_requests_assigned_idx on public.quote_requests(assigned_admin);
create index if not exists quote_requests_archived_idx on public.quote_requests(archived);

drop trigger if exists trg_quote_requests_updated on public.quote_requests;
create trigger trg_quote_requests_updated before update on public.quote_requests
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------ quote versions
create table if not exists public.quote_versions (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.quote_requests(id) on delete cascade,
  version_number int not null default 1,
  status text not null default 'draft',
  token text unique,
  currency text not null default 'USD',
  customer_message text,
  terms text,
  travel_notes text,
  required_documents text,
  payment_instructions text,
  contact_info text,
  total_price numeric,
  previous_total numeric,
  changes_summary text,
  expires_at timestamptz,
  booking_deadline timestamptz,
  created_by uuid references auth.users(id),
  created_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz,
  viewed_at timestamptz,
  responded_at timestamptz
);
create index if not exists quote_versions_request_idx on public.quote_versions(request_id);
create index if not exists quote_versions_token_idx on public.quote_versions(token);
drop trigger if exists trg_quote_versions_updated on public.quote_versions;
create trigger trg_quote_versions_updated before update on public.quote_versions
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------- quote options
create table if not exists public.quote_options (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references public.quote_versions(id) on delete cascade,
  request_id uuid references public.quote_requests(id) on delete cascade,
  sort_order int not null default 0,
  title text,
  description text,
  travelers int,
  flights jsonb not null default '[]',   -- array of flight segments
  hotels jsonb not null default '[]',    -- array of hotels
  package jsonb not null default '{}',   -- inclusions/exclusions/services
  pricing jsonb not null default '{}',   -- full price breakdown
  total_price numeric,
  created_at timestamptz not null default now()
);
create index if not exists quote_options_version_idx on public.quote_options(version_id);

-- -------------------------------------------------------- customer responses
create table if not exists public.customer_responses (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.quote_requests(id) on delete cascade,
  version_id uuid references public.quote_versions(id),
  option_id uuid references public.quote_options(id),
  type text not null,                    -- accept | decline | request_changes
  full_name text, email text, phone text,
  agreed_terms boolean default false,
  total_accepted numeric,
  decline_reason text,
  message text,
  created_at timestamptz not null default now()
);
create index if not exists customer_responses_request_idx on public.customer_responses(request_id);

-- ------------------------------------------------ messages (customer-visible)
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.quote_requests(id) on delete cascade,
  sender text not null,                  -- admin | customer
  author_id uuid,
  author_name text,
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists messages_request_idx on public.messages(request_id);

-- ----------------------------------------------- internal notes (admin only)
create table if not exists public.internal_notes (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.quote_requests(id) on delete cascade,
  author_id uuid references auth.users(id),
  author_name text,
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists internal_notes_request_idx on public.internal_notes(request_id);

-- --------------------------------------------------------------- activity log
create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.quote_requests(id) on delete cascade,
  action text not null,
  actor text not null default 'system',  -- customer | admin | system
  actor_name text,
  detail text,
  meta jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists activity_log_request_idx on public.activity_log(request_id, created_at desc);

-- --------------------------------------------------------------- notifications
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references public.quote_requests(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_read_idx on public.notifications(read, created_at desc);

-- ------------------------------------------------------------- expiry helper
create or replace function public.mark_expired_quotes()
returns void language sql security definer set search_path = public as $$
  update public.quote_versions set status = 'expired'
   where expires_at is not null and expires_at < now()
     and status in ('sent','viewed','changes_requested');
  update public.quote_requests r set status = 'expired'
   where r.status in ('quote_sent','viewed','changes_requested')
     and exists (select 1 from public.quote_versions v
                  where v.request_id = r.id and v.status = 'expired');
$$;

-- ------------------------------------------------------------------------ RLS
alter table public.admin_users        enable row level security;
alter table public.quote_versions     enable row level security;
alter table public.quote_options      enable row level security;
alter table public.customer_responses enable row level security;
alter table public.messages           enable row level security;
alter table public.internal_notes     enable row level security;
alter table public.activity_log       enable row level security;
alter table public.notifications      enable row level security;

drop policy if exists admin_users_self on public.admin_users;
create policy admin_users_self on public.admin_users for select using (user_id = auth.uid());

drop policy if exists qr_admin_all on public.quote_requests;
create policy qr_admin_all on public.quote_requests for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists qv_admin_all on public.quote_versions;
create policy qv_admin_all on public.quote_versions for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists qo_admin_all on public.quote_options;
create policy qo_admin_all on public.quote_options for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists cr_admin_all on public.customer_responses;
create policy cr_admin_all on public.customer_responses for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists msg_admin_all on public.messages;
create policy msg_admin_all on public.messages for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists note_admin_all on public.internal_notes;
create policy note_admin_all on public.internal_notes for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists act_admin_all on public.activity_log;
create policy act_admin_all on public.activity_log for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists notif_admin_all on public.notifications;
create policy notif_admin_all on public.notifications for all using (public.is_admin()) with check (public.is_admin());

-- ------------------------------------------------------------------ realtime
do $$ begin alter publication supabase_realtime add table public.quote_requests;   exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.notifications;    exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.messages;         exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.activity_log;     exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.customer_responses; exception when duplicate_object then null; end $$;
