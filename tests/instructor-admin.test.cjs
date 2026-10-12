const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');

const root = path.resolve(__dirname, '..');
const admin = path.join(root, 'admin');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const withoutComments = sql => sql.replace(/\/\*[\s\S]*?\*\//g, '').replace(/--[^\n]*/g, '');

function filesUnder(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    if (['.git', 'node_modules'].includes(entry.name)) return [];
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(file) : [file];
  });
}

test('the public operations-wall route contains only a login redirect', () => {
  const directory = path.join(root, 'learn/osint/display');
  const files = filesUnder(directory).map(file => path.relative(directory, file));
  assert.deepEqual(files.sort(), ['index.html']);
  const html = read('learn/osint/display/index.html');
  assert.match(html, /\/admin\//);
  assert.doesNotMatch(html, /CampaignDisplayData|createCatalog|data\.js|activity-data\.js/);
});

test('teacher documents and generated private bundles are absent from the public repository', () => {
  const privateNames = /(?:Mandy-Schmear-(?:Answer-Keys-and-Final-Timelines|Teacher-Guide|Student-Briefing)|Campaign-Incident-Response-Report-Assignment-and-Rubric)\.(?:docx|pptx|pdf)$/i;
  for (const file of filesUnder(root)) {
    assert(!privateNames.test(path.basename(file)), `Private teaching file in public tree: ${path.relative(root, file)}`);
    assert(!/(?:^|\/)(?:private-build|private-resources|operations-wall)\//.test(path.relative(root, file)), `Private build directory in public tree: ${path.relative(root, file)}`);
  }
});

test('resource authorization pins the confirmed instructor ID in an enabled database RLS policy', () => {
  const sql = withoutComments(read('tools/instructor-resources/schema.sql'));
  assert.match(sql, /alter\s+table\s+(?:public\.)?instructor_resources\s+enable\s+row\s+level\s+security/i);
  assert.match(sql, /create\s+policy[\s\S]*?on\s+(?:public\.)?instructor_resources[\s\S]*?for\s+select[\s\S]*?to\s+authenticated[\s\S]*?using\s*\(/i);
  assert.match(sql, /auth\.uid\s*\(\s*\)/i);
  assert.match(sql, /select\s+id\s+into\s+strict\s+instructor_id\s+from\s+auth\.users/i);
  assert.match(sql, /email_confirmed_at\s+is\s+not\s+null/i);
  assert.match(sql, /is_anonymous\s+is\s+false/i);
  assert.match(sql, /auth\.uid\s*\(\s*\)\s*\)\s*=\s*%L::uuid/i);
  assert.match(sql, /\)\s*',\s*instructor_id\s*\)/i, 'Resolve the instructor at installation, then pin the ID as a SQL literal');
  assert.match(sql, /bryan@kc7cyber\.com/i);
  assert.doesNotMatch(sql, /(?:raw_)?user_meta_data|user_metadata|auth\.role\s*\(/i, 'Do not authorize from user-editable metadata or role alone');
  assert.doesNotMatch(sql, /using\s*\(\s*true\s*\)/i);
  assert.doesNotMatch(sql, /security\s+definer/i, 'This read-only table does not require a privileged bypass function');
});

test('browser roles receive read-only access and no anonymous grant', () => {
  const sql = withoutComments(read('tools/instructor-resources/schema.sql'));
  assert.match(sql, /revoke\s+all[\s\S]*?instructor_resources[\s\S]*?from[^;]*\banon\b/i);
  assert.match(sql, /revoke\s+all[\s\S]*?instructor_resources[\s\S]*?from[^;]*\bauthenticated\b/i);
  const grants = sql.match(/grant\s+[^;]+;/gi) || [];
  const resourceGrants = grants.filter(statement => /instructor_resources/i.test(statement));
  assert(resourceGrants.some(statement => /grant\s+select\b/i.test(statement) && /to\s+authenticated\b/i.test(statement)));
  for (const grant of resourceGrants) {
    if (/\bto\b[^;]*\b(?:anon|authenticated|public)\b/i.test(grant)) {
      assert.match(grant, /^grant\s+select\b/i, grant);
      assert.doesNotMatch(grant, /\b(?:insert|update|delete|truncate|references|trigger|all)\b/i, grant);
      assert.doesNotMatch(grant, /\bto\b[^;]*\b(?:anon|public)\b/i, grant);
    }
  }
});

test('the login shell does not embed private content or a privileged API key', () => {
  const sources = filesUnder(admin).filter(file => /\.(?:html|js|json|css)$/.test(file));
  assert(sources.length >= 2);
  for (const file of sources) {
    const text = fs.readFileSync(file, 'utf8');
    assert.doesNotMatch(text, /sb_secret_[A-Za-z0-9_-]+/);
    assert.doesNotMatch(text, /data:application\/(?:vnd\.openxmlformats|pdf)/);
    assert.doesNotMatch(text, /window\.CAMPAIGN_ACTIVITY\s*=|window\.CampaignDisplayData\s*=/);
    for (const token of text.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g) || []) {
      let claims;
      try { claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()); } catch { continue; }
      assert.notEqual(claims.role, 'service_role', `Privileged key in ${path.basename(file)}`);
    }
  }
});

function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}

