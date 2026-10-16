'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const folder = path.join(__dirname, '../learn/osint/campaign-player');
const C = require(path.join(folder, 'player-core.js'));
const Q = require(path.join(folder, 'query-engine.js'));

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
  click() { return this.disabled ? Promise.resolve() : this.fire('click'); }
  focus() { this.ownerDocument.activeElement = this; }
  querySelectorAll(selector) { return walk(this).slice(1).filter(item => selector.startsWith('.') ? item.className.split(/\s+/).includes(selector.slice(1)) : item.tagName === selector); }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
}
function walk(node) { return [node, ...node.children.flatMap(walk)]; }
function find(root, predicate) { const result = walk(root).find(predicate); assert.ok(result, 'Expected control was not found'); return result; }
function button(root, label) { return find(root, item => item.tagName === 'button' && item.textContent === label); }
function searchInput(h) { return find(h.content, item => item.attributes['aria-label'] === 'Search provided records'); }
function results(h) { return walk(h.content).filter(item => item.className === 'records-search-result'); }
async function search(h, text) { const input = searchInput(h); input.value = text; await input.fire('input'); return results(h); }

function fixture() {
  const early = ['DOC-03', 'DOC-04', 'LEDGER-FIXTURE'];
  const question = (id, mode) => ({ id, title: id, prompt: 'Explain the evidence.', type: 'short', validation: { responseRequired: true }, hints: ['Read the source.'], workspace: mode === 'query' ? { mode, tableName: 'ApprovalLedger' } : { mode: 'browser', pageId: 'early' }, report: { section: 'timeline' } });
  const track = id => ({ id, label: id, sections: [
    { id: id + '-early', title: 'First collection', availableArtifactIds: early, availableTableNames: ['ApprovalLedger'], questions: [question(id + '-01', 'browser'), question(id + '-02', 'query')] },
    { id: id + '-later', title: 'Later collection', availableArtifactIds: [...early, 'LATER-01'], availableTableNames: ['ApprovalLedger'], questions: [question(id + '-03', 'browser')] }
  ] });
  return { id: 'records-search-fixture', revision: '1', title: 'Investigation', scoring: { pointsPerQuestion: 5, hintCost: 1 }, tracks: [track('year1'), track('year2')], pages: [
    { id: 'early', title: 'Initial documents', public: false, artifactIds: early },
    { id: 'later', title: 'Later evidence', public: false, artifactIds: ['LATER-01'] }
  ], caseData: { contentRevision: '1', artifacts: [
    { id: 'DOC-03', type: 'document', title: 'Connectivity briefing — version 3', body: ['Document DOC-CONNECTIVITY-01, version 3. Approved position with privacy protections.'] },
    { id: 'DOC-04', type: 'document', title: 'Connectivity briefing — version 4', body: ['Document DOC-CONNECTIVITY-01, version 4. A revised policy statement. Previous version: 3.'] },
    { id: 'LEDGER-FIXTURE', type: 'table', title: 'Campaign approval ledger', body: ['Approval applies to the document and version listed.'], columns: ['approval_id', 'version', 'decision'], rows: [['APR-061', 3, 'Approved'], ['APR-062', 4, 'Pending']] },
    { id: 'LATER-01', type: 'document', title: 'Later private assignment', body: ['Only later students should see the violet schedule.'] }
  ], discoveryChannels: Object.fromEntries([...early, 'LATER-01'].map(id => [id, ['data']])), queryTables: { ApprovalLedger: { artifactId: 'LEDGER-FIXTURE', types: { approval_id: 'string', version: 'long', decision: 'string' } } } } };
}
function harness(a = fixture()) {
  const document = {}, ids = ['question-panel', 'workspace-toolbar', 'workspace-content', 'save-status', 'announcement', 'progress-status', 'finding-count', 'track-switch', 'report-toggle', 'backup', 'restore', 'export-report', 'import-file'];
  const nodes = new Map(ids.map(id => [id, Object.assign(new Element('div', document), { id })]));
  document.body = new Element('body', document); document.body.append(...nodes.values());
  Object.assign(document, { getElementById: id => nodes.get(id) || walk(document.body).find(item => item.id === id), createElement: tag => new Element(tag, document), createTextNode: text => Object.assign(new Element('#text', document), { textContent: text }) });
  const storage = new Map(), mounts = [], guideCalls = [];
  const location = { href: 'https://classroom.example/player/index.html#/year1', hash: '#/year1', origin: 'https://classroom.example', protocol: 'https:' };
  const window = { CAMPAIGN_ACTIVITY: a, CampaignPlayerCore: C, CampaignQuery: Q, addEventListener() {}, clearTimeout() {},
    CampaignTableGuides: { render(host, options) { guideCalls.push(options); host.append(document.createTextNode('Help for ' + options.tableName)); } },
    CampaignPlayerEditor: { mount(host, options) { const api = { value: options.initialQuery, getValue() { return this.value; }, getRestoredRun() { return options.initialRun || null; }, destroy() {} }; mounts.push({ options, api }); return api; } }
  };
  const source = fs.readFileSync(path.join(folder, 'player.js'), 'utf8'), end = source.lastIndexOf('\n})();');
  const instrumented = source.slice(0, end) + '\n globalThis.playerTest = { get state() { return state; }, route, go, replaceSessionState };' + source.slice(end);
  const context = vm.createContext({ window, document, location, history: { replaceState(_state, _title, value) { location.hash = value; } }, localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) }, TextEncoder, URL, Blob, console });
  vm.runInContext(fs.readFileSync(path.join(folder, 'sources.js'), 'utf8'), context);
  vm.runInContext(instrumented, context);
  return { a, document, nodes, content: nodes.get('workspace-content'), toolbar: nodes.get('workspace-toolbar'), mounts, guideCalls, api: context.playerTest, navigate(id) { this.api.go(id); this.api.route(); } };
}
function complete(h, id) { C.setAnswer(h.a, h.api.state, id, 'My evidence explanation.'); assert.equal(C.submit(h.a, h.api.state, id).ok, true); }

