begin;
do $$
declare pid uuid; sid uuid; iid uuid; aid uuid; stamp timestamptz; result jsonb; blocked boolean:=false;
begin
 select user_id into aid from public.admin_users limit 1;
 if aid is null then raise exception 'Admin required for test'; end if;
 insert into public.productions(title,venue,start_date,end_date) values('__delete_test__','__test__','2026-11-01','2026-11-30') returning id,updated_at into pid,stamp;
 insert into public.performances(production_id,starts_at,"cast") values(pid,'2026-11-01T19:00:00','[]') returning id into sid;
 insert into public.favorites(user_id,performance_id) values(aid,sid);
 insert into public.imports(production_id,created_by,summary) values(pid,aid,'{}') returning id into iid;
 insert into public.change_logs(import_id,performance_id,after_cast) values(iid,sid,'[]');
 insert into public.schedule_submissions(id,submitted_by,production_id,title,image_paths) values('00000000-0000-0000-0000-000000000001',aid,pid,'__delete_test__',array[aid::text||'/00000000-0000-0000-0000-000000000001/a.png']);
 perform set_config('request.jwt.claim.sub','',true);
 begin perform public.delete_production(pid,stamp); exception when insufficient_privilege then blocked:=true; end;
 if not blocked then raise exception 'Anonymous deletion accepted'; end if;
 perform set_config('request.jwt.claim.sub',aid::text,true);
 blocked:=false;
 begin perform public.delete_production(pid,stamp-interval '1 second'); exception when others then blocked:=true; end;
 if not blocked then raise exception 'Stale deletion accepted'; end if;
 result:=public.delete_production(pid,stamp);
 if result->>'deleted'<>'true' or exists(select 1 from public.productions where id=pid) or exists(select 1 from public.performances where id=sid) or exists(select 1 from public.favorites where performance_id=sid) then raise exception 'Deletion incomplete'; end if;
 if not exists(select 1 from public.admin_edit_logs where entity_id=pid and entity_type='production_deleted') then raise exception 'Audit absent'; end if;
 if not exists(select 1 from public.schedule_submissions where id='00000000-0000-0000-0000-000000000001' and production_id is null) then raise exception 'Submission lost'; end if;
end $$;
rollback;

select 'PASS: administrator-only confirmed deletion, stale guard, linked rows, audit and submission preservation; test rolled back' as result;
