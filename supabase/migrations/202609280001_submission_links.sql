begin;
alter table public.schedule_submissions drop constraint if exists schedule_submissions_image_paths_check;
alter table public.schedule_submissions add constraint schedule_submissions_image_paths_check check(cardinality(image_paths) between 0 and 5);
alter table public.schedule_submissions alter column image_paths set default '{}';
create or replace function public.validate_submission() returns trigger
language plpgsql set search_path='' as $$
declare path text;
begin
 if new.source_url is null or length(new.source_url)>2000 or new.source_url !~ '^https://[^/@[:space:]?#]+([/?#][^[:space:]]*)?$' then raise exception '올바른 출처 링크를 입력해주세요.'; end if;
 new.created_at:=now();
 foreach path in array new.image_paths loop
  if path is null or path not like (new.submitted_by::text||'/'||new.id::text||'/%') or path like '%..%' then
   raise exception '잘못된 제출 이미지 경로입니다.';
  end if;
 end loop;
 return new;
end $$;
commit;
