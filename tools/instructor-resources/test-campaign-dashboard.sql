-- Run on the installed dashboard through the administrator SQL connection.
-- Role simulation exercises real grants/RLS. All test group changes roll back.
begin;
select set_config('test.teacher_id', (select id::text from auth.users where lower(email) = 'bryan@kc7cyber.com'), true);
select set_config('test.student_id', (select id::text from auth.users where lower(email) = 'campaign-test-26-01@students.mrqcyber.com'), true);
select set_config('test.save_hash', md5(coalesce((select string_agg(to_jsonb(p)::text, ',' order by user_id, assignment_id, activity_id) from public.campaign_progress p), '')), true);
select set_config('test.save_count', (select count(*)::text from public.campaign_progress where assignment_id = 'campaign-2026-fall' and activity_id = 'mandy-high-five-guided'), true);

set local role authenticated;
select set_config('request.jwt.claims', jsonb_build_object('sub', current_setting('test.teacher_id'), 'email', 'bryan@kc7cyber.com', 'is_anonymous', false, 'role', 'authenticated')::text, true);
do $teacher$
declare
  group_a uuid;
  group_b uuid;
  pupil_a uuid;
  pupil_b uuid;
begin
  if (select count(*) from public.campaign_teacher_progress_overview) <> 82 then raise exception 'Teacher cannot see the full roster'; end if;
  if (select count(*) from public.campaign_teacher_progress_overview where not is_test) <> 80 then raise exception 'Student count mismatch'; end if;
  if (select count(*) from public.campaign_progress) <> current_setting('test.save_count')::int then raise exception 'Teacher cannot read saved student detail'; end if;
  if exists (select 1 from public.campaign_teacher_progress_overview where progress_state ?| array['findings','queryRuns','reportDraft']) then raise exception 'Overview includes full detail payload'; end if;
  if exists (select 1 from public.campaign_teacher_progress_overview where not has_progress and progress_state is not null) then raise exception 'Unsaved student has fabricated state'; end if;
  if has_table_privilege(current_user, 'public.campaign_progress', 'UPDATE') or has_table_privilege(current_user, 'public.campaign_teacher_roster', 'UPDATE') then raise exception 'Read-only tables allow teacher writes'; end if;
  select user_id into strict pupil_a from public.campaign_teacher_roster where username = 'a-am-y1-01';
  select user_id into strict pupil_b from public.campaign_teacher_roster where username = 'b-pm-y2-01';
  insert into public.campaign_teacher_groups(assignment_id,name) values('campaign-2026-fall','Dashboard verification ' || gen_random_uuid()) returning id into group_a;
  insert into public.campaign_teacher_groups(assignment_id,name) values('campaign-2026-fall','Dashboard verification ' || gen_random_uuid()) returning id into group_b;
  update public.campaign_teacher_groups set name = name || ' renamed' where id = group_a;
  insert into public.campaign_teacher_group_members(assignment_id,user_id,group_id) values
    ('campaign-2026-fall',pupil_a,group_a), ('campaign-2026-fall',pupil_b,group_a)
    on conflict(owner_id,assignment_id,user_id) do update set group_id = excluded.group_id;
  if (select count(*) from public.campaign_teacher_group_members where group_id = group_a) <> 2 then raise exception 'Cross-class/track grouping failed'; end if;
  insert into public.campaign_teacher_group_members(owner_id,assignment_id,user_id,group_id)
    values(auth.uid(),'campaign-2026-fall',pupil_b,group_b)
    on conflict(owner_id,assignment_id,user_id) do update set group_id = excluded.group_id;
  if (select group_id from public.campaign_teacher_group_members where user_id = pupil_b) <> group_b then raise exception 'Group reassignment failed'; end if;
  begin
    update public.campaign_teacher_groups set owner_id = current_setting('test.student_id')::uuid where id = group_a;
    raise exception 'Changing group owner was allowed';
  exception when insufficient_privilege then null;
  end;
  perform set_config('test.group_id',group_a::text,true);
  perform set_config('test.group_b',group_b::text,true);
end
$teacher$;

