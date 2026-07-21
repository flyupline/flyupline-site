-- Scheduled quote maintenance: proactively notify on expiring/expired quotes
-- and flip statuses. Runs hourly via pg_cron, and also lazily on page loads
-- (mark_expired_quotes is redefined to call this).

alter table public.quote_versions add column if not exists expiring_notified boolean not null default false;

create or replace function public.run_quote_maintenance()
returns void language plpgsql security definer set search_path = public as $$
begin
  -- 1) Expiring within 48h — notify once per version.
  insert into public.notifications (request_id, type, title, body)
  select v.request_id, 'expiring',
         'Quote expiring soon — ' || coalesce(r.full_name, 'customer'),
         r.reference || ' · expires ' || to_char(v.expires_at, 'DD Mon')
  from public.quote_versions v
  join public.quote_requests r on r.id = v.request_id
  where v.expires_at is not null and v.expires_at > now() and v.expires_at < now() + interval '48 hours'
    and v.status in ('sent', 'viewed', 'changes_requested')
    and v.expiring_notified = false;

  insert into public.activity_log (request_id, action, actor, detail)
  select v.request_id, 'quote_expiring_soon', 'system', 'Expires ' || to_char(v.expires_at, 'DD Mon YYYY')
  from public.quote_versions v
  where v.expires_at is not null and v.expires_at > now() and v.expires_at < now() + interval '48 hours'
    and v.status in ('sent', 'viewed', 'changes_requested')
    and v.expiring_notified = false;

  update public.quote_versions set expiring_notified = true
  where expires_at is not null and expires_at > now() and expires_at < now() + interval '48 hours'
    and status in ('sent', 'viewed', 'changes_requested') and expiring_notified = false;

  -- 2) Expired — notify + log on the transition, then flip.
  insert into public.notifications (request_id, type, title, body)
  select v.request_id, 'expired',
         'Quote expired — ' || coalesce(r.full_name, 'customer'), r.reference
  from public.quote_versions v
  join public.quote_requests r on r.id = v.request_id
  where v.expires_at is not null and v.expires_at < now()
    and v.status in ('sent', 'viewed', 'changes_requested');

  insert into public.activity_log (request_id, action, actor, detail)
  select v.request_id, 'quote_expired', 'system', 'Version ' || v.version_number
  from public.quote_versions v
  where v.expires_at is not null and v.expires_at < now()
    and v.status in ('sent', 'viewed', 'changes_requested');

  update public.quote_versions set status = 'expired'
   where expires_at is not null and expires_at < now()
     and status in ('sent', 'viewed', 'changes_requested');

  update public.quote_requests r set status = 'expired'
   where r.status in ('quote_sent', 'viewed', 'changes_requested')
     and exists (select 1 from public.quote_versions v where v.request_id = r.id and v.status = 'expired');
end $$;

-- Redefine the lazy helper to run full maintenance (idempotent).
create or replace function public.mark_expired_quotes()
returns void language sql security definer set search_path = public as $$
  select public.run_quote_maintenance();
$$;

-- Schedule hourly via pg_cron.
create extension if not exists pg_cron;
do $$ begin perform cron.unschedule('quote-maintenance-hourly'); exception when others then null; end $$;
select cron.schedule('quote-maintenance-hourly', '0 * * * *', $$ select public.run_quote_maintenance(); $$);
