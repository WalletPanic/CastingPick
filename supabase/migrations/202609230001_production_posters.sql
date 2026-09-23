begin;
-- Allow publishing production metadata before a casting schedule is available.
alter table public.productions drop constraint if exists productions_roles_check;
alter table public.productions add constraint productions_roles_check check(cardinality(roles) between 0 and 30);
alter table public.productions add column if not exists poster_url text;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('production-posters','production-posters',true,8388608,array['image/png','image/jpeg','image/webp']) on conflict(id) do nothing;
drop policy if exists poster_admin_insert on storage.objects;
create policy poster_admin_insert on storage.objects for insert to authenticated
with check(bucket_id='production-posters' and (select public.is_admin()) and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists poster_admin_read on storage.objects;
create policy poster_admin_read on storage.objects for select to authenticated
using(bucket_id='production-posters' and (select public.is_admin()));
drop policy if exists poster_admin_delete on storage.objects;
create policy poster_admin_delete on storage.objects for delete to authenticated
using(bucket_id='production-posters' and (select public.is_admin()) and (storage.foldername(name))[1]=(select auth.uid())::text);
commit;
