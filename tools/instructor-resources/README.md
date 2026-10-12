# Private instructor library

`/admin/` is an unlisted login shell. Its documents and Operations Wall come from
Supabase after authentication; they are not files in the public website.
The student investigation links still open the public student activity.

## Student progress and teaching groups

Open `/admin/#/students` using the same instructor account. The dashboard shows
the 80 existing class logins; the two test logins are hidden until requested.
Filter by class, year, group, or username. Open a student to review both tracks,
saved responses, query drafts and retained query results, report drafts, and
evidence findings. The student player remains the source of truth for question
checks, hint deductions, and sequential completion. An edited earlier answer can
relock progress while later checked answers remain saved; the detail view keeps
that distinction visible. Practice points do not assess short-answer quality.

Create teaching groups and use each row's group selector to assign or move a
login. Groups may span classes or years. Each login belongs to at most one group
for this assignment and instructor. Removing a group unassigns its members;
student answers and progress are unaffected. Groups persist in Supabase and
are private to the instructor. They are organizational notes, not shared saves.

The overview is refreshed while the dashboard is visible, with a manual refresh
control as well. An open student detail stays on its labeled saved snapshot so
incoming changes do not interrupt reading; use Refresh progress to reload it.
**Last online save** is the timestamp of a successful cloud save,
not live presence or time spent. **No online save** does not establish whether a
student has signed in or worked offline. Query history is the player's bounded
saved history, not a complete record of attempts.

Installation source is `campaign-dashboard.sql` (migration
`campaign_teacher_dashboard`). Apply once as an administrator, not on each
deployment. It resolves the existing generic usernames without creating or
resetting accounts, adds a private roster and instructor-owned group tables,
and grants the approved instructor SELECT access to assignment saves. The
overview view uses `security_invoker`; full report/query data is fetched only
when a student is opened. No additional privileged RPC or client key is used.

`test-campaign-dashboard.sql` verifies real authenticated/anonymous grants and
RLS in a transaction and rolls back all group changes. It tests cross-class
membership, reassignment, group deletion, student isolation, and preservation of
saved work. Run through an administrator connection against the installed
schema. The browser UI/model tests run with:

```sh
node --test tests/campaign-teacher-model.test.cjs tests/campaign-dashboard.test.cjs tests/instructor-admin.test.cjs
```

Never copy roster exports, actual answers, query results, account passwords, or
browser auth tokens into public site files or test fixtures. Browser fixtures
use synthetic student work; SQL role tests establish the database boundary.

## Access model

- Project: `djgaqadlwaxwgobcemsp` (the existing student-login project).
- Table: `public.instructor_resources`, with row-level security enabled and forced.
- Migration: `private_instructor_resource_library`; source: `schema.sql`.
- The policy pins the existing, confirmed `bryan@kc7cyber.com` account's immutable
  auth UUID when the migration runs. It also checks the signed token's email and
  rejects anonymous sessions. A matching email on another UUID is insufficient.
- Anonymous clients have no table privileges. Authenticated clients have SELECT
  only, subject to the policy. Publishing uses the trusted administration connection.
- The browser uses the existing publishable API key, never an administrative key.
- Instructor auth uses a separate session-storage key from student auth. Sign-out
  removes the wall, clears resource metadata, and revokes Blob URLs.

The base64 payload is a transport encoding, not encryption. RLS is the access
boundary. GitHub Pages cannot protect static files with a browser login screen.
Do not put instructor documents, generated SQL, JSON payloads, or wall source in
this repository, including its Git history.

## Source and build

Private source material is in the sibling `../campaign-teacher/` directory:

- `operations-wall/`: editable wall HTML, CSS, JavaScript, and private tests.
- `Mandy-Schmear-Answer-Keys-and-Final-Timelines.docx`.
- `Campaign-Incident-Response-Report-Assignment-and-Rubric.docx`.

From the website root:

```sh
python3 tools/instructor-resources/build.py \
  --teacher-dir ../campaign-teacher \
  --output ../campaign-teacher/private-publish
```

The builder refuses an output directory inside the public website. It bundles the
wall with the current canonical campaign data, converts public image references
to absolute HTTPS URLs, and produces four resource records. Output includes:

- `campaign-operations-wall.html`: self-contained display.
- `csp-hashes.json`: exact script and stylesheet hashes.
- `resources.json`: private resource payloads and checksums.
- `publish-resources.sql`: a narrowly scoped upsert of the four library entries.

Keep the private source directory backed up separately. The database stores the
published display bundle, not its separate editable source files.

## Publishing updates

1. Edit the private sources and run the builder.
2. If the wall or its canonical activity data changed, replace the wall hashes in
   `admin/index.html`'s Content-Security-Policy with `csp-hashes.json`'s values.
   Preserve the shell's existing allowed origins. The sandboxed Blob iframe
   inherits the parent policy, so both parent and bundled policies must authorize
   the same exact hashes. Do not use `unsafe-inline` or add `allow-same-origin`.
3. Execute the generated upsert through the authenticated Supabase administration
   connection or SQL editor. Never paste its private payload into public code or
   commit it. Do not rerun `schema.sql` for ordinary content changes.
4. Verify decoded file lengths and SHA-256 hashes against the source documents.
5. Preview sign-in, document downloads, all wall stages, fullscreen, and sign-out.
   Then deploy the public shell/CSP changes together with the resource update.

The public `/learn/osint/display/` route must remain only a redirect to
`/admin/#/wall`; its former JavaScript and CSS must stay outside the public tree.
GitHub Pages HTTPS enforcement is enabled and should remain enabled.

For future resources, add entries to `build.py` with a stable ID, a title,
description, sort order, and `link`, `download`, or `display` kind. The current
wall launcher uses the ID `campaign-operations-wall`. The small-file library has
a 16 MiB per-file ceiling; larger media should use private object storage with
the same account-level authorization. Do not broaden this table's RLS policy to
add content. Changing the approved account requires an explicit policy migration.

## Verification

```sh
node --test tests/instructor-admin.test.cjs \
  ../campaign-teacher/operations-wall/tests/osint-display.test.cjs
```

Also check the deployed Supabase endpoint: anonymous and invalid-token requests
must fail, other signed-in accounts must receive no rows, and only the approved
account may read metadata and payloads. Test claims under the `authenticated`
role in a transaction; do not mistake the administration connection's unrestricted
view for a browser authorization test. Browser mocks exercise the UI only.

This library protects instructor files. The existing student game intentionally
ships its own evidence and client-side answer-validation data; this change does
not convert that game engine to server-side validation. A file already downloaded
by the authorized instructor cannot be recalled by signing out.
