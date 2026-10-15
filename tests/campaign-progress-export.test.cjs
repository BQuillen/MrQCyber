'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const C = require('../learn/osint/campaign-player/player-core.js');
const player = fs.readFileSync(path.join(__dirname, '../learn/osint/campaign-player/player.js'), 'utf8');

class Element {
  constructor(tag, ownerDocument) { this.tagName = tag; this.ownerDocument = ownerDocument; this.children = []; this.attributes = {}; this.listeners = {}; this.value = ''; this._text = ''; this.contentWindow = { postMessage() {} }; }
  set textContent(value) { this._text = String(value); this.children = []; }
  get textContent() { return this._text + this.children.map(item => item.textContent).join(''); }
  set className(value) { this.attributes.class = value; }
  get className() { return this.attributes.class || ''; }
  get options() { return this.children.filter(item => item.tagName === 'option'); }
  setAttribute(key, value) { this.attributes[key] = String(value); if (['id', 'value', 'href'].includes(key)) this[key] = String(value); }
  getAttribute(key) { return this.attributes[key] ?? null; }
  removeAttribute(key) { delete this.attributes[key]; }
  append(...children) { for (const child of children) { const item = child instanceof Element ? child : Object.assign(new Element('#text', this.ownerDocument), { textContent: child }); item.parentElement = this; this.children.push(item); } }
  replaceChildren(...children) { this.children = []; this._text = ''; this.append(...children); }
  addEventListener(type, listener) { (this.listeners[type] ||= []).push(listener); }
  async fire(type, extra = {}) { for (const listener of this.listeners[type] || []) await listener({ target: this, preventDefault() {}, ...extra }); }
  click() { if (this.tagName === 'a') this.ownerDocument.downloads.push(this.attributes.download); return this.fire('click'); }
  remove() { if (this.parentElement) this.parentElement.children = this.parentElement.children.filter(item => item !== this); }
  focus() { this.ownerDocument.activeElement = this; }
  showModal() { this.open = true; }
  close() { this.open = false; }
  querySelectorAll(selector) { if (selector === '.question-progress p span:last-child') return walk(this).filter(item => item.tagName === 'span').slice(-1); return walk(this).slice(1).filter(item => selector.startsWith('.') ? item.className.split(/\s+/).includes(selector.slice(1)) : item.tagName === selector); }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
}
function walk(node) { return [node, ...node.children.flatMap(walk)]; }
function button(root, text) { const item = walk(root).find(item => item.tagName === 'button' && item.textContent === text); assert.ok(item, 'Missing button: ' + text); return item; }
function activity() {
  return { id: 'export-regression', revision: '1', title: 'Export regression', scoring: { pointsPerQuestion: 5, hintCost: 1 }, tracks: [{ id: 'year1', label: 'Year 1', sections: [{ id: 'first', title: 'First section', availableArtifactIds: ['POST-01'], availableTableNames: [], questions: [{ id: 'Y1-01', title: 'Read the post', prompt: 'Explain the issue.', type: 'short', validation: { responseRequired: true }, hints: ['Compare the posts.'], workspace: { mode: 'browser', pageId: 'public' }, report: { section: 'attacker' } }] }] }], pages: [{ id: 'public', title: 'Public post', public: true, artifactIds: ['POST-01'] }], caseData: { artifacts: [{ id: 'POST-01', type: 'document', title: 'Post', body: ['Evidence.'] }], discoveryChannels: { 'POST-01': ['compass'] } } };
}
function harness() {
  const a = activity(), document = { downloads: [] }, nodes = new Map(), blobs = [], saves = [];
  for (const id of ['question-panel', 'workspace-toolbar', 'workspace-content', 'save-status', 'announcement', 'progress-status', 'finding-count', 'track-switch', 'report-toggle', 'backup', 'restore', 'export-report', 'import-file']) nodes.set(id, Object.assign(new Element('div', document), { id }));
  document.body = new Element('body', document); document.body.append(...nodes.values());
  Object.assign(document, { getElementById: id => nodes.get(id), createElement: tag => new Element(tag, document), createTextNode: text => Object.assign(new Element('#text', document), { textContent: text }) });
  const map = new Map(), storage = { getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, value) };
  const location = { href: 'https://classroom.example/learn/osint/campaign-player/index.html#/year1', hash: '#/year1', origin: 'https://classroom.example', protocol: 'https:' };
  const history = { replaceState(_state, _title, hash) { location.hash = hash; } };
  let adapter, authActive = false, context = { mode: 'practice', username: null, status: 'signed-out' };
  const window = { CAMPAIGN_ACTIVITY: a, CampaignPlayerCore: C, addEventListener() {}, clearTimeout() {}, CampaignCloudUI: { mount(value) { adapter = value; return { isAccountActive: () => authActive || context.mode === 'account', getBackupContext: () => ({ ...context }), save(value) { saves.push(JSON.stringify(value)); return true; } }; } } };
  vm.runInNewContext(player, { window, document, location, history, localStorage: storage, TextEncoder, Blob, URL: { createObjectURL(blob) { blobs.push(blob); return 'blob:test'; }, revokeObjectURL() {} }, setTimeout() { return 1; }, console });
  return { a, document, nodes, blobs, saves, get adapter() { return adapter; }, get state() { return adapter.getState(); }, get dialog() { return walk(document.body).find(item => item.tagName === 'dialog'); },
    account(snapshot = C.createState(a), username = 'a-am-y1-01') { context = { mode: 'account', username, status: 'saved' }; adapter.replaceState(snapshot); },
    signOut() { authActive = false; context = { mode: 'practice', username: null, status: 'signed-out' }; adapter.replaceState(C.createState(a)); },
    failHydration() { authActive = true; context = { mode: 'practice', username: null, status: 'error' }; adapter.onSessionReady(); }
  };
}

