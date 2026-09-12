create table if not exists public.ai_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null default (now() at time zone 'utc')::date,
  count integer not null default 0,
  primary key (user_id, day)
);

-- No policies: this table is only ever touched by the Edge Function through
-- the service role, which bypasses RLS. Enabling RLS with no policy means a
-- leaked anon/user key still cannot read or write it.
alter table public.ai_usage enable row level security;

create or replace function public.claim_ai_request(p_user uuid, p_limit integer)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  new_count integer;
begin
  insert into public.ai_usage (user_id, day, count)
  values (p_user, (now() at time zone 'utc')::date, 1)
  on conflict (user_id, day)
    do update set count = public.ai_usage.count + 1
  returning count into new_count;

  return new_count <= p_limit;
end;
$$;

revoke all on function public.claim_ai_request(uuid, integer) from public, anon, authenticated;
