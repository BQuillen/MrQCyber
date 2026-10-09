'use strict';
(() => {
  const container = document.getElementById('source');
  const activity = window.CAMPAIGN_ACTIVITY;
  const labUrl = document.body.getAttribute('data-lab-url') || '../index.html';
  if (window.parent === window) {
    const pageId = new URLSearchParams(location.search).get('page');
    const page = activity.pages.find(p => p.id === pageId);
    if (page) location.replace(labUrl + '#/campaign-case/' + encodeURIComponent(pageId));
    else container.textContent = 'Open the OSINT lab to search the campaign sources.';
    return;
  }
  window.addEventListener('message', event => {
    if (event.source !== window.parent || event.data?.type !== 'campaign-source-open') return;
    const { pageId, allowedArtifactIds } = event.data;
    if (typeof pageId !== 'string' || !Array.isArray(allowedArtifactIds)) return;
    const page = activity.pages.find(p => p.id === pageId);
    if (page && page.artifactIds.every(id => allowedArtifactIds.includes(id))) location.replace(labUrl + '?campaignEmbed=1#/campaign-case/' + encodeURIComponent(pageId));
  });
  window.parent.postMessage({ type: 'campaign-source-ready' }, '*');
})();