test('search finds the briefing versions, source IDs, table names, columns, and record values', async () => {
  const h = harness();
  assert.equal((await search(h, 'connectivity briefing')).length, 2);
  assert.equal((await search(h, 'connectivity briefing 3'))[0].attributes['data-source-id'], 'DOC-03');
  assert.deepEqual((await search(h, 'connectivity briefing 4')).map(item => item.attributes['data-source-id']), ['DOC-04']);
  assert.equal((await search(h, 'DOC-03'))[0].attributes['data-source-id'], 'DOC-03');
  for (const term of ['ApprovalLedger', 'approval_id', 'APR-061', 'privacy protections']) {
    const found = await search(h, term); assert.ok(found.length, term); assert.ok(found[0].querySelector('.records-search-excerpt').textContent.length, 'search gives a source excerpt');
  }
  assert.match((await search(h, 'APR-061'))[0].textContent, /approval_id: APR-061/);
});

test('search and its snippets contain only supplied evidence in the current section', async () => {
  const h = harness();
  assert.equal((await search(h, 'violet')).length, 0);
  assert.equal((await search(h, 'LATER-01')).length, 0);
  assert.doesNotMatch(h.content.textContent, /Later private assignment|violet schedule/);
  assert.match(h.content.textContent, /No matching records in this section/);
  complete(h, 'year1-01'); complete(h, 'year1-02'); h.navigate('year1-03');
  assert.equal((await search(h, 'violet'))[0].attributes['data-source-id'], 'LATER-01');
  h.navigate('year1-01');
  assert.equal(results(h).length, 0, 'returning to an earlier section does not retain later search results');
  assert.doesNotMatch(h.content.textContent, /violet schedule/);
});

