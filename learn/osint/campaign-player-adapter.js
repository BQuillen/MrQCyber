'use strict';
(() => {
  const activity = window.CAMPAIGN_ACTIVITY;
  const artifacts = activity?.caseData?.artifacts || [];
  const byId = new Map(artifacts.map(artifact => [artifact.id, artifact]));
  const publicPages = (activity?.pages || []).filter(page => page.public);
  const native = window.CAMPAIGN_NATIVE;
  let allowed = null;
  const visibility = id => activity.caseData.artifactVisibility?.[id] || byId.get(id)?.visibility || 'provided';
  const isCompassArtifact = id => byId.has(id) && (activity.caseData.discoveryChannels?.[id] || (visibility(id) === 'public' ? ['compass'] : ['data'])).includes('compass');
  const available = id => isCompassArtifact(id) && (!allowed || allowed.has(id));
  const tableSources = { EventRevisions: 'EVENT-02', EventRegistrations: 'GUESTS-01', NetworkConnections: 'NETWORK-01', ApprovalEvents: 'APPROVALS-01', AccountPermissions: 'ACCESS-01', PublishingEvents: 'PUBLISH-01', SessionObservations: 'SESSION-01', DocumentEvents: 'DOCLOG-01', ...Object.fromEntries(Object.entries(activity?.caseData?.queryTables || {}).map(([name, spec]) => [name, spec.artifactId])) };
  const routeForArtifact = id => byId.has(id) ? '/campaign-case/source-' + encodeURIComponent(id) : null;
  const routeForPage = id => activity?.pages.some(page => page.id === id) ? native?.pageRoutes?.[id] || '/campaign-case/' + encodeURIComponent(id) : null;
  const catalog = artifacts.filter(artifact => isCompassArtifact(artifact.id)).map(artifact => {
    const kind = visibility(artifact.id), tables = Object.entries(tableSources).filter(([, id]) => id === artifact.id).map(([name]) => name);
    return Object.freeze({ artifactId: artifact.id, artifactIds: [artifact.id], route: native?.artifactRoutes?.[artifact.id] || routeForArtifact(artifact.id), sourceRoute: routeForArtifact(artifact.id), title: artifact.title,
      site: (kind === 'public' ? artifact.site || 'Public webpage' : 'Provided investigation record') + ' · ' + artifact.id,
      text: kind === 'public' ? 'Public source · ' + (artifact.author || artifact.site || 'Campaign Post') : 'Supplied case evidence' + (artifact.rows ? ` · ${artifact.rows.length} records` : '') + (tables.length ? ' · ' + tables.join(', ') : '') + '. Preserved with its source and collection notes.',
      keys: [artifact.id, artifact.title, artifact.site, artifact.author, artifact.date, ...tables, ...(artifact.body || []), ...(artifact.columns || []), ...(artifact.rows || []).flat(), ...(artifact.links || []).filter(link => isCompassArtifact(link.artifactId)).map(link => link.label), ...[...(artifact.image ? [artifact.image] : []), ...(artifact.images || [])].flatMap(item => typeof item === 'object' ? [item.alt, item.caption] : [])].filter(value => value !== undefined && value !== null).join(' '),
      visibility: kind, campaignSource: true });
  });
  function reindex() {
    if (typeof SEARCH_INDEX === 'undefined') return;
    for (let index = SEARCH_INDEX.length - 1; index >= 0; index--) {
      if (SEARCH_INDEX[index].campaignSource || /^\/(?:campaign|campaign2|campaign-case)\//.test(SEARCH_INDEX[index].route || '')) SEARCH_INDEX.splice(index, 1);
    }
    SEARCH_INDEX.push(...catalog.filter(entry => available(entry.artifactId)));
    for (const entry of native?.searchEntries || []) {
      if (entry.artifactIds?.some(id => available(id)) && !SEARCH_INDEX.some(item => item.route === entry.route)) SEARCH_INDEX.push({ ...entry, campaignSource: true });
    }
  }
  function routeArtifacts(raw) {
    const route = String(raw || '').replace(/^#/, '').split('?')[0];
    const nativeIds = native?.routeEvidence?.(route) || [];
    if (nativeIds.length) return nativeIds;
    const match = /^\/campaign-case\/([^/]+)$/.exec(route);
    if (!match) return [];
    let id; try { id = decodeURIComponent(match[1]); } catch (_) { return []; }
    if (id.startsWith('source-')) return byId.has(id.slice(7)) ? [id.slice(7)] : [];
    return activity?.pages.find(page => page.id === id)?.artifactIds || [];
  }
  function isRouteAvailable(raw) {
    const ids = routeArtifacts(raw);
    if (/^#?\/profile\//.test(raw)) return ids.length ? ids.some(available) : !/^#?\/profile\/campaign-/.test(raw);
    return ids.length ? ids.every(available) : !/^#?\/(?:campaign-case\/|post\/campaign-)/.test(raw);
  }
  function cite(id) {
    if (!available(id)) return;
    if (window.CampaignLabBridge) { window.CampaignLabBridge.cite(id); return; }
    const show = () => { if (typeof toast === 'function') toast('Source ID: ' + id); };
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) navigator.clipboard.writeText(id).then(show, show); else show();
  }
  function render(container, id) {
    const direct = id?.startsWith('source-') ? byId.get(id.slice(7)) : null;
    const page = direct ? { id, title: direct.title, site: 'Source details · ' + direct.site, artifactIds: [direct.id], public: visibility(direct.id) === 'public' } : activity?.pages.find(item => item.id === id);
    if (page?.artifactIds.some(source => !isCompassArtifact(source))) { container.textContent = 'This is a supplied investigation record. Open it through the data workspace in the guided investigation.'; return; }
    if (!page || page.artifactIds.some(source => !available(source))) { container.textContent = 'This source is not available in the current collection.'; return; }
    const destination = !direct && native?.pageRoutes?.[id];
    if (destination) { location.hash = '#' + destination; return; }
    const localActivity = direct ? { ...activity, pages: [...activity.pages, page] } : activity;
    window.CampaignSources.render(container, { activity: localActivity, pageId: id, assetBase: 'campaign-player/images/', allowedArtifactIds: artifacts.filter(item => available(item.id)).map(item => item.id),
      onNavigate: pageId => { const route = routeForPage(pageId); if (route && isRouteAvailable(route)) location.hash = '#' + route; }, onCite: cite });
    const frameRoute = direct && native?.artifactRoutes?.[direct.id];
    if (frameRoute && isRouteAvailable(frameRoute)) {
      const link = document.createElement('a');
      link.setAttribute('href', '#' + frameRoute); link.setAttribute('class', 'button'); link.textContent = 'View on Frame'; container.append(link);
    }
  }
  window.CAMPAIGN_GUIDED_LAB = Object.freeze({ catalog: Object.freeze(catalog), publicPageIds: Object.freeze(publicPages.map(page => page.id)),
    routeForArtifact, routeForPage, routeArtifacts, isRouteAvailable, isCompassArtifact, render,
    setScope(ids) { allowed = Array.isArray(ids) ? new Set(ids.filter(id => byId.has(id))) : null; reindex(); },
    availableArtifactIds() { return artifacts.filter(item => available(item.id)).map(item => item.id); }
  });
  reindex();
})();
