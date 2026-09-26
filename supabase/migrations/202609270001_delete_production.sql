begin;
-- Recover only missing role arrays from already stored cast data; never invent names.
update public.productions p set roles=coalesce((select array_agg(distinct c->>'role' order by c->>'role') from public.performances s cross join lateral jsonb_array_elements(s."cast") c where s.production_id=p.id and length(trim(c->>'role'))>0),'{}'),updated_at=clock_timestamp() where roles is null;
alter table public.productions alter column roles set default '{}';
alter table public.productions alter column roles set not null;
create or replace function public.delete_production(p_id uuid,p_expected timestamptz)
returns jsonb language plpgsql security definer set search_path='' as $$
declare prod public.productions%rowtype; snapshot jsonb; row_count integer;
begin
 if not public.is_admin() then raise exception '관리자 권한이 필요합니다.' using errcode='42501'; end if;
 select * into prod from public.productions where id=p_id for update;
 if not found then raise exception '이미 삭제되었거나 없는 공연입니다.'; end if;
 if prod.updated_at is distinct from p_expected then raise exception '공연 정보가 변경되었습니다. 새로고침 후 다시 확인해주세요.'; end if;
 select count(*) into row_count from public.performances where production_id=p_id;
 snapshot:=jsonb_build_object('production',to_jsonb(prod),'performances',coalesce((select jsonb_agg(to_jsonb(s)) from public.performances s where production_id=p_id),'[]'::jsonb),'imports',coalesce((select jsonb_agg(to_jsonb(i)) from public.imports i where production_id=p_id),'[]'::jsonb),'change_logs',coalesce((select jsonb_agg(to_jsonb(c)) from public.change_logs c where c.import_id in(select id from public.imports where production_id=p_id) or c.performance_id in(select id from public.performances where production_id=p_id)),'[]'::jsonb));
 insert into public.admin_edit_logs(actor_id,entity_type,entity_id,before_data,after_data) values(auth.uid(),'production_deleted',p_id,snapshot,jsonb_build_object('deleted',true));
 update public.schedule_submissions set production_id=null where production_id=p_id;
 delete from public.change_logs where import_id in(select id from public.imports where production_id=p_id) or performance_id in(select id from public.performances where production_id=p_id);
 delete from public.imports where production_id=p_id;
 delete from public.productions where id=p_id;
 return jsonb_build_object('deleted',true,'performances_deleted',row_count);
end $$;
revoke all on function public.delete_production(uuid,timestamptz) from public;
grant execute on function public.delete_production(uuid,timestamptz) to authenticated;
commit;
