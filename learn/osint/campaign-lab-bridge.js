'use strict';
(() => {
  const embedded = window.parent !== window && new URLSearchParams(location.search).get('campaignEmbed') === '1';
  const catalog = window.CAMPAIGN_GUIDED_LAB, native = window.CAMPAIGN_NATIVE;
  const all = new Set((window.CAMPAIGN_ACTIVITY?.caseData?.artifacts || []).filter(item => catalog?.isCompassArtifact(item.id)).map(item => item.id));
  let ready = !embedded, allowed = new Set(embedded ? [] : all);
  const esc = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  function message(text) { const main = document.getElementById('main'); if (main) { main.textContent = text; main.setAttribute('role', 'status'); } }
  function cite(id) {
    if (!allowed.has(id)) return;
    if (embedded) window.parent.postMessage({ type: 'campaign-source-cite', artifactId: id }, '*');
    else {
      const show = () => { if (typeof toast === 'function') toast('Source ID: ' + id); };
      if (navigator.clipboard?.writeText) navigator.clipboard.writeText(id).then(show, show); else show();
    }
  }
  function sourceAction(route, title) {
    const ids = (catalog?.routeArtifacts(route) || []).filter(id => allowed.has(id));
    if (!ids.length) return embedded ? '' : null;
    return '<div class="source-action campaign-native-source" aria-label="Source references">' + ids.map(id => '<button type="button" data-campaign-cite="' + esc(id) + '" title="' + esc(title) + '">' + (embedded ? 'Use source ' : 'Copy source ID · ') + esc(id) + '</button><a href="#' + esc(catalog.routeForArtifact(id)) + '">Source details</a>').join('') + '</div>';
  }
  function guardRoute(hash) {
    const raw = String(hash || '#/search').replace(/^#/, '');
    const legacy = /^\/(?:campaign|campaign2)\/([^/?]+)$/.exec(raw);
    if (legacy) {
      let id; try { id = decodeURIComponent(legacy[1]); } catch (_) { id = ''; }
      const route = native?.artifactRoutes?.[id] || catalog?.routeForArtifact(id);
      if (route) { location.hash = '#' + route; return false; }
    }
    const sourceIds = catalog?.routeArtifacts(raw) || [];
    const nativeProfile = /^\/profile\//.test(raw);
    if (sourceIds.length && (nativeProfile ? !sourceIds.some(id => catalog.isCompassArtifact(id)) : sourceIds.some(id => !catalog.isCompassArtifact(id)))) { message('This is a supplied investigation record. Open it through the data workspace in the guided investigation.'); return false; }
    if (!embedded) return true;
    if (!ready) { message('Opening the investigation source…'); return false; }
    if (!catalog?.isRouteAvailable(raw)) { message('This source belongs to a later collection. Use Compass or return to the question source.'); return false; }
    if (/^\/(?:notebook|report|investigations|brief)(?:[/?]|$)/.test(raw)) { message('Your investigation questions and report remain in the guide beside this browser. Use Compass to continue browsing sources.'); return false; }
    return true;
  }
  function rendered() {
    document.getElementById('main')?.removeAttribute('role');
    document.querySelectorAll('[data-campaign-cite]').forEach(button => { button.onclick = () => cite(button.dataset.campaignCite); });
    if (embedded && ready) window.parent.postMessage({ type: 'campaign-source-location', route: location.hash, artifactIds: (catalog?.routeArtifacts(location.hash) || []).filter(id => allowed.has(id)) }, '*');
  }
  window.CampaignLabBridge = Object.freeze({ embedded, sourceAction, guardRoute, rendered, cite });
  if (!embedded) { native?.applyScope([...all]); return; }
  document.body.classList.add('campaign-embedded');
  native?.applyScope([]); catalog?.setScope([]);
  window.addEventListener('message', event => {
    if (event.source !== window.parent || event.data?.type !== 'campaign-source-open') return;
    const { pageId, route, allowedArtifactIds } = event.data;
    if (typeof pageId !== 'string' || !Array.isArray(allowedArtifactIds)) return;
    const page = window.CAMPAIGN_ACTIVITY.pages.find(item => item.id === pageId);
    const next = new Set(allowedArtifactIds.filter(id => all.has(id)));
    if (!page || page.artifactIds.some(id => !next.has(id))) return;
    allowed = next; ready = true;
    native?.applyScope([...allowed]); catalog?.setScope([...allowed]);
    const validRoute = typeof route === 'string' && route.length <= 2000 && /^#\/[a-z0-9%_/-]+(?:\?[^<>"\r\n]*)?$/i.test(route)
      && !/^#\/(?:notebook|report|investigations|brief)(?:[/?]|$)/.test(route) && catalog.isRouteAvailable(route);
    const target = validRoute ? route : '#' + catalog.routeForPage(pageId);
    if (location.hash !== target) location.hash = target;
    else if (typeof render === 'function') render();
  });
  window.parent.postMessage({ type: 'campaign-source-ready' }, '*');
})();
