'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');
const root = path.resolve(__dirname, '..');
const sdkSource = fs.readFileSync(path.join(root, 'learn/osint/campaign-player/supabase.min.js'), 'utf8');
const appSource = fs.readFileSync(path.join(root, 'admin/app.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'admin/index.html'), 'utf8');
const canonicalKey = 'mrq-instructor-session-v1';
const teacher = { id: '11111111-1111-4111-8111-111111111111', email: 'instructor@example.test', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {} };

// Real bundled SDK and real admin controller; only browser surfaces and HTTP
// are simulated. Each tab has isolated sessionStorage, as a browser does.
function environment() {
  const channels = new Set(), tabs = [], requests = [], broadcasts = [], timers = new Set();
  let sequence = 0;
  class Channel {
    constructor(name) { this.name = name; this.listeners = []; channels.add(this); }
    addEventListener(type, listener) { if (type === 'message') this.listeners.push(listener); }
    postMessage(value) {
      broadcasts.push({ channel: this.name, event: value.event });
      for (const peer of channels) if (peer !== this && peer.name === this.name) {
        const copy = structuredClone(value);
        setImmediate(() => { if (channels.has(peer)) for (const listener of peer.listeners) listener({ data: copy }); });
      }
    }
    close() { channels.delete(this); }
  }
  const reply = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });
  async function fakeFetch(input, options = {}) {
    const url = new URL(typeof input === 'string' ? input : input.url);
    assert.equal(url.origin, 'https://auth.example.test', 'No test request may contact a real service.');
    requests.push({ path: url.pathname, method: options.method || 'GET' });
    if (url.pathname === '/auth/v1/token') {
      const now = Math.floor(Date.now() / 1000), number = ++sequence;
      const payload = Buffer.from(JSON.stringify({ sub: teacher.id, exp: now + 3600, iat: now, session_id: 'synthetic-' + number })).toString('base64url');
      return reply({ access_token: 'eyJhbGciOiJIUzI1NiJ9.' + payload + '.synthetic', refresh_token: 'synthetic-refresh-' + number, token_type: 'bearer', expires_in: 3600, expires_at: now + 3600, user: teacher });
    }
    if (url.pathname === '/auth/v1/user') return reply(teacher);
    if (url.pathname === '/auth/v1/logout') return reply({});
    if (url.pathname === '/rest/v1/instructor_resources') return reply([{ id: 'synthetic-resource', title: 'Synthetic resource', kind: 'link', description: 'Test content only', links: [] }]);
    throw new Error('Unexpected simulated request: ' + url.pathname);
  }
  function tab(existingStorage) {
    const store = existingStorage || new Map(), elements = new Map(), listeners = new Map(), authEvents = [];
    class Element {
      constructor(tag = 'div') { this.tagName = tag.toUpperCase(); this.children = []; this.attributes = {}; this.dataset = {}; this.events = new Map(); this.hidden = false; this.disabled = false; this.value = ''; this.textContent = ''; this.isConnected = true; this.classList = { add() {}, remove() {}, toggle() {} }; }
      append(...children) { for (const child of children) { child.parent = this; this.children.push(child); } }
      after(...children) { this.parent?.append(...children); }
      replaceChildren(...children) { this.children = []; this.textContent = ''; this.append(...children); }
      setAttribute(key, value) { this.attributes[key] = value; }
      addEventListener(type, listener) { this.events.set(type, listener); }
      focus() {}
    }
    for (const match of html.matchAll(/\bid="([^"]+)"/g)) elements.set(match[1], new Element());
    for (const id of ['login-view', 'hub-view', 'account-actions', 'students-view', 'wall-view']) elements.get(id).hidden = true;
    const document = { hidden: false, visibilityState: 'hidden', body: new Element('body'),
      getElementById: id => elements.get(id), createElement: tag => new Element(tag), createTextNode: text => Object.assign(new Element('#text'), { textContent: text }),
      querySelector() { return null; }, addEventListener: (name, fn) => listeners.set('document:' + name, fn) };
    const sessionStorage = { getItem: key => store.get(key) ?? null, setItem: (key, value) => store.set(key, String(value)), removeItem: key => store.delete(key) };
    const location = { protocol: 'https:', hostname: 'classroom.example', origin: 'https://classroom.example', href: 'https://classroom.example/admin/', hash: '', replace() {}, reload() {} };
    const context = vm.createContext({ console, document, location, sessionStorage, navigator: {}, crypto: webcrypto,
      URL, URLSearchParams, Headers, Request, Response, TextEncoder, TextDecoder, AbortController, Uint8Array, Blob, atob, btoa, BroadcastChannel: Channel, fetch: fakeFetch,
      WebSocket: class { constructor() { throw new Error('Realtime connections are not used by this test.'); } },
      setTimeout(fn, delay = 0, ...args) { const timer = setTimeout(fn, delay, ...args); timer.unref(); timers.add(timer); return timer; },
      clearTimeout(timer) { clearTimeout(timer); timers.delete(timer); }, setInterval(fn, delay, ...args) { const timer = setInterval(fn, delay, ...args); timer.unref(); timers.add(timer); return timer; }, clearInterval(timer) { clearInterval(timer); timers.delete(timer); },
      addEventListener: (name, fn) => listeners.set('window:' + name, fn), removeEventListener() {} });
    context.window = context;
    vm.runInContext(sdkSource, context, { filename: 'actual-bundled-supabase.js' });
    const createClient = context.supabase.createClient;
    let client, options, creationError;
    context.supabase.createClient = (url, key, settings) => { options = settings; try { client = createClient(url, key, settings); } catch (error) { creationError = error.message; throw error; } client.auth.onAuthStateChange(event => { authEvents.push(event); }); return client; };
    context.CAMPAIGN_CLOUD_CONFIG = { url: 'https://auth.example.test', publishableKey: 'synthetic-public-key', assignmentId: 'synthetic-assignment' };
    vm.runInContext(appSource, context, { filename: 'actual-admin-app.js' });
    const result = { elements, store, authEvents, get options() { return options; }, get client() { return client; }, diagnostics() { return JSON.stringify({ creationError, events: authEvents, status: elements.get('status').children.map(child => child.textContent), requests }); },
      async login() { elements.get('email').value = teacher.email; elements.get('password').value = 'synthetic-password'; await elements.get('login-form').events.get('submit')({ preventDefault() {} }); },
      async logout() { await elements.get('sign-out').events.get('click')(); },
      async close() { listeners.get('window:pagehide')?.({}); await client?.auth.stopAutoRefresh(); client?.auth.broadcastChannel?.close(); }
    };
    tabs.push(result); return result;
  }
  async function settle() { for (let i = 0; i < 12; i++) await new Promise(resolve => setTimeout(resolve, 5)); }
  async function close() { for (const item of tabs) await item.close(); for (const channel of channels) channel.close(); for (const timer of timers) { clearTimeout(timer); clearInterval(timer); } }
  return { tab, settle, close, requests, broadcasts };
}

