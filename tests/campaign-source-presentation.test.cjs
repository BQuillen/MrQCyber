const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const folder = path.join(__dirname, '../learn/osint/campaign-player');
const source = fs.readFileSync(path.join(folder, 'sources.js'), 'utf8');
const activity = JSON.parse(fs.readFileSync(path.join(folder, 'activity.json'), 'utf8'));

class Element {
  constructor(tag) { this.tagName = tag; this.attributes = {}; this.children = []; this.listeners = {}; this._text = ''; }
  set textContent(value) { this._text = String(value); this.children = []; }
  get textContent() { return this._text + this.children.map(child => child.textContent).join(''); }
  set innerHTML(_value) { throw new Error('Source content must use text nodes.'); }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  addEventListener(name, callback) { this.listeners[name] = callback; }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = children; }
  scrollIntoView(options) { this.scrolled = options; }
  focus(options) { this.focused = options; }
}
const walk = node => [node, ...node.children.flatMap(walk)];
const hasClass = (node, name) => (node.attributes.class || '').split(/\s+/).includes(name);
function render(pageId, data = activity, options = {}) {
  const context = vm.createContext({ window: {}, document: {
    createElement: tag => new Element(tag),
    createTextNode: text => Object.assign(new Element('#text'), { textContent: text })
  } });
  vm.runInContext(source, context);
  const container = new Element('div'), citations = [];
  context.window.CampaignSources.render(container, { activity: data, pageId, onCite: id => citations.push(id), ...options });
  return { nodes: walk(container), container, citations };
}

test('real forum threads separate the original post from every reply without losing profile notes', () => {
  const { nodes } = render('marketing-forum');
  const threads = nodes.filter(node => hasClass(node, 'source-forum-thread'));
  assert.equal(threads.length, 2);
  for (const [index, usernames] of [
    ['benny_s', 'Paige_Turner', 'benny_s', 'Paige_Turner', 'benny_s'],
    ['benny_s', 'Paige_Turner', 'casey_draws', 'benny_s']
  ].entries()) {
    const thread = threads[index], posts = thread.children.filter(node => hasClass(node, 'source-forum-post'));
    assert.deepEqual(posts.map(post => walk(post).find(node => node.tagName === 'strong').textContent), usernames);
    assert.equal(thread.children.filter(node => node.tagName === 'hr').length, 1);
    const divider = thread.children.findIndex(node => node.tagName === 'hr');
    assert(divider > thread.children.indexOf(posts[0]));
    assert(divider < thread.children.indexOf(posts[1]));
    assert(posts.every(post => walk(post).some(node => node.tagName === 'em' && node.textContent.endsWith('UTC'))));
  }
  assert(threads[0].textContent.includes('Paige_Turner’s public profile does not display a legal name or employer.'));
  assert(!threads[0].textContent.includes('Paige Bracket'));
  assert(threads[1].textContent.includes('They do not reveal the users’ physical locations, device addresses or legal identities.'));
  assert.equal(nodes.filter(node => hasClass(node, 'source-footer')).length, 2);
});

test('forum names and messages remain literal text, including markup and colons', () => {
  const username = '<img src=x onerror=alert(1)>', message = '<script>alert(1)</script> Keep this: exact text.';
  const fixture = { pages: [{ id: 'thread', title: 'Example', artifactIds: ['F'] }], caseData: { artifacts: [{ id: 'F', type: 'forum', title: 'Example', body: [
    `18:22 UTC · ${username}: ${message}`,
    'Profile note: <b>Unverified</b> · ordinary metadata, not another post.'
  ] }] } };
  const { nodes } = render('thread', fixture);
  assert.equal(nodes.filter(node => hasClass(node, 'source-forum-post')).length, 1);
  assert.equal(nodes.find(node => node.tagName === 'strong' && node.textContent === username).textContent, username);
  assert(nodes.some(node => node.tagName === 'p' && node.textContent === message));
  assert(nodes.some(node => hasClass(node, 'source-forum-note') && node.textContent.startsWith('Profile note:')));
  assert(!nodes.some(node => ['img', 'script', 'hr'].includes(node.tagName)));
});

test('High Five team portraits retain every image and caption in team-card grids', () => {
  for (const [pageId, sourceId] of [['high-five', 'HIGHFIVE-01'], ['high-five-work', 'TEAM-02']]) {
    const { nodes } = render(pageId);
    const grids = nodes.filter(node => hasClass(node, 'source-team-grid'));
    const artifact = activity.caseData.artifacts.find(item => item.id === sourceId);
    assert.equal(artifact.images.length, 6);
    const grid = grids.find(item => item.textContent.includes(artifact.images[0].caption));
    assert(grid, sourceId);
    assert.equal(walk(grid).filter(node => node.tagName === 'figure').length, artifact.images.length);
    for (const image of artifact.images) {
      assert(walk(grid).some(node => node.tagName === 'figcaption' && node.textContent === image.caption));
      assert(walk(grid).some(node => node.tagName === 'img' && node.attributes.src.endsWith(image.src.split('/').pop())));
      assert(walk(grid).some(node => node.tagName === 'a' && node.attributes.href.endsWith(image.src.split('/').pop())));
    }
  }
});