test('account backup contains submitted and draft work, owner/date filename and compatible metadata without mutating state', async () => {
  const h = harness(); h.account();
  C.setAnswer(h.a, h.state, 'Y1-01', 'The policy changed without an explanation.'); C.submit(h.a, h.state, 'Y1-01');
  h.state.responses['Y1-01'].query = 'Records | count'; h.state.responses['Y1-01'].capture.summary = 'Another finding draft';
  C.addFinding(h.a, h.state, { questionId: 'Y1-01', section: 'attacker', summary: 'Public evidence', evidenceIds: ['POST-01'] });
  h.state.reportDraft.year1.mitigation = 'Verify publication approval.';
  const original = JSON.stringify(h.state); await h.nodes.get('backup').click();
  const file = JSON.parse(await h.blobs[0].text());
  assert.equal(file.responses['Y1-01'].answer, 'The policy changed without an explanation.');
  assert.equal(file._backup.mode, 'account'); assert.equal(file._backup.username, 'a-am-y1-01'); assert.equal(file._backup.saveStatus, 'saved');
  assert.deepEqual(file._backup.counts, { responses: 1, submittedResponses: 1, findings: 1, queryDrafts: 1, queryRuns: 0, reportNotes: 1, findingDrafts: 1, hintsUsed: 0 });
  assert.match(h.document.downloads[0], /^Campaign-guided-progress--a-am-y1-01--\d{4}-\d\d-\d\dT.+Z\.json$/);
  assert.ok(Number.isFinite(Date.parse(file._backup.exportedAt)));
  assert.equal(JSON.stringify(h.state), original); assert.ok(h.saves.every(value => !value.includes('"_backup"')));
  const restored = C.restore(h.a, file); assert.equal(restored.responses['Y1-01'].answer, file.responses['Y1-01'].answer); assert.equal(C.isComplete(h.a, restored, 'Y1-01'), true); assert.equal(restored.findings.length, 1);
  assert.match(h.nodes.get('save-status').textContent, /Account: a-am-y1-01.*1 responses.*1 submitted/);
});

test('signed-out blank practice cannot silently download the same apparent account backup', async () => {
  const h = harness(); h.account(); C.setAnswer(h.a, h.state, 'Y1-01', 'My saved account explanation');
  await h.adapter.downloadBackup('Campaign-guided-progress.json'); assert.equal(h.blobs.length, 1);
  h.signOut(); const pending = h.nodes.get('backup').click();
  assert.equal(h.blobs.length, 1); assert.equal(h.dialog.open, true);
  assert.match(h.dialog.textContent, /Browser practice \(signed out\)/); assert.match(h.dialog.textContent, /Sign in to your class account/);
  await button(h.dialog, 'Cancel download').click(); await pending;
  assert.equal(h.blobs.length, 1); assert.equal(h.dialog, undefined);
  const second = h.adapter.downloadBackup('Campaign-guided-progress.json');
  await button(h.dialog, 'Download empty practice backup').click(); assert.equal(await second, true);
  const empty = JSON.parse(await h.blobs.at(-1).text()); assert.equal(empty._backup.mode, 'practice'); assert.equal(empty._backup.counts.responses, 0);
  assert.match(h.document.downloads.at(-1), /--browser-practice--/);
});

