const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const core = require('../learn/osint/campaign-player/player-core.js');
const model = require('../admin/campaign-progress-model.js');
const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const activityContext = { window: {} };
vm.runInNewContext(read('learn/osint/campaign-player/activity-data.js'), activityContext);
const activity = activityContext.window.CAMPAIGN_ACTIVITY;
const settle = () => new Promise(resolve => setImmediate(resolve));
function deferred() { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; }
const instructor = { id: 'teacher-id' }, assignment = 'campaign-2026-fall';
const first = { user_id: 'student-1', assignment_id: assignment, username: 'a-am-y1-01', class_label: 'A Day AM Year 1', track_id: 'year1', is_test: false, enabled: true, has_progress: false };
const second = { ...first, user_id: 'student-2', username: 'b-am-y2-01', class_label: 'B Day AM Year 2', track_id: 'year2' };
const testLogin = { ...first, user_id: 'test-1', username: 'campaign-test-26-01', class_label: 'Test accounts', is_test: true };
const initialGroups = [{ id: 'group-1', owner_id: instructor.id, assignment_id: assignment, name: 'Table 1', created_at: '2026-10-12T12:00:00Z' }];

function harness(options = {}) {
  const listeners = new Map(), timers = new Map(), requests = [], elements = []; let tick = 0;
  class Element {
    constructor(tag = 'div') { this.tagName = tag.toUpperCase(); this.children = []; this.attributes = {}; this.events = new Map(); this.hidden = false; this.disabled = false; this.value = ''; this._text = ''; const classes = new Set(); this.classList = { toggle: (name, yes) => yes ? classes.add(name) : classes.delete(name) }; elements.push(this); }
    set textContent(value) { this._text = String(value); this.children = []; }
    get textContent() { return this._text + this.children.map(child => child.textContent).join(''); }
    append(...nodes) { this.children.push(...nodes); }
    replaceChildren(...nodes) { this._text = ''; this.children = []; this.append(...nodes); }
    setAttribute(name, value) { this.attributes[name] = value; }
    addEventListener(name, callback) { this.events.set(name, callback); }
    focus() { this.focused = true; }
    querySelector(tag) { return this.descendants().find(child => child.tagName === tag.toUpperCase()) || null; }
    descendants() { return this.children.flatMap(child => [child, ...child.descendants()]); }
    click() { if (!this.disabled) return this.events.get('click')?.({ preventDefault() {} }); }
    change(value) { this.value = value; return this.events.get('change')?.(); }
    input(value) { this.value = value; return this.events.get('input')?.(); }
    submit() { return this.events.get('submit')?.({ preventDefault() {} }); }
  }
  const document = {
    hidden: false, createElement: tag => new Element(tag), createTextNode: text => { const node = new Element('#text'); node.textContent = text; return node; },
    addEventListener: (name, fn) => listeners.set(name, fn), removeEventListener: name => listeners.delete(name)
  };
  const container = new Element('section');
  const client = { from(table) {
    const request = { table, op: 'select', eq: [] };
    const chain = {
      select(columns) { request.columns = columns; return chain; },
      eq(key, value) { request.eq.push([key, value]); return chain; },
      order(column) { request.order = column; return chain; },
      insert(value) { request.op = 'insert'; request.value = value; return chain; },
      update(value) { request.op = 'update'; request.value = value; return chain; },
      delete() { request.op = 'delete'; return chain; },
      upsert(value, settings) { request.op = 'upsert'; request.value = value; request.settings = settings; return chain; },
      single() { request.single = true; return chain; }, maybeSingle() { request.maybeSingle = true; return chain; },
      then(resolve, reject) {
        requests.push(request);
        let result = options.respond?.(request);
        if (result === undefined) {
          if (table === 'campaign_teacher_progress_overview') result = { data: options.roster || [first, second, testLogin] };
          else if (table === 'campaign_teacher_groups') result = { data: request.op === 'select' ? initialGroups.map(row => ({ ...row })) : { id: request.value?.id || 'new-group', ...request.value } };
          else if (table === 'campaign_teacher_group_members') result = { data: request.op === 'select' ? [] : request.value || { user_id: 'student-1' } };
          else if (table === 'campaign_progress') result = { data: options.saved || null };
        }
        return Promise.resolve(result).then(resolve, reject);
      }
    }; return chain;
  } };
  const authErrors = [];
  const window = { CampaignTeacherModel: model, confirm: () => true };
  vm.runInNewContext(read('admin/campaign-dashboard.js'), { window, document, Date, Set, Promise, setTimeout: fn => { timers.set(++tick, fn); return tick; }, clearTimeout: id => timers.delete(id) }, { filename: 'campaign-dashboard.js' });
  const dashboard = window.CampaignTeacherDashboard.create({ root: container, client, user: instructor, activity, assignmentId: assignment, onAuthError: () => authErrors.push(true) });
  const live = () => [container, ...container.descendants()];
  return { dashboard, container, requests, document, timers, authErrors,
    find: (tag, text) => live().find(node => node.tagName === tag.toUpperCase() && node.textContent === text),
    field: label => live().find(node => node.attributes['aria-label'] === label),
    event: name => listeners.get(name)?.(),
    visibleText: () => { function text(node) { return node.hidden ? '' : node._text + node.children.map(text).join(''); } return text(container); }
  };
}