test('forum pages use one Threadline community shell with one heading per discussion', () => {
  const { nodes } = render('marketing-forum');
  assert.equal(nodes.filter(node => hasClass(node, 'source-forum-site')).length, 1);
  assert(nodes.some(node => hasClass(node, 'source-forum-brand') && node.textContent.includes('threadline')));
  assert(nodes.some(node => hasClass(node, 'source-forum-community-handle') && node.textContent === 'c/marketing'));
  assert.deepEqual(nodes.filter(node => node.tagName === 'h1').map(node => node.textContent), ['Marketing & communications']);
  for (const id of ['FORUM-01', 'FORUM-02']) {
    const title = activity.caseData.artifacts.find(artifact => artifact.id === id).title;
    assert.equal(nodes.filter(node => /^h[1-6]$/.test(node.tagName) && node.textContent === title).length, 1, title);
  }
  assert.equal(nodes.filter(node => hasClass(node, 'source-forum-sidebar')).length, 1);
  assert(!nodes.some(node => hasClass(node, 'source-masthead')));
  const company = render('high-five').nodes;
  assert(!company.some(node => hasClass(node, 'source-forum-site')));
  assert(company.some(node => hasClass(node, 'source-masthead')));
});

function forumPageFixture() {
  const data = JSON.parse(JSON.stringify(activity));
  data.pages.push({ id: 'source-FORUM-01', title: data.caseData.artifacts.find(artifact => artifact.id === 'FORUM-01').title, public: true, artifactIds: ['FORUM-01'] });
  data.caseData.artifacts.push({ id: 'PRIVATE-FORUM', type: 'forum', title: 'Private staff discussion', body: ['19:00 UTC · staff_only: Not public.'] });
  data.pages.push({ id: 'private-thread', public: false, artifactIds: ['PRIVATE-FORUM'] });
  return data;
}

test('forum navigation scrolls within the page and opens other permitted discussions through callbacks', () => {
  const opened = [], navigated = [], data = forumPageFixture();
  const { nodes, citations } = render('source-FORUM-01', data, {
    allowedArtifactIds: ['FORUM-01', 'FORUM-02', 'NETWORK-01', 'PRIVATE-FORUM'],
    onOpenArtifact: id => opened.push(id), onNavigate: pageId => navigated.push(pageId)
  });
  const click = label => { const button = nodes.find(node => node.tagName === 'button' && node.textContent === label); assert(button, label); button.listeners.click(); };
  click('Discussions');
  assert(nodes.find(node => hasClass(node, 'source-forum-discussions')).focused);
  click('About this community');
  assert(nodes.find(node => hasClass(node, 'source-forum-about')).scrolled);
  const firstTitle = data.caseData.artifacts.find(artifact => artifact.id === 'FORUM-01').title;
  const secondTitle = data.caseData.artifacts.find(artifact => artifact.id === 'FORUM-02').title;
  click(firstTitle);
  assert(nodes.find(node => hasClass(node, 'source-forum-discussion')).focused);
  assert.deepEqual(opened, []);
  click(secondTitle);
  assert.deepEqual(opened, ['FORUM-02']);
  assert.deepEqual(navigated, []);
  click('Use this source');
  assert.deepEqual(citations, ['FORUM-01']);
  assert(!nodes.some(node => node.textContent === 'Private staff discussion' || node.textContent === 'Venue context'));
  assert(!nodes.some(node => Object.values(node.attributes).some(value => value.includes('NETWORK-01') || value.includes('PRIVATE-FORUM'))));

  const fallback = render('source-FORUM-01', data, { allowedArtifactIds: ['FORUM-01', 'FORUM-02'], onNavigate: id => navigated.push(id) });
  fallback.nodes.find(node => node.tagName === 'button' && node.textContent === secondTitle).listeners.click();
  assert.deepEqual(navigated, ['marketing-forum']);
});

test('forum menus omit later and private discussions and unavailable pages render no thread content', () => {
  const data = forumPageFixture(), opened = [];
  const scoped = render('source-FORUM-01', data, { allowedArtifactIds: ['FORUM-01', 'PRIVATE-FORUM', 'NETWORK-01'], onOpenArtifact: id => opened.push(id) });
  const secondTitle = data.caseData.artifacts.find(artifact => artifact.id === 'FORUM-02').title;
  assert(!scoped.nodes.some(node => node.tagName === 'button' && [secondTitle, 'Private staff discussion'].includes(node.textContent)));
  assert.equal(scoped.nodes.filter(node => hasClass(node, 'source-forum-discussion')).length, 1);
  assert.deepEqual(opened, []);
  const blocked = render('marketing-forum', data, { allowedArtifactIds: ['FORUM-01'] });
  assert(blocked.container.textContent.includes('not available'));
  assert(!blocked.nodes.some(node => hasClass(node, 'source-forum-site') || hasClass(node, 'source-forum-thread')));
});

test('the actual Compass adapter rejects private and out-of-scope artifact navigation', () => {
  let renderedContext;
  const context = vm.createContext({ window: {
    CAMPAIGN_ACTIVITY: activity,
    CampaignSources: { render(_container, options) { renderedContext = options; } }
  }, location: { hash: '#/campaign-case/source-FORUM-01' } });
  vm.runInContext(fs.readFileSync(path.join(folder, '../campaign-player-adapter.js'), 'utf8'), context);
  const adapter = context.window.CAMPAIGN_GUIDED_LAB;
  adapter.setScope(['FORUM-01', 'FORUM-02', 'NETWORK-01']);
  adapter.render(new Element('div'), 'source-FORUM-01');
  assert.equal(typeof renderedContext.onOpenArtifact, 'function');
  renderedContext.onOpenArtifact('FORUM-02');
  assert.equal(context.location.hash, '#/campaign-case/source-FORUM-02');
  for (const id of ['NETWORK-01', 'NEWS-01', 'missing-artifact']) {
    renderedContext.onOpenArtifact(id);
    assert.equal(context.location.hash, '#/campaign-case/source-FORUM-02', id);
  }
  adapter.setScope(['FORUM-01']);
  context.location.hash = '#/campaign-case/source-FORUM-01';
  renderedContext.onOpenArtifact('FORUM-02');
  assert.equal(context.location.hash, '#/campaign-case/source-FORUM-01');
});
