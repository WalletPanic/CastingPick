create or replace function public.validate_production_roles() returns trigger language plpgsql set search_path='' as $$
begin
 if exists(select 1 from unnest(new.roles) r where r is null or length(trim(r)) not between 1 and 80 or r<>trim(r))
 or (select count(distinct r) from unnest(new.roles) r)<>cardinality(new.roles)
 then raise exception '배역은 중복 없이 1~80자로 입력해주세요.';end if;
 return new;
end $$;
revoke all on function public.validate_production_roles() from public;
create trigger validate_roles before insert or update of roles on public.productions for each row execute function public.validate_production_roles();
