begin;
create unique index member_profiles_nickname_unique on public.member_profiles(lower(trim(nickname))) where nickname is not null;
create function public.nickname_available(p_nickname text) returns boolean language sql stable security definer set search_path='' as $$
 select coalesce(length(trim(p_nickname)) between 2 and 20 and not exists(select 1 from public.member_profiles where lower(trim(nickname))=lower(trim(p_nickname)) and user_id is distinct from auth.uid()),false);
$$;
revoke all on function public.nickname_available(text) from public;
grant execute on function public.nickname_available(text) to anon,authenticated;
commit;
