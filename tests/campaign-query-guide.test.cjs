'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const folder = path.join(__dirname, '../learn/osint/campaign-player');
const editor = require(path.join(folder, 'query-editor.js'));
const engine = require(path.join(folder, 'query-engine.js'));
const C = require(path.join(folder, 'player-core.js'));
const activity = JSON.parse(fs.readFileSync(path.join(folder, 'activity.json'), 'utf8'));
const scopedCase = C.scopedCase(activity, C.createState(activity), 'Y1-01');
const tables = engine.getTables(scopedCase);

// Small DOM harness: exercises the real editor, query engine, and guide renderer
// without a browser profile, student account, or network access.
class Element {
  constructor(tag, document) {
    this.tagName = tag; this.ownerDocument = document; this.children = [];
    this.attributes = {}; this.listeners = {}; this._text = ''; this.value = '';
    this.selectionStart = 0; this.selectionEnd = 0; this.scrollTop = 0; this.scrollLeft = 0;
  }
  set textContent(value) { this._text = String(value); this.children = []; }
  get textContent() { return this._text + this.children.map(child => child.textContent).join(''); }
  get childNodes() { return this.children; }
  setAttribute(key, value) { this.attributes[key] = String(value); if (key === 'hidden') this.hidden = true; if (key === 'disabled') this.disabled = true; }
  removeAttribute(key) { delete this.attributes[key]; if (key === 'hidden') this.hidden = false; }
  append(...children) { this.children.push(...children.map(child => child instanceof Element ? child : Object.assign(new Element('#text', this.ownerDocument), { textContent: String(child) }))); }
  replaceChildren(...children) { this._text = ''; this.children = []; this.append(...children); }
  addEventListener(type, listener) { (this.listeners[type] ||= []).push(listener); }
  removeEventListener(type, listener) { this.listeners[type] = (this.listeners[type] || []).filter(fn => fn !== listener); }
  fire(type, extra = {}) { const event = { target: this, preventDefault() { this.defaultPrevented = true; }, ...extra }; for (const listener of [...(this.listeners[type] || [])]) listener(event); return event; }
  setSelectionRange(start, end) { this.selectionStart = start; this.selectionEnd = end; }
  querySelector(selector) { return walk(this).slice(1).find(node => selector.startsWith('.') ? (node.attributes.class || '').split(/\s+/).includes(selector.slice(1)) : node.tagName === selector) || null; }
  focus() { this.ownerDocument.activeElement = this; }
  scrollIntoView() {}
}
function walk(node) { return [node, ...node.children.flatMap(walk)]; }
function harness(initialQuery = 'PublishingEvents | take 2') {
  const document = {
    createElement(tag) { return new Element(tag, document); },
    createTextNode(text) { return Object.assign(new Element('#text', document), { textContent: text }); }
  };
  const container = new Element('main', document), drafts = [], runs = [];
  const api = editor.mount(container, { caseData: scopedCase, initialQuery, onDraftChange: value => drafts.push(value), onRun: receipt => runs.push(receipt) });
  const input = container.querySelector('textarea');
  const picker = walk(container).find(node => node.tagName === 'select' && node.attributes['aria-label'] === 'Table guide');
  const control = label => {
    const button = walk(container).find(node => node.tagName === 'button' && (node.textContent === label || node.attributes['aria-label'] === label));
    assert.ok(button, 'Missing button: ' + label); return button;
  };
  const selectGuide = name => { picker.value = name; picker.fire('change'); };
  return {
    api, container, input, picker, drafts, runs, control, selectGuide,
    guide: () => container.querySelector('.cpqe-guide-content'),
    results: () => container.querySelector('.cpqe-results'),
    run() { control('▶ Run query').fire('click'); },
    type(value, event = {}) { input.value = value; input.setSelectionRange(value.length, value.length); input.fire('input', event); }
  };
}

test('the table guide follows the actual query table after leading comments and is scoped to the current collection', () => {
  const h = harness('// ApprovalEvents is only a comment\n  PublishingEvents\n| take 2');
  assert.equal(h.picker.value, 'PublishingEvents');
  assert.ok(h.guide().textContent.trim(), 'The guide must render content, not just a selector.');
  assert.deepEqual(h.picker.children.map(option => option.attributes.value), Object.keys(tables));
  assert.ok(!h.picker.children.some(option => option.attributes.value === 'SupportGrants'), 'A later collection is not exposed.');
  assert.ok(!walk(h.container).some(node => node.attributes['aria-label'] === 'Read table guide for SupportGrants'));
  assert.deepEqual(h.drafts, [], 'Opening a guide must not rewrite the initial query.');
  assert.deepEqual(h.runs, [], 'Opening a guide must not run a query.');
  assert.match(h.container.querySelector('.cpqe-guide-panel').textContent, /no points deducted/i);
});

