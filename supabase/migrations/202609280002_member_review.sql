begin;
create table public.member_profiles(user_id uuid primary key references auth.users(id) on delete cascade,nickname text check(nickname is null or (nickname=trim(nickname) and length(nickname) between 2 and 20)));
alter table public.member_profiles enable row level security;
grant select,insert,update on public.member_profiles to authenticated;
create policy profile_read on public.member_profiles for select to authenticated using(user_id=auth.uid() or public.is_admin());
create policy profile_insert on public.member_profiles for insert to authenticated with check(user_id=auth.uid());
create policy profile_update on public.member_profiles for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
insert into public.member_profiles(user_id) select id from auth.users;
create function public.create_member_profile() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.member_profiles(user_id,nickname) values(new.id,case when length(trim(new.raw_user_meta_data->>'nickname')) between 2 and 20 then trim(new.raw_user_meta_data->>'nickname') else null end);
 return new;
end $$;
revoke all on function public.create_member_profile() from public;
create trigger create_member_profile after insert on auth.users for each row execute function public.create_member_profile();
alter table public.schedule_submissions drop constraint schedule_submissions_status_check;
alter table public.schedule_submissions add constraint schedule_submissions_status_check check(status in ('pending','completed'));
alter table public.schedule_submissions add column reviewed_at timestamptz, add column reviewed_by uuid references auth.users(id);
create view public.submissions_with_members with (security_invoker=true) as select s.*,p.nickname from public.schedule_submissions s left join public.member_profiles p on p.user_id=s.submitted_by;
grant select on public.submissions_with_members to authenticated;
create function public.set_submission_status(p_id uuid,p_status text,p_expected text) returns public.schedule_submissions language plpgsql security definer set search_path='' as $$
declare old public.schedule_submissions%rowtype; updated public.schedule_submissions%rowtype;
begin
 if not public.is_admin() then raise exception '관리자 권한이 필요합니다.' using errcode='42501'; end if;
 if p_status is null or p_status not in ('pending','completed') then raise exception '잘못된 검수 상태입니다.'; end if;
 select * into old from public.schedule_submissions where id=p_id for update;
 if not found then raise exception '제보를 찾을 수 없습니다.'; end if;
 if old.status is distinct from p_expected then raise exception '검수 상태가 변경되었습니다. 새로고침해주세요.'; end if;
 update public.schedule_submissions set status=p_status,reviewed_at=case when p_status='completed' then now() end,reviewed_by=case when p_status='completed' then auth.uid() end where id=p_id returning * into updated;
 insert into public.admin_edit_logs(actor_id,entity_type,entity_id,before_data,after_data) values(auth.uid(),'submission',p_id,to_jsonb(old),to_jsonb(updated));
 return updated;
end $$;
revoke all on function public.set_submission_status(uuid,text,text) from public;
grant execute on function public.set_submission_status(uuid,text,text) to authenticated;
commit;
