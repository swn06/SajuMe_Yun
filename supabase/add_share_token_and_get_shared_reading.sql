-- Applied via Supabase MCP (add_share_token_and_get_shared_reading).
-- Share links use share_token. Friends cannot list readings; they only fetch one row via RPC.

alter table public.saju_readings
  add column if not exists share_token uuid not null default gen_random_uuid();

create unique index if not exists saju_readings_share_token_idx
  on public.saju_readings (share_token);

create or replace function private.get_shared_reading(p_token uuid)
returns table (
  share_token uuid,
  result text,
  created_at timestamptz,
  name text,
  birth_date date,
  birth_time time,
  gender text,
  calendar_type text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    r.share_token,
    r.result,
    r.created_at,
    u.name,
    u.birth_date,
    u.birth_time,
    u.gender,
    u.calendar_type
  from public.saju_readings as r
  join public.users as u on u.id = r.user_id
  where r.share_token = p_token
  limit 1;
$$;

revoke all on function private.get_shared_reading(uuid) from public, anon, authenticated;

create or replace function public.get_shared_reading(p_token uuid)
returns table (
  share_token uuid,
  result text,
  created_at timestamptz,
  name text,
  birth_date date,
  birth_time time,
  gender text,
  calendar_type text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    s.share_token,
    s.result,
    s.created_at,
    s.name,
    s.birth_date,
    s.birth_time,
    s.gender,
    s.calendar_type
  from private.get_shared_reading(p_token) as s;
$$;

revoke all on function public.get_shared_reading(uuid) from public;
grant execute on function public.get_shared_reading(uuid) to anon, authenticated;
