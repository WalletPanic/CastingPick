-- Run only against a disposable/local Supabase DB after migrations.
-- psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/security.sql
begin;
create function pg_temp.assert_true(value boolean,message text) returns void language plpgsql as $$ begin if value is distinct from true then raise exception 'FAIL: %',message;end if;end $$;
create function pg_temp.must_fail(statement text) returns void language plpgsql as $$
begin
 begin execute statement;
 exception when others then return;
 end;
 raise exception 'FAIL: expected rejection: %',statement;
end $$;
insert into auth.users(id,email) values
 ('b0000000-0000-4000-8000-000000000001','cp-admin@test.invalid'),
 ('b0000000-0000-4000-8000-000000000002','cp-user@test.invalid'),
 ('b0000000-0000-4000-8000-000000000003','cp-other@test.invalid');
insert into public.admin_users values('b0000000-0000-4000-8000-000000000001');
insert into public.productions(id,title,venue,start_date,end_date,roles)
values('b0000000-0000-4000-8000-000000000010','테스트 공연','테스트 극장','2026-10-01','2026-10-31',array['주연']);
set local role anon;
select pg_temp.assert_true(not public.is_admin(),'anon not admin');
select pg_temp.assert_true(exists(select 1 from public.productions where id='b0000000-0000-4000-8000-000000000010'),'public read');
select pg_temp.must_fail('insert into public.admin_users values(''b0000000-0000-4000-8000-000000000002'')');
select pg_temp.must_fail('delete from public.performances');
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','b0000000-0000-4000-8000-000000000002',true);
select pg_temp.must_fail($q$select public.commit_import('b0000000-0000-4000-8000-000000000010','[]')$q$);
select pg_temp.must_fail($q$insert into public.productions(title,venue,start_date,end_date,roles) values('금지','극장','2026-10-01','2026-10-31',array['역할'])$q$);
select set_config('request.jwt.claim.sub','b0000000-0000-4000-8000-000000000001',true);
select pg_temp.assert_true(public.is_admin(),'admin recognized');
select pg_temp.assert_true(public.commit_import('b0000000-0000-4000-8000-000000000010','[{"starts_at":"2026-10-03T14:00:00","cast":[{"role":"주연","actor":"배우A"}],"expected_updated_at":null}]')->>'new'='1','new row');
select pg_temp.assert_true(public.commit_import('b0000000-0000-4000-8000-000000000010','[{"starts_at":"2026-10-03T14:00:00","cast":[{"role":"주연","actor":"배우A"}],"expected_updated_at":null}]')->>'duplicate'='1','duplicate skipped');
select pg_temp.must_fail($q$select public.commit_import('b0000000-0000-4000-8000-000000000010','[{"starts_at":"2026-10-03T14:00:00","cast":[{"role":"주연","actor":"배우B"}],"expected_updated_at":null}]')$q$);
select pg_temp.assert_true(public.commit_import('b0000000-0000-4000-8000-000000000010',jsonb_build_array(jsonb_build_object('starts_at','2026-10-03T14:00:00','cast','[{"role":"주연","actor":"배우B"}]'::jsonb,'expected_updated_at',(select updated_at from public.performances where production_id='b0000000-0000-4000-8000-000000000010'))))->>'changed'='1','confirmed change');
select pg_temp.must_fail($q$select public.commit_import('b0000000-0000-4000-8000-000000000010','[{"starts_at":"2026-10-04T14:00:00","cast":[{"role":"주연","actor":"배우A"}]},{"starts_at":"2026-11-04T14:00:00","cast":[{"role":"주연","actor":"배우A"}]}]')$q$);
select pg_temp.assert_true((select count(*)=1 from public.performances where production_id='b0000000-0000-4000-8000-000000000010'),'batch rollback');
select set_config('request.jwt.claim.sub','b0000000-0000-4000-8000-000000000002',true);
insert into public.favorites(user_id,performance_id) select 'b0000000-0000-4000-8000-000000000002',id from public.performances where production_id='b0000000-0000-4000-8000-000000000010';
select pg_temp.assert_true((select count(*)=1 from public.favorites),'own favorites visible');
select set_config('request.jwt.claim.sub','b0000000-0000-4000-8000-000000000003',true);
select pg_temp.assert_true((select count(*)=0 from public.favorites),'other favorites hidden');
delete from public.favorites where user_id='b0000000-0000-4000-8000-000000000002';
select pg_temp.must_fail($q$insert into public.favorites(user_id,performance_id) select 'b0000000-0000-4000-8000-000000000002',id from public.performances where production_id='b0000000-0000-4000-8000-000000000010'$q$);
select set_config('request.jwt.claim.sub','b0000000-0000-4000-8000-000000000002',true);
select pg_temp.assert_true((select count(*)=1 from public.favorites),'other user cannot delete favorites');
rollback;
