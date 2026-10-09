'use strict';
(() => {
  const A = window.CAMPAIGN_ACTIVITY, C = window.CampaignPlayerCore;
  const questionPanel = document.getElementById('question-panel'), toolbar = document.getElementById('workspace-toolbar'), content = document.getElementById('workspace-content');
  if (!A || !C) { questionPanel.textContent = 'The activity could not load. Keep all player files together and reopen the guide.'; return; }
  let state = C.createState(A), storedSnapshot = null, storageBlocked = false, currentId = null, currentPage = null, mode = 'browser', reportSection = 'attacker';
  let editor = null, frame = null, lastRun = null, selectedCitations = [], pageHistory = [], bannerMessage = '';
  const queryRuns = new Map();
  let refreshQueryHistory = null;
  let cloudSession = null, stateEpoch = 0, suppressSave = false;
  let browserLocation = null, browserBack = null, browserPicker = null, awaitingSourceLocation = false, recordLocation = null;
  let sourceLoadTimer = null, sourceLoadStatus = null;
  let captureSummary, captureTime, captureSection, captureEvidence, captureStatus;
  const saveStatus = document.getElementById('save-status');
  const labUrl = document.body.getAttribute?.('data-lab-url') || '../index.html';
  const labAddress = (() => { try { return new URL(labUrl, location.href); } catch (_) { return null; } })();
  const labOrigin = labAddress?.origin || location.origin || 'null';
  const labProtocol = labAddress?.protocol || location.protocol;
  try { storedSnapshot = localStorage.getItem(C.STORAGE_KEY); if (storedSnapshot) state = C.restore(A, storedSnapshot); }
  catch (_) { storageBlocked = true; saveStatus.textContent = 'Saved data could not be read. Export this session before leaving.'; }
  if (state.findings.some(f => f.autoTimeline)) reportSection = 'timeline';
  function node(tag, attrs = {}, children = []) {
    const item = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
      if (value == null || value === false) continue;
      if (key === 'text') item.textContent = String(value);
      else if (key.startsWith('on')) item.addEventListener(key.slice(2), value);
      else if (['checked', 'disabled', 'hidden'].includes(key)) item[key] = Boolean(value);
      else item.setAttribute(key, String(value));
    }
    for (const child of Array.isArray(children) ? children : [children]) if (child != null) item.append(typeof child === 'string' ? document.createTextNode(child) : child);
    return item;
  }
  const p = (text, cls = '') => node('p', { text, class: cls });
  const button = (text, onclick, cls = '', disabled = false) => node('button', { type: 'button', text, onclick, class: cls, disabled });
  const field = (label, input, help) => node('label', { class: 'field' }, [node('span', { text: label }), input, help ? p(help, 'helper') : null]);
  function announce(message) { document.getElementById('announcement').textContent = message; }
  function clearSourceLoadTimer() {
    if (sourceLoadTimer !== null) window.clearTimeout?.(sourceLoadTimer);
    sourceLoadTimer = null;
  }
  function sourceLoadFailed(target) {
    if (target !== frame || mode !== 'browser' || !awaitingSourceLocation || !sourceLoadStatus) return;
    clearSourceLoadTimer(); sourceLoadStatus.hidden = false;
  }
  function sendSourceScope(target = frame) {
    if (!target || target !== frame || mode !== 'browser' || !browserLocation) return;
    try { target.contentWindow.postMessage({ type: 'campaign-source-open', pageId: currentPage, route: browserLocation.route, allowedArtifactIds: C.scopedCase(A, state, currentId).artifacts.map(a => a.id) }, labProtocol === 'file:' || labOrigin === 'null' ? '*' : labOrigin); }
    catch (_) { sourceLoadFailed(target); }
  }
  function save() {
    if (suppressSave) return true;
    if (cloudSession?.isAccountActive()) {
      const kept = cloudSession.save(state);
      saveStatus.textContent = kept ? 'Account work cached in this browser' : 'Account work is open here · check online save status';
      return kept;
    }
    if (storageBlocked) { saveStatus.textContent = 'Unsaved work is kept here. Download a progress backup.'; return false; }
    try {
      const current = localStorage.getItem(C.STORAGE_KEY);
      if (current !== storedSnapshot) { storageBlocked = true; saveStatus.textContent = 'Another tab saved newer work. Export this tab before reloading.'; return false; }
      const serialized = JSON.stringify(state);
      if (new TextEncoder().encode(serialized).byteLength > C.MAX_BYTES) throw new Error('Backup limit');
      localStorage.setItem(C.STORAGE_KEY, serialized); storedSnapshot = serialized; saveStatus.textContent = 'Saved in this browser'; return true;
    } catch (_) { saveStatus.textContent = 'Browser storage is full or unavailable. Download a progress backup.'; return false; }
  }
  function current() { return C.locate(A, currentId); }
  function prepareSessionState(raw, options = {}) {
    const next = raw == null ? C.createState(A) : C.restore(A, raw, options.preserveCurrentHints ? state : undefined);
    if (options.preserveCurrentHints && cloudSession?.isAccountActive() && new TextEncoder().encode(JSON.stringify(next)).byteLength > (window.CampaignCloudSync?.MAX_BYTES || 8 * 1024 * 1024)) {
      throw new Error('This backup exceeds the 8 MiB online-save limit. The current account work has not been replaced.');
    }
    return next;
  }
  function replaceSessionState(raw, options = {}) {
    // Account changes must never inherit another account's answers or hint use.
    // An explicit backup/practice import may retain this account's used hints.
    const next = prepareSessionState(raw, options);
    stateEpoch++;
    clearSourceLoadTimer();
    if (editor) { editor.destroy(); editor = null; }
    frame = null; sourceLoadStatus = null; lastRun = null; currentId = null;
    queryRuns.clear(); refreshQueryHistory = null; selectedCitations = []; pageHistory = [];
    captureSummary = captureTime = captureSection = captureEvidence = captureStatus = null;
    browserLocation = browserBack = browserPicker = recordLocation = null; awaitingSourceLocation = false;
    bannerMessage = '';
    state = next;
    reportSection = state.findings.some(f => f.autoTimeline) ? 'timeline' : 'attacker';
    history.replaceState(null, '', '#/' + state.trackId + '/' + state.activeQuestion[state.trackId]);
    suppressSave = true;
    try { route(); } finally { suppressSave = false; }
    saveStatus.textContent = cloudSession?.isAccountActive() ? 'Account work open in this browser' : 'Practice work kept separately in this browser';
  }
  function ownFindings(trackId = state.trackId) { return state.findings.filter(f => C.locate(A, f.questionId)?.track.id === trackId); }
  function availablePages() { return A.pages.filter(page => C.pageAvailable(A, state, currentId, page.id)); }
  function channels(id) {
    const declared = A.caseData.discoveryChannels?.[id];
    if (Array.isArray(declared)) return declared;
    const artifact = A.caseData.artifacts.find(a => a.id === id);
    const visibility = A.caseData.artifactVisibility?.[id] || artifact?.visibility;
    if (visibility) return [visibility === 'public' ? 'compass' : 'data'];
    return [A.pages.some(page => page.public && page.artifactIds.includes(id)) ? 'compass' : 'data'];
  }
  function compassPage(page) { return Boolean(page?.artifactIds.length && page.artifactIds.every(id => channels(id).includes('compass'))); }
  function browserPages() { return availablePages().filter(compassPage); }
  function dataArtifacts() { return C.scopedCase(A, state, currentId).artifacts.filter(a => channels(a.id).includes('data')); }
  function questionMode() { return current().question.workspace.mode === 'browser' && !compassPage(A.pages.find(page => page.id === questionPage())) ? 'records' : current().question.workspace.mode; }
  function questionPage() {
    const pages = availablePages(), q = current().question;
    return pages.find(page => page.id === q.workspace.pageId)?.id || (q.workspace.tableName && pages.find(page => page.artifactIds.includes(tablesSource(q.workspace.tableName)))?.id) || pages[0]?.id;
  }
  function pageLocation(pageId) {
    const page = browserPages().find(item => item.id === pageId);
    return page ? { pageId, route: '#/campaign-case/' + encodeURIComponent(pageId), artifactIds: [...page.artifactIds] } : null;
  }
  function validSourceLocation(route, artifactIds) {
    if (typeof route !== 'string' || route.length > 2000 || !/^#\/[a-z0-9-]+(?:\/[a-z0-9_-]+)?(?:\?[^#]*)?$/i.test(route) || !Array.isArray(artifactIds)) return false;
    const [, view, id] = route.slice(1).split('?')[0].split('/');
    if (['notebook', 'report', 'investigations', 'brief'].includes(view)) return false;
    const allowed = new Set(C.scopedCase(A, state, currentId).artifacts.filter(a => channels(a.id).includes('compass')).map(a => a.id));
    if (artifactIds.some(id => typeof id !== 'string' || !allowed.has(id))) return false;
    if (view === 'campaign-case') {
      const required = id?.startsWith('source-') ? [id.slice(7)] : A.pages.find(page => page.id === id)?.artifactIds;
      return Boolean(required?.length && required.every(source => allowed.has(source) && artifactIds.includes(source)));
    }
    if (['campaign', 'campaign2'].includes(view)) return allowed.has(id) && artifactIds.includes(id);
    if (['profile', 'post'].includes(view) && id?.startsWith('campaign-')) return artifactIds.length > 0;
    return true;
  }
  function updateBrowserControls() {
    if (browserBack) browserBack.disabled = !pageHistory.length;
    if (browserPicker) browserPicker.value = currentPage;
    if (browserLocation) document.getElementById('open-native-source')?.setAttribute('href', labUrl + browserLocation.route);
  }
  function rememberLocation(next, remember = true) {
    if (!next || !C.pageAvailable(A, state, currentId, next.pageId) || !validSourceLocation(next.route, next.artifactIds)) return false;
    if (remember && browserLocation && browserLocation.route !== next.route) { pageHistory.push(browserLocation); if (pageHistory.length > 100) pageHistory.shift(); }
    browserLocation = { ...next, artifactIds: [...next.artifactIds] }; currentPage = next.pageId; updateBrowserControls(); return true;
  }
  function openPage(pageId, reset = false) {
    const page = availablePages().find(item => item.id === pageId); if (!page) return;
    if (!compassPage(page)) { recordLocation = { pageId }; mode = 'records'; renderWorkspace(); return; }
    const next = pageLocation(pageId); if (!next) return;
    if (reset) pageHistory = [];
    rememberLocation(next, !reset); mode = 'browser'; renderWorkspace();
  }
  function progress() {
    const track = current().track, list = C.questions(A, track.id), complete = C.frontier(A, state, track.id);
    document.getElementById('progress-status').textContent = `${track.label} · ${complete}/${list.length} checked · ${C.score(A, state, track.id)}/${list.length * A.scoring.pointsPerQuestion} points`;
    document.getElementById('finding-count').textContent = state.findings.filter(f => C.locate(A, f.questionId)?.track.id === track.id).length;
  }
  function go(id) {
    const f = C.locate(A, id); if (!f || !C.canAccess(A, state, id)) { announce('Finish the earlier questions first.'); return; }
    state.trackId = f.track.id; state.activeQuestion[f.track.id] = id; save();
    const nextHash = '#/' + f.track.id + '/' + id;
    if (location.hash === nextHash) route(); else location.hash = nextHash;
  }
  function route() {
    let parts;
    try { parts = location.hash.replace(/^#\/?/, '').split('/').map(decodeURIComponent); } catch (_) { parts = []; }
    const track = A.tracks.find(t => t.id === parts[0]) || A.tracks.find(t => t.id === state.trackId) || A.tracks[0];
    const list = C.questions(A, track.id), edge = C.frontier(A, state, track.id);
    let desired = parts[1] || state.activeQuestion[track.id] || list[Math.min(edge, list.length - 1)].id;
    if (C.locate(A, desired)?.track.id !== track.id || !C.canAccess(A, state, desired)) {
      desired = list[Math.min(edge, list.length - 1)].id; bannerMessage = 'Finish the current question to unlock the next step.';
      history.replaceState(null, '', '#/' + track.id + '/' + desired);
    }
    currentId = desired; state.trackId = track.id; state.activeQuestion[track.id] = desired;
    mode = questionMode(); recordLocation = mode === 'records' ? { pageId: questionPage() } : null;
    browserLocation = pageLocation(questionPage()) || pageLocation(browserPages()[0]?.id); currentPage = browserLocation?.pageId;
    pageHistory = []; selectedCitations = []; lastRun = null; save(); renderQuestion(); renderWorkspace(); progress(); questionPanel.focus({ preventScroll: true });
  }
  function renderQuestion() {
    const { question: q, track, section, index } = current(), r = C.response(state, q.id), list = C.questions(A, track.id);
    document.getElementById('track-switch').replaceChildren(...A.tracks.map(t => node('button', { type: 'button', class: 'track-button', 'aria-pressed': t.id === track.id, text: t.label.split(' · ')[0], onclick: () => { const qs = C.questions(A, t.id); const id = state.activeQuestion[t.id] || qs[Math.min(C.frontier(A, state, t.id), qs.length - 1)].id; go(C.canAccess(A, state, id) ? id : qs[Math.min(C.frontier(A, state, t.id), qs.length - 1)].id); } })));
    const sectionPicker = node('select', { class: 'section-select', 'aria-label': 'Investigation section' });
    for (const s of track.sections) sectionPicker.append(node('option', { value: s.id, text: s.title, disabled: !C.canAccess(A, state, s.questions[0].id) }));
    sectionPicker.value = section.id; sectionPicker.addEventListener('change', () => go(track.sections.find(s => s.id === sectionPicker.value).questions[0].id));
    const within = section.questions.findIndex(item => item.id === q.id);
    questionPanel.replaceChildren(p('Your investigation', 'eyebrow'), sectionPicker, node('div', { class: 'question-progress' }, [node('progress', { max: list.length, value: C.frontier(A, state, track.id), 'aria-label': 'Completed questions' }), node('p', {}, [node('span', { text: `Question ${within + 1} of ${section.questions.length}` }), node('span', { text: `${Math.max(0, A.scoring.pointsPerQuestion - r.hints.length * A.scoring.hintCost)} points available` })])]), node('h1', { text: q.title }), p(q.prompt, 'question-prompt'));
    if (index === 0 && !ownFindings(track.id).length) questionPanel.append(p('Checked responses about dated events build your attack timeline automatically. Review and improve those descriptions in the report. Use “Add a finding to your report” for other evidence you want to keep.', 'report-guidance'));
    if (q.timelineEvents?.length) questionPanel.append(p('Checking this response adds the relevant dated event to your attack timeline using your response. You can improve the description in the report.', 'timeline-guidance'));
    if (bannerMessage) { questionPanel.append(p(bannerMessage, 'success-callout')); bannerMessage = ''; }
    const form = node('form', { class: 'answer-form' });
    const feedback = node('p', { class: 'feedback', role: 'status', 'aria-live': 'polite' });
    const answerChanged = value => {
      C.setAnswer(A, state, q.id, value); save();
      feedback.textContent = C.isComplete(A, state, q.id) ? 'This response is still checked.' : r.submittedAnswer !== null ? 'This answer changed. Check it again to reopen later questions. Your later answers and findings are retained.' : 'Submit to check this response.';
      progress(); refreshLocks();
    };
    if (q.type === 'choice') {
      const set = node('fieldset', { style: 'border:0;padding:0;margin:0' }, node('legend', { class: 'sr-only', text: 'Choose a response' }));
      for (const option of q.options) { const input = node('input', { type: 'radio', name: 'answer', value: option.id, checked: r.answer === option.id, onchange: () => answerChanged(option.id) }); set.append(node('label', { class: 'choice' }, [input, node('span', { text: option.text })])); }
      form.append(set);
    } else {
      const input = node(q.type === 'fill' ? 'input' : 'textarea', { type: q.type === 'fill' ? 'text' : null, rows: q.type === 'fill' ? null : '5', maxlength: '12000', autocomplete: 'off', spellcheck: 'true', 'aria-label': q.type === 'fill' ? 'Answer' : 'Your explanation' });
      input.value = r.answer; input.addEventListener('input', () => answerChanged(input.value));
      form.append(field(q.type === 'fill' ? 'Fill in the detail' : 'Explain what you found', input, q.type === 'short' ? 'Write a complete explanation. The tool checks key ideas; your teacher reviews the reasoning.' : 'Capitalization and spacing do not matter.'));
    }
    const submitButton = node('button', { type: 'submit', class: 'submit-answer', text: index === list.length - 1 ? 'Check response & review report' : 'Check response & continue' });
    form.append(feedback, submitButton);
    form.addEventListener('submit', event => {
      event.preventDefault(); const checked = C.validateAnswer(q, C.response(state, q.id).answer);
      feedback.className = 'feedback' + (checked.ok ? '' : ' error'); feedback.textContent = checked.message;
      if (!checked.ok) { announce(checked.message); return; }
      if (captureSummary?.value.trim() && !saveCapture()) { feedback.className = 'feedback error'; feedback.textContent = 'Your answer is ready. Fix the highlighted finding source below, then check the response again.'; refreshLocks(); progress(); return; }
      const submitted = C.submit(A, state, q.id);
      if (!submitted.ok) { feedback.className = 'feedback error'; feedback.textContent = submitted.message; announce(submitted.message); return; }
      const timelineFeedback = submitted.timelineAdded ? ` ${submitted.timelineAdded} dated ${submitted.timelineAdded === 1 ? 'event added' : 'events added'} to your attack timeline.` : submitted.timelineUpdated ? ' Your attack timeline entry has been updated; report edits are preserved.' : '';
      if (submitted.timelineAdded || submitted.timelineUpdated) reportSection = 'timeline';
      save(); announce(checked.message + timelineFeedback); bannerMessage = checked.message + timelineFeedback;
      if (submitted.nextId) go(submitted.nextId); else { progress(); refreshLocks(); mode = 'report'; reportSection = 'timeline'; renderWorkspace(); feedback.textContent = ownFindings().length ? 'Questions complete. Review your timeline descriptions, selected findings and section notes, then export them for your presentation.' : 'Questions complete. There are no saved findings yet. Select useful evidence for your report before preparing your presentation.'; announce(feedback.textContent); }
    });
    questionPanel.append(form);
    const hints = node('section', { class: 'hint-box', 'aria-label': 'Progressive hints' });
    function paintHints() {
      hints.replaceChildren(p('Need a nudge?', 'eyebrow'), p(`Each new hint costs ${A.scoring.hintCost} points on this question. Retrying is free.`, 'helper'));
      r.hints.forEach((id, i) => hints.append(p(q.hints[i], 'hint')));
      if (r.hints.length < q.hints.length) hints.append(button(`Reveal hint ${r.hints.length + 1} (−${A.scoring.hintCost} points)`, () => { C.revealHint(A, state, q.id, r.hints.length); save(); paintHints(); progress(); const count = questionPanel.querySelector('.question-progress p span:last-child'); if (count) count.textContent = Math.max(0, A.scoring.pointsPerQuestion - r.hints.length * A.scoring.hintCost) + ' points available'; }));
    }
    paintHints(); questionPanel.append(hints, buildCapture(q));
    const earlier = node('select', { id: 'revisit-question', 'aria-label': 'Revisit an available question', class: 'section-select' });
    for (const item of list) earlier.append(node('option', { value: item.id, text: item.id + ' · ' + item.title, disabled: !C.canAccess(A, state, item.id) }));
    earlier.value = q.id; earlier.addEventListener('change', () => go(earlier.value));
    const nextButton = button('Next →', () => go(list[index + 1].id), '', index === list.length - 1 || !C.isComplete(A, state, q.id)); nextButton.id = 'next-question';
    questionPanel.append(node('div', { class: 'question-nav' }, [button('← Previous', () => go(list[index - 1].id), '', index === 0), nextButton]), field('Revisit a question', earlier));
    questionPanel.scrollTop = 0;
  }
  function refreshLocks() {
    const { track, question, index } = current(), list = C.questions(A, track.id);
    const next = document.getElementById('next-question'); if (next) next.disabled = index === list.length - 1 || !C.isComplete(A, state, question.id);
    const picker = document.getElementById('revisit-question'); if (picker) for (const option of picker.options) option.disabled = !C.canAccess(A, state, option.value);
    const sectionPicker = questionPanel.querySelector('.section-select'); if (sectionPicker) for (const option of sectionPicker.options) option.disabled = !C.canAccess(A, state, track.sections.find(s => s.id === option.value).questions[0].id);
  }
  function buildCapture(q) {
    const draft = C.response(state, q.id).capture ||= { summary: '', timestamp: '', evidenceText: '', section: '', certainty: 'Observed' };
    captureSummary = node('textarea', { rows: '3', maxlength: '12000', placeholder: 'A finding in your own words…' });
    captureSection = node('select', {}, C.SECTIONS.map(id => node('option', { value: id, text: C.labels[id] }))); captureSection.value = draft.section || q.report?.section || 'attacker';
    captureTime = node('input', { type: 'text', maxlength: '100', placeholder: 'e.g. 2026-10-25 08:10 UTC' });
    captureEvidence = node('input', { type: 'text', maxlength: '3000', placeholder: 'Source or record IDs, separated by commas' });
    captureSummary.value = draft.summary; captureTime.value = draft.timestamp; captureEvidence.value = draft.evidenceText;
    for (const control of [captureSummary, captureTime, captureEvidence, captureSection]) control.addEventListener('input', saveCaptureDraft);
    captureStatus = node('p', { class: 'feedback', role: 'status', tabindex: '-1' });
    const detail = node('details', { class: 'report-capture' }, [node('summary', { text: 'Add a finding to your report' }), p(q.report?.prompt || 'Keep the evidence you will want in your final presentation.', 'helper'), p(q.timelineEvents?.length ? 'This response already creates the dated timeline entry when checked. Use this space for an additional finding, such as an attacker profile detail or mitigation.' : 'Choose useful evidence and explain it here. Saving an additional finding is separate from checking your answer.', 'helper'), field('Report section', captureSection), field('Finding', captureSummary), field('Event time (for timeline entries)', captureTime), field('Sources', captureEvidence, 'Use “Use this source” in the right pane, or enter a record ID.'), button('Save finding', saveCapture), captureStatus]);
    return detail;
  }
  function saveCaptureDraft() {
    Object.assign(C.response(state, currentId).capture, { summary: captureSummary.value, timestamp: captureTime.value, evidenceText: captureEvidence.value, section: captureSection.value }); save();
  }
  function saveCapture() {
    try {
      const evidenceIds = C.normalizeCitationIds({ caseData: C.scopedCase(A, state, currentId) }, captureEvidence.value.split(/[,;\n]/).map(x => x.trim()).filter(Boolean));
      C.addFinding(A, state, { questionId: currentId, section: captureSection.value, summary: captureSummary.value, timestamp: captureTime.value, evidenceIds });
      captureEvidence.value = evidenceIds.join(', '); captureSummary.value = ''; captureTime.value = ''; saveCaptureDraft(); captureStatus.className = 'feedback'; captureStatus.setAttribute('role', 'status'); captureStatus.textContent = 'Finding added. You can revise and regroup it in your report.'; save(); progress(); return true;
    } catch (error) { captureStatus.className = 'feedback error'; captureStatus.setAttribute('role', 'alert'); captureStatus.textContent = error.message; captureSummary.closest('details').open = true; captureStatus.focus(); captureStatus.scrollIntoView?.({ block: 'nearest' }); announce(error.message); return false; }
  }
  function cite(id) {
    const ids = C.citationIds({ caseData: C.scopedCase(A, state, currentId) }); if (!ids.has(id)) return;
    selectedCitations = [...new Set([...captureEvidence.value.split(/[,;\n]/).map(x => x.trim()).filter(Boolean), id])];
    captureEvidence.value = selectedCitations.join(', '); saveCaptureDraft(); captureStatus.textContent = 'Source selected. Add a finding in your own words.'; captureSummary.closest('details').open = true; announce('Source ' + id + ' selected for your report finding.');
  }
  function sourcePage(artifactId, originatingQuestionId) {
    if (!C.scopedCase(A, state, currentId).artifacts.some(a => a.id === artifactId)) {
      const origin = C.locate(A, originatingQuestionId);
      if (!origin || !C.canAccess(A, state, originatingQuestionId) || !origin.section.availableArtifactIds.includes(artifactId)) { announce('Recheck the earlier response to reopen this finding’s question and sources. Your saved finding is retained.'); return false; }
      history.replaceState(null, '', '#/' + origin.track.id + '/' + originatingQuestionId); route();
    }
    if (channels(artifactId).includes('data')) { recordLocation = { artifactId }; mode = 'records'; renderWorkspace(); return; }
    const page = browserPages().find(p => p.artifactIds.includes(artifactId));
    if (page) openPage(page.id);
  }
  function renderRecords() {
    const scoped = C.scopedCase(A, state, currentId), artifacts = dataArtifacts();
    const packets = availablePages().filter(page => !compassPage(page));
    const picker = node('select', { 'aria-label': 'Provided records and documents', class: 'toolbar-right' }, [
      ...packets.map(page => node('option', { value: 'page:' + page.id, text: page.title + ' · collection' })),
      ...artifacts.map(a => node('option', { value: 'source:' + a.id, text: a.id + ' · ' + (a.title || 'Provided record') }))
    ]);
    const validPage = packets.find(page => page.id === recordLocation?.pageId);
    const validArtifact = artifacts.find(a => a.id === recordLocation?.artifactId);
    if (!validPage && !validArtifact) recordLocation = packets.length ? { pageId: packets[0].id } : artifacts.length ? { artifactId: artifacts[0].id } : null;
    toolbar.append(node('strong', { text: 'Provided records' }), picker, button('Question source', () => openPage(questionPage(), true)));
    if (!recordLocation) { content.append(p('No provided records are available in this section.', 'helper')); return; }
    picker.value = recordLocation.artifactId ? 'source:' + recordLocation.artifactId : 'page:' + recordLocation.pageId;
    picker.addEventListener('change', () => { const value = picker.value; if (value.startsWith('source:')) sourcePage(value.slice(7)); else if (value.startsWith('page:')) openPage(value.slice(5)); });
    let pageId = recordLocation.pageId, pages = availablePages().map(page => ({ ...page, public: compassPage(page) }));
    if (recordLocation.artifactId) {
      const artifact = artifacts.find(a => a.id === recordLocation.artifactId);
      pageId = 'record-' + artifact.id;
      pages = [...pages, { id: pageId, title: artifact.title || artifact.id, site: 'Case Data Explorer', public: false, artifactIds: [artifact.id] }];
    }
    const host = node('div', { class: 'provided-records' });
    content.append(p('These records were supplied for the investigation. Explore them here or query their tables in KQL.', 'records-notice'), host);
    if (!window.CampaignSources?.render) { host.append(p('The provided-record viewer could not load. Keep sources.js with the player files.', 'helper')); return; }
    window.CampaignSources.render(host, { activity: { ...A, pages, caseData: scoped }, pageId, allowedArtifactIds: scoped.artifacts.map(a => a.id), assetBase: 'images/', onNavigate: openPage, onCite: cite });
  }
  function renderWorkspace() {
    refreshQueryHistory = null;
    clearSourceLoadTimer(); sourceLoadStatus = null;
    if (editor) { editor.destroy(); editor = null; } frame = null; browserBack = null; browserPicker = null; lastRun = null;
    content.replaceChildren(); toolbar.replaceChildren();
    const { question: q } = current();
    toolbar.append(button('Browser', () => { mode = 'browser'; renderWorkspace(); }), button('KQL', () => { mode = 'query'; renderWorkspace(); }), button('Records', () => { mode = 'records'; renderWorkspace(); }), button('Report', () => { mode = 'report'; renderWorkspace(); }), button('Terms', () => { mode = 'terms'; renderWorkspace(); }));
    if (mode === 'terms') {
      const host = node('div', { class: 'report-view' }, [node('h2', { text: 'Investigation terms' }), p('Use this reference at any time. General vocabulary help does not cost points.', 'helper')]);
      const search = node('input', { type: 'search', placeholder: 'Find a term…', 'aria-label': 'Search investigation terms' }), list = node('div');
      function updateTerms() { const term = search.value.toLowerCase(); list.replaceChildren(...(A.glossary || []).filter(item => (item.term + ' ' + item.definition).toLowerCase().includes(term)).map(item => node('article', { class: 'report-card' }, [node('strong', { text: item.term }), p(item.definition)]))); }
      search.addEventListener('input', updateTerms); host.append(field('Search terms', search), list); updateTerms();
      host.append(node('details', { class: 'report-card' }, [node('summary', { text: 'Commands available in the query workspace' }), p('This local practice editor supports where, project, take / limit, order / sort by, count, distinct, and summarize count(). Use quoted text, whole numbers, or datetime(...) for values. It supports comparisons, contains / has, and / or, and comments beginning //. Other ADX commands are outside this practice dataset.'), p('Enter adds a new line. Ctrl+Space opens suggestions; arrow keys choose one and Tab inserts it. Escape closes the list. Ctrl+Enter runs the query.'), node('a', { href: 'https://learn.microsoft.com/en-us/azure/data-explorer/web-ui-kql', target: '_blank', rel: 'noopener', text: 'Microsoft’s ADX editor reference ↗' })]));
      content.append(host); return;
    }
    if (mode === 'report') { toolbar.append(node('strong', { text: 'Build your incident response report', class: 'toolbar-right' })); renderReport(); return; }
    if (mode === 'records') { renderRecords(); return; }
    if (mode === 'query') {
      toolbar.append(node('strong', { text: 'Case Data Explorer', class: 'toolbar-right' }));
      const keep = button('Keep query evidence', () => keepQuery(), '', true); keep.id = 'keep-query'; toolbar.append(keep);
      const host = node('div', { class: 'query-host' }); content.append(host);
      const scoped = C.scopedCase(A, state, currentId), tables = window.CampaignQuery.getTables(scoped), tableName = q.workspace.tableName || Object.keys(tables)[0];
      const r = C.response(state, currentId), trackId = current().track.id;
      const questionId = currentId, cached = queryRuns.get(questionId), queryEpoch = stateEpoch;
      const starter = q.workspace.starterQuery || tableName + '\n| take 5';
      let initialQuery = r.queryEdited || r.query ? r.query : starter, continuedFrom = null;
      if (!r.queryEdited && !r.query) {
        const prior = C.questions(A, trackId).slice(0, current().index).reverse().find(item => C.canAccess(A, state, item.id) && state.responses[item.id]?.query?.trim() && queryTable(state.responses[item.id].query) === tableName);
        if (prior) { initialQuery = state.responses[prior.id].query; r.query = initialQuery; r.queryEdited = true; continuedFrom = prior.id; save(); }
      }
      const note = p(continuedFrom ? `Continued your query from ${continuedFrom}. Run it to refresh the results for this question.` : 'Query drafts stay with their questions. Successful runs save automatically in Query history; choose which evidence belongs in your report.', 'query-save-note');
      note.setAttribute('role', 'status');
      const historySummary = node('summary'), historyBody = node('div', { class: 'query-history-list' }), history = node('details', { class: 'query-history' }, [historySummary, historyBody]);
      const editorHost = node('div', { class: 'query-editor-host' });
      function useQuery(query) {
        if (!tables[queryTable(query)]) return;
        editor.setValue(query); r.query = query; r.queryEdited = true; lastRun = null; queryRuns.delete(questionId);
        keep.disabled = true; keep.textContent = 'Keep query evidence'; save();
        note.textContent = 'Query loaded into this question. Run it to update the results. The original saved query remains in history.';
        paintHistory(); editor.focus();
      }
      function paintHistory() {
        const runs = C.queryHistory(A, state, trackId);
        const drafts = C.questions(A, trackId).filter(item => item.id !== questionId && C.canAccess(A, state, item.id) && state.responses[item.id]?.query?.trim() && !runs.some(run => run.questionId === item.id && run.queryReceipt.query === state.responses[item.id].query));
        historySummary.textContent = `Query history · ${runs.length} saved runs · ${drafts.length} earlier drafts`;
        historyBody.replaceChildren(p('Recent successful runs and their result values save with your progress backup. History does not add findings to your report automatically.', 'helper'));
        if (!runs.length && !drafts.length) historyBody.append(p('Run a query to start the history. Earlier query drafts will also appear here.', 'helper'));
        for (const entry of runs) {
          const receipt = entry.queryReceipt, inReport = queryInReport(entry.questionId, receipt), available = Boolean(tables[receipt.tableName]);
          const card = node('article', { class: 'query-history-card' }, [node('strong', { text: entry.questionId + ' · ' + receipt.tableName }), p(`${receipt.ranAt} · ${receipt.rowCount} result ${receipt.rowCount === 1 ? 'row' : 'rows'}`, 'helper'), node('pre', { class: 'query-history-code', text: receipt.query })]);
          if (receipt.resultSnapshot) card.append(node('details', {}, [node('summary', { text: 'Saved result values' }), node('pre', { class: 'query-history-result', text: snapshotText(receipt.resultSnapshot) }), receipt.resultSnapshot.truncated ? p('This saved result is shortened. Reuse and run the query to inspect all rows.', 'helper') : null]));
          card.append(button('Use this query', () => useQuery(receipt.query), '', !available), button(inReport ? 'In report' : 'Keep in report', () => { keepQueryReceipt(entry.questionId, receipt); paintHistory(); }, '', inReport));
          if (!available) card.append(p('To rerun this query, revisit its question where this table is available.', 'helper'));
          historyBody.append(card);
        }
        for (const item of drafts) {
          const query = state.responses[item.id].query;
          historyBody.append(node('article', { class: 'query-history-draft' }, [node('strong', { text: item.id + ' · Saved draft' }), node('pre', { class: 'query-history-code', text: query }), p('Run this draft to produce a saved result.', 'helper'), button('Use this query', () => useQuery(query), '', !tables[queryTable(query)])]));
        }
      }
      toolbar.append(button('Question starter', () => { useQuery(starter); note.textContent = 'Question starter loaded. Earlier runs remain in Query history.'; }));
      host.append(note, history, editorHost); refreshQueryHistory = paintHistory;
      editor = window.CampaignPlayerEditor.mount(editorHost, { caseData: scoped, initialQuery, initialRun: cached?.run, compact: true,
        onDraftChange: query => {
          if (currentId !== questionId || queryEpoch !== stateEpoch) return;
          r.query = query; r.queryEdited = true; lastRun = null; queryRuns.delete(questionId); keep.disabled = true; keep.textContent = 'Keep query evidence';
          note.textContent = save() ? 'Query draft saved with this question. Run it to save the result in Query history.' : 'Query draft is kept in this session. Download a progress backup to preserve it.';
        },
        onRun: run => {
          if (currentId !== questionId || queryEpoch !== stateEpoch) return;
          r.query = run.query; r.queryEdited = true; lastRun = run; queryRuns.set(questionId, { run, kept: false }); keep.disabled = false; keep.textContent = 'Keep query evidence';
          try {
            C.recordQueryRun(A, state, questionId, receiptFromRun(run, questionId));
            note.textContent = save() ? 'Query and result saved in Query history. Use Keep query evidence only when you want this result in your report.' : 'Query and result are kept in this session. Download a progress backup to preserve them.';
          } catch (error) { save(); note.textContent = 'The query ran, but its history entry could not be saved. ' + error.message; }
          paintHistory();
        }, onSource: sourcePage, onDocument: sourcePage });
      lastRun = editor.getRestoredRun?.() || null;
      if (lastRun) { keep.disabled = Boolean(cached?.kept); keep.textContent = cached?.kept ? 'Query evidence kept' : 'Keep query evidence'; }
      else if (cached) queryRuns.delete(questionId);
      paintHistory();
      return;
    }
    const pages = browserPages();
    if (!browserLocation || !C.pageAvailable(A, state, currentId, browserLocation.pageId) || !validSourceLocation(browserLocation.route, browserLocation.artifactIds)) { browserLocation = pageLocation(questionPage()) || pageLocation(pages[0]?.id); currentPage = browserLocation?.pageId; pageHistory = []; }
    if (!browserLocation) { content.append(p('No public source pages are available in this collection. Use Records for the supplied investigation evidence.', 'helper')); return; }
    const picker = node('select', { 'aria-label': 'Available case pages', class: 'toolbar-right' }, pages.map(page => node('option', { value: page.id, text: page.title })));
    picker.value = currentPage; picker.addEventListener('change', () => openPage(picker.value)); browserPicker = picker;
    browserBack = button('←', () => { let previous; while ((previous = pageHistory.pop())) { if (rememberLocation(previous, false)) { renderWorkspace(); return; } } updateBrowserControls(); }, '', !pageHistory.length);
    browserBack.setAttribute('aria-label', 'Back in source browser');
    toolbar.append(browserBack, picker, button('Question source', () => openPage(questionPage(), true)));
    const page = pages.find(p => p.id === currentPage);
    toolbar.append(node('a', { id: 'open-native-source', href: labUrl + browserLocation.route, target: '_blank', rel: 'noopener', text: 'Open in lab ↗' }));
    awaitingSourceLocation = true;
    frame = node('iframe', { class: 'source-frame', title: page?.title || 'Relevant investigation source', src: labUrl + '?campaignEmbed=1' + browserLocation.route, sandbox: 'allow-scripts allow-same-origin allow-popups allow-forms' });
    const openingFrame = frame;
    // The child ready message can be missed or use a file-origin serialization
    // different from URL.origin. Loading the known frame is a second startup path.
    frame.addEventListener('load', () => { if (awaitingSourceLocation) sendSourceScope(openingFrame); });
    frame.addEventListener('error', () => sourceLoadFailed(openingFrame));
    sourceLoadStatus = node('div', { id: 'source-load-status', class: 'source-load-status', role: 'alert', hidden: true }, [p('The source browser has not connected. Your work remains in this activity. Try opening the source again.'), button('Retry source', () => renderWorkspace()), node('a', { href: labUrl + browserLocation.route, target: '_blank', rel: 'noopener', text: 'Open source in a separate tab ↗' })]);
    content.append(sourceLoadStatus, frame);
    sourceLoadTimer = window.setTimeout?.(() => sourceLoadFailed(openingFrame), 8000) ?? null;
  }
  function tablesSource(name) { return window.CampaignQuery.getTables(C.scopedCase(A, state, currentId))[name]?.artifactId; }
  function queryTable(query) { return /^(?:\s|\/\/[^\n]*(?:\n|$))*([A-Za-z_][A-Za-z0-9_]*)/.exec(query)?.[1]; }
  function snapshotText(snapshot) { return [snapshot.columns.join(' | '), ...snapshot.rows.map(row => row.map(String).join(' | '))].join('\n'); }
  function receiptFromRun(run, questionId) {
    const r = run.result, ids = C.citationIds({ caseData: C.scopedCase(A, state, questionId) });
    const records = [...new Set(r.rows.flat().filter(value => typeof value === 'string' && ids.has(value)))].slice(0, 100);
    return { query: run.query, ranAt: run.ranAt, rowCount: r.rows.length, sourceArtifactId: r.sourceArtifactId, tableName: r.tableName, recordIds: records, caseRevision: A.caseData.contentRevision, ...(Array.isArray(r.columns) ? { resultSnapshot: { columns: r.columns, rows: r.rows } } : {}) };
  }
  function queryInReport(questionId, receipt) { return state.findings.some(f => f.questionId === questionId && f.queryReceipt?.query === receipt.query && f.queryReceipt?.ranAt === receipt.ranAt && f.queryReceipt?.sourceArtifactId === receipt.sourceArtifactId); }
  function keepQueryReceipt(questionId, receipt) {
    if (!C.canAccess(A, state, questionId) || queryInReport(questionId, receipt)) return;
    const snapshot = receipt.resultSnapshot, scalar = snapshot?.rows.length === 1 && snapshot.columns.length === 1 ? ` · ${snapshot.columns[0]} = ${snapshot.rows[0][0]}` : '';
    const finding = { questionId, section: C.locate(A, questionId).question.report?.section || 'timeline', summary: 'Query evidence to interpret: ' + receipt.tableName + ' returned ' + receipt.rowCount + ' result ' + (receipt.rowCount === 1 ? 'row' : 'rows') + scalar + '.', timestamp: '', certainty: 'Question', evidenceIds: [receipt.sourceArtifactId, ...receipt.recordIds], queryReceipt: receipt };
    try {
      C.addFinding(A, state, finding);
      const cached = queryRuns.get(questionId); if (cached?.run.query === receipt.query && cached.run.ranAt === receipt.ranAt) cached.kept = true;
      save(); progress();
      if (questionId === currentId && cached?.kept) { const control = document.getElementById('keep-query'); if (control) { control.disabled = true; control.textContent = 'Query evidence kept'; } }
      refreshQueryHistory?.(); announce('Query evidence added. Explain what it supports in your report.');
    }
    catch (error) { announce(error.message); }
  }
  function keepQuery() {
    if (!lastRun || !editor || editor.getValue() !== lastRun.query) return;
    keepQueryReceipt(currentId, receiptFromRun(lastRun, currentId));
  }
  function renderReport() {
    const host = node('div', { class: 'report-view' });
    host.append(node('h2', { text: 'Your incident response report' }), p('Dated event responses build your attack timeline. Revise their descriptions and add other findings, then export the report to build your presentation.', 'helper'), node('div', { class: 'report-tabs' }, C.SECTIONS.map(id => node('button', { type: 'button', 'aria-pressed': reportSection === id, text: C.labels[id], onclick: () => { reportSection = id; renderWorkspace(); } }))));
    if (!ownFindings().length) host.append(p('No findings have been saved for this track yet. Checked event questions will add timeline entries. You can also select useful evidence and add your own findings.', 'report-guidance'), button('Add a finding for this question', () => { captureSection.value = reportSection; saveCaptureDraft(); captureSummary.closest('details').open = true; captureSummary.focus(); captureSummary.scrollIntoView?.({ block: 'center' }); }));
    if (reportSection === 'timeline') host.append(p('Entries are ordered by the time of the event, even when you discover them later. Source timestamps are supplied for automatic entries; the descriptions are your responses and still need your review. Expand brief answers into clear event descriptions.', 'timeline-guidance'));
    const draft = node('textarea', { rows: '4', maxlength: '30000', placeholder: reportSection === 'attacker' ? 'Supported roles, likely goals, methods and remaining uncertainty…' : reportSection === 'timeline' ? 'Describe the sequence and any gaps you still need to resolve…' : 'What problem does each mitigation address? How would you verify it works?' });
    draft.value = state.reportDraft[state.trackId][reportSection]; draft.addEventListener('input', () => { state.reportDraft[state.trackId][reportSection] = draft.value; save(); });
    host.append(field('Section notes — revise in your own words', draft));
    const findings = C.orderedFindings(A, state, state.trackId, reportSection);
    if (!findings.length) host.append(p(reportSection === 'timeline' ? 'No dated events here yet. Complete an event question to start the timeline, or add your own dated finding.' : 'No selected findings here yet. Use “Add a finding to your report” beneath a question, or keep evidence from a query.', 'empty-report'));
    for (const f of findings) {
      const automatic = Boolean(f.autoTimeline);
      const summary = node('textarea', { rows: '3', maxlength: '12000', 'aria-label': automatic ? 'Timeline description' : 'Finding' }); summary.value = f.summary;
      summary.addEventListener('input', () => { f.summary = summary.value; if (automatic) f.autoTimeline.descriptionEdited = true; save(); });
      const timestamp = node('input', { type: 'text', maxlength: '100', 'aria-label': 'Event timestamp', placeholder: 'Timestamp and time zone, if known' }); timestamp.value = f.timestamp;
      timestamp.addEventListener('input', () => { f.timestamp = timestamp.value; save(); });
      const group = node('select', { 'aria-label': 'Move finding to report section' }, C.SECTIONS.map(id => node('option', { value: id, text: C.labels[id] }))); group.value = f.section;
      group.addEventListener('change', () => { f.section = group.value; save(); renderWorkspace(); });
      const card = node('article', { class: 'report-card' + (automatic ? ' timeline-event' : '') }, [node('div', { class: 'card-meta' }, [node('span', { text: f.questionId + (automatic ? ' · From your checked response' : '') }), button('Revisit question', () => go(f.questionId), '', !C.canAccess(A, state, f.questionId))])]);
      if (automatic) card.append(node('time', { class: 'timeline-time', datetime: f.timestamp, text: C.formatTimelineTimestamp(f.timestamp) }), node('h3', { text: f.autoTimeline.title }), p('Time and sources come from the evidence. Improve your response below into the event description you want to present.', 'helper'));
      card.append(field(automatic ? 'Your event description' : 'Finding', summary));
      if (!automatic) card.append(field('Event time', timestamp), field('Report section', group));
      card.append(node('div', { class: 'source-chips' }, f.evidenceIds.map(id => button(id, () => { const source = A.caseData.artifacts.find(a => a.id === id || a.rows?.some(row => row[0] === id)); if (source) sourcePage(source.id, f.questionId); }, '', !C.canAccess(A, state, f.questionId)))));
      if (automatic && !C.isComplete(A, state, f.questionId)) card.append(p('This entry retains your earlier checked response. Recheck the changed answer, then review the timeline description.', 'helper'));
      if (!C.canAccess(A, state, f.questionId)) card.append(p('Your finding is saved. Recheck the earlier edited answer to reopen this question and its sources.', 'helper'));
      if (!f.evidenceIds.length) card.append(p('Add a source citation before presenting this finding.', 'helper'));
      const citationInput = node('input', { type: 'text', 'aria-label': 'Finding source IDs', maxlength: '3000' }); citationInput.value = f.evidenceIds.join(', ');
      const citationStatus = p('', 'helper'); citationInput.addEventListener('change', () => {
        const scopeIds = new Set(C.locate(A, f.questionId).section.availableArtifactIds);
        const sourceCase = { caseData: { artifacts: A.caseData.artifacts.filter(a => scopeIds.has(a.id)) } };
        const values = C.normalizeCitationIds(sourceCase, citationInput.value.split(/[,;\n]/).map(x => x.trim()).filter(Boolean));
        const available = C.citationIds(sourceCase);
        if (values.every(id => available.has(id))) { f.evidenceIds = [...new Set(values)]; citationInput.value = f.evidenceIds.join(', '); citationStatus.textContent = 'Citations saved.'; save(); }
        else citationStatus.textContent = 'An ID is not available in this section. Existing saved citations were kept.';
      }); if (!automatic) card.append(field('Sources', citationInput), citationStatus);
      if (f.queryReceipt) {
        const receipt = f.queryReceipt, snapshot = receipt.resultSnapshot;
        card.append(node('details', {}, [node('summary', { text: 'Preserved query evidence' }), p(`${receipt.tableName} · ${receipt.rowCount} result rows · ${receipt.ranAt}`, 'helper'), node('pre', { class: 'report-query', text: receipt.query }), snapshot ? node('pre', { class: 'report-query', text: [snapshot.columns.join(' | '), ...snapshot.rows.map(row => row.map(String).join(' | '))].join('\n') }) : p('This older finding retains the query and source. Run it again to preserve the result values.', 'helper'), snapshot?.truncated ? p('This saved result is shortened. Run the preserved query again to inspect all result values.', 'helper') : null]));
      }
      if (!automatic) card.append(button('Remove finding', () => { const index = state.findings.findIndex(x => x.id === f.id); state.findings.splice(index, 1); save(); progress(); renderWorkspace(); })); host.append(card);
    }
    host.append(button('Export findings for presentation', exportReport)); content.append(host);
  }
  function download(filename, text, type) { const a = node('a', { href: URL.createObjectURL(new Blob([text], { type })), download: filename }); document.body.append(a); a.click(); const href = a.href; a.remove(); setTimeout(() => URL.revokeObjectURL(href), 1000); }
  function exportReport() { save(); download('Campaign-' + state.trackId + '-incident-report.txt', C.exportReport(A, state, state.trackId), 'text/plain;charset=utf-8'); }
  document.getElementById('report-toggle').addEventListener('click', () => { mode = mode === 'report' ? questionMode() : 'report'; renderWorkspace(); });
  document.getElementById('backup').addEventListener('click', () => { save(); download('Campaign-guided-progress.json', JSON.stringify(state, null, 2), 'application/json'); });
  document.getElementById('export-report').addEventListener('click', exportReport);
  const inputFile = document.getElementById('import-file'); document.getElementById('restore').addEventListener('click', () => inputFile.click());
  inputFile.addEventListener('change', async () => {
    const file = inputFile.files[0]; if (!file) return;
    const importEpoch = stateEpoch;
    try {
      if (file.size > C.MAX_BYTES) throw new Error('Choose a progress backup smaller than 64 MB.');
      const rawBackup = await file.text(); if (importEpoch !== stateEpoch) return; prepareSessionState(rawBackup, { preserveCurrentHints: true });
      const notice = node('div', { class: 'report-view' }, [node('h2', { text: 'Restore this progress backup?' }), p('This replaces the guided activity work in this tab and, when signed in, in this account. Previously used hints will remain charged. Download your current backup first if you want to keep both versions.'), button('Download current backup', () => download('Campaign-before-restore.json', JSON.stringify(state, null, 2), 'application/json')), button('Restore selected backup', () => { if (importEpoch === stateEpoch) { replaceSessionState(rawBackup, { preserveCurrentHints: true }); save(); } }), button('Cancel', renderWorkspace)]);
      if (editor) { editor.destroy(); editor = null; } frame = null; toolbar.replaceChildren(); content.replaceChildren(notice);
    } catch (error) { announce(error.message); saveStatus.textContent = error.message; }
    inputFile.value = '';
  });
  window.addEventListener('message', event => {
    if (!frame || event.source !== frame.contentWindow || (typeof event.origin === 'string' && event.origin !== labOrigin && !(labProtocol === 'file:' && ['null', 'file://'].includes(event.origin)))) return;
    const message = event.data;
    if (message?.type === 'campaign-source-ready') sendSourceScope();
    else if (message?.type === 'campaign-source-navigate' && browserPages().some(page => page.id === message.pageId)) openPage(message.pageId);
    else if (message?.type === 'campaign-source-cite' && typeof message.artifactId === 'string' && channels(message.artifactId).includes('compass')) cite(message.artifactId);
    else if (message?.type === 'campaign-source-location' && validSourceLocation(message.route, message.artifactIds)) {
      const routePage = /^#\/campaign-case\/([^?]+)$/.exec(message.route)?.[1];
      const page = browserPages().find(page => page.id === routePage) || browserPages().find(page => message.artifactIds.length && message.artifactIds.every(id => page.artifactIds.includes(id)));
      rememberLocation({ pageId: page?.id || currentPage, route: message.route, artifactIds: message.artifactIds }, !awaitingSourceLocation);
      awaitingSourceLocation = false;
      clearSourceLoadTimer(); if (sourceLoadStatus) sourceLoadStatus.hidden = true;
    }
  });
  window.addEventListener('storage', event => { if (event.key === C.STORAGE_KEY || event.key === null) { storageBlocked = true; if (!cloudSession?.isAccountActive()) saveStatus.textContent = 'Another tab changed this work. Export this tab before reloading.'; } });
  window.addEventListener('hashchange', route);
  cloudSession = window.CampaignCloudUI?.mount({
    activityId: A.id,
    getState: () => state,
    validateState: raw => C.restore(A, raw),
    replaceState: replaceSessionState,
    downloadBackup: filename => download(filename, JSON.stringify(state, null, 2), 'application/json'),
    downloadState: (filename, snapshot) => download(filename, JSON.stringify(snapshot, null, 2), 'application/json')
  }) || null;
  route();
})();