test('overview loads only bounded progress data, hides test logins, and filters by assigned year and class', async () => {
  const h = harness(); h.dashboard.show(); await settle();
  assert.equal(h.requests.length, 3);
  assert(!h.requests.some(request => request.table === 'campaign_progress'));
  assert.match(h.visibleText(), /a-am-y1-01/);
  assert.match(h.visibleText(), /b-am-y2-01/);
  assert.doesNotMatch(h.visibleText(), /campaign-test-26-01/);
  h.field('Investigation').change('year2');
  assert.doesNotMatch(h.visibleText(), /a-am-y1-01/);
  assert.match(h.visibleText(), /b-am-y2-01/);
  h.field('Find a login').input('nobody'); assert.match(h.visibleText(), /No logins match/);
  assert.match(h.visibleText(), /last confirmed online save/);
  h.dashboard.clear();
});

test('overview finishing after sign-out cannot repopulate the DOM or schedule refresh', async () => {
  const pending = deferred(); const h = harness({ respond: request => request.table === 'campaign_teacher_progress_overview' ? pending.promise : undefined });
  h.dashboard.show(); await settle(); h.dashboard.clear();
  pending.resolve({ data: [first] }); await settle();
  assert.equal(h.container.children.length, 0); assert.equal(h.timers.size, 0);
});

test('polling pauses on hidden pages and stops when navigating away', async () => {
  const h = harness(); h.dashboard.show(); await settle(); assert.equal(h.timers.size, 1);
  h.document.hidden = true; h.event('visibilitychange'); assert.equal(h.timers.size, 0);
  h.document.hidden = false; h.event('visibilitychange'); await settle(); assert.equal(h.requests.length, 6);
  h.dashboard.hide(); assert.equal(h.timers.size, 0); assert.equal(h.container.hidden, true);
});

test('student detail is fetched on demand and a missing save has an accurate empty state', async () => {
  const h = harness(); h.dashboard.show(); await settle();
  h.find('button', first.username).click(); await settle();
  const request = h.requests.find(row => row.table === 'campaign_progress');
  assert.deepEqual(request.eq, [['user_id', first.user_id], ['assignment_id', assignment], ['activity_id', activity.id]]);
  assert.equal(request.maybeSingle, true);
  assert.match(h.visibleText(), /No online save exists/);
  assert.match(h.visibleText(), /Last viewed question: Not recorded/);
  assert.doesNotMatch(h.visibleText(), /could not be displayed/);
  h.dashboard.clear();
});

test('student text is rendered as text and details do not write student progress', async () => {
  const saved = core.createState(activity); saved.responses['Y1-01'] = { answer: '<img src=x onerror=alert(1)>' };
  const h = harness({ saved: { state: saved, revision: 1, updated_at: '2026-10-12T12:00:00Z' } });
  h.dashboard.show(); await settle(); h.find('button', first.username).click(); await settle();
  assert.match(h.container.textContent, /<img src=x onerror=alert\(1\)>/);
  assert.equal(h.container.descendants().filter(node => node.tagName === 'IMG').length, 0);
  assert(h.requests.filter(request => request.table === 'campaign_progress').every(request => request.op === 'select'));
  h.dashboard.clear();
});

test('late detail responses cannot restore student content after dashboard cleanup', async () => {
  const pending = deferred(); const h = harness({ respond: request => request.table === 'campaign_progress' ? pending.promise : undefined });
  h.dashboard.show(); await settle(); h.find('button', first.username).click(); await settle(); h.dashboard.clear();
  pending.resolve({ data: { state: core.createState(activity), revision: 1 } }); await settle();
  assert.equal(h.container.children.length, 0);
});

test('teacher group assignment uses instructor ownership and never mutates student work', async () => {
  const h = harness(); h.dashboard.show(); await settle();
  h.field(`Group for ${second.username}`).change('group-1'); await settle();
  const mutation = h.requests.find(request => request.op === 'upsert');
  assert.equal(mutation.table, 'campaign_teacher_group_members');
  assert.equal(mutation.value.owner_id, instructor.id); assert.equal(mutation.value.user_id, second.user_id);
  assert.equal(mutation.value.assignment_id, assignment); assert.equal(mutation.value.group_id, 'group-1');
  assert.equal(mutation.settings.onConflict, 'owner_id,assignment_id,user_id');
  assert.equal(mutation.single, true);
  assert(h.requests.filter(request => request.op !== 'select').every(request => /^campaign_teacher_group/.test(request.table)));
  h.field('Group').change('group-1'); assert.match(h.visibleText(), /b-am-y2-01/); assert.doesNotMatch(h.visibleText(), /a-am-y1-01/);
  h.dashboard.clear();
});

test('RLS-denied group assignment retains the old group instead of showing success', async () => {
  const h = harness({ respond: request => request.op === 'upsert' ? { error: { code: '42501' } } : undefined });
  h.dashboard.show(); await settle(); h.field(`Group for ${first.username}`).change('group-1'); await settle();
  assert.equal(h.field(`Group for ${first.username}`).value, '');
  assert.match(h.visibleText(), /could not be saved/); h.dashboard.clear();
});

test('all dashboard files preserve the private shell and avoid executable student HTML or browser persistence', () => {
  const source = read('admin/campaign-dashboard.js');
  assert.doesNotMatch(source, /innerHTML|outerHTML|insertAdjacentHTML|localStorage|sessionStorage|eval\(/);
  assert.doesNotMatch(source, /certainty|evidence status/i);
  const html = read('admin/index.html');
  assert(html.indexOf('player-core.js') < html.indexOf('campaign-progress-model.js'));
  assert(html.indexOf('campaign-progress-model.js') < html.indexOf('campaign-dashboard.js'));
  assert.match(html, /href="#\/students"/);
});
