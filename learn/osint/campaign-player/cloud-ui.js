'use strict';
// The account controls never migrate browser practice automatically. The player
// supplies fresh-state replacement so hints and drafts cannot cross accounts.
(() => {
  function mount(adapter) {
    const config = window.CAMPAIGN_CLOUD_CONFIG;
    const accountButton = document.getElementById('cloud-account');
    const statusElement = document.getElementById('cloud-status');
    const dialog = document.getElementById('cloud-dialog');
    if (!config?.url || !config?.publishableKey || !accountButton || !dialog) return null;
    const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
    let guest = clone(adapter.getState()), controller = null, busy = false, loadingAccount = true;
    let status = { kind: 'loading', message: 'Checking sign-in…' }, panel = 'account', failure = '', wasSignedIn = false, conflictSource = 'cloud';
    let resolutionRecovery = null, signoutRecoveryFingerprint = null, displayedUser = null;
    function element(tag, text, attrs = {}) {
      const item = document.createElement(tag);
      if (text != null) item.textContent = text;
      for (const [key, value] of Object.entries(attrs)) item.setAttribute(key, String(value));
      return item;
    }
    function button(text, action) {
      const item = element('button', text, { type: 'button' });
      item.addEventListener('click', action); return item;
    }
    function show() {
      dialog.hidden = false;
      if (typeof dialog.showModal === 'function' && !dialog.open) dialog.showModal();
      else dialog.open = true;
      render();
    }
    function close() {
      if (busy || loadingAccount || (current().user && !current().ready)) return;
      if (typeof dialog.close === 'function') dialog.close();
      dialog.open = false; dialog.hidden = true;
      adapter.onSessionReady?.();
      accountButton.focus?.();
    }
    function identity(user) { return user?.email?.split('@')[0] || 'Student account'; }
    function current() { return controller?.getSnapshot({ includeState: false }) || { user: null, ready: false, dirty: false }; }
    function isAccountActive() { return loadingAccount || Boolean(current().user); }
    function getBackupContext(options = {}) {
      // Authentication can succeed before account progress loads. The current
      // screen still belongs to practice until replacement actually succeeds.
      const user = options.alternate ? current().user : displayedUser;
      return { mode: user ? 'account' : 'practice', username: user ? identity(user) : null, status: status.kind };
    }
    function updateStatus(next) {
      if (next.kind === 'signed-out') next = { ...next, message: wasSignedIn
        ? 'Signed out. Sign back in to view or download your account work. Browser practice is separate.'
        : 'Browser practice only. Sign in to open your account’s saved work.' };
      status = next;
      const snap = current(), user = next.user || snap.user;
      if (statusElement) { statusElement.textContent = next.message || next.kind; statusElement.setAttribute('data-kind', next.kind); }
      accountButton.textContent = user ? identity(user) + ' · Account' : 'Sign in to save online';
      if (user) wasSignedIn = true;
      if (next.kind === 'signed-out') {
        loadingAccount = false;
        if (wasSignedIn) { wasSignedIn = false; adapter.replaceState(clone(guest)); }
        displayedUser = null;
        adapter.onSessionReady?.();
      }
      if (['error', 'auth-required', 'not-enrolled', 'offline', 'oversized'].includes(next.kind)) { loadingAccount = false; adapter.onSessionReady?.(); }
      if (dialog.open && !busy) render();
    }
    function receiveState(value, details) {
      adapter.replaceState(clone(value));
      displayedUser = clone(details?.user || current().user);
      loadingAccount = false;
      adapter.onSessionReady?.();
    }
    async function perform(action, after) {
      if (busy) return;
      busy = true; failure = ''; render();
      try { const value = await action(); if (after) after(value); }
      catch (error) { failure = error?.message || 'The account could not connect. Your current work is still here.'; }
      finally { busy = false; render(); }
    }
    function resolveConflict(action, backupDownloaded = false) {
      return perform(() => controller[action]({ backupDownloaded }), value => {
        if (value === false && current().conflict && controller.getConflictCopies) {
          resolutionRecovery = { action, downloaded: false, fingerprint: null };
        } else { resolutionRecovery = null; panel = 'account'; }
      });
    }
    function losingCopy(action) {
      const versions = controller.getConflictCopies?.();
      return versions ? (action === 'useCloud' ? versions.local : versions.remote) : undefined;
    }
    function line(text, cls = '') { return element('p', text, cls ? { class: cls } : {}); }
    function footer() { const back = button(current().user ? 'Return to investigation' : 'Continue in browser practice', close); back.disabled = Boolean(current().user && !current().ready); dialog.append(back); }
    function render() {
      if (!dialog.open) return;
      const snap = current();
      dialog.replaceChildren(element('h2', snap.user ? 'Your saved investigation' : 'Save your work online'));
      if (busy || loadingAccount) {
        dialog.append(line(status.message || 'Connecting…', 'cloud-notice'));
        return;
      }
      if (failure) dialog.append(line(failure, 'cloud-error'));
      if (!controller) {
        dialog.append(line('Online saving could not load. Browser practice and progress backups still work. Refresh when the connection is available.', 'cloud-error'));
        footer(); return;
      }
      if (snap.user) {
        dialog.append(line('Signed in as ' + identity(snap.user)), line(status.message || 'Checking online progress…', 'cloud-notice'));
        if (snap.conflict) {
          dialog.append(line('Another session has different saved work' + (conflictSource === 'device' ? ' in this browser' : ' online') + '. Download your current copy before choosing which version to continue. Nothing is merged or overwritten automatically.'));
          dialog.append(button('Download this copy', () => adapter.downloadBackup('Campaign-conflict-copy.json')));
          dialog.append(button(conflictSource === 'device' ? 'Load the other browser copy' : 'Load online version', () => resolveConflict('useCloud')));
          dialog.append(button(conflictSource === 'device' ? 'Keep this browser copy' : 'Use this copy online', () => { panel = 'confirm-overwrite'; render(); }));
          if (panel === 'confirm-overwrite') {
            dialog.append(line('Replace the other saved version with this copy? The other session’s changes will not be included. A recovery copy is kept under this account in this browser.', 'cloud-notice'));
            dialog.append(button('Confirm use this copy', () => resolveConflict('keepLocal')));
            dialog.append(button('Cancel replacement', () => { panel = 'account'; render(); }));
          }
          if (resolutionRecovery && adapter.downloadState) {
            dialog.append(line('The choice could not finish. If this browser cannot keep a recovery copy, download the version that would be replaced before trying again.', 'cloud-notice'));
            dialog.append(button('Download the version being replaced', () => {
              const value = losingCopy(resolutionRecovery.action); if (value === undefined) return;
              adapter.downloadState('Campaign-before-conflict-choice.json', value, getBackupContext({ alternate: true }));
              resolutionRecovery.fingerprint = JSON.stringify(value); resolutionRecovery.downloaded = true; render();
            }));
            if (resolutionRecovery.downloaded) {
              dialog.append(line('The download has started. Check that the file is saved on your device before continuing.'));
              dialog.append(button('I saved the backup — continue', () => {
                if (JSON.stringify(losingCopy(resolutionRecovery.action)) !== resolutionRecovery.fingerprint) {
                  resolutionRecovery.downloaded = false; failure = 'That saved version changed. Download its latest copy before continuing.'; render(); return;
                }
                resolveConflict(resolutionRecovery.action, true);
              }));
            }
          }
        } else if (panel === 'import-practice') {
          dialog.append(line('Copy this browser’s practice work into ' + identity(snap.user) + '? This replaces this account’s current investigation work. Use this only for your own practice. The original browser copy stays in this browser.'));
          dialog.append(button('Download current account backup', () => adapter.downloadBackup('Campaign-before-practice-import.json')));
          dialog.append(button('Confirm copy my practice work', () => {
            if (!snap.ready) return;
            perform(async () => {
              adapter.replaceState(clone(guest), { preserveCurrentHints: true });
              controller.save(adapter.getState()); panel = 'account';
            });
          }));
          dialog.append(button('Cancel copy', () => { panel = 'account'; render(); }));
        } else if (panel === 'pending-signout') {
          const lacksCurrentCopy = snap.locallySaved === false || snap.rejectedChanges;
          dialog.append(line(lacksCurrentCopy ? 'Some changes have not reached the server, and this browser could not save the current work as an offline copy. Keep this page open and download a backup. Sign-out is blocked until a copy is preserved.' : 'Some changes have not reached the server. Download a backup before leaving. An offline copy also stays under this account in this browser; it will not appear for the next signed-in student.', 'cloud-notice'));
          dialog.append(button('Download unsynced backup', async () => {
            const fingerprint = JSON.stringify(adapter.getState());
            const downloaded = await adapter.downloadBackup('Campaign-unsynced-progress.json');
            if (downloaded !== false && fingerprint === JSON.stringify(adapter.getState())) signoutRecoveryFingerprint = fingerprint;
            render();
          }));
          dialog.append(button('Retry saving', () => perform(() => controller.retry(), () => { panel = 'account'; })));
          if (!lacksCurrentCopy) dialog.append(button('Sign out and keep an offline copy', () => perform(() => controller.signOut({ allowPending: true }), value => { if (value !== false) panel = 'account'; })));
          else if (signoutRecoveryFingerprint !== null) {
            dialog.append(line('The download has started. Check that your current backup file is saved on your device before signing out.'));
            dialog.append(button('I saved my backup — sign out', () => {
              if (JSON.stringify(adapter.getState()) !== signoutRecoveryFingerprint) { signoutRecoveryFingerprint = null; failure = 'Your work changed. Download the latest backup before signing out.'; render(); return; }
              perform(() => controller.signOut({ allowPending: true, backupDownloaded: true }), value => { if (value !== false) panel = 'account'; });
            }));
          }
        } else {
          dialog.append(line('Answers, query history, timeline descriptions and report notes save to this account. On a shared computer, sign out when you finish.'));
          if (snap.ready) dialog.append(button('Copy this browser’s practice work', () => { panel = 'import-practice'; render(); }));
          if (['offline', 'error', 'auth-required', 'not-enrolled'].includes(status.kind)) dialog.append(button('Retry online connection', () => perform(() => controller.retry())));
        }
        const backups = controller.getBackups?.() || [];
        if (backups.length && adapter.downloadState) {
          const recovery = element('details'); recovery.append(element('summary', 'Alternate copies kept in this browser'));
          recovery.append(line('These copies belong to this account. Download one to review or restore it through Save & export.'));
          for (const item of backups) recovery.append(button('Download ' + (item.kind === 'online' ? 'online' : 'device') + ' copy · ' + item.savedAt, () => adapter.downloadState('Campaign-alternate-copy.json', item.state, getBackupContext({ alternate: true }))));
          dialog.append(recovery);
        }
        dialog.append(button('Download progress backup', () => adapter.downloadBackup('Campaign-guided-progress.json')));
        if (panel !== 'pending-signout') dialog.append(button('Sign out', () => perform(() => controller.signOut(), value => { signoutRecoveryFingerprint = null; if (value === false) panel = 'pending-signout'; else panel = 'account'; })));
        footer(); return;
      }
      dialog.append(line('Sign in with the username and password assigned by your teacher to reopen your saved responses. You do not need to register or provide a personal email address.'));
      dialog.append(line(status.message || '', 'cloud-notice'));
      const practiceAnswers = Object.values(adapter.getState()?.responses || {}).filter(response => typeof response?.answer === 'string' && response.answer.trim()).length;
      dialog.append(line((practiceAnswers ? 'This browser has ' + practiceAnswers + ' practice response' + (practiceAnswers === 1 ? '' : 's') + '. ' : '') + 'Browser practice stays separate from your class account. Sign in before downloading a backup of your account work.', 'helper'));
      const form = element('form'), username = element('input', null, { type: 'text', name: 'username', autocomplete: 'username', required: '', maxlength: '80', 'aria-label': 'Class username' });
      const password = element('input', null, { type: 'password', name: 'password', autocomplete: 'current-password', required: '', maxlength: '200', 'aria-label': 'Password' });
      for (const [label, input] of [['Class username', username], ['Password', password]]) { const wrap = element('label', label, { class: 'field' }); wrap.append(input); form.append(wrap); }
      form.append(element('button', 'Sign in', { type: 'submit' }));
      form.addEventListener('submit', event => {
        event.preventDefault();
        const name = username.value.trim(), secret = password.value;
        if (!name || !secret || busy) return;
        guest = clone(adapter.getState()); password.value = ''; loadingAccount = true;
        perform(() => controller.signIn(name, secret), () => { loadingAccount = false; panel = 'account'; }).finally(() => { loadingAccount = false; render(); });
      });
      dialog.append(form); footer();
    }
    accountButton.hidden = false;
    accountButton.addEventListener('click', () => { panel = 'account'; show(); });
    dialog.addEventListener('cancel', event => { if (busy || loadingAccount || !current().user || !current().ready) event.preventDefault(); else { dialog.hidden = true; dialog.open = false; } });
    try {
      if (!window.supabase?.createClient || !window.CampaignCloudSync?.create) throw new Error('Online saving is unavailable.');
      const client = window.supabase.createClient(config.url, config.publishableKey, { auth: { persistSession: true, storage: window.sessionStorage, autoRefreshToken: true, detectSessionInUrl: false } });
      controller = window.CampaignCloudSync.create({ client, storage: window.localStorage, activityId: adapter.activityId, assignmentId: config.assignmentId, emailDomain: config.emailDomain, validateState: adapter.validateState, onStatus: updateStatus, onRemote: receiveState, onConflict: details => { conflictSource = details?.source || 'cloud'; panel = 'account'; show(); } });
    } catch (error) {
      loadingAccount = false; updateStatus({ kind: 'error', message: 'Online saving unavailable · browser practice only' });
      return { isAccountActive: () => false, save: () => false, getBackupContext };
    }
    // Hydration is modal: nobody can type into a previous student's screen while
    // their own account is still loading. No practice state is sent by resume().
    show();
    perform(() => controller.resume(), () => { loadingAccount = false; }).finally(() => { loadingAccount = false; if (current().user && current().ready) close(); else render(); });
    window.addEventListener('beforeunload', event => { if (current().user && current().dirty) { event.preventDefault(); event.returnValue = ''; } });
    window.addEventListener('online', () => { if (current().user) controller.retry().catch(() => {}); });
    return {
      isAccountActive,
      getBackupContext,
      save(value) { return controller.save(value); },
      canEdit() { return !loadingAccount && (!current().user || current().ready); }
    };
  }
  window.CampaignCloudUI = Object.freeze({ mount });
})();
