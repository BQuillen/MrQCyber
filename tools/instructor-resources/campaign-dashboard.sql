-- Additive teacher dashboard installation; leaves student saves and save RPC intact.
-- Apply once through the authenticated Supabase administration connection.
begin;
create table public.campaign_teacher_roster (
  assignment_id text not null,
  user_id uuid not null,
  username text not null,
  class_label text not null,
  track_id text not null check (track_id in ('year1', 'year2')),
  is_test boolean not null default false,
  primary key (assignment_id, user_id),
  unique (assignment_id, username),
  foreign key (user_id, assignment_id)
    references public.campaign_enrollments (user_id, assignment_id) on delete cascade
);
create index campaign_teacher_roster_enrollment_idx
  on public.campaign_teacher_roster (user_id, assignment_id);

create table public.campaign_teacher_groups (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  assignment_id text not null check (assignment_id = 'campaign-2026-fall'),
  name text not null check (name = btrim(name) and char_length(name) between 1 and 80),
  created_at timestamptz not null default now(),
  unique (owner_id, assignment_id, id)
);
create unique index campaign_teacher_groups_name_idx
  on public.campaign_teacher_groups (owner_id, assignment_id, lower(name));

create table public.campaign_teacher_group_members (
  owner_id uuid not null default auth.uid(),
  assignment_id text not null,
  user_id uuid not null,
  group_id uuid not null,
  primary key (owner_id, assignment_id, user_id),
  foreign key (owner_id, assignment_id, group_id)
    references public.campaign_teacher_groups (owner_id, assignment_id, id) on delete cascade,
  foreign key (assignment_id, user_id)
    references public.campaign_teacher_roster (assignment_id, user_id) on delete cascade
);
create index campaign_teacher_members_group_idx
  on public.campaign_teacher_group_members (owner_id, assignment_id, group_id);
create index campaign_teacher_members_roster_idx
  on public.campaign_teacher_group_members (assignment_id, user_id);

alter table public.campaign_teacher_roster enable row level security;
alter table public.campaign_teacher_roster force row level security;
alter table public.campaign_teacher_groups enable row level security;
alter table public.campaign_teacher_groups force row level security;
alter table public.campaign_teacher_group_members enable row level security;
alter table public.campaign_teacher_group_members force row level security;
revoke all on public.campaign_teacher_roster, public.campaign_teacher_groups,
  public.campaign_teacher_group_members from public, anon, authenticated;
grant select on public.campaign_teacher_roster to authenticated;
grant select, insert, update, delete on public.campaign_teacher_groups,
  public.campaign_teacher_group_members to authenticated;

-- Same confirmed instructor identity as the existing resource hub. Resolve the
-- immutable ID at installation; never trust student-editable user_metadata.
do $policy$
declare
  instructor_id uuid;
  teacher_predicate text;
  owner_predicate text;
