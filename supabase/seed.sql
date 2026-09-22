-- Optional demonstration production. Real deployments start with no fabricated schedules.
insert into public.productions(id,title,subtitle,venue,start_date,end_date,roles,motif)
values('a0000000-0000-4000-8000-000000000001','달빛의 정원 (샘플)','가상 공연입니다','아르테홀','2026-10-01','2026-11-29',array['서윤','도현','은별','정원사'],'moon') on conflict do nothing;
