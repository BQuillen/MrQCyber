'use strict';

// Chapter 2 owns its routes, data binding, and question guide. Carried-over
// Chapter 1 public pages keep their existing Compass routes and search entries.
(() => {
  const data = window.CAMPAIGN_CHAPTER_TWO;
  const artifacts = data?.artifacts || [];
  const previousIds = new Set((window.CAMPAIGN_CASE?.artifacts || []).map(artifact => artifact.id));
  const availableIds = new Set(artifacts.map(artifact => artifact.id));
  const carriedPublicIds = (window.CAMPAIGN_LAB?.publicIds || []).filter(id => availableIds.has(id));
  const newPublicIds = artifacts.filter(artifact => !previousIds.has(artifact.id) && artifact.visibility === 'public').map(artifact => artifact.id);
  window.CAMPAIGN_CHAPTER_TWO_LAB = window.CampaignAdapterFactory(data, {
    folder: 'campaign-chapter2', routePrefix: 'campaign2',
    publicIds: [...carriedPublicIds, ...newPublicIds], searchIds: newPublicIds,
    legacyPublicIds: carriedPublicIds
  });
})();
