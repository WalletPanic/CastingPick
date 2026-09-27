begin;
do $$
declare uid uuid; sid uuid; bad text; blocked boolean;
begin
 select user_id into uid from public.admin_users limit 1;
 if uid is null then raise exception 'Missing test user'; end if;
 insert into public.schedule_submissions(submitted_by,title,source_url) values(uid,'__link_test__','https://example.com/schedule') returning id into sid;
 if (select cardinality(image_paths) from public.schedule_submissions where id=sid)<>0 then raise exception 'Link-only submission failed'; end if;
 foreach bad in array array[null::text,'','http://example.com','https://','javascript:alert(1)','https://example.com/has space'] loop
  blocked:=false;
  begin insert into public.schedule_submissions(submitted_by,title,source_url) values(uid,'__invalid_test__',bad); exception when others then blocked:=true; end;
  if not blocked then raise exception 'Invalid source accepted: %',bad; end if;
 end loop;
 sid:=gen_random_uuid();
 insert into public.schedule_submissions(id,submitted_by,title,source_url,image_paths) values(sid,uid,'__image_test__','https://example.com/schedule',array[uid::text||'/'||sid::text||'/image.png']);
 blocked:=false;
 begin insert into public.schedule_submissions(submitted_by,title,source_url,image_paths) values(uid,'__bad_path__','https://example.com',array['someone-else/image.png']); exception when others then blocked:=true; end;
 if not blocked then raise exception 'Bad image path accepted'; end if;
end $$;
rollback;
select 'PASS: link-only, required link validation, optional image, image ownership; all rolled back' as result;
