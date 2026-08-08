-- Shared workspace settings (business profile + quote defaults), one row.
create table if not exists public.app_settings (
  id int primary key default 1,
  business jsonb not null default '{}'::jsonb,
  quote_defaults jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  constraint app_settings_single_row check (id = 1)
);

insert into public.app_settings (id) values (1) on conflict (id) do nothing;

alter table public.app_settings enable row level security;

drop policy if exists settings_admin_all on public.app_settings;
create policy settings_admin_all on public.app_settings
  for all using (public.is_admin()) with check (public.is_admin());

drop trigger if exists trg_app_settings_updated on public.app_settings;
create trigger trg_app_settings_updated before update on public.app_settings
  for each row execute function public.set_updated_at();

-- Reports the scheduled maintenance job for the admin System tab.
create or replace function public.maintenance_status()
returns jsonb language plpgsql security definer set search_path = public, cron as $$
declare j record; begin
  select jobname, schedule, active into j from cron.job where jobname = 'quote-maintenance-hourly' limit 1;
  if j is null then return jsonb_build_object('enabled', false); end if;
  return jsonb_build_object('enabled', coalesce(j.active, false), 'schedule', j.schedule, 'name', j.jobname);
exception when others then
  return jsonb_build_object('enabled', null);
end $$;