const settle = () => new Promise(resolve => setImmediate(resolve));
const instructor = { id: 'afb656bd-2ee6-4703-8788-0433c8e8b725', email: 'Bryan@kc7cyber.com' };
const wall = { id: 'campaign-operations-wall', title: 'Operations Wall', description: 'Private display', kind: 'display' };
const documentResource = { id: 'campaign-answer-key', title: 'Answer key', description: 'Private document', kind: 'download' };
const payload = kind => ({ data: { kind, mime_type: kind === 'display' ? 'text/html' : 'application/octet-stream', filename: kind === 'display' ? 'wall.html' : 'answer.docx', content_base64: Buffer.from(kind === 'display' ? '<!doctype html><p>Private display</p>' : 'Private answer key').toString('base64') }, error: null });

// Exercise the browser controller with a minimal DOM and controllable async
// Supabase responses. Authorization itself is verified by the database audit;
// these tests cover stale responses and cleanup at the browser boundary.
function browserHarness(options = {}) {
  const elements = [];
  const revoked = [];
  const created = [];
  const downloads = [];
  const queries = [];
  const ids = new Map();
  let authChanged;
  let createOptions;
  const listeners = new Map();
  class Element {
    constructor(tag = 'div') {
      this.tagName = tag.toUpperCase(); this.children = []; this.attributes = {}; this.dataset = {}; this.events = new Map();
      this.hidden = false; this.disabled = false; this.value = ''; this.textContent = ''; this.isConnected = true;
      const classes = new Set();
      this.classList = { add: value => classes.add(value), remove: value => classes.delete(value), toggle: (value, force) => force ? classes.add(value) : classes.delete(value), contains: value => classes.has(value) };
      elements.push(this);
    }
    append(...children) { for (const child of children) { child.parent = this; child.isConnected = true; this.children.push(child); } }
    after(...children) { if (this.parent) this.parent.append(...children); }
    replaceChildren(...children) { for (const child of this.children) child.isConnected = false; this.children = []; this.textContent = ''; this.append(...children); }
    remove() { this.isConnected = false; if (this.parent) this.parent.children = this.parent.children.filter(child => child !== this); }
    setAttribute(name, value) { this.attributes[name] = value; }
    addEventListener(name, callback) { this.events.set(name, callback); }
    focus() {}
    click() { if (this.tagName === 'A' && this.download) downloads.push(this); return this.events.get('click')?.({ preventDefault() {} }); }
    submit() { return this.events.get('submit')?.({ preventDefault() {} }); }
  }
  for (const id of read('admin/index.html').matchAll(/\bid="([^"]+)"/g)) {
    const element = new Element(); element.id = id[1]; ids.set(id[1], element);
  }
  const location = { protocol: 'http:', hostname: 'localhost', origin: 'http://localhost:8765', href: 'http://localhost:8765/admin/', hash: '', replace(value) { this.redirect = value; }, reload() {} , ...options.location };
  const document = {
    body: new Element('body'), hidden: false,
    getElementById: id => ids.get(id),
    createElement: tag => new Element(tag), createTextNode: text => Object.assign(new Element('#text'), { textContent: text }),
    querySelector: selector => { const match = selector.match(/^\[data-resource-id="(.+)"\]$/); return match ? elements.find(element => element.dataset.resourceId === match[1] && element.isConnected) : null; },
    addEventListener: (name, callback) => listeners.set(`document:${name}`, callback)
  };
  const storage = new Map();
  const sessionStorage = { setItem: (key, value) => storage.set(key, value), getItem: key => storage.get(key), removeItem: key => storage.delete(key) };
  const client = {
    auth: {
      getUser: async () => options.getUser ? options.getUser() : ({ data: { user: instructor }, error: null }),
      signInWithPassword: async () => ({ data: { user: instructor }, error: null }),
      signOut: async () => { authChanged?.('SIGNED_OUT', null); return { error: null }; },
      onAuthStateChange: callback => { authChanged = callback; }
    },
    from: table => ({ select: columns => {
      queries.push({ table, columns });
      return {
        order: async () => options.metadata ? options.metadata() : ({ data: [wall, documentResource], error: null }),
        eq: (key, id) => ({ single: async () => options.content ? options.content(id) : payload(id === wall.id ? 'display' : 'download') })
      };
    } })
  };
  const timerCallbacks = new Map(); let timer = 0;
  class HarnessURL extends URL {}
  HarnessURL.createObjectURL = blob => { const url = `blob:test-${created.length + 1}`; created.push({ url, blob }); return url; };
  HarnessURL.revokeObjectURL = url => revoked.push(url);
  const window = { crypto: webcrypto, CAMPAIGN_CLOUD_CONFIG: { url: 'https://example.supabase.co', publishableKey: 'sb_publishable_test' }, supabase: { createClient: (url, key, config) => { createOptions = config; return client; } }, addEventListener: (name, callback) => listeners.set(`window:${name}`, callback) };
  vm.runInNewContext(read('admin/app.js'), { window, document, location, sessionStorage, URL: HarnessURL, Blob, Uint8Array, Set, atob: value => Buffer.from(value, 'base64').toString('binary'), setTimeout: callback => { timerCallbacks.set(++timer, callback); return timer; }, clearTimeout: id => timerCallbacks.delete(id) }, { filename: 'admin/app.js' });
  return { ids, elements, queries, created, revoked, downloads, location, get createOptions() { return createOptions; }, event: (name, value) => authChanged(name, value), route(hash) { location.hash = hash; return listeners.get('window:hashchange')?.(); } };
}

