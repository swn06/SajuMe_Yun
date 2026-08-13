-- Applied via Supabase MCP (create_users_and_normalize_readings, wrap_auth_uid_in_rls_policies).
-- public.users = signed-in person's birth profile (1:1 with auth.users).
-- public.saju_readings = interpretation results, related via user_id.

create schema if not exists private;

revoke all on schema private from public;
revoke all on schema private from anon, authenticated;

create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  name text,
  birth_date date,
  birth_time time,
  gender text check (gender is null or gender = any (array['male'::text, 'female'::text])),
  calendar_type text not null default 'solar'::text
    check (calendar_type = any (array['solar'::text, 'lunar'::text])),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.users is 'App profile for the signed-in person (birth info). Distinct from auth.users.';

alter table public.users enable row level security;

grant select, insert, update, delete on table public.users to authenticated;
grant all on table public.users to service_role;
revoke all on table public.users from anon;

create policy "Users can read own profile"
  on public.users for select to authenticated
  using ((select auth.uid()) = id);

create policy "Users can insert own profile"
  on public.users for insert to authenticated
  with check ((select auth.uid()) = id);

create policy "Users can update own profile"
  on public.users for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "Users can delete own profile"
  on public.users for delete to authenticated
  using ((select auth.uid()) = id);

create or replace function private.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger users_set_updated_at
  before update on public.users
  for each row
  execute function private.set_updated_at();

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.users (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function private.handle_new_user();

insert into public.users (id, name, birth_date, birth_time, gender, calendar_type, created_at)
select distinct on (r.user_id)
  r.user_id,
  r.name,
  r.birth_date,
  r.birth_time,
  r.gender,
  coalesce(r.calendar_type, 'solar'),
  r.created_at
from public.saju_readings r
where r.user_id is not null
order by r.user_id, r.created_at desc;

insert into public.users (id)
select id from auth.users
on conflict (id) do nothing;

alter table public.saju_readings
  drop constraint saju_readings_user_id_fkey;

alter table public.saju_readings
  add constraint saju_readings_user_id_fkey
  foreign key (user_id) references public.users (id) on delete cascade;

alter table public.saju_readings
  drop column name,
  drop column birth_date,
  drop column birth_time,
  drop column gender,
  drop column calendar_type;

drop policy if exists "Users can read own saju_readings" on public.saju_readings;
drop policy if exists "Users can insert own saju_readings" on public.saju_readings;
drop policy if exists "Users can update own saju_readings" on public.saju_readings;
drop policy if exists "Users can delete own saju_readings" on public.saju_readings;

create policy "Users can read own saju_readings"
  on public.saju_readings for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert own saju_readings"
  on public.saju_readings for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own saju_readings"
  on public.saju_readings for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete own saju_readings"
  on public.saju_readings for delete to authenticated
  using ((select auth.uid()) = user_id);
