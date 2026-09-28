begin;
update public.member_profiles set nickname=null where user_id in(select user_id from public.admin_users);
create function public.lock_member_nickname() returns trigger language plpgsql set search_path='' as $$
begin
 if old.nickname is not null and new.nickname is distinct from old.nickname then
  raise exception '한 번 설정한 닉네임은 변경할 수 없습니다.';
 end if;
 return new;
end $$;
revoke all on function public.lock_member_nickname() from public;
create trigger lock_member_nickname before update on public.member_profiles for each row execute function public.lock_member_nickname();
commit;
