-- Existing schedules are treated as the first release; correct them when needed.
alter table public.performances add column if not exists casting_round integer not null default 1 check (casting_round >= 1);

create or replace function public.commit_import(
 p_production_id uuid,p_rows jsonb,p_source_url text default null,p_source_path text default null
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
 prod public.productions%rowtype; previous public.performances%rowtype;
 item jsonb; canonical jsonb; old_canonical jsonb; moment timestamp; expected timestamptz;
 round_number integer; role_name text; import_id uuid; performance_id uuid; seen timestamp[] := '{}';
 new_count int:=0; changed_count int:=0; duplicate_count int:=0; result jsonb;
begin
 if not public.is_admin() then raise exception '관리자 권한이 필요합니다.' using errcode='42501'; end if;
 if jsonb_typeof(p_rows) is distinct from 'array' or jsonb_array_length(p_rows) not between 1 and 200 then raise exception '회차는 1~200개를 입력해주세요.'; end if;
 if p_source_url is not null and p_source_url !~ '^https://(www\.)?instagram\.com/(p|reel)/[A-Za-z0-9_-]+/?([?].*)?$' then raise exception '인스타 출처 링크를 확인해주세요.'; end if;
 if p_source_path is not null and split_part(p_source_path,'/',1)<>auth.uid()::text then raise exception '잘못된 이미지 경로입니다.'; end if;
 select * into prod from public.productions where id=p_production_id for update;
 if not found then raise exception '공연을 찾을 수 없습니다.'; end if;
 insert into public.imports(production_id,created_by,source_url,source_path,summary)
 values(p_production_id,auth.uid(),p_source_url,p_source_path,'{}') returning id into import_id;
 for item in select value from jsonb_array_elements(p_rows) loop
  if coalesce(item->>'starts_at','') !~ '^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d:00$' then raise exception '날짜/시간 형식을 확인해주세요.'; end if;
  if item ? 'casting_round' and (jsonb_typeof(item->'casting_round') <> 'number' or (item->>'casting_round') !~ '^[1-9][0-9]*$') then raise exception '공개 차수는 1 이상의 정수여야 합니다.'; end if;
  round_number:=coalesce((item->>'casting_round')::integer,1);
  moment:=(item->>'starts_at')::timestamp;
  if moment::date<prod.start_date or moment::date>prod.end_date then raise exception '공연 기간 밖의 날짜입니다.'; end if;
  if moment=any(seen) then raise exception '검수 목록에 중복 회차가 있습니다.'; end if;
  seen:=array_append(seen,moment);
  if jsonb_typeof(item->'cast') is distinct from 'array' or jsonb_array_length(item->'cast')<>cardinality(prod.roles) then raise exception '모든 배역을 입력해주세요.'; end if;
  foreach role_name in array prod.roles loop
   if (select count(*) from jsonb_array_elements(item->'cast') c where c->>'role'=role_name and jsonb_typeof(c->'actor')='string' and length(trim(c->>'actor')) between 1 and 80)<>1 then raise exception '배역별 배우를 정확하게 입력해주세요: %',role_name; end if;
  end loop;
  select jsonb_agg(jsonb_build_object('role',c->>'role','actor',trim(c->>'actor')) order by c->>'role') into canonical from jsonb_array_elements(item->'cast') c;
  select * into previous from public.performances where production_id=p_production_id and starts_at=moment for update;
  expected:=nullif(item->>'expected_updated_at','')::timestamptz;
  if found then
   select jsonb_agg(c order by c->>'role') into old_canonical from jsonb_array_elements(previous."cast") c;
   if old_canonical=canonical and previous.casting_round=round_number then duplicate_count:=duplicate_count+1;continue;end if;
   if expected is distinct from previous.updated_at then raise exception '다른 검수에서 회차가 변경됐습니다. 공연을 다시 불러온 뒤 검수해주세요.';end if;
   update public.performances set "cast"=canonical,casting_round=round_number,updated_at=clock_timestamp() where id=previous.id returning id into performance_id;
   changed_count:=changed_count+1;
   insert into public.change_logs(import_id,performance_id,before_cast,after_cast) values(import_id,performance_id,previous."cast",canonical);
  else
   if expected is not null then raise exception '회차가 변경됐습니다. 다시 불러와주세요.';end if;
   insert into public.performances(production_id,starts_at,"cast",casting_round) values(p_production_id,moment,canonical,round_number) returning id into performance_id;
   new_count:=new_count+1;
   insert into public.change_logs(import_id,performance_id,before_cast,after_cast) values(import_id,performance_id,null,canonical);
  end if;
 end loop;
 result:=jsonb_build_object('new',new_count,'changed',changed_count,'duplicate',duplicate_count);
 update public.imports set summary=result where id=import_id;
 return result;
end $$;
revoke all on function public.commit_import(uuid,jsonb,text,text) from public;
grant execute on function public.commit_import(uuid,jsonb,text,text) to authenticated;

-- Role numbering follows production.roles, never JSON array order.
-- Invoker security preserves the underlying tables' RLS policies.
create or replace view public.casting_schedule with (security_invoker = true) as
select s.id as performance_id, p.id as production_id,
 p.title as production_title,
 extract(year from p.start_date)::integer as production_year,
 p.venue as theater_name, s.casting_round,
 s.starts_at::date as performance_date,
 s.starts_at::time as performance_time,
 p.roles[1] as lead_1_character,
 (select c->>'actor' from jsonb_array_elements(s."cast") c where c->>'role'=p.roles[1] limit 1) as lead_1_actor,
 p.roles[2] as lead_2_character,
 (select c->>'actor' from jsonb_array_elements(s."cast") c where c->>'role'=p.roles[2] limit 1) as lead_2_actor,
 s."cast" as full_cast
from public.performances s join public.productions p on p.id=s.production_id;
grant select on public.casting_schedule to anon, authenticated;
comment on view public.casting_schedule is 'One row per performance. Year is season start year; time is Asia/Seoul. Casting round is schedule release number.';
