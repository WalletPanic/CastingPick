-- Local wall-clock timestamps are Asia/Seoul. A production is one season at one venue.
create table public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.admin_users enable row level security;
revoke all on public.admin_users from anon, authenticated;
create or replace function public.is_admin() returns boolean language sql stable security definer
set search_path = '' as $$ select exists(select 1 from public.admin_users where user_id=auth.uid()) $$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

create table public.productions (
 id uuid primary key default gen_random_uuid(),
 title text not null check(length(trim(title)) between 1 and 120),
 subtitle text not null default '' check(length(subtitle)<=160),
 venue text not null check(length(trim(venue)) between 1 and 120),
 start_date date not null, end_date date not null,
 roles text[] not null check(cardinality(roles) between 1 and 30),
 motif text not null default 'moon' check(motif in ('moon','letter','blue')),
 updated_at timestamptz not null default now(),
 check(end_date>=start_date),
 unique(title,venue,start_date)
);
create table public.performances (
 id uuid primary key default gen_random_uuid(),
 production_id uuid not null references public.productions(id) on delete cascade,
 starts_at timestamp without time zone not null,
 "cast" jsonb not null check(jsonb_typeof("cast")='array'),
 updated_at timestamptz not null default now(),
 unique(production_id,starts_at)
);
create index performances_start on public.performances(starts_at);
create table public.favorites (
 user_id uuid not null references auth.users(id) on delete cascade,
 performance_id uuid not null references public.performances(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key(user_id,performance_id)
);
create table public.imports (
 id uuid primary key default gen_random_uuid(),
 production_id uuid not null references public.productions(id),
 created_by uuid not null references auth.users(id),
 source_url text,source_path text,summary jsonb not null,
 created_at timestamptz not null default now()
);
create table public.change_logs (
 id uuid primary key default gen_random_uuid(),
 import_id uuid not null references public.imports(id),
 performance_id uuid not null references public.performances(id),
 before_cast jsonb,after_cast jsonb not null,
 created_at timestamptz not null default now()
);
alter table public.productions enable row level security;
alter table public.performances enable row level security;
alter table public.favorites enable row level security;
alter table public.imports enable row level security;
alter table public.change_logs enable row level security;
revoke all on public.productions,public.performances,public.favorites,public.imports,public.change_logs from anon,authenticated;
grant select on public.productions,public.performances to anon,authenticated;
grant insert on public.productions to authenticated;
grant select,insert,delete on public.favorites to authenticated;
grant select on public.imports,public.change_logs to authenticated;
create policy production_read on public.productions for select to anon,authenticated using (true);
create policy production_insert on public.productions for insert to authenticated with check((select public.is_admin()));
create policy performance_read on public.performances for select to anon,authenticated using (true);
create policy favorite_read on public.favorites for select to authenticated using(user_id=(select auth.uid()));
create policy favorite_insert on public.favorites for insert to authenticated with check(user_id=(select auth.uid()));
create policy favorite_delete on public.favorites for delete to authenticated using(user_id=(select auth.uid()));
create policy import_read on public.imports for select to authenticated using((select public.is_admin()));
create policy log_read on public.change_logs for select to authenticated using((select public.is_admin()));

-- All imported rows and their audit records commit in one transaction.
-- Lock the production to serialize imports and check the exact reviewed version.
create or replace function public.commit_import(
 p_production_id uuid,p_rows jsonb,p_source_url text default null,p_source_path text default null
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
 prod public.productions%rowtype; previous public.performances%rowtype;
 item jsonb; canonical jsonb; old_canonical jsonb; moment timestamp; expected timestamptz;
 role_name text; import_id uuid; performance_id uuid; seen timestamp[] := '{}';
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
   if old_canonical=canonical then duplicate_count:=duplicate_count+1;continue;end if;
   if expected is distinct from previous.updated_at then raise exception '다른 검수에서 회차가 변경됐습니다. 공연을 다시 불러온 뒤 검수해주세요.';end if;
   update public.performances set "cast"=canonical,updated_at=clock_timestamp() where id=previous.id returning id into performance_id;
   changed_count:=changed_count+1;
   insert into public.change_logs(import_id,performance_id,before_cast,after_cast) values(import_id,performance_id,previous."cast",canonical);
  else
   if expected is not null then raise exception '회차가 변경됐습니다. 다시 불러와주세요.';end if;
   insert into public.performances(production_id,starts_at,"cast") values(p_production_id,moment,canonical) returning id into performance_id;
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

-- Private originals. Only admins may upload/read within their own directory.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('casting-sources','casting-sources',false,8388608,array['image/png','image/jpeg','image/webp']) on conflict(id) do nothing;
create policy source_insert on storage.objects for insert to authenticated with check(bucket_id='casting-sources' and (select public.is_admin()) and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy source_read on storage.objects for select to authenticated using(bucket_id='casting-sources' and (select public.is_admin()));
create policy source_delete on storage.objects for delete to authenticated using(bucket_id='casting-sources' and (select public.is_admin()) and (storage.foldername(name))[1]=(select auth.uid())::text);
