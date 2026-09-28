begin;
do $$
declare uid uuid:=gen_random_uuid(); other_id uuid:=gen_random_uuid(); name text:='T'||substr(gen_random_uuid()::text,1,11); blocked boolean;
begin
 insert into auth.users(id,raw_user_meta_data) values(uid,jsonb_build_object('nickname',name));
 perform set_config('request.jwt.claim.sub','',true);
 if public.nickname_available(' '||lower(name)||' ') then raise exception 'Case or whitespace duplicate missed'; end if;
 blocked:=false;
 begin insert into auth.users(id,raw_user_meta_data) values(other_id,jsonb_build_object('nickname',lower(name))); exception when unique_violation then blocked:=true; end;
 if not blocked then raise exception 'Duplicate signup accepted'; end if;
 insert into auth.users(id,raw_user_meta_data) values(other_id,'{}');
 blocked:=false;
 begin update public.member_profiles set nickname=lower(name) where user_id=other_id; exception when unique_violation then blocked:=true; end;
 if not blocked then raise exception 'Duplicate rename accepted'; end if;
 perform set_config('request.jwt.claim.sub',uid::text,true);
 if not public.nickname_available(name) then raise exception 'Own nickname blocked'; end if;
 if public.nickname_available(repeat('a',13)) then raise exception 'Long nickname accepted'; end if;
 blocked:=false;
 begin update public.member_profiles set nickname=repeat('a',13) where user_id=other_id; exception when check_violation then blocked:=true; end;
 if not blocked then raise exception 'Long nickname saved'; end if;
 if public.nickname_available(' ') then raise exception 'Invalid nickname accepted'; end if;
end $$;
rollback;
select 'PASS: duplicate signup/rename blocked, case/whitespace matching, own nickname allowed; rolled back' as result;
