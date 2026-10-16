'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const Guides = require('../learn/osint/campaign-player/table-guides.js');
const Query = require('../learn/osint/campaign-player/query-engine.js');
const Core = require('../learn/osint/campaign-player/player-core.js');
const Activity = require('../learn/osint/campaign-player/activity.json');
const tables = Query.getTables(Activity.caseData);

class Element {
  constructor(tagName, ownerDocument) {
    this.tagName = tagName; this.ownerDocument = ownerDocument;
    this.children = []; this.attributes = {}; this._text = '';
  }
  set textContent(value) { this._text = String(value); this.children = []; }
  get textContent() { return this._text + this.children.map(child => child.textContent).join(''); }
  setAttribute(key, value) { this.attributes[key] = String(value); }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this._text = ''; this.children = [...children]; }
  set innerHTML(_) { throw new Error('Guide renderer must use textContent, not HTML parsing.'); }
}
const walk = node => [node, ...node.children.flatMap(walk)];
function dom() {
  const document = { createElement(tag) { return new Element(tag, document); } };
  const page = document.createElement('main');
  const outside = document.createElement('textarea'); outside.textContent = 'My query stays here';
  const host = document.createElement('div'); page.append(outside, host);
  return { document, page, outside, host };
}
function comparisonSection(host) { return walk(host).find(node => node.className === 'campaign-table-guide-comparisons'); }

test('every current query table has complete, nonempty help for its actual columns', () => {
  assert.deepEqual(Guides.names().sort(), Object.keys(tables).sort());
  for (const [name, table] of Object.entries(tables)) {
    const guide = Guides.get(name);
    assert.equal(guide.tableName, name);
    for (const field of ['title', 'purpose', 'rowMeaning']) assert.ok(guide[field].trim(), name + '.' + field);
    assert.ok(guide.readSteps.length, name + ' has reading steps');
    assert.deepEqual(Object.keys(guide.columns).sort(), [...table.columns].sort(), name + ' has no invented or missing columns');
    for (const [column, explanation] of Object.entries(guide.columns)) {
      assert.equal(typeof explanation, 'string', name + '.' + column);
      assert.ok(explanation.trim().length > 15, name + '.' + column + ' has an explanation');
    }
    assert.ok(Object.isFrozen(guide.columns));
  }
});

test('every suggested comparison names real source and target columns', () => {
  for (const name of Guides.names()) {
    for (const comparison of Guides.get(name).comparisons) {
      assert.ok(tables[comparison.tableName], name + ' comparison target exists');
      assert.ok(comparison.text.trim());
      for (const column of comparison.columns) assert.ok(tables[name].columns.includes(column), name + '.' + column);
      for (const column of comparison.targetColumns) assert.ok(tables[comparison.tableName].columns.includes(column), comparison.tableName + '.' + column);
    }
  }
});

test('rendering is scoped to available tables in every activity section', () => {
  const state = Core.createState(Activity);
  for (const track of Activity.tracks) {
    for (const question of Core.questions(Activity, track.id)) {
      const answer = question.type === 'choice' ? question.validation.correctOption
        : question.type === 'fill' ? question.validation.accepted[0] : 'A student observation from this source.';
      Core.setAnswer(Activity, state, question.id, answer);
      assert.equal(Core.submit(Activity, state, question.id).ok, true, question.id);
    }
  }
  for (const track of Activity.tracks) {
    for (const section of track.sections) {
      const scoped = Query.getTables(Core.scopedCase(Activity, state, section.questions[0].id));
      const available = Object.keys(scoped);
      for (const name of available) {
        const { host } = dom();
        Guides.render(host, { tableName: name, table: scoped[name], availableTableNames: available });
        const text = comparisonSection(host)?.textContent || '';
        for (const comparison of Guides.get(name).comparisons) {
          if (available.includes(comparison.tableName)) assert.ok(text.includes(comparison.text), name + ' available comparison');
          else assert.ok(!text.includes(comparison.text), name + ' hides later comparison');
        }
      }
    }
  }
});

