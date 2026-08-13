-- Applied via Supabase MCP (count_saju_readings_rpc).
-- Guests cannot read saju_readings rows. This RPC returns only the count of saved results.

create or replace function private.count_saju_readings()
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::bigint
  from public.saju_readings
  where result is not null
    and btrim(result) <> '';
$$;

revoke all on function private.count_saju_readings() from public, anon, authenticated;

create or replace function public.count_saju_readings()
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select private.count_saju_readings();
$$;

revoke all on function public.count_saju_readings() from public;
grant execute on function public.count_saju_readings() to anon, authenticated;
