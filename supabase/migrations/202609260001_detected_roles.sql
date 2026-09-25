begin;
create or replace function public.commit_import_with_roles(
 p_production_id uuid,p_roles text[],p_rows jsonb,p_source_url text default null,p_source_path text default null
) returns jsonb language plpgsql security definer set search_path='' as $$
declare prod public.productions%rowtype; result jsonb;
begin
 if not public.is_admin() then raise exception '관리자 권한이 필요합니다.' using errcode='42501'; end if;
 if p_roles is null or cardinality(p_roles) not between 1 and 30
 or exists(select 1 from unnest(p_roles) r where r is null or length(trim(r)) not between 1 and 80 or r<>trim(r))
 or (select count(distinct r) from unnest(p_roles) r)<>cardinality(p_roles)
 then raise exception '배역을 중복 없이 정확하게 입력해주세요.'; end if;
 select * into prod from public.productions where id=p_production_id for update;
 if not found then raise exception '공연을 찾을 수 없습니다.'; end if;
 if cardinality(prod.roles)=0 then
  if exists(select 1 from public.performances where production_id=p_production_id) then raise exception '기존 회차가 있는 공연의 배역을 확인해주세요.'; end if;
  update public.productions set roles=p_roles,updated_at=clock_timestamp() where id=p_production_id;
 elsif cardinality(prod.roles)<>cardinality(p_roles) or not(prod.roles @> p_roles and p_roles @> prod.roles) then
  raise exception '등록된 배역과 분석한 배역이 다릅니다. 공연을 다시 불러와주세요.';
 end if;
 result:=public.commit_import(p_production_id,p_rows,p_source_url,p_source_path);
 return result;
end $$;
revoke all on function public.commit_import_with_roles(uuid,text[],jsonb,text,text) from public;
grant execute on function public.commit_import_with_roles(uuid,text[],jsonb,text,text) to authenticated;
commit;
