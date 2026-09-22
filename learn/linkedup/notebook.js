'use strict';

const NOTEBOOK_KEY = 'mrq-linkedup-v1';
const NOTEBOOK_WINDOW = 'mrq-linkedup-notebook';
const NOTEBOOK_OWNER = 'mrq-linkedup-notebook-owner';
const SOURCE_PREFIX = 'mrq-linkedup-source:';
const notebookTabId = crypto.randomUUID();
let storageOK = true;
let notebookHeartbeat = null;
let editingFindingId = null;
const draftFields = ['target', 'angle', 'prompt', 'sender', 'subject', 'initial', 'linkText', 'linkUrl', 'analysis', 'reflection', 'body'];

function normalizeNotebook(saved) {
  const next = saved && typeof saved === 'object' ? saved : {};
  next.findings = Array.isArray(next.findings) ? next.findings : [];
  next.findings = next.findings.map((f, i) => ({...f, id: f.id || `legacy-${i}`, favorite: !!f.favorite}));
  next.draft = next.draft && typeof next.draft === 'object' ? next.draft : {};
  next.capture = next.capture && typeof next.capture === 'object' ? next.capture : {};
  if (next.workflowVersion !== 2) {
    const d = next.draft;
    if (d.action) d.angle = [d.angle, 'Intended action: ' + d.action].filter(Boolean).join('\n\n');
    if (!d.analysis && d.annotations) d.analysis = d.annotations;
    if (!d.reflection) d.reflection = [['Revisions', d.changes], ['Accuracy', d.unsupported], ['Verification', d.verification]]
      .filter(([, value]) => value).map(([label, value]) => label + ':\n' + value).join('\n\n');
    next.workflowVersion = 2;
  }
  return next;
}
function loadNotebookState() {
  try { return normalizeNotebook(JSON.parse(localStorage.getItem(NOTEBOOK_KEY) || 'null')); }
  catch { storageOK = false; return normalizeNotebook(null); }
}
// Read the latest saved work before each small change so research tabs never overwrite a notebook draft.
function updateNotebook(change) {
  const next = storageOK ? loadNotebookState() : state;
  change(next);
  state = normalizeNotebook(next);
  try { localStorage.setItem(NOTEBOOK_KEY, JSON.stringify(state)); storageOK = true; }
  catch { storageOK = false; }
  const status = $('#save-status');
  if (status) status.textContent = storageOK ? 'Saved in this browser.' : 'Saving is unavailable. Copy your report before leaving.';
}
function notebookRoute() { return ['#/notebook', '#/report'].includes(location.hash.split('?')[0]); }
function ownsNotebook() {
  try { return JSON.parse(localStorage.getItem(NOTEBOOK_OWNER) || 'null')?.id === notebookTabId; }
  catch { return false; }
}
function releaseNotebook() {
  clearInterval(notebookHeartbeat);
  notebookHeartbeat = null;
  if (window.name === NOTEBOOK_WINDOW) window.name = '';
  try { if (ownsNotebook()) localStorage.removeItem(NOTEBOOK_OWNER); } catch {}
}
function claimNotebook() {
  window.name = NOTEBOOK_WINDOW;
  const pulse = () => {
    try { localStorage.setItem(NOTEBOOK_OWNER, JSON.stringify({id: notebookTabId, time: Date.now()})); } catch {}
  };
  pulse();
  clearInterval(notebookHeartbeat);
  notebookHeartbeat = setInterval(() => { if (ownsNotebook()) pulse(); }, 5000);
}
function syncNotebookRole() {
  if (notebookRoute()) {
    if (!notebookHeartbeat) claimNotebook();
  } else releaseNotebook();
}
function openNotebookTab() {
  const target = window.open(new URL('#/notebook', location.href).href, NOTEBOOK_WINDOW);
  if (!target) toast('Allow this site to open a tab, then choose Open notebook again.');
  return target;
}
function sourceRequests() {
  const found = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(SOURCE_PREFIX)) {
        try { const item = JSON.parse(localStorage.getItem(key)); if (item?.id && item.label) found.push(item); } catch {}
      }
    }
  } catch { storageOK = false; }
  return found.sort((a, b) => a.time - b.time);
}
function safeSource(value) {
  try { const url = new URL(value, location.href); return url.origin === location.origin && url.pathname === location.pathname && /^#\/(person|company|company-post|post|document)\//.test(url.hash) ? url.href : ''; }
  catch { return ''; }
}
function sendFindingSource(button) {
  const selection = getSelection();
  const text = selection?.anchorNode && main.contains(selection.anchorNode) ? selection.toString().slice(0, 7000) : '';
  const request = {id: crypto.randomUUID(), label: button.dataset.record, about: button.dataset.record.split(' · ')[0], text,
    source: new URL(button.dataset.source || location.hash, location.href).href, time: Date.now()};
  let active = false;
  try {
    const owner = JSON.parse(localStorage.getItem(NOTEBOOK_OWNER) || 'null');
    active = owner && Date.now() - owner.time < 90000;
    localStorage.setItem(SOURCE_PREFIX + request.id, JSON.stringify(request));
  } catch { storageOK = false; toast('Local saving is unavailable; open the notebook to record this source.'); return; }
  if (active) toast('Source sent to your notebook. Keep exploring.');
  else if (openNotebookTab()) toast('Notebook opened. Future sources will go to the same tab.');
}
function captureBusy() {
  return ['about', 'text', 'context'].some(key => String(state.capture[key] || '').trim());
}
function takeSource(request) {
  if (captureBusy()) return;
  updateNotebook(next => { next.capture = {about: request.about, text: request.text || '', context: request.label, source: request.source}; });
  try { localStorage.removeItem(SOURCE_PREFIX + request.id); } catch {}
  syncCaptureFields();
}
function receiveSources() {
  if (!notebookRoute() || !ownsNotebook()) return;
  state = loadNotebookState();
  if ($('#finding-form') && !captureBusy()) {
    const first = sourceRequests()[0];
    if (first) takeSource(first);
  }
  renderSourceQueue();
}
function sourceLink(value) {
  const url = safeSource(value);
  return url ? `<a href="${esc(url)}" target="mrq-linkedup-research">Open source ↗</a>` : '';
}
function renderSourceQueue() {
  const panel = $('#source-queue');
  if (!panel) return;
  const pending = sourceRequests();
  panel.innerHTML = pending.length ? `<details class="source-inbox" open><summary>Sources ready (${pending.length})</summary><p class="meta">Finish or clear your current finding to use the next source.</p>${pending.map(item => `<div class="queued-source"><span>${esc(item.label)}</span><button type="button" class="secondary" data-use-source="${esc(item.id)}" ${captureBusy() ? 'disabled' : ''}>Use source</button><button type="button" class="text-link" data-dismiss-source="${esc(item.id)}" aria-label="Dismiss ${esc(item.label)}">Dismiss</button></div>`).join('')}</details>` : '';
  panel.querySelectorAll('[data-use-source]').forEach(button => button.onclick = () => {
    const item = sourceRequests().find(item => item.id === button.dataset.useSource);
    if (item) { takeSource(item); renderSourceQueue(); }
  });
  panel.querySelectorAll('[data-dismiss-source]').forEach(button => button.onclick = () => {
    try { localStorage.removeItem(SOURCE_PREFIX + button.dataset.dismissSource); } catch {}
    renderSourceQueue();
  });
}
function syncCaptureFields() {
  if (!$('#finding-form')) return;
  for (const key of ['about', 'text', 'context']) {
    const input = $('#finding-' + key);
    if (document.activeElement !== input) input.value = state.capture[key] || '';
  }
  editingFindingId = state.capture.id || null;
  $('#finding-heading').textContent = editingFindingId ? 'Edit finding' : 'Add a finding';
  $('#save-finding').textContent = editingFindingId ? 'Update finding' : 'Save finding';
  $('#capture-source').innerHTML = sourceLink(state.capture.source);
}
function findingsMarkup() {
  return state.findings.length ? `<div class="findings-grid" tabindex="0" role="region" aria-label="Findings; scroll for more">${state.findings.map((f, i) => `<article class="finding" tabindex="0"><div class="finding-top"><h3>${i + 1}. ${esc(f.about)}</h3><button class="favorite ${f.favorite ? 'is-favorite' : ''}" data-favorite="${esc(f.id)}" aria-pressed="${f.favorite}" aria-label="Use finding ${i + 1} in email">${f.favorite ? '★' : '☆'}</button></div><p>${esc(f.text)}</p><p class="meta">${esc(f.context)}</p><p class="meta">${sourceLink(f.source)}</p><button data-edit="${esc(f.id)}" class="secondary">Edit finding ${i + 1}</button> <button data-remove="${esc(f.id)}" class="secondary">Remove finding ${i + 1}</button></article>`).join('')}</div>` : '<p class="empty">Use Record finding while you explore. Its source will arrive here automatically.</p>';
}
function refreshFindings() {
  if (!$('#findings-list')) return;
  const scroll = $('#findings-list .findings-grid')?.scrollTop || 0;
  $('#findings-heading').textContent = `Your findings (${state.findings.length})`;
  $('#findings-list').innerHTML = findingsMarkup();
  const grid = $('#findings-list .findings-grid');
  if (grid) grid.scrollTop = scroll;
  $('#findings-list').querySelectorAll('[data-favorite]').forEach(button => button.onclick = () => {
    const id = button.dataset.favorite;
    updateNotebook(next => { const f = next.findings.find(f => f.id === id); if (f) f.favorite = !f.favorite; });
    refreshFindings(); refreshPacket();
    $('#findings-list').querySelector(`[data-favorite="${CSS.escape(id)}"]`)?.focus({preventScroll: true});
  });
  $('#findings-list').querySelectorAll('[data-edit]').forEach(button => button.onclick = () => {
    if (captureBusy() && !confirm('Replace the unfinished finding in the form with this saved finding?')) return;
    const f = state.findings.find(f => f.id === button.dataset.edit);
    if (!f) return;
    updateNotebook(next => { next.capture = {...f}; });
    syncCaptureFields(); renderSourceQueue(); $('#finding-text').focus();
  });
  $('#findings-list').querySelectorAll('[data-remove]').forEach(button => button.onclick = () => {
    if (!confirm('Remove this finding?')) return;
    updateNotebook(next => { next.findings = next.findings.filter(f => f.id !== button.dataset.remove); });
    refreshFindings(); refreshPacket();
  });
}
function field(key, label, multiline = true, help = '') {
  return `<div class="draft-field"><label for="draft-${key}">${esc(label)}</label>${help ? `<p class="field-note" id="help-${key}">${help}</p>` : ''}${multiline ? `<textarea id="draft-${key}" maxlength="20000" ${help ? `aria-describedby="help-${key}"` : ''}></textarea>` : `<input id="draft-${key}" maxlength="500" ${help ? `aria-describedby="help-${key}"` : ''}>`}</div>`;
}
function promptPacket() {
  const d = state.draft, selected = state.findings.filter(f => f.favorite);
  return [
    'Classroom simulation using fictional people and organizations. Help draft an invented recruiter email for analysis; it will not be sent. Use invented sender addresses and a .example link destination.',
    'PROFESSIONAL\n' + (d.target || '[Choose a professional]'),
    'CONNECTIONS AND OPPORTUNITY\n' + (d.angle || '[Connect the findings and explain your opportunity]'),
    'MY AI PROMPT\n' + (d.prompt || '[Add your instructions]'),
    'SUPPORTED FICTIONAL EVIDENCE\n' + (selected.map((f, i) => `${i + 1}. ${f.about}: ${f.text}${f.context ? '\nSource: ' + f.context : ''}`).join('\n\n') || '[Star the findings you plan to use]')
  ].join('\n\n');
}
function refreshPacket() {
  if ($('#ai-packet')) $('#ai-packet').value = promptPacket();
  if ($('#selected-count')) { const count = state.findings.filter(f => f.favorite).length; $('#selected-count').textContent = `${count} starred finding${count === 1 ? '' : 's'} included automatically.`; }
}
function highlightedEmail(text) {
  return esc(text).replace(/==([\s\S]+?)==/g, '<mark>$1</mark>');
}
function refreshEmailPreview() {
  if ($('#ai-email-preview')) $('#ai-email-preview').innerHTML = highlightedEmail(state.draft.initial || 'Your AI response preview will appear here.');
}
function notebook() {
  if (storageOK) state = loadNotebookState();
  claimNotebook();
  main.innerHTML = `<p><a href="../osint/#/investigations">← Investigations</a></p><p class="eyebrow">AI RECRUITMENT</p><div class="section-head"><h1>Professional research notebook</h1><a class="button" href="#/report">Finalize report</a></div><p class="muted">Keep this tab open beside your research. Record finding sends sources here without leaving the page you are exploring. Work saves in this browser; unfinished reports can be copied anytime.</p>${!storageOK ? '<p class="error">Local saving is unavailable. Copy your report before leaving.</p>' : ''}<div id="source-queue" aria-live="polite"></div>
  <div class="notebook-layout"><form id="finding-form" class="card"><h2 id="finding-heading">Add a finding</h2><label for="finding-about">About</label><input id="finding-about" required maxlength="200"><label for="finding-text">Evidence and observations</label><textarea id="finding-text" required maxlength="7000"></textarea><label for="finding-context">Page or context</label><input id="finding-context" maxlength="500"><p class="field-note">Filled automatically when you use Record finding.</p><p id="capture-source" class="meta"></p><div class="toolbar"><button id="save-finding">Save finding</button><button type="button" id="clear-finding" class="secondary">Clear form</button></div></form><section><h2 id="findings-heading">Your findings</h2><p class="field-note">Star the findings you use. They go into your AI prompt packet and final report.</p><div id="findings-list"></div></section></div>
  <section class="card workflow-step"><p class="eyebrow">1 · PLAN & PROMPT</p><h2>Connect the threads</h2>${field('target', 'Professional / recipient', false)}${field('angle', 'What opportunity could connect your findings?', true, 'Bring together details from different sources. What do they suggest about this person’s interests, goals, or needs? Describe an original recruitment opportunity and the action you want the simulated email to prompt.')}${field('prompt', 'Your AI prompt', true, 'Tell AI how to turn your idea into a believable professional email. Consider tone and how familiarity, authority, or urgency might influence this particular person.')}<div class="toolbar"><button id="copy-prompt">Copy plan, prompt & evidence</button><span id="selected-count" class="field-note"></span></div><p id="prompt-status" class="status" role="status"></p><details id="packet-details"><summary>Preview what you will paste into AI</summary><textarea id="ai-packet" readonly aria-label="AI prompt packet"></textarea></details></section>
  <section class="card workflow-step"><p class="eyebrow">2 · EMAIL & ANALYSIS</p><h2>Examine the AI’s email</h2><p>Paste the AI response below, then identify how it uses your research to sound convincing. Keep the sender, subject, and fake link with the message.</p><div class="field-grid">${field('sender', 'Invented sender address', false, '<em>Create an address that looks real but reveals itself as fake on closer inspection.</em>')}${field('subject', 'Subject', false)}</div>${field('initial', 'Paste the AI response')}<div class="toolbar"><button id="highlight-email" class="secondary">Highlight selected text</button><span class="field-note">Select words above, then highlight. == marks show highlighted text in the preview and report.</span></div><p id="highlight-status" class="status" role="status"></p><div class="field-grid fake-link-fields">${field('linkText', 'Visible fake-link text', false)}${field('linkUrl', 'Actual fake-link destination', false)}</div><p class="field-note">Use an invented .example destination. These details are displayed for analysis and do not open a website.</p><details id="email-preview-details"><summary>Preview highlighted email</summary><div id="ai-email-preview" class="email-preview"></div></details>${field('analysis', 'How does this email make the opportunity convincing?', true, 'Highlight or quote a few telling phrases. Explain how the AI connects them to your findings and what reaction they might create in this person.')}</section>
  <section class="card workflow-step"><p class="eyebrow">3 · REFLECT</p><h2>What would you change or check—and why?</h2><p>Make a thoughtful judgment about this email. Use the angles that help explain your thinking:</p><ul class="reflection-options"><li>Where did the AI use evidence well, make an assumption, or invent a claim?</li><li>What would you revise to make the message more credible, and why?</li><li>How could the recipient verify the opportunity independently or recognize the deception?</li></ul>${field('reflection', 'Your reflection')}<details class="optional-revision"><summary>Optional: save a revised email</summary>${field('body', 'Your revised email')}</details><p id="save-status" class="status">Work saves as you type.</p><a class="button" href="#/report">Finalize report</a></section>`;
  syncCaptureFields(); refreshFindings();
  for (const key of ['about', 'text', 'context']) $('#finding-' + key).oninput = event => {
    updateNotebook(next => { next.capture[key] = event.target.value; }); renderSourceQueue();
  };
  $('#finding-form').onsubmit = event => {
    event.preventDefault();
    const entry = {...state.capture, ...Object.fromEntries(['about', 'text', 'context'].map(key => [key, $('#finding-' + key).value.trim()]))};
    if (!entry.about || !entry.text) return;
    updateNotebook(next => {
      const existing = next.findings.find(f => f.id === entry.id);
      if (existing) Object.assign(existing, entry, {favorite: existing.favorite});
      else next.findings.push({...entry, id: crypto.randomUUID(), favorite: false});
      next.capture = {};
    });
    syncCaptureFields(); refreshFindings(); refreshPacket(); receiveSources(); toast('Finding saved.');
  };
  $('#clear-finding').onclick = () => {
    if (captureBusy() && !confirm('Clear this unfinished finding? Saved findings will stay.')) return;
    updateNotebook(next => { next.capture = {}; }); syncCaptureFields(); receiveSources();
  };
  for (const key of draftFields) {
    const input = $('#draft-' + key); input.value = state.draft[key] || '';
    input.oninput = () => { updateNotebook(next => { next.draft[key] = input.value; }); refreshPacket(); if (key === 'initial') refreshEmailPreview(); };
  }
  if (state.draft.body) $('.optional-revision').open = true;
  $('#copy-prompt').onclick = async () => {
    refreshPacket();
    try { await navigator.clipboard.writeText(promptPacket()); $('#prompt-status').textContent = 'Copied. Paste into your AI tool.'; }
    catch { $('#packet-details').open = true; $('#ai-packet').focus(); $('#ai-packet').select(); $('#prompt-status').textContent = 'Packet selected. Copy with Ctrl+C or Command+C.'; }
  };
  $('#highlight-email').onclick = () => {
    const input = $('#draft-initial'), start = input.selectionStart, end = input.selectionEnd;
    if (start === end) { $('#highlight-status').textContent = 'Select a phrase in the AI response first.'; input.focus(); return; }
    const selected = input.value.slice(start, end);
    const replacement = selected.startsWith('==') && selected.endsWith('==') ? selected.slice(2, -2) : '==' + selected + '==';
    input.setRangeText(replacement, start, end, 'select');
    updateNotebook(next => { next.draft.initial = input.value; }); refreshEmailPreview();
    $('#email-preview-details').open = true; $('#highlight-status').textContent = 'Highlight updated in the preview and final report.';
  };
  refreshPacket(); refreshEmailPreview(); receiveSources();
}
function report() {
  if (storageOK) state = loadNotebookState();
  const d = state.draft, selected = state.findings.filter(f => f.favorite);
  const text = (label, value) => `<h2>${esc(label)}</h2><p>${esc(value || 'Not entered.')}</p>`;
  main.innerHTML = `<h1>Finalize report</h1><p>Copy your work now, even if it is unfinished. Starred findings are included automatically as the evidence you used.</p><div class="toolbar"><button id="copy-report">Copy report</button><button id="select-report" class="secondary">Select report</button><a class="button secondary" href="#/notebook">Back to notebook</a></div><p id="copy-status" class="status" role="status"></p><article id="report" class="report"><h1>Professional OSINT · Recruitment phishing simulation</h1><p>MrQ Cyber · LinkedUP investigation</p>${text('Professional / recipient', d.target)}<h2>Evidence used</h2>${selected.map((f, i) => `<section><h3>${i + 1}. ${esc(f.about)}</h3><p>${esc(f.text)}</p>${f.context ? `<p><strong>Context:</strong> ${esc(f.context)}</p>` : ''}</section>`).join('') || '<p>No findings starred yet. Your research remains saved in the notebook.</p>'}${text('Connections and opportunity', d.angle)}${text('My AI prompt', d.prompt)}<h2>AI-generated email</h2><p><strong>Sender:</strong> ${esc(d.sender || 'Not entered.')}<br><strong>Subject:</strong> ${esc(d.subject || 'Not entered.')}</p><div class="email-preview report-email">${highlightedEmail(d.initial || 'No AI response added.')}</div><p><strong>Visible fake-link text:</strong> ${esc(d.linkText || 'Not entered.')}<br><strong>Actual fake-link destination:</strong> ${esc(d.linkUrl || 'Not entered.')}</p>${text('Analysis: how the email persuades', d.analysis)}${text('Reflection: what I would change or check', d.reflection)}${d.body ? text('Optional revised email', d.body) : ''}</article>`;
  const select = () => {
    const range = document.createRange(); range.selectNodeContents($('#report'));
    const selection = getSelection(); selection.removeAllRanges(); selection.addRange(range);
    $('#copy-status').textContent = 'Report selected. Copy with Ctrl+C or Command+C.';
  };
  $('#select-report').onclick = select;
  $('#copy-report').onclick = async () => {
    try {
      if (navigator.clipboard?.write && window.ClipboardItem) await navigator.clipboard.write([new ClipboardItem({'text/html': new Blob([$('#report').outerHTML], {type: 'text/html'}), 'text/plain': new Blob([$('#report').innerText], {type: 'text/plain'})})]);
      else await navigator.clipboard.writeText($('#report').innerText);
      $('#copy-status').textContent = 'Report copied.';
    } catch { select(); }
  };
}
function initNotebook() {
  addEventListener('storage', event => {
    if (event.key === NOTEBOOK_KEY) {
      state = loadNotebookState();
      if ($('#finding-form')) {
        syncCaptureFields(); refreshFindings(); refreshPacket();
        for (const key of draftFields) { const input = $('#draft-' + key); if (input && input !== document.activeElement) input.value = state.draft[key] || ''; }
        refreshEmailPreview(); renderSourceQueue();
      }
    } else if (event.key?.startsWith(SOURCE_PREFIX)) receiveSources();
  });
  addEventListener('pagehide', releaseNotebook);
  addEventListener('pageshow', () => { syncNotebookRole(); receiveSources(); });
  document.querySelectorAll('[data-open-notebook]').forEach(button => button.onclick = openNotebookTab);
}
