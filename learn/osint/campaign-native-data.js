'use strict';

// Public campaign people/posts use the lab's existing Frame records and views.
// No provided audit records or private identity conclusions are used here.
(() => {
  const activity = window.CAMPAIGN_ACTIVITY;
  const caseData = activity?.caseData;
  const artifacts = new Map((caseData?.artifacts || []).map(artifact => [artifact.id, artifact]));
  const profiles = {}, posts = {}, routeArtifacts = new Map();
  const artifactRoutes = {}, pageRoutes = {};
  let allowed = null;
  const get = id => artifacts.get(id);
  const body = id => get(id)?.body || [];
  const images = id => { const a = get(id); return a ? [...(a.image ? [typeof a.image === 'string' ? { src: a.image, alt: a.title } : a.image] : []), ...(a.images || [])] : []; };
  const imageFiles = new Set([...artifacts.values()].flatMap(a => images(a.id)).map(image => String(image.src || '').split('/').pop()).filter(name => /^[a-z0-9-]+\.png$/.test(name)));
  function assetURL(value) {
    if (typeof value !== 'string') return null;
    const match = /^(?:\.\.\/images\/|images\/|campaign-player\/images\/)([a-z0-9-]+\.png)$/.exec(value);
    return match && imageFiles.has(match[1]) ? 'campaign-player/images/' + match[1] : null;
  }
  const unique = values => [...new Set(values)];
  const isAllowed = id => !allowed || allowed.has(id);
  const publicArtifact = id => (get(id)?.visibility || caseData?.artifactVisibility?.[id]) === 'public';
  const publicPage = id => (activity?.pages || []).find(page => page.public && page.artifactIds.includes(id));
  const routeFor = id => artifactRoutes[id] || (publicPage(id) ? '/campaign-case/' + publicPage(id).id : null);
  const portrait = (artifactId, name) => images(artifactId).find(image => String(image.alt || '') .includes(name) || String(image.caption || '').includes(name));
  function addProfile(id, name, parts, postIds = []) {
    const evidenceIds = unique([...parts.map(part => part.artifactId), ...postIds.map(postId => posts[postId].artifactId)]).filter(id => artifacts.has(id));
    profiles[id] = { name, handle: name.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim().replace(/\s+/g, '.'), parts, posts: postIds, evidenceIds, featured: ['campaign-mandy', 'campaign-benny'].includes(id) };
    routeArtifacts.set('/profile/' + id, evidenceIds);
  }
  function addPost(id, owner, artifactId, data) {
    posts[id] = { owner, artifactId, images: [], comments: [], ...data, campaign: true };
    routeArtifacts.set('/post/' + id, [artifactId]);
  }
  const mandyOlder = [];
  for (const paragraph of body('FRAME-01')) {
    const match = /^(POST-MANDY-\d+) · (.*?) — ([\s\S]*)$/.exec(paragraph); if (!match) continue;
    const id = 'campaign-' + match[1].toLowerCase().replace(/^post-/, '');
    const photo = images('FRAME-01').find(image => String(image.caption || '').startsWith(match[2].split(',')[0] + ' ·'));
    addPost(id, 'campaign-mandy', 'FRAME-01', { date: match[2], text: match[3], sourcePostId: match[1], images: photo ? [assetURL(photo.src)].filter(Boolean) : [], imageAlts: photo ? [photo.alt] : [], imageCaptions: photo ? [photo.caption] : [] });
    mandyOlder.push(id);
  }
  const incident = get('FRAME-04');
  if (incident) {
    const publication = /^Post ID: ([^ ]+) · Published (.*?) ·/.exec(incident.body[1] || '');
    const comments = incident.body.slice(2, 6).map(paragraph => {
      const separator = paragraph.indexOf(' — '), heading = paragraph.slice(0, separator), split = heading.indexOf(' · ');
      return { name: heading.slice(0, split), date: heading.slice(split + 3), text: paragraph.slice(separator + 3) };
    });
    addPost('campaign-mandy-incident', 'campaign-mandy', incident.id, { date: publication?.[2] || incident.date, text: incident.body[0], sourcePostId: publication?.[1], comments, notes: [incident.body[1], ...incident.body.slice(6)] });
    artifactRoutes['FRAME-04'] = '/post/campaign-mandy-incident';
  }
  const bennyPosts = [];
  body('FRAME-02').forEach((paragraph, index) => {
    const separator = paragraph.indexOf(' — '); if (separator < 0) return;
    const id = 'campaign-benny-' + String(index + 1).padStart(2, '0');
    addPost(id, 'campaign-benny', 'FRAME-02', { date: paragraph.slice(0, separator), text: paragraph.slice(separator + 3) }); bennyPosts.push(id);
  });
  const extraPosts = {};
  const frameRecords = (caseData?.framePosts || []).filter(item => publicArtifact(item.artifactId));
  for (const record of frameRecords) {
    if (!/^campaign-[a-z0-9-]+$/.test(record.id || '') || !['campaign-benny', 'campaign-mandy', 'campaign-paige'].includes(record.owner) || posts[record.id]) continue;
    const photos = images(record.artifactId).filter(photo => assetURL(photo.src) && (!Array.isArray(record.imageFilenames) || record.imageFilenames.includes(photo.src.split('/').pop())));
    addPost(record.id, record.owner, record.artifactId, { ...record, images: photos.map(photo => assetURL(photo.src)), imageAlts: photos.map(photo => photo.alt || ''), imageCaptions: photos.map(photo => photo.caption || '') });
    (extraPosts[record.owner] ||= []).push(record.id);
    const sharedSource = frameRecords.filter(item => item.artifactId === record.artifactId).length > 1;
    artifactRoutes[record.artifactId] = sharedSource ? '/profile/' + record.owner + '?year=' + record.timestamp.slice(0, 4) : '/post/' + record.id;
  }
  const withHistory = (ids, owner) => [...ids, ...(extraPosts[owner] || [])].sort((a, b) => {
    const time = id => Date.parse(String(posts[id].timestamp || posts[id].date || '').replace(/\s+at\s+/, ' ').replace(',', '')) || 0;
    return time(b) - time(a);
  });
  pageRoutes['benny-history'] = '/profile/campaign-benny?year=2023';
  if (get('PROFILE-01') || mandyOlder.length || incident) {
    addProfile('campaign-mandy', 'Mandy Schmear', [{ artifactId: 'PROFILE-01', bio: body('PROFILE-01')[0], notes: body('PROFILE-01').slice(1), image: images('PROFILE-01')[0] }], withHistory([...(incident ? ['campaign-mandy-incident'] : []), ...mandyOlder.reverse()], 'campaign-mandy'));
    artifactRoutes['PROFILE-01'] = artifactRoutes['FRAME-01'] = pageRoutes['mandy-feed'] = '/profile/campaign-mandy';
  }
  const staffLine = name => body('STAFF-01').find(text => text.startsWith(name + ' — '));
  if (get('FRAME-02')) {
    addProfile('campaign-benny', 'Benny Schmear', [{ artifactId: 'STAFF-01', bio: staffLine('Benny Schmear') }, { artifactId: 'FRAME-02', image: images('FRAME-02')[0] }], withHistory(bennyPosts.reverse(), 'campaign-benny'));
    artifactRoutes['FRAME-02'] = pageRoutes['benny-feed'] = '/profile/campaign-benny';
  }
  if (get('STAFF-01')) {
    addProfile('campaign-crane', 'Crane Gordon', [{ artifactId: 'STAFF-01', bio: staffLine('Crane Gordon'), image: portrait('STAFF-01', 'Crane Gordon') }, { artifactId: 'LINKEDUP-01' }, { artifactId: 'CIVIC-ARCHIVE-03' }]);
    addProfile('campaign-lemon', 'Lemon Smellbottom', [{ artifactId: 'STAFF-01', bio: staffLine('Lemon Smellbottom') }, { artifactId: 'LEMON-PROFILE-02', image: images('LEMON-PROFILE-02')[0] }]);
  }
  const teamLine = body('HIGHFIVE-01').find(text => text.startsWith('Current team: ')) || '';
  for (const [key, name] of [['winnie','Winnie Mouse'],['dex','Dex Varnish'],['milo','Milo Bracket'],['paige','Paige Bracket'],['larry','Larry Couch']]) {
    const role = teamLine.replace(/^Current team: /, '').replace(/\.$/, '').split('; ').find(text => text.startsWith(name + ' — '));
    if (!role) continue;
    addProfile('campaign-' + key, name, [{ artifactId: 'HIGHFIVE-01', bio: role + ' · High Five Consultancy', image: portrait('HIGHFIVE-01', name) }, { artifactId: 'TEAM-02', image: portrait('TEAM-02', name) }], withHistory([], 'campaign-' + key));
  }
  if (get('BARRY-PROFILE-02')) addProfile('campaign-barry', 'Barry Shmelly', [{ artifactId: 'BARRY-PROFILE-02', bio: body('BARRY-PROFILE-02')[0], image: images('BARRY-PROFILE-02')[0] }]);
  if (get('LEON-PROFILE-03')) {
    addProfile('campaign-leon', 'Leon Tusk', [{ artifactId: 'LEON-PROFILE-03', bio: body('LEON-PROFILE-03')[0], notes: body('LEON-PROFILE-03').slice(1), image: images('LEON-PROFILE-03')[0], gallery: images('LEON-PROFILE-03').slice(1) }, { artifactId: 'LEON-CONTACT-03' }]);
    artifactRoutes['LEON-PROFILE-03'] = '/profile/campaign-leon';
  }

  const normalizeRoute = route => String(route || '').replace(/^#/, '').split('?')[0].replace(/\/$/, '');
  const routeEvidence = route => [...(routeArtifacts.get(normalizeRoute(route)) || [])];
  const visibleEvidence = route => routeEvidence(route).filter(isAllowed);
  const postYear = id => String(posts[id]?.timestamp || posts[id]?.date || '').match(/\b(?:19|20)\d{2}\b/)?.[0];
  const profilePostIds = (id, year = '') => (profiles[id]?.posts || []).filter(post => isAllowed(posts[post].artifactId) && (!year || postYear(post) === String(year)));
  const profileYears = id => unique(profilePostIds(id).map(postYear).filter(Boolean)).sort().reverse();
  function applyScope(artifactIds) {
    allowed = artifactIds == null ? null : new Set(artifactIds);
    if (typeof PROFILES === 'undefined' || typeof POSTS === 'undefined') return;
    for (const id of Object.keys(profiles)) delete PROFILES[id];
    for (const id of Object.keys(posts)) delete POSTS[id];
    for (const [id, post] of Object.entries(posts)) if (isAllowed(post.artifactId)) POSTS[id] = { ...post, images: [...post.images], comments: [...post.comments] };
    for (const [id, profile] of Object.entries(profiles)) {
      const evidenceIds = profile.evidenceIds.filter(isAllowed); if (!evidenceIds.length) continue;
      const parts = profile.parts.filter(part => isAllowed(part.artifactId));
      const image = parts.map(part => part.image).find(Boolean);
      const profilePhotos = parts.flatMap(part => part.gallery || []).map(photo => ({ ...photo, src: assetURL(photo.src) })).filter(photo => photo.src);
      const postIds = profile.posts.filter(postId => POSTS[postId]);
      const links = [];
      for (const evidenceId of evidenceIds) {
        for (const target of [evidenceId, ...(get(evidenceId)?.links || []).map(link => link.artifactId)]) {
          const route = routeFor(target); if (!route || route === '/profile/' + id || !isAllowed(target) || !publicArtifact(target) || links.some(link => link[1] === route)) continue;
          links.push([get(target)?.title || target, route]);
        }
      }
      PROFILES[id] = { name: profile.name, handle: profile.handle, bio: parts.map(part => part.bio).filter(Boolean).join(' '), profileNotes: parts.flatMap(part => part.notes || []), image: image ? assetURL(image.src) : null, imageAlt: image?.alt, profilePhotos, stats: postIds.length ? `${postIds.length} preserved public posts` : 'Public profile · no posts in this collection', posts: postIds, links, featured: profile.featured, campaign: true, artifactIds: evidenceIds };
    }
  }
  const searchEntries = Object.entries(profiles).map(([id, profile]) => {
    const bio = profile.parts.map(part => part.bio).filter(Boolean).join(' ');
    const role = id === 'campaign-mandy' ? 'candidate' : id === 'campaign-barry' ? 'reporter' : id === 'campaign-benny' ? 'learning about marketing' : (bio.split(' — ')[1] || '').split('.')[0].split(' · ')[0];
    return { route: '/profile/' + id, title: profile.name + ' · Frame', site: 'Frame', text: bio, keys: [profile.name, profile.handle, role].join(' '), artifactIds: [...profile.evidenceIds] };
  });
  window.CAMPAIGN_NATIVE = Object.freeze({ artifactRoutes: Object.freeze(artifactRoutes), pageRoutes: Object.freeze(pageRoutes), routeEvidence, visibleEvidence, profilePostIds, profileYears, applyScope, assetURL, searchEntries: Object.freeze(searchEntries), profileIds: Object.freeze(Object.keys(profiles)), postIds: Object.freeze(Object.keys(posts)) });
  applyScope(null);
})();