begin
  select id into strict instructor_id from auth.users
    where lower(email) = 'bryan@kc7cyber.com'
      and email_confirmed_at is not null and is_anonymous is false
      and (banned_until is null or banned_until < now());
  teacher_predicate := format(
    '(select auth.uid()) = %L::uuid
     and lower((select auth.jwt() ->> ''email'')) = ''bryan@kc7cyber.com''
     and coalesce((select auth.jwt() ->> ''is_anonymous''), ''false'') = ''false''', instructor_id);
  owner_predicate := teacher_predicate ||
    ' and owner_id = (select auth.uid()) and assignment_id = ''campaign-2026-fall''';

  execute format('create policy campaign_teacher_roster_read on public.campaign_teacher_roster
    for select to authenticated using (%s and assignment_id = ''campaign-2026-fall'')', teacher_predicate);
  execute format('create policy campaign_teacher_groups_owner on public.campaign_teacher_groups
    for all to authenticated using (%s) with check (%s)', owner_predicate, owner_predicate);
  execute format('create policy campaign_teacher_members_owner on public.campaign_teacher_group_members
    for all to authenticated using (%s) with check (%s)', owner_predicate, owner_predicate);

  -- Teacher access is SELECT only. Existing self-read policies and the
  -- revision-checked student save RPC are not replaced or broadened.
  execute format('create policy campaign_enrollment_teacher_read on public.campaign_enrollments
    for select to authenticated using (%s and assignment_id = ''campaign-2026-fall'')', teacher_predicate);
  execute format('create policy campaign_progress_teacher_read on public.campaign_progress
    for select to authenticated using (%s and assignment_id = ''campaign-2026-fall''
      and activity_id = ''mandy-high-five-guided'')', teacher_predicate);
end
$policy$;

-- Password-free roster seed: resolve the existing generic usernames to Auth IDs.
-- No student accounts are created or changed by this migration.
with classes(prefix, class_label, track_id, account_count) as (values
  ('a-am-y1-', 'A Day AM Year 1', 'year1', 15),
  ('a-pm-y1-', 'A Day PM Year 1', 'year1', 5),
  ('a-pm-y2-', 'A Day PM Year 2', 'year2', 16),
  ('b-am-y1-', 'B Day AM Year 1', 'year1', 14),
  ('b-am-y2-', 'B Day AM Year 2', 'year2', 6),
  ('b-pm-y1-', 'B Day PM Year 1', 'year1', 17),
  ('b-pm-y2-', 'B Day PM Year 2', 'year2', 7)
), roster as (
  select prefix || lpad(n::text, 2, '0') as username, class_label, track_id, false as is_test
    from classes cross join lateral generate_series(1, account_count) n
  union all values
    ('campaign-test-26-01', 'Test accounts', 'year1', true),
    ('campaign-test-26-02', 'Test accounts', 'year2', true)
)
insert into public.campaign_teacher_roster (assignment_id, user_id, username, class_label, track_id, is_test)
select 'campaign-2026-fall', u.id, r.username, r.class_label, r.track_id, r.is_test
  from roster r join auth.users u on lower(u.email) = r.username || '@students.mrqcyber.com'
  join public.campaign_enrollments e on e.user_id = u.id and e.assignment_id = 'campaign-2026-fall';

do $roster_check$
begin
  if (select count(*) from public.campaign_teacher_roster where assignment_id = 'campaign-2026-fall') <> 82
    or (select count(*) from public.campaign_teacher_roster where assignment_id = 'campaign-2026-fall' and not is_test) <> 80 then
    raise exception 'Expected 80 existing student accounts and 2 existing test accounts; dashboard installation rolled back.';
  end if;
end
$roster_check$;

-- Compact overview excludes query-result snapshots and report contents.
-- Invoker permissions preserve the underlying teacher-only roster boundary.
create view public.campaign_teacher_progress_overview
with (security_invoker = true) as
select r.user_id, r.assignment_id, r.username, r.class_label, r.track_id, r.is_test,
  e.enabled, p.user_id is not null as has_progress, p.revision, p.updated_at,
  case when p.user_id is null then null else jsonb_build_object(
    'version', p.state -> 'version',
    'activityId', p.state -> 'activityId',
    'revision', p.state -> 'revision',
    'trackId', p.state -> 'trackId',
    'activeQuestion', p.state -> 'activeQuestion',
    'responses', p.state -> 'responses'
  ) end as progress_state
from public.campaign_teacher_roster r
join public.campaign_enrollments e on e.user_id = r.user_id and e.assignment_id = r.assignment_id
left join public.campaign_progress p on p.user_id = r.user_id
  and p.assignment_id = r.assignment_id and p.activity_id = 'mandy-high-five-guided';
revoke all on public.campaign_teacher_progress_overview from public, anon, authenticated;
grant select on public.campaign_teacher_progress_overview to authenticated;

comment on table public.campaign_teacher_roster is
  'Private teacher roster for existing assignment logins; contains no passwords.';
comment on table public.campaign_teacher_groups is
  'Instructor-owned organizational groups. Grouping does not share or change student progress.';
comment on table public.campaign_teacher_group_members is
  'At most one group per student, assignment, and instructor. Removal never deletes progress.';
comment on view public.campaign_teacher_progress_overview is
  'Teacher-only compact saved-work overview. updated_at is a confirmed online save, not online presence.';

notify pgrst, 'reload schema';
commit;
