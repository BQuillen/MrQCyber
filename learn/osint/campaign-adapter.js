'use strict';

// Keep this case separate from the Community Cup source records and notebook.
(() => {
  function createCampaignAdapter(data, options = {}) {
  const folder = options.folder || 'campaign';
  const routePrefix = options.routePrefix || 'campaign';
  if (!['campaign', 'campaign-chapter2'].includes(folder) || !['campaign', 'campaign2'].includes(routePrefix)) throw new Error('Unsupported campaign adapter route.');
  const legacyPublicIds = new Set(options.legacyPublicIds || []);
  const artifacts = new Map((data?.artifacts || []).map(artifact => [artifact.id, artifact]));
  // Provided investigator exhibits are intentionally excluded from the public web.
  // New artifacts must be explicitly classified before they enter Compass.
  const publicIds = new Set(options.publicIds || [
    'PROFILE-01', 'FRAME-01', 'FRAME-04', 'STAFF-01', 'FRAME-02',
    'LINKEDUP-01', 'HIGHFIVE-01', 'EVENT-01', 'NEWS-01',
    'FORUM-01', 'FORUM-02', 'NEWS-02'
  ]);
  const descriptions = {
    'PROFILE-01': 'Mandy Schmear’s public campaign profile and links to recent posts.',
    'FRAME-01': 'Recent public updates from Mandy Schmear’s campaign account.',
    'FRAME-04': 'A public post from Mandy Schmear’s campaign account on 25 October.',
    'STAFF-01': 'Meet the campaign team and read about their responsibilities.',
    'FRAME-02': 'Benny’s public updates about his week around the campaign.',
    'LINKEDUP-01': 'Crane Gordon’s professional experience and current campaign role.',
    'HIGHFIVE-01': 'Services and team information from High Five Consultancy.',
    'EVENT-01': 'Public information about the city connectivity listening event.',
    'NEWS-01': 'Local coverage of the connectivity listening event.',
    'FORUM-01': 'Public community discussion about planning useful posts.',
    'FORUM-02': 'Public discussion about behind-the-scenes posts and their context.',
    'NEWS-02': 'Local reporting on the campaign’s response to a morning post.'
  };

  const route = id => '/' + (legacyPublicIds.has(id) ? 'campaign' : routePrefix) + '/' + encodeURIComponent(id);
  const guide = id => folder + '/preview/index.html' + (id ? '#/evidence/' + encodeURIComponent(id) : '#/guide');
  function node(tag, attrs = {}, children = []) {
    const el = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
      if (value == null) continue;
      if (key === 'text') el.textContent = String(value);
      else if (key.startsWith('on')) el.addEventListener(key.slice(2), value);
      else el.setAttribute(key, String(value));
    }
    for (const child of Array.isArray(children) ? children : [children]) if (child != null) el.append(typeof child === 'string' ? document.createTextNode(child) : child);
    return el;
  }
  const p = text => node('p', { text });
  const anchor = (text, href, className) => node('a', { text, href, class: className });

  function imageURL(src) {
    if (typeof src !== 'string') return null;
    const clean = src.replace(/^\.\.\//, '').replace(/^\.\//, '');
    return /^images\/[a-zA-Z0-9_./ -]+$/.test(clean) && !clean.includes('..') ? folder + '/' + clean : null;
  }
  function imagesFor(artifact) {
    const images = [];
    if (artifact.image) images.push(typeof artifact.image === 'string' ? { src: artifact.image, alt: artifact.title } : artifact.image);
    for (const image of artifact.images || []) if (!images.some(existing => existing.src === image.src)) images.push(image);
    return images;
  }
  function styleFor(artifact) {
    const site = String(artifact.site || '').toLowerCase();
    if (site.includes('frame')) return 'frame';
    if (site.includes('linked')) return 'linkedup';
    if (artifact.id === 'HIGHFIVE-01' || site.includes('company') || site.includes('organization website')) return 'company';
    if (artifact.type === 'article' || site.includes('news site')) return 'news';
    if (artifact.type === 'forum') return 'forum';
    return 'document';
  }

  function displayDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))?$/.test(value)) return value || '';
    const date = new Date(value); if (Number.isNaN(date.getTime())) return value;
    const day = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
    return value.includes('T') ? `${day} at ${date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC', hourCycle: 'h23' })} UTC` : day;
  }

  const entries = [...(options.searchIds || publicIds)].filter(id => artifacts.has(id) && publicIds.has(id)).map(id => {
    const artifact = artifacts.get(id);
    return {
      title: artifact.title,
      route: route(id),
      site: artifact.site,
      text: descriptions[id] || artifact.summary || 'Public page preserved for the Campaign Post investigation.',
      keys: [artifact.title, artifact.author, artifact.site, ...(artifact.body || [])].filter(Boolean).join(' ')
    };
  });
  if (typeof SEARCH_INDEX !== 'undefined') for (const entry of entries) if (!SEARCH_INDEX.some(existing => existing.route === entry.route)) SEARCH_INDEX.push(entry);

  function render(container, id) {
    const artifact = artifacts.get(id);
    if (!artifact) {
      container.replaceChildren(node('h1', { text: 'Campaign source not found' }), p('This page is not available in the loaded case revision.'), anchor('Return to Compass', '#/search'));
      return;
    }
    const isPublic = publicIds.has(id);
    if (!isPublic) {
      container.replaceChildren(
        node('h1', { text: 'Provided case record' }),
        p('This exhibit belongs to the guided investigation. Open your class activity to reach the supplied records in sequence.'),
        anchor('Open guided investigation \u2192', 'campaign-player/index.html')
      );
      return;
    }
    const style = styleFor(artifact);
    const article = node('article', { class: `campaign-page campaign-${style}${artifact.type === 'profile' ? ' campaign-profile' : ''}` });
    article.append(node('header', { class: 'campaign-masthead' }, [
      anchor(artifact.site || 'Campaign case record', '#/search', 'campaign-brand'),
      node('span', { text: isPublic ? 'Public source snapshot' : 'Provided investigator exhibit', class: 'small muted' })
    ]));
    const content = node('div', { class: 'campaign-content' }, [node('h1', { text: artifact.title })]);
    const byline = [artifact.author, displayDate(artifact.date)].filter(Boolean).join(' · ');
    if (byline) content.append(node('p', { class: 'campaign-byline', text: byline }));
    if (Array.isArray(data?.priorArtifactIds) && data.priorArtifactIds.includes(id)) content.append(node('p', { class: 'notice', text: 'Preserved Chapter 1 source. Its coverage statements describe the earlier collection. Consult the Chapter 2 briefing for the newly supplied records.' }));
    if (!isPublic) content.append(node('p', { class: 'notice', text: 'This record was supplied to investigators. It is not a public Compass search result. Use the Campaign Post guide to record your findings.' }));
    for (const image of imagesFor(artifact)) {
      const src = imageURL(image.src); if (!src) continue;
      const img = node('img', { src, alt: image.alt || artifact.title, loading: 'lazy', 'data-noinspector': 'true' });
      const fullSize = node('a', { href: src, target: '_blank', rel: 'noopener', class: 'campaign-image-open', 'aria-label': `Open full-size image: ${image.alt || artifact.title} (opens in a new tab)` }, [img, node('span', { class: 'campaign-image-label', text: 'Open full-size image ↗' })]);
      img.addEventListener('error', () => fullSize.replaceWith(node('p', { class: 'notice', text: 'This image is unavailable in the local copy.' })), { once: true });
      const portrait = src.endsWith('-reference.png');
      const caption = image.caption || (portrait ? image.alt || artifact.title : '');
      content.append(node('figure', { class: `campaign-figure${portrait ? ' campaign-portrait-figure' : ''}` }, [fullSize, caption ? node('figcaption', { text: caption }) : null]));
    }
    content.append(node('div', { class: 'campaign-body' }, (artifact.body || []).map(text => p(String(text)))));
    if (Array.isArray(artifact.rows)) {
      const columns = artifact.columns || [];
      const table = node('table', {}, [node('caption', { text: artifact.title }), node('thead', {}, node('tr', {}, columns.map(column => node('th', { scope: 'col', text: column })))), node('tbody', {}, artifact.rows.map(row => node('tr', {}, columns.map((_, index) => node('td', { text: row[index] ?? '' })))))]);
      content.append(node('div', { class: 'campaign-table-wrap', tabindex: '0', 'aria-label': 'Scrollable case exhibit table' }, table));
    }
    // A public webpage must not acquire artificial links into private audit exports.
    const related = (artifact.links || []).filter(item => artifacts.has(item.artifactId) && (!isPublic || publicIds.has(item.artifactId)));
    if (related.length) content.append(node('nav', { class: 'campaign-related', 'aria-label': 'Links from this source' }, related.map(item => anchor(item.label, '#' + route(item.artifactId)))));
    article.append(content);
    const status = node('span', { class: 'small muted', role: 'status', 'aria-live': 'polite' });
    article.append(node('footer', { class: 'campaign-source-action' }, [
      node('code', { text: 'Source ID: ' + id }),
      node('button', { type: 'button', text: 'Copy source ID', onclick: async () => {
        try { await navigator.clipboard.writeText(id); status.textContent = 'Source ID copied.'; }
        catch (_) { status.textContent = 'Record this source ID: ' + id; }
      } }),
      anchor('Open in Campaign question guide →', guide(id)), status
    ]));
    container.replaceChildren(node('nav', { class: 'campaign-context', 'aria-label': 'Case navigation' }, [anchor('← Compass', '#/search'), anchor((data?.title || 'The Campaign Post') + ' · question guide', guide())]), article);
  }

  return Object.freeze({ render, publicIds: Object.freeze([...publicIds]), searchEntries: Object.freeze(entries), hasData: artifacts.size > 0 });
  }
  window.CampaignAdapterFactory = createCampaignAdapter;
  window.CAMPAIGN_LAB = createCampaignAdapter(window.CAMPAIGN_CASE);
})();