-- Even a student whose editable metadata claims teacher access is still a student.
select set_config('request.jwt.claims', jsonb_build_object('sub', current_setting('test.student_id'), 'email', 'campaign-test-26-01@students.mrqcyber.com', 'is_anonymous', false, 'role', 'authenticated', 'user_metadata', jsonb_build_object('role','teacher','email','bryan@kc7cyber.com'))::text, true);
do $student$
begin
  if exists(select 1 from public.campaign_teacher_roster) or exists(select 1 from public.campaign_teacher_groups)
    or exists(select 1 from public.campaign_teacher_group_members) or exists(select 1 from public.campaign_teacher_progress_overview) then raise exception 'Student can read teacher data'; end if;
  if (select count(*) from public.campaign_enrollments) <> 1 then raise exception 'Self enrollment visibility changed'; end if;
  if exists(select 1 from public.campaign_progress where user_id <> auth.uid()) then raise exception 'Student can read another student save'; end if;
  if not exists(select 1 from public.campaign_progress where user_id = auth.uid()) then raise exception 'Existing student save is inaccessible'; end if;
  begin
    insert into public.campaign_teacher_groups(assignment_id,name) values('campaign-2026-fall','Forbidden student group');
    raise exception 'Student created a teacher group';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.campaign_teacher_group_members(owner_id,assignment_id,user_id,group_id)
      values(current_setting('test.teacher_id')::uuid,'campaign-2026-fall',auth.uid(),current_setting('test.group_id')::uuid);
    raise exception 'Student added teacher membership';
  exception when insufficient_privilege then null;
  end;
  update public.campaign_teacher_groups set name = 'Forbidden rename' where id = current_setting('test.group_id')::uuid;
  if found then raise exception 'Student changed a teacher group'; end if;
  delete from public.campaign_teacher_groups where id = current_setting('test.group_id')::uuid;
  if found then raise exception 'Student deleted a teacher group'; end if;
end
$student$;

-- Recheck that claiming the instructor email alone never grants access.
select set_config('request.jwt.claims', jsonb_build_object('sub', current_setting('test.student_id'), 'email', 'bryan@kc7cyber.com', 'is_anonymous', false, 'role', 'authenticated')::text, true);
do $spoof$
begin
  if exists(select 1 from public.campaign_teacher_progress_overview) then raise exception 'Email-only privilege escalation'; end if;
end
$spoof$;

set local role anon;
select set_config('request.jwt.claims', '{}'::text, true);
do $anonymous$
begin
  if has_table_privilege(current_user,'public.campaign_teacher_roster','SELECT')
    or has_table_privilege(current_user,'public.campaign_teacher_groups','SELECT')
    or has_table_privilege(current_user,'public.campaign_teacher_group_members','SELECT')
    or has_table_privilege(current_user,'public.campaign_teacher_progress_overview','SELECT') then raise exception 'Anonymous teacher-data grant'; end if;
  begin
    perform 1 from public.campaign_teacher_progress_overview;
    raise exception 'Anonymous overview read allowed';
  exception when insufficient_privilege then null;
  end;
end
$anonymous$;

set local role authenticated;
select set_config('request.jwt.claims', jsonb_build_object('sub', current_setting('test.teacher_id'), 'email', 'bryan@kc7cyber.com', 'is_anonymous', false, 'role', 'authenticated')::text, true);
do $cleanup$
begin
  delete from public.campaign_teacher_groups where id in (current_setting('test.group_id')::uuid,current_setting('test.group_b')::uuid);
  if exists(select 1 from public.campaign_teacher_group_members where group_id in (current_setting('test.group_id')::uuid,current_setting('test.group_b')::uuid)) then raise exception 'Group removal left membership'; end if;
end
$cleanup$;
reset role;
do $unchanged$
begin
  if current_setting('test.save_hash') <> md5(coalesce((select string_agg(to_jsonb(p)::text, ',' order by user_id,assignment_id,activity_id) from public.campaign_progress p),'')) then raise exception 'Student saves changed'; end if;
end
$unchanged$;
select 'PASS: instructor roster, compact overview, group CRUD/cascade, student isolation, anonymous denial, unchanged saves. Test changes rolled back.' as result;
rollback;
