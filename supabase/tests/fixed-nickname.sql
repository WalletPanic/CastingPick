begin;
do $$
declare uid uuid:=gen_random_uuid(); blocked boolean;
begin
 insert into auth.users(id,raw_user_meta_data) values(uid,'{}');
 update public.member_profiles set nickname='T'||substr(uid::text,1,10) where user_id=uid;
 blocked:=false;
 begin update public.member_profiles set nickname='변경시도' where user_id=uid; exception when others then blocked:=true; end;
 if not blocked then raise exception 'Rename allowed'; end if;
 blocked:=false;
 begin update public.member_profiles set nickname=null where user_id=uid; exception when others then blocked:=true; end;
 if not blocked then raise exception 'Nickname reset allowed'; end if;
 update public.member_profiles set nickname=nickname where user_id=uid;
 if exists(select 1 from public.member_profiles p join public.admin_users a on a.user_id=p.user_id where p.nickname is not null) then raise exception 'Admin nickname remains'; end if;
end $$;
rollback;
select 'PASS: initial setting, rename/reset blocked, unchanged allowed, admins have no nickname; rolled back' as result;
