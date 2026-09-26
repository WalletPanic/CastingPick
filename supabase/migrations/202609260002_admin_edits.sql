begin;
create table if not exists public.admin_edit_logs(
 id uuid primary key default gen_random_uuid(), actor_id uuid not null references auth.users(id),
 entity_type text not null, entity_id uuid not null, before_data jsonb not null, after_data jsonb not null, created_at timestamptz not null default now()
);
alter table public.admin_edit_logs enable row level security;
revoke all on public.admin_edit_logs from anon,authenticated;
grant select on public.admin_edit_logs to authenticated;
create policy admin_edit_log_read on public.admin_edit_logs for select to authenticated using((select public.is_admin()));
create or replace function public.edit_production(p_id uuid,p_expected timestamptz,p_data jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare old public.productions%rowtype; updated public.productions%rowtype; start_day date; end_day date;
begin
 if not public.is_admin() then raise exception '관리자 권한이 필요합니다.' using errcode='42501'; end if;
 select * into old from public.productions where id=p_id for update;
 if not found then raise exception '공연을 찾을 수 없습니다.'; end if;
 if old.updated_at is distinct from p_expected then raise exception '다른 관리자가 수정했습니다. 새로고침 후 다시 확인해주세요.'; end if;
 start_day:=(p_data->>'start_date')::date; end_day:=(p_data->>'end_date')::date;
 if exists(select 1 from public.performances where production_id=p_id and (starts_at::date<start_day or starts_at::date>end_day)) then raise exception '등록된 회차를 포함하는 공연 기간으로 설정해주세요.'; end if;
 update public.productions set title=trim(p_data->>'title'),venue=trim(p_data->>'venue'),start_date=start_day,end_date=end_day,poster_url=p_data->>'poster_url',updated_at=clock_timestamp() where id=p_id returning * into updated;
 insert into public.admin_edit_logs(actor_id,entity_type,entity_id,before_data,after_data) values(auth.uid(),'production',p_id,to_jsonb(old),to_jsonb(updated));
 return to_jsonb(updated);
end $$;
create or replace function public.edit_performance(p_id uuid,p_expected timestamptz,p_data jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare old public.performances%rowtype; updated public.performances%rowtype; prod public.productions%rowtype; prod_id uuid; moment timestamp; role_name text; canonical jsonb;
begin
 if not public.is_admin() then raise exception '관리자 권한이 필요합니다.' using errcode='42501'; end if;
 select production_id into prod_id from public.performances where id=p_id;
 select * into prod from public.productions where id=prod_id for update;
 select * into old from public.performances where id=p_id for update;
 if not found then raise exception '회차를 찾을 수 없습니다.'; end if;
 if old.updated_at is distinct from p_expected then raise exception '다른 관리자가 수정했습니다. 새로고침 후 다시 확인해주세요.'; end if;
 if coalesce(p_data->>'starts_at','') !~ '^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d:00$' then raise exception '날짜와 시간을 확인해주세요.'; end if;
 moment:=(p_data->>'starts_at')::timestamp;
 if moment::date<prod.start_date or moment::date>prod.end_date then raise exception '공연 기간 밖의 날짜입니다.'; end if;
 if coalesce(p_data->>'casting_round','') !~ '^[1-9][0-9]*$' then raise exception '티켓 오픈 차수를 확인해주세요.'; end if;
 if exists(select 1 from public.performances where production_id=prod_id and starts_at=moment and id<>p_id) then raise exception '같은 날짜와 시간의 회차가 이미 있습니다.'; end if;
 if jsonb_typeof(p_data->'cast') is distinct from 'array' or jsonb_array_length(p_data->'cast')<>cardinality(prod.roles) then raise exception '모든 배역의 배우를 입력해주세요.'; end if;
 foreach role_name in array prod.roles loop
  if (select count(*) from jsonb_array_elements(p_data->'cast') c where c->>'role'=role_name and jsonb_typeof(c->'actor')='string' and length(trim(c->>'actor')) between 1 and 80)<>1 then raise exception '배역별 배우를 확인해주세요: %',role_name; end if;
 end loop;
 select jsonb_agg(jsonb_build_object('role',c->>'role','actor',trim(c->>'actor')) order by c->>'role') into canonical from jsonb_array_elements(p_data->'cast') c;
 update public.performances set starts_at=moment,"cast"=canonical,casting_round=(p_data->>'casting_round')::integer,updated_at=clock_timestamp() where id=p_id returning * into updated;
 insert into public.admin_edit_logs(actor_id,entity_type,entity_id,before_data,after_data) values(auth.uid(),'performance',p_id,to_jsonb(old),to_jsonb(updated));
 return to_jsonb(updated);
end $$;
revoke all on function public.edit_production(uuid,timestamptz,jsonb),public.edit_performance(uuid,timestamptz,jsonb) from public;
grant execute on function public.edit_production(uuid,timestamptz,jsonb),public.edit_performance(uuid,timestamptz,jsonb) to authenticated;
commit;
