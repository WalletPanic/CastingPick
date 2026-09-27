begin;
do $$
declare pid uuid; stamp timestamptz; aid uuid; result jsonb; payload jsonb; invalid jsonb; blocked boolean;
begin
 select user_id into aid from public.admin_users limit 1;
 if aid is null then raise exception 'Missing admin'; end if;
 perform set_config('request.jwt.claim.sub',aid::text,true);
 insert into public.productions(title,venue,start_date,end_date,roles) values('__filter_roles_test__','test','2026-11-01','2026-11-30',array['주연','조연']) returning id,updated_at into pid,stamp;
 payload:='{"title":"__filter_roles_test__","venue":"test","start_date":"2026-11-01","end_date":"2026-11-30","filter_roles":["주연"]}';
 result:=public.edit_production(pid,stamp,payload);
 if result->'filter_roles'<>'["주연"]'::jsonb or result->'roles'<>'["주연","조연"]'::jsonb then raise exception 'Selection or role preservation failed'; end if;
 stamp:=(result->>'updated_at')::timestamptz;
 result:=public.edit_production(pid,stamp,payload-'filter_roles');
 if result->'filter_roles'<>'["주연"]'::jsonb then raise exception 'Legacy preservation failed'; end if;
 stamp:=(result->>'updated_at')::timestamptz;
 foreach invalid in array array['["없는 배역"]'::jsonb,'["주연","주연"]'::jsonb,'[1]'::jsonb,'null'::jsonb] loop
  blocked:=false;
  begin perform public.edit_production(pid,stamp,jsonb_set(payload,'{filter_roles}',invalid)); exception when others then blocked:=true; end;
  if not blocked then raise exception 'Invalid roles accepted: %',invalid; end if;
 end loop;
 result:=public.edit_production(pid,stamp,jsonb_set(payload,'{filter_roles}','[]'));
 if result->'filter_roles'<>'[]'::jsonb then raise exception 'Empty selection failed'; end if;
 if (select count(*) from public.admin_edit_logs where entity_id=pid)<>3 then raise exception 'Audit missing'; end if;
 perform set_config('request.jwt.claim.sub','',true);
 blocked:=false;
 begin perform public.edit_production(pid,(result->>'updated_at')::timestamptz,payload); exception when insufficient_privilege then blocked:=true; end;
 if not blocked then raise exception 'Unauthorized accepted'; end if;
end $$;
rollback;
select 'PASS: selection, original roles, legacy payload, invalid roles, empty selection, audit, authorization; rolled back' as result;
