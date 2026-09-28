begin;
-- Preserve existing long nicknames; new or changed profiles use the shorter limit.
alter table public.member_profiles add constraint member_profiles_nickname_length check(nickname is null or length(nickname) between 2 and 12) not valid;
create or replace function public.nickname_available(p_nickname text) returns boolean language sql stable security definer set search_path='' as $$
 select coalesce(length(trim(p_nickname)) between 2 and 12 and not exists(select 1 from public.member_profiles where lower(trim(nickname))=lower(trim(p_nickname)) and user_id is distinct from auth.uid()),false);
$$;
commit;
