begin;
do $$
declare aid uuid; uid uuid:=gen_random_uuid(); sid uuid; result public.schedule_submissions; blocked boolean;
begin
 select user_id into aid from public.admin_users limit 1;
 insert into auth.users(id,raw_user_meta_data) values(uid,'{"nickname":"테스트회원"}');
 if (select nickname from public.member_profiles where user_id=uid)<>'테스트회원' then raise exception 'Signup profile missing'; end if;
 insert into public.schedule_submissions(submitted_by,title,source_url) values(uid,'__review_test__','https://example.com') returning id into sid;
 perform set_config('request.jwt.claim.sub',uid::text,true);
 blocked:=false;
 begin perform public.set_submission_status(sid,'completed','pending'); exception when insufficient_privilege then blocked:=true; end;
 if not blocked then raise exception 'Member review accepted'; end if;
 perform set_config('request.jwt.claim.sub',aid::text,true);
 result:=public.set_submission_status(sid,'completed','pending');
 if result.status<>'completed' or result.reviewed_by<>aid or result.reviewed_at is null then raise exception 'Completion failed'; end if;
 blocked:=false;
 begin perform public.set_submission_status(sid,'completed','pending'); exception when others then blocked:=true; end;
 if not blocked then raise exception 'Stale review accepted'; end if;
 result:=public.set_submission_status(sid,'pending','completed');
 if result.status<>'pending' or result.reviewed_at is not null then raise exception 'Reopen failed'; end if;
 if (select count(*) from public.admin_edit_logs where entity_id=sid)<>2 then raise exception 'Audit failed'; end if;
 perform set_config('casting.test_uid',uid::text,true);
 perform set_config('request.jwt.claim.sub',uid::text,true);
end $$;
set local role authenticated;
do $$
declare uid uuid:=current_setting('casting.test_uid')::uuid; affected integer;
begin
 update public.member_profiles set nickname='변경닉네임' where user_id=uid;
 if (select nickname from public.submissions_with_members where submitted_by=uid limit 1)<>'변경닉네임' then raise exception 'Nickname view failed'; end if;
 if exists(select 1 from public.member_profiles where user_id<>uid) then raise exception 'Other profiles leaked'; end if;
 update public.member_profiles set nickname='침범' where user_id<>uid;
 get diagnostics affected=row_count;
 if affected<>0 then raise exception 'Other profile changed'; end if;
end $$;
rollback;
select 'PASS: signup nickname, rename, profile privacy, admin-only review, completion/reopen, conflicts, audit; rolled back' as result;
