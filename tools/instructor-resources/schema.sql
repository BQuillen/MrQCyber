-- Instructor resources are served by Supabase, never as public site files.
-- Run through the authenticated Supabase administration connection.
create table public.instructor_resources (
  id text primary key check (id ~ '^[a-z0-9-]+$'),
  collection text not null,
  title text not null,
  description text not null,
  kind text not null check (kind in ('link', 'download', 'display')),
  filename text,
  mime_type text,
  content_base64 text,
  payload_sha256 text,
  byte_length integer,
  links jsonb not null default '[]'::jsonb check (jsonb_typeof(links) = 'array'),
  sort_order integer not null default 0,
  updated_at timestamptz not null default now(),
  constraint resource_payload check (
    (kind = 'link' and content_base64 is null and jsonb_array_length(links) > 0)
    or
    (kind in ('download', 'display') and content_base64 is not null
      and filename is not null and mime_type is not null
      and byte_length > 0 and byte_length <= 16777216
      and payload_sha256 ~ '^[a-f0-9]{64}$')
  )
);

alter table public.instructor_resources enable row level security;
alter table public.instructor_resources force row level security;
revoke all on public.instructor_resources from public, anon, authenticated;
grant select on public.instructor_resources to authenticated;

-- Resolve the existing, confirmed account at installation time. Email text alone
-- is not the authorization boundary; the policy pins the immutable auth user ID.
do $policy$
declare
  instructor_id uuid;
begin
  select id into strict instructor_id from auth.users
    where lower(email) = 'bryan@kc7cyber.com'
      and email_confirmed_at is not null
      and is_anonymous is false
      and (banned_until is null or banned_until < now());
  execute format(
    'create policy instructor_resources_owner_read on public.instructor_resources
     for select to authenticated using (
       (select auth.uid()) = %L::uuid
       and lower((select auth.jwt() ->> ''email'')) = ''bryan@kc7cyber.com''
       and coalesce((select auth.jwt() ->> ''is_anonymous''), ''false'') = ''false''
     )', instructor_id
  );
end
$policy$;

comment on table public.instructor_resources is
  'Private instructor library. Only the pinned instructor auth account can read. No browser writes; payloads must never be copied into the public repository.';
