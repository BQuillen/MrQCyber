'use strict';

(() => {
  const localHosts = new Set(['localhost', '127.0.0.1', '[::1]']);
  if (location.protocol === 'http:' && !localHosts.has(location.hostname)) {
    const secure = new URL(location.href);
    secure.protocol = 'https:';
    location.replace(secure.href);
    return;
  }

  const $ = id => document.getElementById(id);
  const metadataColumns = 'id,collection,title,description,kind,filename,mime_type,links,sort_order,updated_at';
  const sessionKey = 'mrq-instructor-session-v1';
  const blobURLs = new Set();
  const state = { epoch: 0, user: null, resources: [], signingIn: false, signingOut: false, checking: false, wallLoading: false, wallRequest: 0, wallURL: null };
  let client;
  let validateTimer;
  let dashboard;

  function status(message = '', isError = false, retry) {
    const box = $('status');
    box.replaceChildren(document.createTextNode(message));
    box.classList.toggle('error', isError);
    if (retry) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'retry-button';
      button.textContent = 'Try again';
      button.addEventListener('click', retry, { once: true });
      box.append(button);
    }
  }

  function removeWall() {
    state.wallRequest += 1;
    $('wall-container').replaceChildren();
    if (state.wallURL) {
      URL.revokeObjectURL(state.wallURL);
      blobURLs.delete(state.wallURL);
      state.wallURL = null;
    }
    state.wallLoading = false;
    const launch = document.querySelector('[data-resource-id="campaign-operations-wall"]');
    if (launch) { launch.disabled = false; launch.textContent = 'Launch display →'; }
    $('wall-view').hidden = true;
    document.body.classList.remove('wall-mode');
  }

  function clearPrivateState() {
    state.epoch += 1;
    state.user = null;
    state.resources = [];
    state.checking = false;
    state.signingIn = false;
    dashboard?.clear();
    dashboard = null;
    if ($('students-view')) $('students-view').hidden = true;
    removeWall();
    blobURLs.forEach(url => URL.revokeObjectURL(url));
    blobURLs.clear();
    $('resource-grid').replaceChildren();
    $('account-email').textContent = '';
    $('account-actions').hidden = true;
    $('private-label').hidden = false;
    $('hub-view').hidden = true;
    $('password').value = '';
    $('password').type = 'password';
    $('show-password').textContent = 'Show';
    $('show-password').setAttribute('aria-label', 'Show password');
    $('show-password').setAttribute('aria-pressed', 'false');
    clearTimeout(validateTimer);
  }

  function showLogin(message = '', isError = false) {
    $('checking').hidden = true;
    $('login-view').hidden = false;
    $('sign-in').disabled = false;
    $('sign-in').replaceChildren(document.createTextNode('Sign in →'));
    $('login-form').after($('status'));
    status(message, isError);
  }

  async function signOut(message = 'You have signed out.', isError = false) {
    clearPrivateState();
    state.signingOut = true;
    const epoch = state.epoch;
    showLogin(message, isError);
    try { await client.auth.signOut({ scope: 'local' }); } catch (_) { /* Local content is already cleared. */ }
    if (epoch === state.epoch) {
      state.signingOut = false;
      try { sessionStorage.removeItem(sessionKey); } catch (_) { /* Session storage can be unavailable. */ }
      showLogin(message, isError);
    }
  }

  function safeLink(href) {
    try {
      const url = new URL(href, location.origin);
      if ((url.origin === location.origin || url.origin === 'https://mrqcyber.com') && /^\/learn\//.test(url.pathname)) return url.href;
    } catch (_) { /* Invalid resource link. */ }
    return null;
  }

  function renderResources() {
    const grid = $('resource-grid');
    grid.replaceChildren();
    const icons = { link: '↗', download: '↓', display: '▤' };
    for (const resource of state.resources) {
      const card = document.createElement('article');
      card.className = 'resource-card';
      const icon = document.createElement('span');
      icon.className = 'resource-icon';
      icon.setAttribute('aria-hidden', 'true');
      icon.textContent = icons[resource.kind] || '◇';
      const title = document.createElement('h3');
      title.textContent = resource.title;
      const description = document.createElement('p');
      description.textContent = resource.description;
      const actions = document.createElement('div');
      actions.className = 'resource-actions';
      if (resource.kind === 'link') {
        (Array.isArray(resource.links) ? resource.links : []).forEach((link, index) => {
          const href = safeLink(link.href);
          if (!href) return;
          const anchor = document.createElement('a');
          anchor.href = href;
          anchor.target = '_blank';
          anchor.rel = 'noopener noreferrer';
          anchor.className = `resource-action${index ? ' secondary' : ''}`;
          anchor.textContent = `${link.label} ↗`;
          actions.append(anchor);
        });
      } else {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'resource-action';
        button.dataset.resourceId = resource.id;
        button.textContent = resource.kind === 'display' ? 'Launch display →' : 'Download document ↓';
        button.addEventListener('click', () => resource.kind === 'display' ? navigateWall() : downloadResource(resource, button));
        actions.append(button);
      }
      card.append(icon, title, description, actions);
      grid.append(card);
    }
  }

  function scheduleValidation() {
    clearTimeout(validateTimer);
    if (state.user) validateTimer = setTimeout(() => validateSession(), 240000);
  }

  async function validateSession() {
    if (!state.user || state.checking) return;
    const epoch = state.epoch;
    try {
      const { data, error } = await client.auth.getUser();
      if (epoch !== state.epoch) return;
      if (error || !data.user || data.user.id !== state.user.id) {
        await signOut('Your session has ended. Please sign in again.', true);
        return;
      }
      scheduleValidation();
    } catch (_) {
      if (epoch === state.epoch) await signOut('We could not verify your session. Please sign in again.', true);
    }
  }

  async function authorize(epoch, quiet = false) {
    state.checking = true;
    try {
      const { data, error } = await client.auth.getUser();
      if (epoch !== state.epoch) return;
      if (error || !data.user) {
        await signOut(quiet ? '' : 'Unable to sign in. Check your email and password, then try again.', !quiet);
        return;
      }
      const result = await client.from('instructor_resources').select(metadataColumns).order('sort_order');
      if (epoch !== state.epoch) return;
      if (result.error || !Array.isArray(result.data) || !result.data.length) {
        await signOut('This account cannot access instructor resources.', true);
        return;
      }
      state.user = data.user;
      state.resources = result.data.filter(row => ['link', 'download', 'display'].includes(row.kind));
      if (!state.resources.length) {
        await signOut('This account cannot access instructor resources.', true);
        return;
      }
      $('password').value = '';
      $('account-email').textContent = data.user.email || 'Instructor';
      $('account-actions').hidden = false;
      $('private-label').hidden = true;
      $('login-view').hidden = true;
      $('checking').hidden = true;
      $('hub-view').hidden = false;
      $('main').append($('status'));
      renderResources();
      status();
      scheduleValidation();
      route();
    } catch (_) {
      if (epoch !== state.epoch) return;
      await signOut('Instructor resources are temporarily unavailable. Please try signing in again.', true);
    } finally {
      if (epoch === state.epoch) state.checking = false;
    }
  }

  async function fetchResource(resource, epoch) {
    const verification = await client.auth.getUser();
    if (epoch !== state.epoch) return null;
    if (verification.error || !verification.data.user || verification.data.user.id !== state.user?.id) {
      await signOut('Your session has ended. Please sign in again.', true);
      return null;
    }
    const result = await client.from('instructor_resources').select('content_base64,mime_type,filename,kind').eq('id', resource.id).single();
    if (epoch !== state.epoch) return null;
    if (result.error) {
      if (['PGRST116', '42501', 'PGRST301', 'PGRST303'].includes(result.error.code)) {
        await signOut('This account cannot access instructor resources.', true);
        return null;
      }
      throw new Error('resource-unavailable');
    }
    if (!result.data || result.data.kind !== resource.kind || typeof result.data.content_base64 !== 'string' || !result.data.content_base64) throw new Error('invalid-resource');
    const binary = atob(result.data.content_base64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return { blob: new Blob([bytes], { type: result.data.mime_type || 'application/octet-stream' }), filename: result.data.filename || 'instructor-resource' };
  }

  async function downloadResource(resource, button) {
    const epoch = state.epoch;
    if (!state.user || button.disabled) return;
    button.disabled = true;
    button.textContent = 'Preparing download…';
    status();
    try {
      const result = await fetchResource(resource, epoch);
      if (!result || epoch !== state.epoch) return;
      const url = URL.createObjectURL(result.blob);
      blobURLs.add(url);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = result.filename.replace(/[\/\\]/g, '-');
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => { URL.revokeObjectURL(url); blobURLs.delete(url); }, 60000);
      status(`${resource.title} is ready in your downloads.`);
    } catch (_) {
      if (epoch === state.epoch) status('The document could not be loaded. Please try again.', true, () => downloadResource(resource, button));
    } finally {
      if (epoch === state.epoch && button.isConnected) {
        button.disabled = false;
        button.textContent = 'Download document ↓';
      }
    }
  }

  function navigateWall() {
    if (location.hash !== '#/wall') location.hash = '/wall';
    else route();
  }

  async function openWall() {
    if (!state.user || state.wallURL || state.wallLoading) return;
    const resource = state.resources.find(row => row.id === 'campaign-operations-wall' && row.kind === 'display');
    if (!resource) return;
    const epoch = state.epoch;
    const request = ++state.wallRequest;
    state.wallLoading = true;
    const button = document.querySelector('[data-resource-id="campaign-operations-wall"]');
    if (button) { button.disabled = true; button.textContent = 'Opening display…'; }
    status('Loading the Operations Wall…');
    try {
      const result = await fetchResource(resource, epoch);
      if (!result || epoch !== state.epoch || request !== state.wallRequest || location.hash !== '#/wall') return;
      if (result.blob.type !== 'text/html') throw new Error('invalid-display');
      const url = URL.createObjectURL(result.blob);
      blobURLs.add(url);
      state.wallURL = url;
      const iframe = document.createElement('iframe');
      iframe.title = 'Campaign Operations Wall';
      iframe.setAttribute('sandbox', 'allow-scripts allow-popups allow-popups-to-escape-sandbox');
      iframe.setAttribute('allow', 'fullscreen');
      iframe.setAttribute('allowfullscreen', '');
      iframe.referrerPolicy = 'no-referrer';
      iframe.src = url;
      $('wall-container').replaceChildren(iframe);
      $('hub-view').hidden = true;
      $('wall-view').hidden = false;
      document.body.classList.add('wall-mode');
      status();
      $('back-to-resources').focus();
    } catch (_) {
      if (epoch === state.epoch && request === state.wallRequest) status('The display could not be loaded. Please try again.', true, () => openWall());
    } finally {
      if (epoch === state.epoch && request === state.wallRequest) {
        state.wallLoading = false;
        if (button?.isConnected) { button.disabled = false; button.textContent = 'Launch display →'; }
      }
    }
  }

  function route() {
    if (!state.user) return;
    if (location.hash === '#/students' && window.CampaignTeacherDashboard && window.CAMPAIGN_ACTIVITY) {
      removeWall();
      $('hub-view').hidden = true;
      status();
      if (!dashboard) dashboard = window.CampaignTeacherDashboard.create({
        root: $('students-view'), client, user: state.user,
        activity: window.CAMPAIGN_ACTIVITY,
        assignmentId: window.CAMPAIGN_CLOUD_CONFIG.assignmentId,
        onAuthError: () => signOut('Your instructor session could not be verified. Please sign in again.', true)
      });
      dashboard.show();
    } else if (location.hash === '#/wall') {
      dashboard?.hide();
      openWall();
    }
    else {
      dashboard?.hide();
      removeWall();
      $('hub-view').hidden = false;
      status();
    }
  }

  $('login-form').addEventListener('submit', async event => {
    event.preventDefault();
    if (state.signingIn || state.signingOut || state.checking) return;
    state.signingIn = true;
    const epoch = ++state.epoch;
    $('sign-in').disabled = true;
    $('sign-in').textContent = 'Signing in…';
    status();
    try {
      const result = await client.auth.signInWithPassword({ email: $('email').value.trim(), password: $('password').value });
      if (epoch !== state.epoch) return;
      if (result.error) {
        $('password').value = '';
        showLogin('Unable to sign in. Check your email and password, then try again.', true);
        return;
      }
      await authorize(epoch);
    } catch (_) {
      if (epoch === state.epoch) showLogin('Unable to connect. Please try signing in again.', true);
    } finally {
      if (epoch === state.epoch) state.signingIn = false;
    }
  });
  $('show-password').addEventListener('click', () => {
    const reveal = $('password').type === 'password';
    $('password').type = reveal ? 'text' : 'password';
    $('show-password').textContent = reveal ? 'Hide' : 'Show';
    $('show-password').setAttribute('aria-label', reveal ? 'Hide password' : 'Show password');
    $('show-password').setAttribute('aria-pressed', String(reveal));
  });
  $('sign-out').addEventListener('click', () => signOut());
  $('back-to-resources').addEventListener('click', () => { location.hash = '/'; });
  window.addEventListener('hashchange', route);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) validateSession(); });
  window.addEventListener('pagehide', () => {
    clearPrivateState();
  });
  window.addEventListener('pageshow', event => { if (event.persisted) location.reload(); });

  try {
    const config = window.CAMPAIGN_CLOUD_CONFIG;
    if (!config?.url || !config?.publishableKey || !window.supabase?.createClient) throw new Error('configuration');
    sessionStorage.setItem(`${sessionKey}-check`, '1');
    sessionStorage.removeItem(`${sessionKey}-check`);
    client = window.supabase.createClient(config.url, config.publishableKey, {
      auth: { storage: sessionStorage, storageKey: sessionKey, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
    });
    client.auth.onAuthStateChange((event, session) => {
      // Keep callbacks synchronous: Supabase's auth lock may still be held here.
      if (event === 'SIGNED_OUT') {
        if (!state.signingOut) {
          clearPrivateState();
          showLogin();
        }
      } else if (event === 'TOKEN_REFRESHED' && state.user) {
        setTimeout(validateSession, 0);
      } else if (event === 'SIGNED_IN' && session && !state.signingIn && !state.checking && !state.user) {
        setTimeout(() => authorize(state.epoch, true), 0);
      }
    });
    authorize(state.epoch, true);
  } catch (_) {
    clearPrivateState();
    showLogin('Sign-in is unavailable. Enable session storage or reload this page to try again.', true);
    $('sign-in').disabled = true;
  }
})();
