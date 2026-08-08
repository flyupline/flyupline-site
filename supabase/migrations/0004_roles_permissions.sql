-- Roles + per-user permission overrides.
alter table public.admin_users
  add column if not exists permissions jsonb not null default '{}'::jsonb;

-- Existing rows keep their role; new roles allowed: owner | admin | moderator.
alter table public.admin_users drop constraint if exists admin_users_role_check;
alter table public.admin_users
  add constraint admin_users_role_check check (role in ('owner', 'admin', 'moderator'));

-- First admin becomes the owner so there is always someone who can manage people.
update public.admin_users set role = 'owner'
 where user_id = (select user_id from public.admin_users order by created_at limit 1)
   and role <> 'owner';