test('the hub fetches metadata only and keeps instructor auth separate from student sessions', async () => {
  const browser = browserHarness();
  await settle();
  assert.equal(browser.ids.get('hub-view').hidden, false);
  assert.equal(browser.queries.length, 1);
  assert.doesNotMatch(browser.queries[0].columns, /\*|content_base64/);
  assert.equal(browser.created.length, 0, 'Do not download any private payload while listing resources');
  assert(browser.createOptions.auth.storageKey.includes('instructor'));
  assert.equal(browser.createOptions.auth.detectSessionInUrl, false);
});

test('an account with no authorized rows is returned to login without private content', async () => {
  const browser = browserHarness({ metadata: () => ({ data: [], error: null }) });
  await settle();
  assert.equal(browser.ids.get('login-view').hidden, false);
  assert.equal(browser.ids.get('hub-view').hidden, true);
  assert.equal(browser.ids.get('resource-grid').children.length, 0);
  assert.equal(browser.created.length, 0);
});

test('metadata that finishes after sign-out cannot restore the instructor hub', async () => {
  const pending = deferred();
  const browser = browserHarness({ metadata: () => pending.promise });
  await settle();
  browser.event('SIGNED_OUT', null);
  pending.resolve({ data: [wall, documentResource], error: null });
  await settle();
  assert.equal(browser.ids.get('hub-view').hidden, true);
  assert.equal(browser.ids.get('resource-grid').children.length, 0);
  assert.equal(browser.ids.get('account-email').textContent, '');
});

test('private wall responses that finish after sign-out cannot create a frame or blob', async () => {
  const pending = deferred();
  const browser = browserHarness({ content: () => pending.promise });
  await settle();
  browser.route('#/wall');
  await settle();
  browser.event('SIGNED_OUT', null);
  pending.resolve(payload('display'));
  await settle();
  assert.equal(browser.created.length, 0);
  assert.equal(browser.ids.get('wall-container').children.length, 0);
  assert.equal(browser.ids.get('wall-view').hidden, true);
});

