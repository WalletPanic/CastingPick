-- Run once in Supabase SQL Editor. Existing public performances are unchanged.
begin;
create table if not exists public.schedule_submissions (
 id uuid primary key default gen_random_uuid(),
 submitted_by uuid not null references auth.users(id),
 production_id uuid references public.productions(id),
 title text not null check(length(trim(title)) between 1 and 120),
 source_url text check(source_url is null or (source_url like 'https://%' and length(source_url)<=2000)),
 image_paths text[] not null check(cardinality(image_paths) between 1 and 5),
 status text not null default 'pending' check(status='pending'),
 created_at timestamptz not null default now()
);
alter table public.schedule_submissions enable row level security;
revoke all on public.schedule_submissions from anon,authenticated;
grant select,insert on public.schedule_submissions to authenticated;
drop policy if exists submission_read on public.schedule_submissions;
create policy submission_read on public.schedule_submissions for select to authenticated
 using(submitted_by=(select auth.uid()) or (select public.is_admin()));
drop policy if exists submission_insert on public.schedule_submissions;
create policy submission_insert on public.schedule_submissions for insert to authenticated
 with check(submitted_by=(select auth.uid()) and status='pending');
create or replace function public.validate_submission() returns trigger
language plpgsql set search_path='' as $$
declare path text;
begin
 new.created_at:=now();
 foreach path in array new.image_paths loop
  if path is null or path not like (new.submitted_by::text||'/'||new.id::text||'/%') or path like '%..%' then
   raise exception '잘못된 제출 이미지 경로입니다.';
  end if;
 end loop;
 return new;
end $$;
revoke all on function public.validate_submission() from public;
drop trigger if exists validate_submission on public.schedule_submissions;
create trigger validate_submission before insert on public.schedule_submissions for each row execute function public.validate_submission();
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('schedule-submissions','schedule-submissions',false,8388608,array['image/png','image/jpeg','image/webp']) on conflict(id) do nothing;
drop policy if exists submission_image_insert on storage.objects;
create policy submission_image_insert on storage.objects for insert to authenticated
 with check(bucket_id='schedule-submissions' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists submission_image_read on storage.objects;
create policy submission_image_read on storage.objects for select to authenticated
 using(bucket_id='schedule-submissions' and ((storage.foldername(name))[1]=(select auth.uid())::text or (select public.is_admin())));
drop policy if exists submission_image_cleanup on storage.objects;
create policy submission_image_cleanup on storage.objects for delete to authenticated
 using(bucket_id='schedule-submissions' and (storage.foldername(name))[1]=(select auth.uid())::text
 and not exists(select 1 from public.schedule_submissions s where storage.objects.name=any(s.image_paths)));
commit;
