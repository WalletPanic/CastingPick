begin;
create or replace function public.edit_production(p_id uuid,p_expected timestamptz,p_data jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare old public.productions%rowtype; updated public.productions%rowtype; start_day date; end_day date; selected_roles text[];
begin
 if not public.is_admin() then raise exception '관리자 권한이 필요합니다.' using errcode='42501'; end if;
 select * into old from public.productions where id=p_id for update;
 if not found then raise exception '공연을 찾을 수 없습니다.'; end if;
 if old.updated_at is distinct from p_expected then raise exception '다른 관리자가 수정했습니다. 새로고침 후 다시 확인해주세요.'; end if;
 selected_roles:=old.filter_roles;
 if p_data ? 'filter_roles' then
  if jsonb_typeof(p_data->'filter_roles') is distinct from 'array' then raise exception '표시할 배역을 목록으로 선택해주세요.'; end if;
  if exists(select 1 from jsonb_array_elements(p_data->'filter_roles') item where jsonb_typeof(item) is distinct from 'string') then raise exception '배역 이름을 확인해주세요.'; end if;
  select coalesce(array_agg(role),array[]::text[]) into selected_roles from jsonb_array_elements_text(p_data->'filter_roles') role;
  if exists(select 1 from unnest(selected_roles) role where not(role=any(old.roles))) or cardinality(selected_roles)<>(select count(distinct role) from unnest(selected_roles) role) then raise exception '등록된 배역을 중복 없이 선택해주세요.'; end if;
 end if;
 start_day:=(p_data->>'start_date')::date; end_day:=(p_data->>'end_date')::date;
 if exists(select 1 from public.performances where production_id=p_id and (starts_at::date<start_day or starts_at::date>end_day)) then raise exception '등록된 회차를 포함하는 공연 기간으로 설정해주세요.'; end if;
 update public.productions set title=trim(p_data->>'title'),venue=trim(p_data->>'venue'),start_date=start_day,end_date=end_day,poster_url=p_data->>'poster_url',filter_roles=selected_roles,updated_at=clock_timestamp() where id=p_id returning * into updated;
 insert into public.admin_edit_logs(actor_id,entity_type,entity_id,before_data,after_data) values(auth.uid(),'production',p_id,to_jsonb(old),to_jsonb(updated));
 return to_jsonb(updated);
end $$;
commit;