test('comparison help defaults closed to unavailable collections', () => {
  const { host } = dom();
  Guides.render(host, { tableName: 'FileTransfers', table: tables.FileTransfers });
  assert.equal(comparisonSection(host), undefined);
  Guides.render(host, { tableName: 'FileTransfers', table: tables.FileTransfers, availableTableNames: ['DeviceAssignments'] });
  const section = comparisonSection(host);
  assert.ok(section.textContent.includes('DeviceAssignments'));
  assert.ok(!section.textContent.includes('EndpointEvents'));
  assert.ok(!section.textContent.includes('SupportApprovals'));
});

test('summary stays visible while column explanations use native expandable details', () => {
  const { host, outside } = dom();
  const panel = Guides.render(host, { tableName: 'FileTransfers', table: tables.FileTransfers, availableTableNames: Object.keys(tables) });
  assert.equal(panel, host.children[0]);
  const details = panel.children.find(child => child.tagName === 'details');
  assert.ok(details);
  assert.equal(details.attributes.open, undefined);
  assert.ok(panel.children.some(child => child.tagName === 'p' && child.textContent === Guides.get('FileTransfers').purpose));
  assert.ok(details.children.some(child => child.tagName === 'summary'));
  assert.equal(walk(details).filter(child => child.tagName === 'dt').length, tables.FileTransfers.columns.length);
  assert.ok(panel.textContent.includes(tables.FileTransfers.artifactId));
  assert.equal(outside.textContent, 'My query stays here');
  Guides.render(host, { tableName: 'EmailEvents', table: tables.EmailEvents, availableTableNames: ['EmailEvents'] });
  assert.equal(host.children.length, 1, 'Repeated renders replace only the dedicated guide panel');
  assert.equal(outside.textContent, 'My query stays here');
});

test('guides do not inspect record rows or change query results, table schemas or saved state', () => {
  const { host } = dom();
  const state = Core.createState(Activity);
  const stateBefore = JSON.stringify(state), tableBefore = JSON.stringify(tables);
  const query = 'FileTransfers | project timestamp, status, destination_device_id';
  const resultBefore = Query.execute(query, tables);
  for (const [name, original] of Object.entries(tables)) {
    const table = { columns: Object.freeze([...original.columns]), types: Object.freeze({ ...original.types }), artifactId: original.artifactId };
    Object.defineProperty(table, 'rows', { get() { throw new Error('Guides should never read student evidence rows.'); } });
    Guides.render(host, { tableName: name, table, availableTableNames: Object.keys(tables) });
  }
  assert.equal(JSON.stringify(state), stateBefore);
  assert.equal(JSON.stringify(tables), tableBefore);
  assert.deepEqual(Query.execute(query, tables), resultBefore);
});

test('unknown schemas and untrusted labels stay plain text and use generic reading help', () => {
  const { host } = dom();
  const tableName = '<img src=x onerror=alert(1)>';
  const column = '<script>bad()</script>';
  Guides.render(host, { tableName, table: { artifactId: '<b>source</b>', columns: [column, 'timestamp'], types: { [column]: 'string', timestamp: 'datetime' } }, availableTableNames: [] });
  assert.ok(host.textContent.includes(tableName));
  assert.ok(host.textContent.includes(column));
  assert.ok(host.textContent.includes('UTC'));
  assert.ok(walk(host).every(node => !['script', 'img', 'iframe'].includes(node.tagName)));
  assert.equal(Guides.get('__proto__').tableName, '__proto__');
  assert.equal(Guides.render(null, {}), null);
});

test('the same API loads in the browser without dependencies or global document access', () => {
  const script = fs.readFileSync(path.join(__dirname, '../learn/osint/campaign-player/table-guides.js'), 'utf8');
  const context = vm.createContext({ window: {} });
  vm.runInContext(script, context);
  assert.equal(typeof context.window.CampaignTableGuides.render, 'function');
  assert.equal(context.window.CampaignTableGuides.names().length, Object.keys(tables).length);
  const { host } = dom();
  context.window.CampaignTableGuides.render(host, { tableName: 'DocumentReceipts', table: tables.DocumentReceipts });
  assert.ok(host.textContent.includes('receiving computer'));
});
