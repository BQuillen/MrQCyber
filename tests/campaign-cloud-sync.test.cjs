'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const bundled = path.resolve(__dirname, '../learn/osint/campaign-player/cloud-sync.js');
const Cloud = require(process.env.CAMPAIGN_PLAYER_FOLDER ? path.join(process.env.CAMPAIGN_PLAYER_FOLDER, 'cloud-sync.js') : bundled);
const ACTIVITY = 'mandy-high-five-guided', ASSIGNMENT = 'campaign-2026-fall';
const clone = x => x == null ? x : JSON.parse(JSON.stringify(x));
const state = answer => ({ version: 2, activityId: ACTIVITY, answer, findings: [{ summary: 'My report' }], hints: [1] });
const deferred = () => { let resolve; return { promise: new Promise(r => { resolve = r; }), resolve: value => resolve(value) }; };
function storage() {
  const data = new Map();
  return { data, getItem: k => data.has(k) ? data.get(k) : null, setItem: (k, v) => data.set(k, v), removeItem: k => data.delete(k) };
}
function harness(options = {}) {
  const local = options.storage || storage(), records = options.records || new Map(), events = [], remotes = [], conflicts = [];
  let uid = options.uid || null, networkError = null, rpcError = null, readError = null, enrollment = true, hold = null, rpcCalls = 0;
  const recordKey = id => id + ':' + ASSIGNMENT + ':' + ACTIVITY;
  const account = id => ({ id, email: id + '@students.example.invalid' });
  const client = {
    auth: {
      async signInWithPassword({ email }) { uid = email.split('@')[0]; return { data: { user: account(uid) } }; },
      async getUser() { return networkError ? { error: networkError } : { data: { user: uid ? account(uid) : null } }; },
      async signOut() { uid = null; return { error: null }; }
    },
    from(table) {
      const filters = {};
      const query = {
        select() { return query; }, eq(k, v) { filters[k] = v; return query; },
        async maybeSingle() {
          if (networkError || readError) return { error: networkError || readError };
          assert.equal(filters.user_id, uid, 'reads are scoped to verified current user');
          assert.equal(filters.assignment_id, ASSIGNMENT);
          if (table === 'campaign_enrollments') { assert.equal(filters.enabled, true); return { data: enrollment ? { user_id: uid, assignment_id: ASSIGNMENT, enabled: true } : null }; }
          assert.equal(filters.activity_id, ACTIVITY); return { data: clone(records.get(recordKey(uid)) || null) };
        }
      }; return query;
    },
    async rpc(name, params) {
      const requestUid = uid; rpcCalls++; assert.equal(name, 'campaign_save_progress');
      assert.equal(params.p_expected_user_id, requestUid, 'RPC binds snapshot ownership to verified UID');
      assert.equal(params.p_activity_id, ACTIVITY); assert.equal(params.p_assignment_id, ASSIGNMENT);
      if (hold) { const gate = hold; hold = null; await gate.promise; }
      if (networkError || rpcError) return { error: networkError || rpcError };
      const previous = records.get(recordKey(requestUid));
      if ((previous ? previous.revision : 0) !== params.p_expected_revision) return { error: { code: 'PT409', message: 'Progress conflict' } };
      const row = { state: clone(params.p_state), revision: params.p_expected_revision + 1, updated_at: '2026-10-09T12:00:00Z' };
      records.set(recordKey(requestUid), row); return { data: { revision: row.revision, updated_at: row.updated_at } };
    }
  };
  const sync = Cloud.create({ client, storage: local, activityId: ACTIVITY, assignmentId: ASSIGNMENT, emailDomain: 'students.example.invalid', debounceMs: options.debounceMs == null ? 100000 : options.debounceMs, retryDelayMs: options.retryDelayMs == null ? 100000 : options.retryDelayMs,
    validateState(value) { if (!value || value.version !== 2 || value.activityId !== ACTIVITY) throw new Error('Invalid activity state'); return value; },
    onStatus: v => events.push(v), onRemote: (v, meta) => remotes.push({ value: v, meta }), onConflict: v => conflicts.push(v)
  });
  return { sync, local, records, events, remotes, conflicts, client, recordKey, get rpcCalls() { return rpcCalls; },
    network(value) { networkError = value; }, rpcError(value) { rpcError = value; }, readError(value) { readError = value; }, enrolled(value) { enrollment = value; }, switchAccount(value) { uid = value; }, hold(value) { hold = value; }
  };
}
function seedCache(h, id, value, revision = 0, dirty = true) {
  h.local.setItem(Cloud.cacheKey(id, ASSIGNMENT, ACTIVITY), JSON.stringify({ state: value, baseRevision: revision, dirty, updatedAt: null }));
}
test('cloud sign-in reads enrollment and progress without importing the guest save', async t => {
  const h = harness(); t.after(() => h.sync.destroy());
  h.local.setItem('campaign-guided-investigation-v2', JSON.stringify(state('guest')));
  assert.equal(await h.sync.signIn('Student01', 'a password'), true);
  assert.equal(h.sync.getSnapshot().user.id, 'student01');
  assert.equal(h.remotes[0].value, null); assert.equal(h.remotes[0].meta.source, 'empty');
  assert.equal(h.rpcCalls, 0); assert.equal(JSON.parse(h.local.getItem('campaign-guided-investigation-v2')).answer, 'guest');
});
test('cloud work is cached immediately then saved with a server-confirmed revision', async t => {
  const h = harness(); t.after(() => h.sync.destroy()); await h.sync.signIn('one', 'pw');
  const raw = state('draft'); assert.equal(h.sync.save(raw), true); raw.answer = 'outside mutation';
  const cached = JSON.parse(h.local.getItem(Cloud.cacheKey('one', ASSIGNMENT, ACTIVITY)));
  assert.equal(cached.state.answer, 'draft'); assert.equal(cached.dirty, true); assert.equal(h.rpcCalls, 0);
  assert.equal(await h.sync.flush(), true);
  assert.equal(h.records.get(h.recordKey('one')).state.answer, 'draft'); assert.equal(h.sync.getSnapshot().dirty, false);
  assert.equal(h.events.at(-1).kind, 'saved');
});
test('resuming elsewhere restores the entire report, query and hint snapshot', async t => {
  const h = harness({ uid: 'one' }); t.after(() => h.sync.destroy());
  const saved = { ...state('checked'), queryHistory: ['Employees | count'], reportDrafts: { attacker: 'My wording' }, active: 'Y2-03' };
  h.records.set(h.recordKey('one'), { state: saved, revision: 4, updated_at: '2026-10-09' });
  await h.sync.resume(); assert.deepEqual(h.remotes.at(-1).value, saved); assert.equal(h.rpcCalls, 0);
});
test('unassigned account cannot create a cloud record or accept player saves', async t => {
  const h = harness(); t.after(() => h.sync.destroy()); h.enrolled(false);
  assert.equal(await h.sync.signIn('one', 'pw'), false); assert.equal(h.events.at(-1).kind, 'not-enrolled');
  assert.equal(h.sync.save(state('blocked')), false); assert.equal(h.rpcCalls, 0); assert.equal(h.remotes.length, 0);
});
test('dirty matching device cache resumes and uploads only after the remote read', async t => {
  const h = harness(); t.after(() => h.sync.destroy()); seedCache(h, 'one', state('pending'), 2);
  h.records.set(h.recordKey('one'), { state: state('old'), revision: 2, updated_at: 'old' });
  await h.sync.signIn('one', 'pw'); assert.equal(h.remotes.at(-1).meta.source, 'cache'); assert.equal(h.rpcCalls, 0);
  await h.sync.flush(); assert.equal(h.records.get(h.recordKey('one')).revision, 3);
});
test('dirty stale cache causes conflict and never silently overwrites another session', async t => {
  const h = harness(); t.after(() => h.sync.destroy()); seedCache(h, 'one', state('device'), 2);
  h.records.set(h.recordKey('one'), { state: state('elsewhere'), revision: 3, updated_at: 'now' });
  await h.sync.signIn('one', 'pw'); assert.equal(h.sync.getSnapshot().conflict, true);
  assert.equal(await h.sync.flush(), false); assert.equal(h.rpcCalls, 0); assert.equal(h.conflicts[0].remote.answer, 'elsewhere');
});
test('choosing online progress preserves a backup of the latest device edits', async t => {
  const h = harness(); t.after(() => h.sync.destroy()); seedCache(h, 'one', state('device'), 1);
  h.records.set(h.recordKey('one'), { state: state('online'), revision: 2, updated_at: 'now' });
  await h.sync.signIn('one', 'pw'); h.sync.save(state('device revised'));
  assert.equal(await h.sync.useCloud(), true); assert.equal(h.remotes.at(-1).value.answer, 'online');
  const backup = [...h.local.data].find(([key]) => key.includes(':backup:'));
  assert.equal(JSON.parse(backup[1]).state.answer, 'device revised'); assert.equal(h.rpcCalls, 0);
});
test('choosing device progress backs up the online copy and uses CAS again', async t => {
  const h = harness(); t.after(() => h.sync.destroy()); seedCache(h, 'one', state('device'), 1);
  h.records.set(h.recordKey('one'), { state: state('online'), revision: 2, updated_at: 'now' });
  await h.sync.signIn('one', 'pw'); assert.equal(await h.sync.keepLocal(), true);
  assert.equal(h.records.get(h.recordKey('one')).revision, 3);
  const backup = [...h.local.data].find(([key]) => key.endsWith(':online'));
  assert.equal(JSON.parse(backup[1]).state.answer, 'online');
});
test('new remote update during conflict resolution produces another conflict, not a blind overwrite', async t => {
  const h = harness(); t.after(() => h.sync.destroy()); seedCache(h, 'one', state('device'), 1);
  h.records.set(h.recordKey('one'), { state: state('online'), revision: 2, updated_at: 'now' });
  await h.sync.signIn('one', 'pw'); h.records.set(h.recordKey('one'), { state: state('newer'), revision: 3, updated_at: 'later' });
  assert.equal(await h.sync.keepLocal(), false); assert.equal(h.sync.getSnapshot().conflict, true); assert.equal(h.records.get(h.recordKey('one')).state.answer, 'newer');
});
test('serialized writes preserve edits typed while a previous save is in flight', async t => {
  const h = harness(); t.after(() => h.sync.destroy()); await h.sync.signIn('one', 'pw'); h.sync.save(state('first'));
  const gate = deferred(); h.hold(gate); const pending = h.sync.flush(); await new Promise(setImmediate);
  h.sync.save(state('second')); assert.equal(h.sync.flush(), pending); gate.resolve(); await pending;
  assert.equal(h.rpcCalls, 2); assert.equal(h.records.get(h.recordKey('one')).state.answer, 'second'); assert.equal(h.records.get(h.recordKey('one')).revision, 2);
});
test('offline edits survive reload and retry after connectivity returns', async t => {
  const h = harness(); t.after(() => h.sync.destroy()); await h.sync.signIn('one', 'pw'); h.sync.save(state('offline work'));
  h.network({ message: 'Failed to fetch' }); assert.equal(await h.sync.flush(), false);
  assert.equal(h.events.at(-1).kind, 'offline'); assert.equal(h.sync.getSnapshot().dirty, true);
  const second = harness({ storage: h.local, records: h.records }); t.after(() => second.sync.destroy());
  await second.sync.signIn('one', 'pw'); await second.sync.flush(); assert.equal(second.records.get(second.recordKey('one')).state.answer, 'offline work');
});
test('a lost response after a committed save is recognized without a duplicate upload', async t => {
  const h = harness(); t.after(() => h.sync.destroy()); seedCache(h, 'one', state('same'), 1);
  h.records.set(h.recordKey('one'), { state: state('same'), revision: 2, updated_at: 'now' });
  await h.sync.signIn('one', 'pw'); assert.equal(h.sync.getSnapshot().conflict, false); assert.equal(h.sync.getSnapshot().dirty, false); assert.equal(h.rpcCalls, 0);
});
test('sign-out preserves pending scoped work and requires explicit acknowledgement', async t => {
  const h = harness(); t.after(() => h.sync.destroy()); await h.sync.signIn('one', 'pw'); h.sync.save(state('pending'));
  h.network({ message: 'Failed to fetch' }); assert.equal(await h.sync.signOut(), false); assert.equal(h.sync.getSnapshot().user.id, 'one');
  assert.equal(await h.sync.signOut({ allowPending: true }), true); assert.equal(h.sync.getSnapshot().user, null);
  assert.equal(JSON.parse(h.local.getItem(Cloud.cacheKey('one', ASSIGNMENT, ACTIVITY))).state.answer, 'pending');
});
test('next student never sees or uploads the previous account cache', async t => {
  const h = harness(); t.after(() => h.sync.destroy()); await h.sync.signIn('one', 'pw'); h.sync.save(state('private one'));
  await h.sync.signOut({ allowPending: true }); await h.sync.signIn('two', 'pw');
  assert.equal(h.remotes.at(-1).value, null); h.sync.save(state('two')); await h.sync.flush();
  assert.equal(h.records.has(h.recordKey('one')), false); assert.equal(h.records.get(h.recordKey('two')).state.answer, 'two');
});
test('late save callbacks from a signed-out account cannot replace a new account UI/cache', async t => {
  const h = harness(); t.after(() => h.sync.destroy()); await h.sync.signIn('one', 'pw'); h.sync.save(state('one'));
  const gate = deferred(); h.hold(gate); const pending = h.sync.flush(); await new Promise(setImmediate);
  await h.sync.signOut({ allowPending: true }); await h.sync.signIn('two', 'pw'); h.sync.save(state('two'));
  gate.resolve(); await pending; assert.equal(h.sync.getSnapshot().user.id, 'two'); assert.equal(h.sync.getSnapshot().state.answer, 'two'); assert.equal(h.sync.getSnapshot().dirty, true);
});
test('auth session switching cannot upload one student state under another student identity', async t => {
  const h = harness(); t.after(() => h.sync.destroy()); await h.sync.signIn('one', 'pw'); h.sync.save(state('one'));
  h.switchAccount('two'); assert.equal(await h.sync.flush(), false); assert.equal(h.events.at(-1).kind, 'auth-required'); assert.equal(h.rpcCalls, 0);
});
test('permission errors and missing schema never produce a saved-online status', async t => {
  for (const error of [{ code: '42501', message: 'permission denied' }, { code: 'PGRST202', message: 'schema cache missing RPC' }]) {
    const h = harness(); t.after(() => h.sync.destroy()); await h.sync.signIn('one', 'pw'); h.sync.save(state('pending')); h.rpcError(error);
    assert.equal(await h.sync.flush(), false); assert.notEqual(h.events.at(-1).kind, 'saved'); assert.equal(h.sync.getSnapshot().dirty, true);
  }
});
test('oversized or malformed snapshots are rejected before local or remote replacement', async t => {
  const h = harness(); t.after(() => h.sync.destroy()); await h.sync.signIn('one', 'pw'); h.sync.save(state('small')); await h.sync.flush();
  assert.equal(h.sync.save(state('x'.repeat(Cloud.MAX_BYTES))), false); assert.equal(h.events.at(-1).kind, 'oversized');
  assert.equal(h.sync.save({ activityId: 'other' }), false); assert.equal(h.sync.getSnapshot().state.answer, 'small'); assert.equal(h.rpcCalls, 1);
});
test('browser cache failures plus offline errors do not falsely claim a saved device copy', async t => {
  const h = harness(); t.after(() => h.sync.destroy()); await h.sync.signIn('one', 'pw');
  h.local.setItem = () => { throw new Error('Quota exceeded'); }; assert.equal(h.sync.save(state('unsafe')), false); h.network({ message: 'Failed to fetch' });
  await h.sync.flush(); assert.match(h.events.at(-1).message, /could not save a device copy/); assert.equal(h.sync.getSnapshot().dirty, true);
});
test('conflict cannot discard the alternate copy when backup storage is unavailable', async t => {
  const h = harness(); t.after(() => h.sync.destroy()); seedCache(h, 'one', state('device'), 1);
  h.records.set(h.recordKey('one'), { state: state('online'), revision: 2, updated_at: 'now' }); await h.sync.signIn('one', 'pw');
  h.local.setItem = () => { throw new Error('Quota'); };
  assert.equal(await h.sync.useCloud(), false); assert.equal(h.sync.getSnapshot().conflict, true); assert.equal(h.sync.getSnapshot().state.answer, 'device'); assert.equal(h.rpcCalls, 0);
});
test('pending edits in another browser tab are backed up and require a copy choice', async t => {
  const shared = storage(), records = new Map();
  const first = harness({ storage: shared, records }), second = harness({ storage: shared, records });
  t.after(() => { first.sync.destroy(); second.sync.destroy(); });
  await first.sync.signIn('one', 'pw'); await second.sync.signIn('one', 'pw');
  first.sync.save(state('first tab')); second.sync.save(state('second tab'));
  assert.equal(second.sync.getSnapshot().conflict, true); assert.equal(second.conflicts.at(-1).source, 'device');
  assert.equal(second.rpcCalls, 0); assert.equal(second.sync.getBackups().at(-1).state.answer, 'first tab');
  await second.sync.useCloud(); assert.equal(records.get(second.recordKey('one')).state.answer, 'first tab');
});
test('a competing tab edit during an in-flight save cannot disappear from browser storage', async t => {
  const shared = storage(), records = new Map();
  const first = harness({ storage: shared, records }), second = harness({ storage: shared, records });
  t.after(() => { first.sync.destroy(); second.sync.destroy(); });
  await first.sync.signIn('one', 'pw'); await second.sync.signIn('one', 'pw');
  first.sync.save(state('first tab')); const gate = deferred(); first.hold(gate); const saving = first.sync.flush(); await new Promise(setImmediate);
  second.sync.save(state('second tab')); gate.resolve(); await saving;
  assert.equal(first.sync.getSnapshot().conflict, true); assert.equal(first.sync.getBackups().some(x => x.state.answer === 'second tab'), true);
});
test('alternate copies remain recoverable after reload and stay isolated by account', async t => {
  const h = harness(); t.after(() => h.sync.destroy()); seedCache(h, 'one', state('device'), 1);
  h.records.set(h.recordKey('one'), { state: state('online'), revision: 2, updated_at: 'now' });
  await h.sync.signIn('one', 'pw'); await h.sync.useCloud();
  const second = harness({ storage: h.local, records: h.records }); t.after(() => second.sync.destroy());
  await second.sync.signIn('one', 'pw'); assert.equal(second.sync.getBackups()[0].state.answer, 'device');
  await second.sync.signOut(); await second.sync.signIn('two', 'pw'); assert.equal(second.sync.getBackups().length, 0);
});
test('retry recognizes a committed request with a lost response without making a conflict', async t => {
  const h = harness(); t.after(() => h.sync.destroy()); await h.sync.signIn('one', 'pw'); h.sync.save(state('same'));
  h.records.set(h.recordKey('one'), { state: state('same'), revision: 1, updated_at: 'now' });
  assert.equal(await h.sync.retry(), true); assert.equal(h.sync.getSnapshot().dirty, false); assert.equal(h.sync.getSnapshot().conflict, false); assert.equal(h.records.get(h.recordKey('one')).revision, 1);
});
test('sign-out cannot discard a pending memory-only copy without backup acknowledgement', async t => {
  const h = harness(); t.after(() => h.sync.destroy()); await h.sync.signIn('one', 'pw');
  h.local.setItem = () => { throw new Error('Quota exceeded'); }; h.sync.save(state('not saved')); h.network({ message: 'Failed to fetch' });
  assert.equal(await h.sync.signOut({ allowPending: true }), false); assert.equal(h.sync.getSnapshot().state.answer, 'not saved'); assert.equal(h.sync.getSnapshot().user.id, 'one');
  assert.equal(await h.sync.signOut({ allowPending: true, backupDownloaded: true }), true); assert.equal(h.sync.getSnapshot().user, null);
});
test('explicit downloaded-copy acknowledgement can resolve conflict when backup quota is full', async t => {
  const h = harness(); t.after(() => h.sync.destroy()); seedCache(h, 'one', state('device'), 1);
  h.records.set(h.recordKey('one'), { state: state('online'), revision: 2, updated_at: 'now' }); await h.sync.signIn('one', 'pw');
  assert.equal(h.sync.getConflictCopies().local.answer, 'device'); assert.equal(h.sync.getConflictCopies().remote.answer, 'online');
  h.local.setItem = () => { throw new Error('Quota'); };
  assert.equal(await h.sync.useCloud(), false); assert.equal(await h.sync.useCloud({ backupDownloaded: true }), true);
  assert.equal(h.sync.getSnapshot().conflict, false); assert.equal(h.sync.getSnapshot().state.answer, 'online');
});
test('a lightweight account snapshot does not expose or copy activity answers', async t => {
  const h = harness(); t.after(() => h.sync.destroy()); await h.sync.signIn('one', 'pw'); h.sync.save(state('draft'));
  const minimal = h.sync.getSnapshot({ includeState: false }); assert.equal('state' in minimal, false); assert.equal(minimal.dirty, true); assert.equal(minimal.user.id, 'one');
});
test('missing backend setup blocks initialization without uploading guest or stale device work', async t => {
  const h = harness(); t.after(() => h.sync.destroy()); seedCache(h, 'one', state('cached'));
  h.readError({ code: 'PGRST205', message: 'Table missing from schema cache' });
  assert.equal(await h.sync.signIn('one', 'pw'), false); assert.equal(h.sync.getSnapshot().ready, false); assert.equal(h.events.at(-1).kind, 'error'); assert.equal(h.rpcCalls, 0);
  assert.equal(JSON.parse(h.local.getItem(Cloud.cacheKey('one', ASSIGNMENT, ACTIVITY))).state.answer, 'cached');
});
test('offline progress read can expose device work but cannot write until remote revision is checked', async t => {
  const h = harness(); t.after(() => h.sync.destroy()); seedCache(h, 'one', state('cached'), 1);
  h.readError({ message: 'Failed to fetch' }); await h.sync.signIn('one', 'pw');
  assert.equal(h.sync.getSnapshot().ready, true); assert.equal(h.remotes.at(-1).value.answer, 'cached'); h.sync.save(state('offline edit'));
  assert.equal(await h.sync.flush(), false); assert.equal(h.rpcCalls, 0);
  h.readError(null); h.records.set(h.recordKey('one'), { state: state('another device'), revision: 2, updated_at: 'now' });
  await h.sync.retry(); assert.equal(h.sync.getSnapshot().conflict, true); assert.equal(h.records.get(h.recordKey('one')).state.answer, 'another device'); assert.equal(h.rpcCalls, 0);
});
test('debounced saves upload the final edit without needing a question navigation', async t => {
  const h = harness({ debounceMs: 5 }); t.after(() => h.sync.destroy()); await h.sync.signIn('one', 'pw');
  h.sync.save(state('a')); h.sync.save(state('a complete answer')); await new Promise(r => setTimeout(r, 35));
  assert.equal(h.rpcCalls, 1); assert.equal(h.records.get(h.recordKey('one')).state.answer, 'a complete answer');
});
test('offline saves retry when the service returns even without a browser online event', async t => {
  const h = harness({ retryDelayMs: 5 }); t.after(() => h.sync.destroy()); await h.sync.signIn('one', 'pw'); h.sync.save(state('waiting'));
  h.network({ message: 'Failed to fetch' }); await h.sync.flush(); h.network(null); await new Promise(r => setTimeout(r, 35));
  assert.equal(h.records.get(h.recordKey('one')).state.answer, 'waiting'); assert.equal(h.sync.getSnapshot().dirty, false);
});
test('rejected current edits block reconnect, hydration and sign-out despite an older clean save', async t => {
  const h = harness(); t.after(() => h.sync.destroy()); await h.sync.signIn('one', 'pw'); h.sync.save(state('saved')); await h.sync.flush();
  const count = h.remotes.length; assert.equal(h.sync.save(state('x'.repeat(Cloud.MAX_BYTES))), false);
  assert.equal(h.sync.getSnapshot().dirty, true); assert.equal(h.sync.getSnapshot().locallySaved, false); assert.equal(h.sync.getSnapshot().rejectedChanges, true);
  assert.equal(await h.sync.resume(), false); assert.equal(await h.sync.retry(), false); assert.equal(await h.sync.signOut({ allowPending: true }), false); assert.equal(h.remotes.length, count);
  h.sync.save(state('corrected')); await h.sync.flush(); assert.equal(h.sync.getSnapshot().dirty, false); assert.equal(h.sync.getSnapshot().rejectedChanges, false); assert.equal(h.records.get(h.recordKey('one')).state.answer, 'corrected');
});
test('older in-flight save completion cannot label newly rejected work saved online', async t => {
  const h = harness(); t.after(() => h.sync.destroy()); await h.sync.signIn('one', 'pw'); h.sync.save(state('old valid'));
  const gate = deferred(); h.hold(gate); const saving = h.sync.flush(); await new Promise(setImmediate);
  h.sync.save(state('x'.repeat(Cloud.MAX_BYTES))); gate.resolve(); await saving;
  assert.equal(h.sync.getSnapshot().dirty, true); assert.equal(h.sync.getSnapshot().locallySaved, false); assert.equal(h.events.at(-1).kind, 'oversized');
  assert.equal(h.records.get(h.recordKey('one')).state.answer, 'old valid'); assert.equal(await h.sync.signOut(), false);
});
test('returning to the prior valid state clears rejected-change warnings and preserves confirmed revision', async t => {
  const h = harness(); t.after(() => h.sync.destroy()); await h.sync.signIn('one', 'pw'); h.sync.save(state('saved')); await h.sync.flush();
  h.sync.save({ invalid: true }); assert.equal(h.sync.getSnapshot().dirty, true); h.sync.save(state('saved'));
  assert.equal(h.sync.getSnapshot().dirty, false); assert.equal(h.events.at(-1).kind, 'saved'); assert.equal(h.rpcCalls, 1);
});
test('retry read never overwrites edits made during its pending request when browser storage fails', async t => {
  const h = harness(); t.after(() => h.sync.destroy()); await h.sync.signIn('one', 'pw'); h.sync.save(state('saved')); await h.sync.flush();
  const gate = deferred(), originalFrom = h.client.from; let blocked = false;
  h.client.from = table => {
    const query = originalFrom(table), originalSingle = query.maybeSingle;
    if (table === 'campaign_progress') query.maybeSingle = async () => { blocked = true; await gate.promise; return originalSingle(); };
    return query;
  };
  const before = h.remotes.length, refreshing = h.sync.retry(); await new Promise(setImmediate); assert.equal(blocked, true);
  h.local.setItem = () => { throw new Error('Quota'); }; h.sync.save(state('new unsaved edit')); gate.resolve(); await refreshing;
  assert.equal(h.remotes.length, before); assert.equal(h.sync.getSnapshot().state.answer, 'new unsaved edit'); assert.equal(h.sync.getSnapshot().dirty, true); assert.equal(h.sync.getSnapshot().locallySaved, false);
});
test('overlapping reconnect retries cannot restore a delayed blank read after an offline save succeeds', async t => {
  const h = harness({ uid: 'one' }); t.after(() => h.sync.destroy());
  h.records.set(h.recordKey('one'), { state: state(''), revision: 1, updated_at: 'before' });
  seedCache(h, 'one', state('substantive student answers'), 1, true);
  h.readError({ message: 'Failed to fetch' }); await h.sync.resume(); h.readError(null);
  const gate = deferred(), originalFrom = h.client.from; let reads = 0;
  h.client.from = table => {
    const query = originalFrom(table), originalSingle = query.maybeSingle;
    query.maybeSingle = async () => {
      const result = await originalSingle();
      if (table === 'campaign_progress' && ++reads === 2) await gate.promise;
      return result;
    }; return query;
  };
  const first = h.sync.retry(), second = h.sync.retry();
  await first; await h.sync.flush();
  assert.equal(h.records.get(h.recordKey('one')).revision, 2);
  assert.equal(h.sync.getSnapshot().status.kind, 'saved');
  gate.resolve(); await second;
  const cached = JSON.parse(h.local.getItem(Cloud.cacheKey('one', ASSIGNMENT, ACTIVITY)));
  assert.equal(h.sync.getSnapshot().state.answer, 'substantive student answers');
  assert.equal(cached.state.answer, 'substantive student answers'); assert.equal(cached.baseRevision, 2);
  assert.equal(h.remotes.at(-1).value.answer, 'substantive student answers');
  assert.equal(reads, 1, 'All reconnect triggers share one hydration read');
});
test('a reconnect during initial account loading shares its hydration instead of opening a second read', async t => {
  const h = harness({ uid: 'one' }); t.after(() => h.sync.destroy());
  h.records.set(h.recordKey('one'), { state: state('saved answers'), revision: 3, updated_at: 'before' });
  const gate = deferred(), originalFrom = h.client.from; let reads = 0;
  h.client.from = table => {
    const query = originalFrom(table), originalSingle = query.maybeSingle;
    if (table === 'campaign_progress') query.maybeSingle = async () => { ++reads; await gate.promise; return originalSingle(); };
    return query;
  };
  const loading = h.sync.resume(); await new Promise(setImmediate);
  const reconnect = h.sync.retry(); await new Promise(setImmediate);
  assert.equal(reads, 1); gate.resolve(); await Promise.all([loading, reconnect]);
  assert.equal(h.remotes.length, 1); assert.equal(h.sync.getSnapshot().state.answer, 'saved answers');
});
test('a newer confirmed device copy is retained when the server returns an older or missing revision', async t => {
  for (const missing of [false, true]) {
    const h = harness(); t.after(() => h.sync.destroy()); seedCache(h, 'one', state('newer saved answers'), 4, false);
    if (!missing) h.records.set(h.recordKey('one'), { state: state('old answers'), revision: 3, updated_at: 'before' });
    await h.sync.signIn('one', 'pw');
    assert.equal(h.sync.getSnapshot().state.answer, 'newer saved answers'); assert.equal(h.sync.getSnapshot().conflict, true);
    assert.equal(h.remotes.at(-1).value.answer, 'newer saved answers'); assert.equal(h.events.at(-1).kind, 'conflict');
    const cached = JSON.parse(h.local.getItem(Cloud.cacheKey('one', ASSIGNMENT, ACTIVITY)));
    assert.equal(cached.state.answer, 'newer saved answers'); assert.equal(cached.baseRevision, 4); assert.equal(h.rpcCalls, 0);
  }
});
test('an older clean browser cache cannot pull a newer in-memory saved revision backward', async t => {
  const h = harness(); t.after(() => h.sync.destroy()); await h.sync.signIn('one', 'pw');
  h.sync.save(state('newer saved answers')); await h.sync.flush(); h.sync.save(state('latest answers')); await h.sync.flush();
  seedCache(h, 'one', state('old browser copy'), 1, false);
  h.records.set(h.recordKey('one'), { state: state('old server copy'), revision: 1, updated_at: 'before' });
  await h.sync.retry();
  assert.equal(h.sync.getSnapshot().state.answer, 'latest answers'); assert.equal(h.sync.getSnapshot().conflict, true);
  const cached = JSON.parse(h.local.getItem(Cloud.cacheKey('one', ASSIGNMENT, ACTIVITY)));
  assert.equal(cached.state.answer, 'latest answers'); assert.equal(cached.baseRevision, 2);
});
test('a newer clean in-memory save never discards another tab’s older-revision unsynced cache', async t => {
  const h = harness(); t.after(() => h.sync.destroy()); await h.sync.signIn('one', 'pw');
  h.sync.save(state('first save')); await h.sync.flush(); h.sync.save(state('saved revision two')); await h.sync.flush();
  seedCache(h, 'one', state('other tab unsynced answer'), 1, true);
  await h.sync.retry();
  const cached = JSON.parse(h.local.getItem(Cloud.cacheKey('one', ASSIGNMENT, ACTIVITY)));
  assert.equal(cached.state.answer, 'other tab unsynced answer'); assert.equal(cached.dirty, true); assert.equal(cached.baseRevision, 1);
  assert.equal(h.sync.getSnapshot().state.answer, 'other tab unsynced answer'); assert.equal(h.sync.getSnapshot().conflict, true);
  assert.equal(h.remotes.at(-1).value.answer, 'other tab unsynced answer');
  const copies = h.sync.getConflictCopies();
  assert.equal(copies.local.answer, 'other tab unsynced answer'); assert.equal(copies.remote.answer, 'saved revision two');
  assert.equal(h.records.get(h.recordKey('one')).state.answer, 'saved revision two'); assert.equal(h.rpcCalls, 2);
});