test('empty account copy names the account and requires confirmation before downloading', async () => {
  const h = harness(); h.account(); const pending = h.adapter.downloadBackup('Campaign-before-restore.json');
  assert.equal(h.blobs.length, 0); assert.match(h.dialog.textContent, /Account: a-am-y1-01/);
  await button(h.dialog, 'Download empty account backup').click(); assert.equal(await pending, true);
  assert.equal(JSON.parse(await h.blobs[0].text())._backup.mode, 'account'); assert.match(h.document.downloads[0], /^Campaign-before-restore--a-am-y1-01--/);
});

test('escaping an empty-backup warning cancels the file download', async () => {
  const h = harness(); const pending = h.adapter.downloadBackup('Campaign-guided-progress.json');
  await h.dialog.fire('cancel'); assert.equal(await pending, false); assert.equal(h.blobs.length, 0);
});

test('an account change while empty-backup confirmation is open cancels the stale request', async () => {
  const h = harness(); const pending = h.adapter.downloadBackup('Campaign-guided-progress.json'), priorDialog = h.dialog;
  h.account(); await button(priorDialog, 'Download empty practice backup').click();
  assert.equal(await pending, false); assert.equal(h.blobs.length, 0); assert.match(h.nodes.get('announcement').textContent, /account or progress changed/);
});

test('query-only, report-only, finding-draft-only and hint-only progress are not called empty', async () => {
  for (const setWork of [state => { C.response(state, 'Y1-01').query = 'Records | count'; }, state => { state.reportDraft.year1.timeline = 'Timeline note'; }, state => { C.response(state, 'Y1-01').capture.summary = 'Unfinished finding'; }, state => { C.response(state, 'Y1-01').hints = ['hint-1']; }]) {
    const h = harness(); setWork(h.state); assert.equal(await h.adapter.downloadBackup('Campaign-guided-progress.json'), true);
    assert.equal(h.blobs.length, 1); assert.equal(h.dialog, undefined);
  }
});

test('alternate recovery downloads preserve their actual snapshot, including literal null, and never substitute current answers', async () => {
  const h = harness(); h.account(); C.setAnswer(h.a, h.state, 'Y1-01', 'Current account answer');
  const alternate = C.createState(h.a); C.setAnswer(h.a, alternate, 'Y1-01', 'Older recovery answer');
  assert.equal(h.adapter.downloadState('Campaign-alternate-copy.json', alternate), true);
  const old = JSON.parse(await h.blobs[0].text()); assert.equal(old.responses['Y1-01'].answer, 'Older recovery answer'); assert.equal(old._backup.counts.responses, 1);
  assert.equal(h.adapter.downloadState('Campaign-before-conflict-choice.json', null), true);
  assert.equal(await h.blobs[1].text(), 'null'); assert.equal(h.state.responses['Y1-01'].answer, 'Current account answer'); assert.equal(h.dialog, undefined);
});

test('alternate account recovery can identify its owner separately from the displayed practice copy', async () => {
  const h = harness(), alternate = C.createState(h.a); C.setAnswer(h.a, alternate, 'Y1-01', 'Saved account recovery');
  h.adapter.downloadState('Campaign-alternate-copy.json', alternate, { mode: 'account', username: 'b-pm-y2-03', status: 'error' });
  const file = JSON.parse(await h.blobs[0].text()); assert.equal(file._backup.mode, 'account'); assert.equal(file._backup.username, 'b-pm-y2-03');
  assert.equal(file.responses['Y1-01'].answer, 'Saved account recovery'); assert.match(h.document.downloads[0], /--b-pm-y2-03--/);
  assert.equal(h.state.responses['Y1-01'].answer, '');
});

test('authenticated but unloaded account does not label the displayed practice as account work', () => {
  const h = harness();
  C.setAnswer(h.a, h.state, 'Y1-01', 'Existing browser practice');
  h.failHydration();
  assert.match(h.nodes.get('save-status').textContent, /^Browser practice/);
  assert.equal(h.state.responses['Y1-01'].answer, 'Existing browser practice');
});
