alter policy submission_insert on public.schedule_submissions with check(submitted_by=(select auth.uid()) and status='pending' and reviewed_at is null and reviewed_by is null);
