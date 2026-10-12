const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { TextEncoder } = require('node:util');

const folder = process.env.CAMPAIGN_PLAYER_TEST_DIR || path.join(__dirname, '../learn/osint/campaign-player');
const C = require(path.join(folder, 'player-core.js'));
const Q = require(path.join(folder, 'query-engine.js'));
const appSource = fs.readFileSync(path.join(folder, 'player.js'), 'utf8');
const sourceRenderer = fs.readFileSync(path.join(folder, 'sources.js'), 'utf8');

// This independent harness exercises the controller's user flows. The real
// editor's restored-result rendering and authenticity checks have their own
// tests; this stub records the controller/editor handoff without a browser.
class Element {
  constructor(tag, ownerDocument) {
    this.tagName = tag; this.ownerDocument = ownerDocument;
    this.children = []; this.attributes = {}; this.listeners = {};
    this.value = ''; this._text = ''; this.contentWindow = {}; this.disabled = false;
  }
  set textContent(value) { this._text = String(value); this.children = []; }
  get textContent() { return this._text + this.children.map(c => c.textContent).join(''); }
  set className(value) { this.attributes.class = value; }
  get className() { return this.attributes.class || ''; }
  get options() { return this.children.filter(item => item.tagName === 'option'); }
  setAttribute(key, value) {
    this.attributes[key] = String(value);
    if (['value', 'id', 'href'].includes(key)) this[key] = String(value);
  }
  getAttribute(key) { return this.attributes[key] ?? null; }
  removeAttribute(key) { delete this.attributes[key]; }
  append(...children) {
    for (const child of children) {
      const item = child instanceof Element ? child : Object.assign(new Element('#text', this.ownerDocument), { textContent: child });
      item.parentElement = this; this.children.push(item);
    }
  }
  replaceChildren(...children) { this.children = []; this._text = ''; this.append(...children); }
  addEventListener(type, listener) { (this.listeners[type] ||= []).push(listener); }
  async fire(type, extra = {}) { for (const listener of this.listeners[type] || []) await listener({ target: this, preventDefault() {}, ...extra }); }
  click() { return this.disabled ? Promise.resolve() : this.fire('click'); }
  remove() { if (this.parentElement) this.parentElement.children = this.parentElement.children.filter(x => x !== this); }
  closest(tag) { return this.tagName === tag ? this : this.parentElement?.closest(tag); }
  querySelectorAll(selector) {
    if (selector === '.question-progress p span:last-child') return walk(this).filter(x => x.tagName === 'span').slice(-1);
    return walk(this).slice(1).filter(x => selector.startsWith('.') ? x.className.split(/\s+/).includes(selector.slice(1)) : x.tagName === selector);
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  focus() { this.ownerDocument.activeElement = this; }
}
function walk(node) { return [node, ...node.children.flatMap(walk)]; }
function find(root, predicate, message = 'Expected UI control was not found') { const value = walk(root).find(predicate); assert.ok(value, message); return value; }
function control(root, label) { return find(root, n => n.tagName === 'button' && n.textContent === label, 'Missing button: ' + label); }
function input(root, label) { return find(root, n => n.attributes['aria-label'] === label, 'Missing input: ' + label); }
function activity() {
  const track = id => ({ id, label: id, sections: [
    { id: id + '-one', title: 'Original collection', availableArtifactIds: ['PUBLIC-01', 'EARLY-01'], availableTableNames: ['EarlyRecords'], questions: [
      { id: id + '-01', title: 'Begin with the post', prompt: 'Choose the supported finding.', type: 'choice', options: [{ id: 'a', text: 'Unsupported' }, { id: 'b', text: 'Supported' }], validation: { correctOption: 'b' }, hints: ['Read the post.'], workspace: { mode: 'browser', pageId: 'public-page' }, report: { section: 'attacker' } },
      { id: id + '-02', title: 'Find the session', prompt: 'Name the session.', type: 'fill', validation: { accepted: ['CS-072'] }, hints: ['Read the session field.'], workspace: { mode: 'query', tableName: 'EarlyRecords' }, report: { section: 'timeline' } }
    ] },
    { id: id + '-two', title: 'New collection', availableArtifactIds: ['PUBLIC-01', 'EARLY-01', 'LATER-02'], availableTableNames: ['EarlyRecords', 'LaterRecords'], questions: [
      { id: id + '-03', title: 'Trace transfer', prompt: 'Name the transfer.', type: 'fill', validation: { accepted: ['TF-902'] }, hints: ['Read the transfer.'], workspace: { mode: 'query', tableName: 'LaterRecords' }, report: { section: 'timeline' } }
    ] }
  ] });
  return {
    id: 'playtest-ui-fixture', revision: 'v1', title: 'Guided case', scoring: { pointsPerQuestion: 5, hintCost: 1 }, tracks: [track('year1'), track('year2')],
    pages: [
      { id: 'public-page', title: 'Public post', public: true, artifactIds: ['PUBLIC-01'] },
      { id: 'early-page', title: 'Early evidence', public: false, artifactIds: ['EARLY-01'] },
      { id: 'later-page', title: 'Later evidence', public: false, artifactIds: ['LATER-02'] }
    ],
    caseData: {
      contentRevision: 'v1',
      artifacts: [
        { id: 'PUBLIC-01', type: 'document', title: 'Public post', body: ['Preserved public post.'] },
        { id: 'EARLY-01', type: 'table', title: 'Early records', columns: ['record_id', 'session_id'], rows: [['OLD-101', 'CS-072'], ['OLD-102', 'CS-081']] },
        { id: 'LATER-02', type: 'table', title: 'Later records', columns: ['transfer_id'], rows: [['TF-902']] }
      ],
      discoveryChannels: { 'PUBLIC-01': ['compass'], 'EARLY-01': ['data'], 'LATER-02': ['data'] },
      queryTables: {
        EarlyRecords: { artifactId: 'EARLY-01', types: { record_id: 'string', session_id: 'string' } },
        LaterRecords: { artifactId: 'LATER-02', types: { transfer_id: 'string' } }
      }
    }
  };
}
function storage() {
  const map = new Map();
  return { getItem(key) { return map.get(key) ?? null; }, setItem(key, value) { map.set(key, value); } };
}
function harness({ restoredRun = options => options.initialRun || null, configure = () => {} } = {}) {
  const document = { activeElement: null };
  const ids = ['question-panel', 'workspace-toolbar', 'workspace-content', 'save-status', 'announcement', 'progress-status', 'finding-count', 'track-switch', 'report-toggle', 'backup', 'restore', 'export-report', 'import-file'];
  const nodes = new Map(ids.map(id => [id, Object.assign(new Element('div', document), { id })]));
  const body = new Element('body', document); body.append(...nodes.values());
  Object.assign(document, {
    body, getElementById(id) { return nodes.get(id) || walk(body).find(n => n.id === id); },
    createElement(tag) { return new Element(tag, document); },
    createTextNode(text) { return Object.assign(new Element('#text', document), { textContent: text }); }
  });
  const events = {}, mounted = [], blobs = [], a = activity(), store = storage();
  configure(a);
  const location = { hash: '#/year1' }, history = { replaceState(_state, _title, url) { location.hash = url; } };
  const window = {
    CAMPAIGN_ACTIVITY: a, CampaignPlayerCore: C, CampaignQuery: Q,
    addEventListener(type, fn) { (events[type] ||= []).push(fn); },
    CampaignPlayerEditor: { mount(_host, options) {
      const api = { value: options.initialQuery, getValue() { return this.value; }, getRestoredRun() { return restoredRun(options); }, destroy() {} };
      mounted.push({ options, api }); return api;
    } }
  };
  const context = vm.createContext({ window, document, location, history, localStorage: store, TextEncoder, Blob,
    URL: { createObjectURL(blob) { blobs.push(blob); return 'blob:test-' + blobs.length; }, revokeObjectURL() {} },
    setTimeout() { return 1; }, clearTimeout() {}, console });
  const close = appSource.lastIndexOf('\n})();'); assert.ok(close > 0);
  const instrumented = appSource.slice(0, close) + '\n globalThis.playerTest = { get state() { return state; }, route, go, get currentId() { return currentId; } };' + appSource.slice(close);
  vm.runInContext(sourceRenderer, context, { filename: 'campaign-player/sources.js' });
  vm.runInContext(instrumented, context, { filename: 'campaign-player/player.js' });
  return { a, nodes, body, document, location, store, mounted, blobs, api: context.playerTest,
    async emit(type, event = {}) { for (const fn of events[type] || []) await fn(event); },
    navigate(id) { context.playerTest.go(id); context.playerTest.route(); }
  };
}
function unlock(h, through = 'year1-02') {
  for (const [id, answer] of [['year1-01', 'b'], ['year1-02', 'CS-072']]) {
    C.setAnswer(h.a, h.api.state, id, answer); assert.equal(C.submit(h.a, h.api.state, id).ok, true);
    if (id === through) break;
  }
}
function runQuery(h, query) {
  const editor = h.mounted.at(-1);
  editor.api.value = query; editor.options.onDraftChange(query);
  const run = { query, ranAt: '2026-10-08T14:00:00Z', result: Q.execute(query, Q.getTables(editor.options.caseData)) };
  editor.options.onRun(run); return run;
}
async function setCapture(h, summary, citation) {
  const panel = h.nodes.get('question-panel');
  const text = find(panel, n => n.attributes.placeholder === 'A finding in your own words…');
  const sources = find(panel, n => n.attributes.placeholder === 'Source or record IDs, separated by commas');
  text.value = summary; await text.fire('input'); sources.value = citation; await sources.fire('input');
  return { text, sources, drawer: text.closest('details') };
}
async function answerAndSubmit(h, answer) {
  const panel = h.nodes.get('question-panel'), q = C.locate(h.a, h.api.currentId).question;
  if (q.type === 'choice') await find(panel, n => n.tagName === 'input' && n.value === answer).fire('change');
  else { const field = input(panel, 'Answer'); field.value = answer; await field.fire('input'); }
  await find(panel, n => n.tagName === 'form').fire('submit');
  await h.emit('hashchange');
}


test('a submitted short response advances without exact keywords and retains the student timeline description', async () => {
  const h = harness({ configure(a) {
    const q = a.tracks[0].sections[0].questions[0];
    q.type = 'short'; q.validation = { minWords: 50, concepts: [{ any: ['an exact phrase'] }] };
    q.timelineEvents = [{ id: 'earlier-conversation', title: 'Earlier conversation', timestamp: '2023-09-13T12:00:00Z', evidenceIds: ['PUBLIC-01'] }];
  } });
  const panel = h.nodes.get('question-panel');
  await find(panel, n => n.tagName === 'form').fire('submit');
  assert.equal(h.api.currentId, 'year1-01');
  assert.match(panel.textContent, /Add your response/);
  const explanation = input(panel, 'Your explanation');
  explanation.value = 'I cannot verify who is behind the account.';
  await explanation.fire('input');
  assert.match(panel.textContent, /no required phrases or minimum word count/);
  assert.ok(control(panel, 'Submit response & continue'));
  await find(panel, n => n.tagName === 'form').fire('submit');
  await h.emit('hashchange');
  assert.equal(h.api.currentId, 'year1-02');
  assert.equal(h.api.state.responses['year1-01'].submittedAnswer, explanation.value);
  assert.equal(h.api.state.findings[0].summary, explanation.value);
  assert.match(h.nodes.get('question-panel').textContent, /Response saved for teacher review/);
});

test('an unfinished optional finding stays saved as a draft without blocking a submitted answer', async () => {
  const h = harness();
  await setCapture(h, 'The supplied post deserves a closer look.', 'UNKNOWN-SOURCE');
  await answerAndSubmit(h, 'b');
  assert.equal(h.api.currentId, 'year1-02');
  assert.equal(C.isComplete(h.a, h.api.state, 'year1-01'), true);
  assert.equal(h.api.state.findings.length, 0, 'an invalid finding is not silently promoted into the report');
  assert.equal(h.api.state.responses['year1-01'].capture.summary, 'The supplied post deserves a closer look.');
  assert.equal(h.api.state.responses['year1-01'].capture.evidenceText, 'UNKNOWN-SOURCE');
  assert.match(h.nodes.get('question-panel').textContent, /additional finding is saved as a draft/);
  const saved = JSON.parse(h.store.getItem(C.STORAGE_KEY));
  assert.equal(saved.responses['year1-01'].capture.evidenceText, 'UNKNOWN-SOURCE');
  h.navigate('year1-01');
  assert.equal(find(h.nodes.get('question-panel'), n => n.attributes.placeholder === 'A finding in your own words…').value, 'The supplied post deserves a closer look.');
});

test('successful query history and its result survive the newly worded submit flow and restore', async () => {
  const h = harness();
  await answerAndSubmit(h, 'b');
  const run = runQuery(h, 'EarlyRecords | where session_id == "CS-072"');
  await answerAndSubmit(h, 'The session is CS-072.');
  assert.equal(h.api.currentId, 'year1-03');
  assert.equal(h.api.state.queryRuns.length, 1);
  assert.equal(h.api.state.queryRuns[0].questionId, 'year1-02');
  assert.equal(h.api.state.queryRuns[0].queryReceipt.query, run.query);
  assert.deepEqual(h.api.state.queryRuns[0].queryReceipt.resultSnapshot.rows, [['OLD-101', 'CS-072']]);
  const restored = C.restore(h.a, JSON.stringify(h.api.state));
  assert.deepEqual(restored.queryRuns, h.api.state.queryRuns);
  assert.equal(C.frontier(h.a, restored, 'year1'), 2);
});