test('choosing a different guide from the selector or table rail preserves query results and recorded work', () => {
  const h = harness(); h.run();
  const original = {
    query: h.api.getValue(), rows: h.results().querySelector('table'), resultText: h.results().textContent,
    status: h.container.querySelector('.cpqe-status').textContent,
    history: JSON.stringify(h.runs), guideText: h.guide().textContent
  };
  h.selectGuide('ApprovalEvents');
  assert.equal(h.picker.value, 'ApprovalEvents');
  assert.notEqual(h.guide().textContent, original.guideText, 'The selected guide content changes.');
  h.control('Read table guide for DocumentEvents').fire('click');
  assert.equal(h.picker.value, 'DocumentEvents');
  assert.equal(h.api.getValue(), original.query);
  assert.equal(h.results().querySelector('table'), original.rows, 'Existing result rows are not replaced or rerun.');
  assert.equal(h.results().textContent, original.resultText);
  assert.equal(h.container.querySelector('.cpqe-status').textContent, original.status);
  assert.equal(JSON.stringify(h.runs), original.history, 'The onRun receipts, which feed query history, stay identical.');
  assert.deepEqual(h.drafts, [], 'Reading reference material does not create a draft change.');
});

test('changing the query table changes its guide while retaining normal draft and run behavior', () => {
  const h = harness(); h.run(); h.selectGuide('DocumentEvents');
  const query = '// PublishingEvents is not the active table\nApprovalEvents\n| take 1';
  h.type(query);
  assert.equal(h.picker.value, 'ApprovalEvents');
  assert.deepEqual(h.drafts, [query], 'Only the student edit triggers onDraftChange.');
  assert.equal(h.runs.length, 1, 'Drafting still does not execute the query.');
  assert.equal(h.results().querySelector('table'), null, 'A real edit still clears stale results.');
  h.run();
  assert.equal(h.runs.length, 2);
  assert.equal(h.runs.at(-1).query, query);
  assert.equal(h.runs.at(-1).result.tableName, 'ApprovalEvents');
  h.api.setValue('PublishingEvents | count');
  assert.equal(h.picker.value, 'PublishingEvents');
  assert.deepEqual(h.drafts, [query, 'PublishingEvents | count']);
});

test('browsing another table guide does not change query-specific autocomplete', () => {
  const h = harness('');
  h.type('PublishingEvents | where ');
  h.selectGuide('EventRegistrations');
  assert.equal(h.picker.value, 'EventRegistrations');
  h.input.fire('keydown', { key: ' ', code: 'Space', ctrlKey: true });
  const suggestionLabels = walk(h.container.querySelector('.cpqe-suggestions')).filter(node => node.tagName === 'strong').map(node => node.textContent);
  assert.ok(suggestionLabels.includes('actor_account_id'));
  assert.ok(!suggestionLabels.includes('affiliation'), 'Guide selection cannot leak another table schema into autocomplete.');
  h.type('PublishingEvents | project actor_');
  assert.ok(h.input.fire('keydown', { key: 'Tab' }).defaultPrevented);
  assert.equal(h.api.getValue(), 'PublishingEvents | project actor_account_id');
  assert.equal(h.runs.length, 0);
});

test('a table guide leaves Enter as a newline instead of accepting an and suggestion', () => {
  const query = 'PublishingEvents | where source_version == 3', h = harness('');
  h.type(query); h.selectGuide('ApprovalEvents');
  assert.equal(h.input.attributes['aria-expanded'], 'true');
  const enter = h.input.fire('keydown', { key: 'Enter' });
  assert.ok(!enter.defaultPrevented, 'The textarea receives its native newline keystroke.');
  assert.equal(h.api.getValue(), query, 'The suggested and operator is not inserted.');
  assert.equal(h.input.attributes['aria-expanded'], 'false');
  // Native textarea insertion is represented by its following input event.
  h.type(query + '\n', { inputType: 'insertLineBreak' });
  assert.equal(h.input.attributes['aria-expanded'], 'false');
  h.type(query + '\n| count');
  assert.ok(h.input.fire('keydown', { key: 'Enter', ctrlKey: true }).defaultPrevented);
  assert.equal(h.runs.length, 1);
  assert.equal(h.runs[0].query, query + '\n| count');
  assert.deepEqual(h.runs[0].result.rows, [[engine.execute(query, tables).rows.length]]);
});