test('an empty second admin tab cannot bounce a successful instructor login back to a blank form', async t => {
  const env = environment(); t.after(() => env.close());
  const first = env.tab(); await env.settle();
  const second = env.tab(); await env.settle();
  await first.login(); await env.settle();
  assert.equal(first.elements.get('hub-view').hidden, false, 'The authenticated tab must retain its instructor hub. ' + first.diagnostics());
  assert.equal(first.elements.get('login-view').hidden, true);
  assert.equal(second.elements.get('login-view').hidden, false, 'An unrelated empty tab remains signed out.');
  assert.equal(env.requests.filter(request => request.path === '/auth/v1/token').length, 1);
  assert.equal(env.requests.filter(request => request.path === '/auth/v1/logout').length, 0, 'The second tab must not attempt to revoke the first tab’s session.');
  assert(first.store.has(canonicalKey));
  assert(!second.store.has(canonicalKey));
});

test('reloading an instructor tab restores its canonical session without another password request', async t => {
  const env = environment(); t.after(() => env.close());
  const first = env.tab(); await env.settle(); await first.login(); await env.settle();
  const stored = first.store.get(canonicalKey); assert(stored);
  await first.close();
  const reloaded = env.tab(first.store); await env.settle();
  assert.equal(reloaded.elements.get('hub-view').hidden, false);
  assert.equal(reloaded.elements.get('login-view').hidden, true);
  assert.equal(reloaded.store.get(canonicalKey), stored);
  assert.equal(env.requests.filter(request => request.path === '/auth/v1/token').length, 1);
});

test('explicit sign-out clears only that tab and leaves another independently signed-in tab usable', async t => {
  const env = environment(); t.after(() => env.close());
  const first = env.tab(); await env.settle(); const second = env.tab(); await env.settle();
  await first.login(); await env.settle(); await second.login(); await env.settle();
  assert.equal(first.elements.get('hub-view').hidden, false);
  assert.equal(second.elements.get('hub-view').hidden, false);
  await first.logout(); await env.settle();
  assert.equal(first.elements.get('login-view').hidden, false);
  assert.equal(first.elements.get('hub-view').hidden, true);
  assert(!first.store.has(canonicalKey));
  assert.equal(second.elements.get('hub-view').hidden, false);
  assert(second.store.has(canonicalKey));
  assert.equal(env.requests.filter(request => request.path === '/auth/v1/logout').length, 1);
});
