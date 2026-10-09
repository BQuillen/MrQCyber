'use strict';
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.CampaignCloudSync = api;
})(typeof window === 'object' ? window : null, function () {
  const MAX_BYTES = 8 * 1024 * 1024;
  const copy = value => value == null ? value : JSON.parse(JSON.stringify(value));
  const bytes = text => typeof TextEncoder === 'function' ? new TextEncoder().encode(text).length : unescape(encodeURIComponent(text)).length;
  const cacheKey = (userId, assignmentId, activityId) => 'campaign-cloud-v1:' + [userId, assignmentId, activityId].map(encodeURIComponent).join(':');
  function create(options) {
    const { client, storage, activityId, assignmentId, emailDomain, validateState } = options;
    if (!client || !storage || !activityId || !assignmentId || typeof validateState !== 'function') throw new Error('Cloud saving configuration is incomplete.');
    const notify = options.onStatus || (() => {}), remote = options.onRemote || (() => {}), conflictNotice = options.onConflict || (() => {});
    const delay = options.debounceMs == null ? 1000 : options.debounceMs;
    let user = null, envelope = null, ready = false, remoteChecked = false, locallySaved = true, rejectedChanges = false, rejectedError = null, editGeneration = 0, lastCacheRaw = null, conflict = null, generation = 0, timer = null, retryTimer = null, inFlight = null, stopped = false, backupSequence = 0;
    let status = { kind: 'signed-out', message: 'Sign in to save across devices.' };
    function emit(kind, message, extra) {
      if (kind === 'saved' && rejectedChanges) { kind = rejectedError.code === 'oversized' ? 'oversized' : 'error'; message = rejectedError.message; }
      status = Object.assign({ kind, message, user: user ? { id: user.id, email: user.email } : null, dirty: rejectedChanges || !!(envelope && envelope.dirty) }, extra || {});
      notify(copy(status)); return status;
    }
    function normalize(raw) {
      const result = validateState(copy(raw));
      if (!result || typeof result !== 'object') throw new Error('This progress file is not valid for this activity.');
      const text = JSON.stringify(result);
      if (bytes(text) > MAX_BYTES) { const e = new Error('This progress is larger than the 8 MiB online-save limit. Download a backup before continuing.'); e.code = 'oversized'; throw e; }
      return JSON.parse(text);
    }
    function key() { return cacheKey(user.id, assignmentId, activityId); }
    function cancelTimer() { if (timer != null) clearTimeout(timer); timer = null; }
    function cancelRetry() { if (retryTimer != null) clearTimeout(retryTimer); retryTimer = null; }
    function scheduleRetry() {
      cancelRetry();
      if (user && !stopped) retryTimer = setTimeout(() => { retryTimer = null; void retry(); }, options.retryDelayMs == null ? 15000 : options.retryDelayMs);
    }
    function cache() {
      try {
        const previousRaw = storage.getItem(key());
        if (previousRaw && previousRaw !== lastCacheRaw) {
          const previous = JSON.parse(previousRaw);
          if (previous.dirty && JSON.stringify(previous.state) !== JSON.stringify(envelope.state)) {
            backup(previous, 'other-tab');
            conflict = { state: normalize(previous.state), revision: envelope.baseRevision, updated_at: previous.updatedAt, source: 'device' };
          }
        }
        const nextRaw = JSON.stringify(envelope); storage.setItem(key(), nextRaw); lastCacheRaw = nextRaw; locallySaved = !rejectedChanges;
        if (conflict && conflict.source === 'device') showConflict(conflict);
        return true;
      }
      catch (_) { locallySaved = false; emit('error', 'This browser could not save a device copy. Download a backup; online saving will still be attempted.'); return false; }
    }
    function backup(value, label) {
      const id = key() + ':backup:' + Date.now() + ':' + (++backupSequence) + ':' + label;
      const indexKey = key() + ':backups', savedAt = new Date().toISOString();
      const index = JSON.parse(storage.getItem(indexKey) || '[]');
      storage.setItem(id, JSON.stringify(value));
      storage.setItem(indexKey, JSON.stringify([...index, { id, kind: label, savedAt }]));
    }
    function getBackups() {
      if (!user) return [];
      try {
        const index = JSON.parse(storage.getItem(key() + ':backups') || '[]');
        return index.map(item => ({ ...item, state: JSON.parse(storage.getItem(item.id) || 'null')?.state || null }));
      } catch (_) { return []; }
    }
    function readCache() {
      const value = storage.getItem(key()); lastCacheRaw = value; if (!value) return null;
      const item = JSON.parse(value);
      if (!Number.isSafeInteger(item.baseRevision) || item.baseRevision < 0 || typeof item.dirty !== 'boolean') throw new Error('The saved device copy could not be read. Download or recover that copy before reconnecting.');
      return { state: normalize(item.state), baseRevision: item.baseRevision, dirty: item.dirty, updatedAt: item.updatedAt || null };
    }
    function current(token) { return !stopped && token === generation; }
    function errorStatus(error) {
      const code = String(error && (error.code || error.status) || '');
      const message = String(error && error.message || '');
      if (code === 'oversized') return emit('oversized', message);
      if (/^(401|403|PGRST301|PGRST302|42501)$/.test(code) || /jwt|refresh.token|not authenticated|not enrolled|permission denied/i.test(message)) return emit('auth-required', locallySaved ? 'Your session or class access needs attention. Your device copy is retained; sign in again or contact your teacher.' : 'Your session needs attention and this browser could not save a device copy. Download a backup before signing in again.');
      if (/42P01|PGRST20[25]|42883/.test(code) || /schema cache|does not exist/i.test(message)) return emit('error', 'Online progress storage has not been set up yet. Your work is kept on this device when browser storage is available.');
      if (/fetch|network|offline|load failed|timeout/i.test(message) || error instanceof TypeError) { scheduleRetry(); return emit('offline', locallySaved ? 'Offline—saved on this device, waiting to sync.' : 'Offline, and this browser could not save a device copy. Keep this page open and download a backup.'); }
      return emit('error', message || 'Online saving failed. Your device copy has been retained.');
    }
    async function getUser(token) {
      const result = await client.auth.getUser();
      if (!current(token)) return null;
      if (result.error) throw result.error;
      if (!result.data || !result.data.user) { const error = new Error('Not authenticated'); error.code = '401'; throw error; }
      return result.data.user;
    }
    async function readProgress(id) {
      const result = await client.from('campaign_progress').select('state,revision,updated_at').eq('user_id', id).eq('assignment_id', assignmentId).eq('activity_id', activityId).maybeSingle();
      if (result.error) throw result.error;
      if (!result.data) return { state: null, revision: 0, updated_at: null };
      if (!Number.isSafeInteger(result.data.revision) || result.data.revision < 1) throw new Error('The online save has an invalid revision.');
      return { state: normalize(result.data.state), revision: result.data.revision, updated_at: result.data.updated_at };
    }
    function showConflict(record) {
      conflict = record; cancelRetry();
      emit('conflict', record.source === 'device' ? 'Another browser tab changed this account’s device copy. Choose which copy to continue; both copies are preserved.' : 'This account has different progress on another session. Choose which copy to continue; neither will be silently overwritten.');
      conflictNotice({ local: copy(envelope.state), remote: copy(record.state), remoteRevision: record.revision, source: record.source || 'cloud' });
    }
    async function hydrate(token, editAtStart = editGeneration) {
      const enrollment = await client.from('campaign_enrollments').select('user_id,assignment_id,enabled').eq('user_id', user.id).eq('assignment_id', assignmentId).eq('enabled', true).maybeSingle();
      if (!current(token)) return false;
      if (enrollment.error) throw enrollment.error;
      if (!enrollment.data) { ready = false; emit('not-enrolled', 'This account is not assigned to this activity yet. Ask your teacher to assign it.'); return false; }
      const record = await readProgress(user.id);
      if (!current(token)) return false;
      if (rejectedChanges || editGeneration !== editAtStart) { if (!rejectedChanges && !remoteChecked) scheduleRetry(); return false; }
      const local = envelope && envelope.dirty ? envelope : readCache();
      ready = true; remoteChecked = true; conflict = null;
      if (local && local.dirty) {
        envelope = local;
        remote(copy(local.state), { source: 'cache', user: copy(user) });
        if (local.baseRevision !== record.revision) {
          // A response may have been lost after the server committed this exact copy.
          if (JSON.stringify(local.state) === JSON.stringify(record.state)) {
            envelope = { state: record.state, baseRevision: record.revision, dirty: false, updatedAt: record.updated_at };
            cache(); emit('saved', 'Saved online.'); return true;
          }
          showConflict(record); return true;
        }
        emit('saving', 'Saving your device copy online…'); schedule(); return true;
      }
      envelope = record.state == null ? null : { state: record.state, baseRevision: record.revision, dirty: false, updatedAt: record.updated_at };
      if (envelope) cache();
      remote(copy(record.state), { source: record.state ? 'cloud' : 'empty', user: copy(user) });
      emit('saved', record.state ? 'Saved online.' : 'Signed in. New work will save online.'); return true;
    }
    async function connect(credentials) {
      if (stopped) return false;
      if (rejectedChanges) { errorStatus(rejectedError); return false; }
      if (envelope && envelope.dirty && !locallySaved) { emit('error', 'This browser could not save your current device copy. Download a backup before reconnecting.'); return false; }
      if (user && envelope && envelope.dirty && credentials && credentials.email !== user.email) { emit('error', 'Save or explicitly sign out with your pending device copy before changing accounts.'); return false; }
      const token = ++generation; cancelTimer(); cancelRetry(); user = null; envelope = null; ready = false; remoteChecked = false; lastCacheRaw = null; conflict = null; inFlight = null;
      emit(credentials ? 'signing-in' : 'loading', credentials ? 'Signing in…' : 'Checking your saved session…');
      try {
        if (credentials) {
          const result = await client.auth.signInWithPassword(credentials);
          if (!current(token)) return false;
          if (result.error) throw result.error;
        }
        const result = await client.auth.getUser();
        if (!current(token)) return false;
        if (!credentials && (!result.data || !result.data.user) && (!result.error || /session missing|auth session missing/i.test(result.error.message || ''))) { emit('signed-out', 'Sign in to save across devices.'); return false; }
        if (result.error) throw result.error;
        if (!result.data || !result.data.user) throw new Error('Not authenticated');
        user = result.data.user;
        emit('loading', 'Loading this account’s progress…');
        return await hydrate(token);
      } catch (error) {
        if (current(token)) {
          if (user && /fetch|network|offline|load failed|timeout/i.test(String(error.message || ''))) {
            try { const local = readCache(); if (local) { envelope = local; ready = true; remote(copy(local.state), { source: 'cache', user: copy(user) }); } } catch (_) { /* Preserve an unreadable cache for recovery. */ }
          }
          errorStatus(error);
        }
        return false;
      }
    }
    function schedule() { cancelTimer(); if (ready && remoteChecked && !conflict && !stopped) timer = setTimeout(() => { timer = null; void flush(); }, delay); }
    function save(raw) {
      if (!user || !ready || stopped) return false;
      ++editGeneration;
      try {
        const state = normalize(raw);
        const hadRejectedChanges = rejectedChanges;
        rejectedChanges = false; rejectedError = null;
        if (envelope && JSON.stringify(envelope.state) === JSON.stringify(state)) {
          const cached = locallySaved || cache();
          if (hadRejectedChanges) {
            if (conflict) showConflict(conflict);
            else if (envelope.dirty) { if (cached) emit('saving', 'Saved on this device. Saving online…'); schedule(); }
            else emit('saved', 'Saved online.');
          }
          return cached;
        }
        envelope = { state, baseRevision: envelope ? envelope.baseRevision : 0, dirty: true, updatedAt: envelope ? envelope.updatedAt : null };
        const cached = cache();
        if (conflict) { showConflict(conflict); return cached; }
        if (cached) emit(remoteChecked ? 'saving' : 'offline', remoteChecked ? 'Saved on this device. Saving online…' : 'Saved on this device. Reconnect before this copy can sync.');
        schedule(); return cached;
      } catch (error) { rejectedChanges = true; rejectedError = error; locallySaved = false; cancelTimer(); cancelRetry(); errorStatus(error); return false; }
    }
    async function performFlush(token) {
      while (current(token) && user && ready && envelope && envelope.dirty && !conflict && !rejectedChanges) {
        const id = user.id, sent = copy(envelope.state), expected = envelope.baseRevision;
        emit('saving', 'Saving online…');
        try {
          const authenticated = await getUser(token);
          if (!current(token)) return false;
          if (!authenticated || authenticated.id !== id) { emit('auth-required', 'This session changed accounts. Your device copy is retained; sign in again.'); return false; }
          const result = await client.rpc('campaign_save_progress', { p_expected_user_id: id, p_assignment_id: assignmentId, p_activity_id: activityId, p_expected_revision: expected, p_state: sent });
          if (!current(token)) return false;
          if (result.error) {
            if (String(result.error.code) === 'PT409' || Number(result.error.status) === 409) {
              const record = await readProgress(id);
              if (!current(token)) return false;
              if (JSON.stringify(sent) === JSON.stringify(record.state)) {
                envelope.baseRevision = record.revision; envelope.updatedAt = record.updated_at;
                envelope.dirty = JSON.stringify(envelope.state) !== JSON.stringify(sent); cache();
                if (conflict || rejectedChanges) return false;
                if (!envelope.dirty) { emit('saved', 'Saved online.'); return true; }
                continue;
              }
              showConflict(record); return false;
            }
            throw result.error;
          }
          const record = Array.isArray(result.data) ? result.data[0] : result.data;
          if (!record || !Number.isSafeInteger(record.revision) || record.revision <= expected) throw new Error('The server did not confirm the saved revision.');
          envelope.baseRevision = record.revision; envelope.updatedAt = record.updated_at;
          envelope.dirty = JSON.stringify(envelope.state) !== JSON.stringify(sent);
          cache();
          if (conflict || rejectedChanges) return false;
          if (!envelope.dirty) { emit('saved', 'Saved online.', { updatedAt: record.updated_at }); return true; }
        } catch (error) { if (current(token)) errorStatus(error); return false; }
      }
      return !!(current(token) && envelope && !envelope.dirty);
    }
    function flush() {
      cancelTimer(); cancelRetry();
      if (stopped || !user || !ready || !remoteChecked || conflict || rejectedChanges) return Promise.resolve(false);
      if (inFlight) return inFlight;
      const token = generation;
      const task = performFlush(token); inFlight = task;
      task.finally(() => { if (inFlight === task) inFlight = null; });
      return task;
    }
    async function retry() {
      if (stopped) return false;
      if (rejectedChanges) { errorStatus(rejectedError); return false; }
      if (!user) return connect();
      if (conflict) return false;
      if (ready && remoteChecked && envelope && envelope.dirty) return flush();
      const token = generation, editAtStart = editGeneration;
      try { const authenticated = await getUser(token); if (!current(token)) return false; if (authenticated.id !== user.id) throw new Error('Not authenticated'); return await hydrate(token, editAtStart); }
      catch (error) { if (current(token)) errorStatus(error); return false; }
    }
    async function useCloud(settings) {
      if (!ready || !conflict || stopped) return false;
      if (rejectedChanges) { errorStatus(rejectedError); return false; }
      try {
        // The UI only passes this after an explicit download + user acknowledgement.
        if (!(settings && settings.backupDownloaded)) backup(envelope, 'device');
        const selected = conflict; conflict = null;
        envelope = selected.state == null ? null : { state: copy(selected.state), baseRevision: selected.revision, dirty: selected.source === 'device', updatedAt: selected.updated_at };
        if (envelope) cache(); else storage.removeItem(key());
        remote(copy(selected.state), { source: selected.source === 'device' ? 'cache' : selected.state ? 'cloud' : 'empty', user: copy(user) });
        if (selected.source === 'device') return await flush();
        emit('saved', settings && settings.backupDownloaded ? 'Using the online copy. You acknowledged downloading the previous device copy.' : 'Using the online copy. The previous device copy was backed up on this browser.'); return true;
      } catch (_) { emit('error', 'The alternate copy could not be backed up. Download a backup before resolving this conflict.'); return false; }
    }
    async function keepLocal(settings) {
      if (!ready || !conflict || stopped) return false;
      if (rejectedChanges) { errorStatus(rejectedError); return false; }
      try {
        if (!(settings && settings.backupDownloaded)) backup({ state: conflict.state, baseRevision: conflict.revision, updatedAt: conflict.updated_at }, conflict.source === 'device' ? 'other-tab' : 'online');
        envelope.baseRevision = conflict.revision; envelope.dirty = true; conflict = null; cache();
        return await flush();
      } catch (_) { emit('error', 'The alternate copy could not be backed up. Download a backup before resolving this conflict.'); return false; }
    }
    async function signOut(settings) {
      if (stopped) return false;
      cancelTimer(); cancelRetry();
      if (rejectedChanges && !(settings && settings.allowPending && settings.backupDownloaded)) { errorStatus(rejectedError); return false; }
      if (envelope && envelope.dirty && !(settings && settings.allowPending)) {
        await flush();
        if (envelope && envelope.dirty) { emit(conflict ? 'conflict' : 'error', locallySaved ? 'Some work is saved only on this device. Download a backup or explicitly leave this copy pending before signing out.' : 'This browser could not save your current device copy. Download a backup and acknowledge it before signing out.'); return false; }
      }
      if (envelope && envelope.dirty && !locallySaved && !(settings && settings.backupDownloaded) && !cache()) { emit('error', 'This browser could not save your current device copy. Download a backup and acknowledge it before signing out.'); return false; }
      ++generation; ready = false; inFlight = null;
      try {
        const result = await client.auth.signOut({ scope: 'local' });
        if (result.error) throw result.error;
        user = null; envelope = null; conflict = null; rejectedChanges = false; rejectedError = null; locallySaved = true;
        emit('signed-out', 'Signed out. Account progress stays separate from practice work.'); return true;
      } catch (error) { errorStatus(error); return false; }
    }
    const onlineHandler = () => { if (user) void retry(); };
    if (typeof window === 'object' && window.addEventListener) window.addEventListener('online', onlineHandler);
    return {
      signIn(username, password) {
        const name = String(username || '').trim().toLowerCase();
        if (!name || !password || (!name.includes('@') && !emailDomain)) { emit('error', 'Enter your assigned username and password.'); return Promise.resolve(false); }
        return connect({ email: name.includes('@') ? name : name + '@' + emailDomain, password });
      },
      resume: () => connect(), signOut, save, flush, retry, useCloud, keepLocal, getBackups,
      getConflictCopies: () => conflict && !rejectedChanges ? { local: copy(envelope.state), remote: copy(conflict.state), source: conflict.source || 'cloud' } : null,
      getSnapshot: (settings) => ({ user: copy(user), ready, locallySaved, rejectedChanges, dirty: rejectedChanges || !!(envelope && envelope.dirty), conflict: !!conflict, status: copy(status), ...(settings && settings.includeState === false ? {} : { state: copy(envelope && envelope.state) }) }),
      destroy() { stopped = true; ++generation; cancelTimer(); cancelRetry(); if (typeof window === 'object' && window.removeEventListener) window.removeEventListener('online', onlineHandler); }
    };
  }
  return { create, MAX_BYTES, cacheKey };
});
