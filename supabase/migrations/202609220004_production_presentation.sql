alter table public.productions add column if not exists poster_url text;
alter table public.productions add column if not exists filter_roles text[];
alter table public.performances add column if not exists schedule_notes text[] not null default '{}';