test('download responses that finish after sign-out cannot create a download', async () => {
  const pending = deferred();
  const browser = browserHarness({ content: () => pending.promise });
  await settle();
  browser.elements.find(element => element.dataset.resourceId === documentResource.id).click();
  await settle();
  browser.event('SIGNED_OUT', null);
  pending.resolve(payload('download'));
  await settle();
  assert.equal(browser.created.length, 0);
  assert.equal(browser.downloads.length, 0);
});

test('an open wall is sandboxed away from the parent session and removed on sign-out', async () => {
  const browser = browserHarness();
  await settle();
  browser.route('#/wall');
  await settle();
  const [frame] = browser.ids.get('wall-container').children;
  assert.equal(frame.tagName, 'IFRAME');
  assert.match(frame.attributes.sandbox, /\ballow-scripts\b/);
  assert.doesNotMatch(frame.attributes.sandbox, /allow-same-origin|allow-top-navigation|allow-forms/);
  assert.equal(browser.created.length, 1);
  browser.event('SIGNED_OUT', null);
  assert.equal(browser.ids.get('wall-container').children.length, 0);
  assert(browser.revoked.includes(browser.created[0].url));
  assert.equal(browser.ids.get('wall-view').hidden, true);
});

test('sign-out revokes an outstanding document blob as well as clearing the resource list', async () => {
  const browser = browserHarness();
  await settle();
  await browser.elements.find(element => element.dataset.resourceId === documentResource.id).click();
  assert.equal(browser.downloads.length, 1);
  browser.event('SIGNED_OUT', null);
  assert(browser.revoked.includes(browser.created[0].url));
  assert.equal(browser.ids.get('resource-grid').children.length, 0);
});

test('public HTTP is redirected before initializing authentication', () => {
  const browser = browserHarness({ location: { protocol: 'http:', hostname: 'mrqcyber.com', origin: 'http://mrqcyber.com', href: 'http://mrqcyber.com/admin/' } });
  assert.equal(browser.location.redirect, 'https://mrqcyber.com/admin/');
  assert.equal(browser.createOptions, undefined);
  assert.equal(browser.queries.length, 0);
});

test('resource links cannot send the instructor to an arbitrary origin or execute script URLs', async () => {
  const links = [
    { label: 'Year 1', href: '/learn/osint/campaign-player/index.html#/year1' },
    { label: 'Public investigation', href: 'https://mrqcyber.com/learn/osint/' },
    { label: 'Script', href: 'javascript:alert(1)' },
    { label: 'Foreign origin', href: 'https://example.invalid/learn/private' },
    { label: 'Protocol relative', href: '//example.invalid/learn/' },
    { label: 'Admin', href: '/admin/' },
    { label: 'Traversal', href: '/learn/../admin/' }
  ];
  const browser = browserHarness({ metadata: () => ({ data: [{ id: 'investigation', title: 'Case', description: 'Case link', kind: 'link', links }], error: null }) });
  await settle();
  const anchors = browser.elements.filter(element => element.tagName === 'A');
  assert.equal(anchors.length, 2);
  for (const anchor of anchors) {
    assert.equal(anchor.target, '_blank');
    assert.match(anchor.rel, /noopener/);
    assert.match(anchor.rel, /noreferrer/);
  }
});

test('the admin CSP limits network access and authorizes the private wall through hashes, not inline script wildcards', () => {
  const html = read('admin/index.html');
  const csp = html.match(/http-equiv="Content-Security-Policy"\s+content="([^"]+)"/i)?.[1];
  assert(csp, 'A restrictive content security policy is required');
  assert.match(csp, /default-src\s+'none'/);
  assert.match(csp, /frame-src\s+blob:/);
  assert.match(csp, /connect-src\s+https:\/\/djgaqadlwaxwgobcemsp\.supabase\.co\s*;/);
  assert.match(csp, /script-src[^;]*'sha256-/);
  assert.doesNotMatch(csp, /unsafe-inline|unsafe-eval/);
  assert.match(csp, /object-src\s+'none'/);
  assert.match(csp, /form-action\s+'none'/);
});