test('opening a search result retains the search and its return path without changing student work', async () => {
  const h = harness(); complete(h, 'year1-01'); h.navigate('year1-02');
  const editor = h.mounts.at(-1), query = 'ApprovalLedger | where approval_id == "APR-061"';
  editor.api.value = query; editor.options.onDraftChange(query);
  editor.options.onRun({ query, ranAt: '2026-10-16T15:00:00Z', result: Q.execute(query, Q.getTables(editor.options.caseData)) });
  C.setAnswer(h.a, h.api.state, 'year1-02', 'My unfinished explanation.');
  C.addFinding(h.a, h.api.state, { questionId: 'year1-02', section: 'timeline', summary: 'Version 3 has an approval.', evidenceIds: ['LEDGER-FIXTURE', 'APR-061'] });
  h.api.state.reportDraft.year1.mitigation = 'Require approval for each changed version.';
  const before = JSON.stringify(h.api.state);
  await button(h.toolbar, 'Records').click();
  await search(h, 'connectivity briefing 4'); await button(results(h)[0], 'Connectivity briefing — version 4').click();
  assert.equal(searchInput(h).value, 'connectivity briefing 4'); assert.equal(results(h).length, 0);
  assert.match(h.content.querySelector('.provided-records').textContent, /A revised policy statement/);
  assert.ok(h.document.activeElement.className.split(/\s+/).includes('record-source-heading'));
  assert.ok(h.document.activeElement.className.split(/\s+/).includes('sr-only'), 'the focus target does not duplicate the visible source title');
  assert.equal(JSON.stringify(h.api.state), before);
  await button(h.content, 'Back to search results').click(); assert.equal(results(h).length, 1);
  await button(h.toolbar, 'KQL').click(); assert.equal(h.mounts.at(-1).options.initialQuery, query);
  await button(h.toolbar, 'Records').click(); assert.equal(searchInput(h).value, 'connectivity briefing 4');
  assert.equal(JSON.stringify(h.api.state), before);
  await button(h.content, 'Clear search').click(); assert.equal(searchInput(h).value, ''); assert.equal(results(h).length, 0);
});

test('search resets across student accounts and tracks, and selected table sources receive scoped help', async () => {
  const h = harness();
  await search(h, 'approval'); await button(results(h)[0], 'Campaign approval ledger').click();
  assert.equal(h.guideCalls.at(-1).tableName, 'ApprovalLedger');
  assert.deepEqual(Object.keys(h.guideCalls.at(-1).table), ['columns', 'rows', 'types', 'artifactId', 'description']);
  assert.deepEqual([...h.guideCalls.at(-1).availableTableNames], ['ApprovalLedger']);
  h.navigate('year2-01'); assert.equal(searchInput(h).value, '');
  await search(h, 'DOC-04'); h.api.replaceSessionState(C.createState(h.a));
  assert.equal(searchInput(h).value, ''); assert.equal(results(h).length, 0);
});

test('blank searches and sections without supplied records remain usable', async () => {
  const h = harness(); assert.equal((await search(h, '   ')).length, 0);
  assert.doesNotMatch(h.content.textContent, /No matching records/);
  const a = fixture(); a.tracks[0].sections[0].availableArtifactIds = []; a.tracks[0].sections[0].availableTableNames = [];
  const empty = harness(a); await button(empty.toolbar, 'Records').click();
  assert.match(empty.content.textContent, /No provided records are available/);
  assert.equal((await search(empty, 'approval')).length, 0);
  assert.match(empty.content.textContent, /No matching records in this section/);
});

test('the actual campaign briefing and approval sources are searchable in their available scope', async () => {
  const a = JSON.parse(fs.readFileSync(path.join(folder, 'activity.json'), 'utf8'));
  const h = harness(a); await button(h.toolbar, 'Records').click();
  const scope = C.scopedCase(a, h.api.state, C.questions(a, 'year1')[0].id);
  for (const [term, id] of [['connectivity briefing 3', 'DOC-03'], ['connectivity briefing 4', 'DOC-04'], ['approval', 'APPROVALS-01']]) {
    assert.ok(scope.artifacts.some(item => item.id === id), 'fixture starts in a collection containing ' + id);
    assert.ok((await search(h, term)).some(item => item.attributes['data-source-id'] === id), id);
  }
});
