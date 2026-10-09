'use strict';

function campaignRecordIndex(artifacts) {
  const index = new Map();
  for (const artifact of artifacts) {
    // The first table column identifies a row/record in this case contract.
    if (!Array.isArray(artifact.rows) || !/^[A-Za-z][A-Za-z0-9_]*_id$/.test(artifact.columns?.[0] || '')) continue;
    for (const row of artifact.rows) {
      const id = String(row[0] ?? ''); if (!id) continue;
      const sources = index.get(id) || [];
      if (!sources.includes(artifact.id)) sources.push(artifact.id);
      index.set(id, sources);
    }
  }
  return index;
}

function campaignCitationSources(id, artifactMap, recordIndex) {
  return artifactMap.has(id) ? [id] : recordIndex.get(id) || [];
}

function campaignDisplayDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))?$/.test(value)) return value || '';
  const date = new Date(value); if (Number.isNaN(date.getTime())) return value;
  const day = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  return value.includes('T') ? `${day} at ${date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC', hourCycle: 'h23' })} UTC` : day;
}

function campaignNotebookBytes(value) {
  return new TextEncoder().encode(typeof value === 'string' ? value : JSON.stringify(value)).byteLength;
}

function campaignNotebookKey(data) {
  if (data.notebookKey === undefined) {
    if (data.browserGlobal === 'CAMPAIGN_CHAPTER_TWO') throw new Error('Chapter 2 requires its own notebookKey.');
    return 'mandy-high-five-casework-v1';
  }
  if (typeof data.notebookKey !== 'string' || !/^campaign-[a-z0-9][a-z0-9-]{2,63}$/.test(data.notebookKey)) throw new Error('The case notebookKey must be a safe campaign- identifier, separate from the legacy notebook.');
  return data.notebookKey;
}

(() => {
  const VERSION = 1;
  let STORAGE_KEY = 'mandy-high-five-casework-v1';
  const MAX_IMPORT_BYTES = 16 * 1024 * 1024;
  const MAX_CASE_BYTES = 20 * 1024 * 1024;
  const MAX_TEXT = 30000;
  const CONFIDENCE = ['Not assessed', 'Low', 'Medium', 'High'];
  const main = document.getElementById('main');
  const saveStatus = document.getElementById('save-status');
  const announcer = document.getElementById('announcer');
  let caseData = null;
  let state = { version: VERSION, notes: {}, activeTrack: 'year1', lastQuestion: {}, draftDismissed: false };
  let pendingSave = null;
  let storageAvailable = true;
  let preserveUnreadableStorage = false;
  let preserveExternalStorage = false;
  let storageSnapshot = null;
  let lastQuestionId = null;
  let currentTrackId = null;
  let importedPreview = null;
  let questionMap = new Map();
  let artifactMap = new Map();
  let recordSourceMap = new Map();

  function node(tag, attrs = {}, children = []) {
    const el = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
      if (value === undefined || value === null || value === false) continue;
      if (key === 'class') el.className = value;
      else if (key === 'text') el.textContent = value;
      else if (key.startsWith('on') && typeof value === 'function') el.addEventListener(key.slice(2), value);
      else if (key === 'checked' || key === 'disabled') el[key] = Boolean(value);
      else el.setAttribute(key, String(value));
    }
    for (const child of Array.isArray(children) ? children : [children]) {
      if (child !== undefined && child !== null) el.append(child instanceof Node ? child : document.createTextNode(String(child)));
    }
    return el;
  }
  const paragraph = (text, cls) => node('p', { class: cls, text });
  const link = (label, hash, cls) => node('a', { href: hash, class: cls, text: label });
  const button = (label, action, cls = '') => node('button', { type: 'button', class: cls, text: label, onclick: action });
  const safeText = value => typeof value === 'string' ? value : value == null ? '' : String(value);
  const routePart = value => encodeURIComponent(value);
  const artifactRoute = id => `#/evidence/${routePart(id)}`;
  const guideRoute = (track, id) => `#/guide/${routePart(track)}${id ? '/' + routePart(id) : ''}`;
  const questionsFor = track => (track.sections || []).flatMap(section => (section.questions || []).map(q => ({ ...q, section })));
  const allQuestions = () => caseData.tracks.flatMap(track => questionsFor(track).map(q => ({ ...q, track })));

  function say(text) { announcer.textContent = ''; requestAnimationFrame(() => { announcer.textContent = text; }); }
  function storageMessage(text, error = false) { saveStatus.textContent = text; saveStatus.dataset.error = String(error); }
  function saveNow() {
    clearTimeout(pendingSave); pendingSave = null;
    state.savedAt = new Date().toISOString();
    if (preserveUnreadableStorage) {
      storageMessage('Previous saved data preserved · export this session to keep new notes', true);
      return;
    }
    try {
      if (preserveExternalStorage || localStorage.getItem(STORAGE_KEY) !== storageSnapshot) {
        preserveExternalStorage = true;
        storageMessage('Another tab changed this notebook · export this tab’s work, then reload', true);
        return;
      }
      const serialized = JSON.stringify(state);
      if (campaignNotebookBytes(serialized) > MAX_IMPORT_BYTES) {
        storageMessage('Notebook exceeds 16 MB · download readable text before reducing your notes', true);
        return;
      }
      localStorage.setItem(STORAGE_KEY, serialized);
      storageSnapshot = serialized;
      storageAvailable = true;
      storageMessage(`Saved in this browser · ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
    } catch (_) {
      storageAvailable = false;
      storageMessage('Browser storage unavailable · export your notebook before leaving', true);
    }
  }
  function scheduleSave() {
    storageMessage(storageAvailable ? 'Saving your notes…' : 'Notes held in this tab · export to keep a copy', !storageAvailable);
    clearTimeout(pendingSave); pendingSave = setTimeout(saveNow, 350);
  }
  function blankNote() { return { answer: '', notes: '', evidence: '', query: '', confidence: 'Not assessed', complete: false, hints: 0, sourcesShown: false }; }
  function getNote(id) { return state.notes[id] || (state.notes[id] = blankNote()); }
  function evidenceIds(note) { return [...new Set(safeText(note.evidence).split(/[\s,;]+/).map(s => s.trim()).filter(Boolean))]; }
  function citationSources(id) { return campaignCitationSources(id, artifactMap, recordSourceMap); }
  function countDone(track) { return questionsFor(track).filter(q => state.notes[q.id]?.complete).length; }

  function validateNotebook(value, requireTitle = true) {
    if (campaignNotebookBytes(value) > MAX_IMPORT_BYTES) throw new Error('Choose a notebook smaller than 16 MB.');
    if (!value || typeof value !== 'object' || Array.isArray(value) || value.version !== VERSION) throw new Error('This is not a supported version 1 notebook.');
    if (requireTitle && value.caseTitle !== caseData.title) throw new Error('This notebook belongs to a different case. Choose an export from this investigation.');
    if (!value.notes || typeof value.notes !== 'object' || Array.isArray(value.notes)) throw new Error('The notebook has no valid question notes.');
    if (Object.keys(value.notes).length > 1000) throw new Error('The notebook contains too many entries.');
    const notes = Object.create(null);
    for (const [id, entry] of Object.entries(value.notes)) {
      if (!questionMap.has(id)) throw new Error(`Unrecognized question ID: ${id.slice(0, 80)}. This may be a different case revision.`);
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) throw new Error(`Invalid entry for ${id}.`);
      const clean = blankNote();
      for (const field of ['answer', 'notes', 'evidence', 'query']) {
        const limit = field === 'query' ? 12000 : MAX_TEXT;
        if (entry[field] !== undefined && (typeof entry[field] !== 'string' || entry[field].length > limit)) throw new Error(`The ${field} field for ${id} is invalid or too long.`);
        clean[field] = entry[field] || '';
      }
      if (entry.confidence !== undefined && !CONFIDENCE.includes(entry.confidence)) throw new Error(`Invalid confidence for ${id}.`);
      if (entry.complete !== undefined && typeof entry.complete !== 'boolean') throw new Error(`Invalid completion status for ${id}.`);
      if (entry.hints !== undefined && (!Number.isInteger(entry.hints) || entry.hints < 0 || entry.hints > 100)) throw new Error(`Invalid hint count for ${id}.`);
      clean.confidence = entry.confidence || 'Not assessed'; clean.complete = entry.complete || false;
      clean.hints = Math.min(entry.hints || 0, (questionMap.get(id).hints || []).length);
      clean.sourcesShown = entry.sourcesShown === true;
      notes[id] = clean;
    }
    return notes;
  }

  function loadStoredState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      storageSnapshot = raw;
      if (!raw) return;
      if (campaignNotebookBytes(raw) > MAX_IMPORT_BYTES) throw new Error('Saved notebook is too large.');
      const loaded = JSON.parse(raw);
      if (loaded.caseTitle && loaded.caseTitle !== caseData.title) throw new Error('The saved notebook belongs to another case.');
      const notes = validateNotebook(loaded, false);
      state.notes = notes;
      state.activeTrack = caseData.tracks.some(t => t.id === loaded.activeTrack) ? loaded.activeTrack : caseData.tracks[0]?.id;
      state.draftDismissed = loaded.draftDismissed === true;
      if (loaded.lastQuestion && typeof loaded.lastQuestion === 'object') {
        for (const track of caseData.tracks) if (questionsFor(track).some(q => q.id === loaded.lastQuestion[track.id])) state.lastQuestion[track.id] = loaded.lastQuestion[track.id];
      }
      storageMessage('Your saved notebook is restored');
    } catch (_) {
      storageAvailable = false;
      preserveUnreadableStorage = true;
      storageMessage('Saved notes could not be restored · use notebook import if you have an export', true);
    }
  }

  function validateCase(data) {
    if (!data || typeof data !== 'object' || typeof data.title !== 'string' || !Array.isArray(data.tracks) || !Array.isArray(data.artifacts)) throw new Error('The case file needs a title, tracks, and artifacts.');
    campaignNotebookKey(data);
    if (data.browserGlobal !== undefined && !['CAMPAIGN_CASE', 'CAMPAIGN_CHAPTER_TWO'].includes(data.browserGlobal)) throw new Error('This case uses an unsupported browser data binding.');
    const expectedBinding = document.documentElement?.dataset?.caseGlobal || 'CAMPAIGN_CASE';
    if (expectedBinding !== (data.browserGlobal || 'CAMPAIGN_CASE')) throw new Error('This case belongs to a different chapter guide. Open that chapter’s guide to load it.');
    if (data.draftNotice !== undefined && (!data.draftNotice || typeof data.draftNotice.title !== 'string' || typeof data.draftNotice.body !== 'string')) throw new Error('The case draft notice needs a title and body.');
    if (data.tracks.length > 8 || data.artifacts.length > 1000) throw new Error('This case file exceeds the prototype limits.');
    const qids = new Set(); const aids = new Set(); const tids = new Set();
    for (const track of data.tracks) {
      if (!track.id || tids.has(track.id) || !Array.isArray(track.sections)) throw new Error('Every track needs a unique ID and sections.');
      tids.add(track.id);
      for (const section of track.sections) {
        if (!Array.isArray(section.questions)) throw new Error('Every section needs a questions list.');
        for (const q of section.questions) {
          if (typeof q.id !== 'string' || !q.id || qids.has(q.id) || typeof q.prompt !== 'string') throw new Error('Every question needs a unique ID and prompt.');
          if (q.hints && !Array.isArray(q.hints)) throw new Error('Question hints must be a list.');
          if (q.evidenceIds && !Array.isArray(q.evidenceIds)) throw new Error('Question source hints must be a list.');
          qids.add(q.id);
        }
      }
    }
    for (const a of data.artifacts) {
      if (typeof a.id !== 'string' || !a.id || aids.has(a.id) || typeof a.title !== 'string') throw new Error('Every artifact needs a unique ID and title.');
      aids.add(a.id);
      if (a.body && !Array.isArray(a.body)) throw new Error('Artifact body must be a list of paragraphs.');
      if (a.rows && (!Array.isArray(a.rows) || a.rows.some(row => !Array.isArray(row)))) throw new Error('Table rows must be arrays.');
    }
    if (data.priorArtifactIds !== undefined && (!Array.isArray(data.priorArtifactIds) || data.priorArtifactIds.some(id => typeof id !== 'string' || !aids.has(id)))) throw new Error('Prior collection references must identify sources in this case.');
    return data;
  }
  function setCase(data) {
    caseData = validateCase(data);
    clearTimeout(pendingSave); pendingSave = null;
    STORAGE_KEY = campaignNotebookKey(caseData);
    state = { version: VERSION, caseTitle: caseData.title, notes: {}, activeTrack: 'year1', lastQuestion: {}, draftDismissed: false };
    storageAvailable = true; preserveUnreadableStorage = false; preserveExternalStorage = false; storageSnapshot = null;
    questionMap = new Map(allQuestions().map(q => [q.id, q]));
    artifactMap = new Map(caseData.artifacts.map(a => [a.id, a]));
    recordSourceMap = campaignRecordIndex(caseData.artifacts);
    if (/\/learn\/osint\/campaign(?:-chapter2)?\//.test(location.pathname)) {
      const nav = document.querySelector('.primary-nav');
      if (nav && !nav.querySelector('[data-lab-back]')) nav.prepend(node('a', { href: '../../index.html#/investigations', text: '← OSINT lab', 'data-lab-back': 'true' }));
    }
    document.title = `${caseData.title} · Casework`;
    document.getElementById('case-name').textContent = caseData.title;
    state.activeTrack = caseData.tracks[0]?.id || 'year1';
    loadStoredState(); render();
  }

  function renderError(message) {
    main.replaceChildren(node('section', { class: 'empty-state' }, [
      node('span', { class: 'eyebrow', text: 'Local review workspace' }), node('h1', { text: 'Open the case file.' }),
      paragraph('This guide loads its questions and evidence from public-case.json beside the preview folder. A local web preview can load it automatically. If you opened this page directly, choose that file below.'),
      paragraph(message, 'notice'), fileChooser('Choose public-case.json', async file => {
        try { if (file.size > MAX_CASE_BYTES) throw new Error('The case file is too large.'); setCase(JSON.parse(await file.text())); }
        catch (error) { renderError(error.message); }
      }), paragraph('This only reads the selected file. It does not upload or change it.', 'helper')
    ]));
  }

  function render() {
    if (!caseData) return;
    let parts;
    try { parts = location.hash.replace(/^#\/?/, '').split('/').map(decodeURIComponent); }
    catch (_) { parts = ['guide']; }
    const route = parts[0] || 'guide';
    for (const nav of document.querySelectorAll('[data-nav]')) {
      const selected = nav.dataset.nav === (route === 'evidence' ? 'compass' : route);
      if (selected) nav.setAttribute('aria-current', 'page'); else nav.removeAttribute('aria-current');
    }
    main.replaceChildren();
    if (route === 'compass') renderCompass();
    else if (route === 'notebook') renderNotebook();
    else if (route === 'evidence') renderEvidence(parts[1]);
    else if (route === 'query') renderQuery(parts[1]);
    else renderGuide(parts[1], parts[2]);
  }
  function moveFocus() { main.focus({ preventScroll: true }); window.scrollTo({ top: 0 }); }

  function progressPanel(track) {
    const total = questionsFor(track).length; const done = countDone(track);
    return node('aside', { class: 'hero-info', 'aria-label': 'Your investigation progress' }, [
      node('span', { class: 'eyebrow', text: 'Your progress' }), node('div', { class: 'number', text: `${done} / ${total}` }),
      node('div', { class: 'progress-label' }, [node('strong', { text: track.label }), node('span', { text: 'marked complete' })]),
      node('progress', { class: 'progress-bar', value: done, max: Math.max(total, 1), 'aria-label': `${done} of ${total} questions marked complete` }),
      paragraph('You decide when your response is ready. There is no automatic answer scoring.', 'helper')
    ]);
  }

  function renderGuide(trackId, questionId) {
    const track = caseData.tracks.find(t => t.id === trackId) || caseData.tracks.find(t => t.id === state.activeTrack) || caseData.tracks[0];
    if (!track) { main.append(node('section', { class: 'empty-state' }, [node('h1', { text: 'The investigation is being prepared.' }), paragraph('No question tracks have been added to this case yet.'), link('Browse the evidence library', '#/compass')])); return; }
    currentTrackId = track.id; state.activeTrack = track.id;
    const questions = questionsFor(track);
    const question = questions.find(q => q.id === questionId) || questions.find(q => q.id === state.lastQuestion[track.id]) || questions[0];
    if (question) { lastQuestionId = question.id; state.lastQuestion[track.id] = question.id; }
    const draftNotice = caseData.draftNotice || { title: 'Local draft · opening investigation content', body: 'Review the opening evidence and question flow here. The full intrusion path and later investigation stages are still to be built.' };
    if (!state.draftDismissed) main.append(node('aside', { class: 'draft-banner' }, [node('div', {}, [node('strong', { text: draftNotice.title }), paragraph(draftNotice.body)]), button('Dismiss', () => { state.draftDismissed = true; saveNow(); render(); }, 'button-subtle')]));
    const briefing = Array.isArray(caseData.briefing) ? caseData.briefing.join('\n\n') : safeText(caseData.briefing);
    main.append(node('section', { class: 'hero' }, [node('div', { class: 'hero-copy' }, [node('span', { class: 'eyebrow', text: `Case file${caseData.caseDate ? ' / ' + caseData.caseDate : ''}` }), node('h1', { text: caseData.title }), paragraph(briefing)]), progressPanel(track)]));
    const tabs = node('nav', { class: 'track-tabs', 'aria-label': 'Investigation track' });
    for (const t of caseData.tracks) tabs.append(node('a', { href: guideRoute(t.id, state.lastQuestion[t.id]), 'aria-current': t.id === track.id ? 'true' : undefined, text: t.label }));
    main.append(tabs);
    const rail = node('aside', { class: 'question-rail', 'aria-label': 'Questions' }, [paragraph(track.description, 'track-description')]);
    let number = 0;
    for (const section of track.sections) {
      const list = node('ol', { class: 'question-nav' });
      for (const q of section.questions) {
        number++;
        const done = state.notes[q.id]?.complete;
        const label = q.title || (q.prompt.length > 76 ? q.prompt.slice(0, 73) + '…' : q.prompt);
        list.append(node('li', {}, node('a', { href: guideRoute(track.id, q.id), 'aria-current': q.id === question?.id ? 'step' : undefined }, [node('span', { class: `question-marker${done ? ' done' : ''}`, 'aria-label': done ? 'Marked complete' : `Question ${number}`, text: done ? '✓' : number }), node('span', { text: label })])));
      }
      rail.append(node('section', { class: 'section-nav' }, [node('h3', { text: section.title }), list]));
    }
    rail.append(node('div', { class: 'question-rail-footer' }, [link('Search the evidence library →', '#/compass'), paragraph('Follow names, handles, dates, and other clues. Record the source ID behind every claim.', 'helper')]));
    main.append(node('div', { class: 'guide-layout' }, [rail, question ? renderQuestion(track, question, questions) : paragraph('No questions have been added to this track.', 'notice')]));
  }

  function field(labelText, control, help) {
    const wrap = node('label', { class: 'field' }, [node('span', { class: 'field-title', text: labelText }), control]);
    if (help) wrap.append(paragraph(help, 'helper')); return wrap;
  }
  function renderQuestion(track, q, questions) {
    const note = getNote(q.id); const index = questions.findIndex(item => item.id === q.id);
    const answer = q.type === 'short' ? node('input', { type: 'text', value: note.answer, maxlength: MAX_TEXT }) : node('textarea', { rows: 5, maxlength: MAX_TEXT, text: note.answer });
    answer.addEventListener('input', () => { note.answer = answer.value; scheduleSave(); });
    const notes = node('textarea', { class: 'notes', rows: 5, maxlength: MAX_TEXT, text: note.notes });
    notes.addEventListener('input', () => { note.notes = notes.value; scheduleSave(); });
    const cited = node('input', { type: 'text', value: note.evidence, placeholder: 'e.g. artifact-001, artifact-002', maxlength: MAX_TEXT, spellcheck: 'false' });
    const citeFeedback = node('div', { class: 'feedback', 'aria-live': 'polite' });
    const updateCiteFeedback = () => { const unknown = evidenceIds(note).filter(id => !citationSources(id).length); citeFeedback.textContent = unknown.length ? `Source or record IDs not in this collection: ${unknown.join(', ')}` : evidenceIds(note).length ? `${evidenceIds(note).length} source or record ID(s) recorded` : ''; citeFeedback.className = `feedback${unknown.length ? ' error' : ''}`; };
    cited.addEventListener('input', () => { note.evidence = cited.value; updateCiteFeedback(); scheduleSave(); }); updateCiteFeedback();
    const confidence = node('select'); for (const value of CONFIDENCE) confidence.append(node('option', { value, text: value })); confidence.value = note.confidence;
    confidence.addEventListener('change', () => { note.confidence = confidence.value; scheduleSave(); });
    const completion = node('input', { type: 'checkbox', checked: note.complete });
    completion.addEventListener('change', () => { note.complete = completion.checked; saveNow(); render(); say(note.complete ? 'Question marked complete. Progress updated.' : 'Question marked in progress.'); });
    const hintsBox = node('div', { class: 'hint-area' });
    const refreshHints = () => {
      hintsBox.replaceChildren();
      const hints = q.hints || [];
      const controls = node('div', { class: 'hint-controls' });
      if (hints.length) controls.append(button(note.hints < hints.length ? `Reveal hint ${note.hints + 1} of ${hints.length}` : 'All hints shown', () => { note.hints = Math.min(note.hints + 1, hints.length); saveNow(); refreshHints(); say(`Hint ${note.hints} revealed.`); }, 'button-small'));
      if (hints.length && note.hints >= hints.length) controls.lastChild.disabled = true;
      if ((q.evidenceIds || []).length && !note.sourcesShown) controls.append(button('Show a source hint', () => { note.sourcesShown = true; saveNow(); refreshHints(); say('Source hints shown.'); }, 'button-link'));
      if (controls.childNodes.length) hintsBox.append(controls);
      if (note.hints) { const list = node('ol', { class: 'hint-list' }); hints.slice(0, note.hints).forEach(hint => list.append(node('li', { text: typeof hint === 'string' ? hint : hint.text || safeText(hint) }))); hintsBox.append(list); }
      if (note.sourcesShown) hintsBox.append(paragraph('Suggested places to investigate. You still need to establish what the evidence supports.', 'helper'), node('div', { class: 'source-hints' }, (q.evidenceIds || []).filter(id => artifactMap.has(id)).map(id => link(`${id} · ${artifactMap.get(id).title}`, artifactRoute(id), 'chip'))));
      hintsBox.hidden = !controls.childNodes.length && !note.hints && !note.sourcesShown;
    }; refreshHints();
    const work = node('div', { class: 'question-work' }, [field(q.type === 'short' ? 'Your answer' : 'Your explanation', answer, 'Use your own words. Include uncertainty when the evidence is incomplete.'), field('Reasoning and working notes', notes, 'What did you observe? What did you infer? What would you need to check next?'), node('div', { class: 'field-row' }, [node('div', {}, [field('Evidence source or record IDs', cited, 'Separate IDs with commas. Use a source ID or a row’s record/event ID; both link back to the source.'), citeFeedback]), field('How confident are you?', confidence)]), hintsBox]);
    if (track.id === 'year2') work.prepend(node('p', { class: 'query-question-link' }, link('Open the KQL query workspace →', '#/query/' + encodeURIComponent(q.id))));
    if (q.reflection) work.append(node('aside', { class: 'reflection' }, [node('strong', { text: 'Pause and reflect' }), safeText(q.reflection)]));
    const actions = node('div', { class: 'question-actions' });
    if (index > 0) actions.append(link('← Previous', guideRoute(track.id, questions[index - 1].id), 'chip'));
    if (index < questions.length - 1) actions.append(link('Next question →', guideRoute(track.id, questions[index + 1].id), 'chip'));
    else actions.append(link('Review your notebook →', '#/notebook', 'chip'));
    return node('article', { class: 'question-card', 'aria-label': `Question ${index + 1}` }, [node('div', { class: 'question-top' }, [node('div', { class: 'question-meta' }, [node('span', { text: `${q.section.title} / ${q.id}` }), node('span', { text: `Question ${index + 1} of ${questions.length}` })]), node('h2', { class: 'question-prompt', text: q.prompt }), link('Open the evidence library ↗', '#/compass', 'button-link')]), work, node('div', { class: 'question-footer' }, [node('label', { class: 'check-label' }, [completion, node('span', {}, [node('strong', { text: 'Ready for review' }), node('small', { text: 'Mark complete when you can explain your reasoning.' })])]), actions])]);
  }

  function renderQuery(questionId) {
    const track = caseData.tracks.find(item => item.id === 'year2');
    const questions = track ? questionsFor(track) : [];
    const question = questions.find(item => item.id === questionId) || questions.find(item => item.id === state.lastQuestion.year2) || questions.find(item => item.id === 'Y2-02') || questions[0];
    if (!question || !window.CampaignQueryWorkspace) { main.append(paragraph('The query workspace is unavailable in this copy.', 'notice'), link('Open the evidence library', '#/compass')); return; }
    currentTrackId = 'year2'; lastQuestionId = question.id; state.activeTrack = 'year2'; state.lastQuestion.year2 = question.id;
    const note = getNote(question.id);
    window.CampaignQueryWorkspace.mount(main, {
      caseData, question, questions, note, lessons: (caseData.browserGlobal === 'CAMPAIGN_CHAPTER_TWO' ? window.CAMPAIGN_CHAPTER_TWO_QUERY_LESSONS : window.CAMPAIGN_QUERY_LESSONS) || [],
      onDraftChange(query) { note.query = query.slice(0, 12000); scheduleSave(); },
      onSaveRun(run) {
        const result = run.result;
        const recordIds = [...new Set(result.rows.flat().map(String).filter(id => citationSources(id).includes(result.sourceArtifactId)))];
        const shownIds = recordIds.slice(0, 20);
        const receipt = `Query run: ${run.ranAt}\nCase revision: ${run.caseRevision}\nTable: ${result.tableName} | Source: ${result.sourceArtifactId}\n${run.query}\nReturned ${result.rows.length} rows (all shown; no result truncation).${shownIds.length ? '\nRecord IDs: ' + shownIds.join(', ') + (recordIds.length > shownIds.length ? ' (first 20 recorded)' : '') : ''}\nInterpretation: `;
        const combined = note.notes ? note.notes + '\n\n' + receipt : receipt;
        const ids = [...new Set([...evidenceIds(note), result.sourceArtifactId, ...shownIds])].join(', ');
        if (combined.length > MAX_TEXT || ids.length > MAX_TEXT) return { ok: false, message: 'These working notes are full. Export your notebook, then shorten the notes before adding another query.' };
        if (note.notes.includes(`Query run: ${run.ranAt}\n`)) return { ok: true, message: 'This query run is already in your working notes.' };
        note.notes = combined; note.query = run.query; note.evidence = ids; saveNow();
        return { ok: true, message: `Added to ${question.id}. Return to the question and explain what the evidence supports.` };
      }
    });
  }

  function imageSrc(raw) {
    if (typeof raw !== 'string' || !raw || /^(?:[a-z]+:|\/\/|\/)/i.test(raw) || raw.includes('\\') || raw.includes('\0')) return null;
    const clean = raw.replace(/^\.\//, '');
    if (/^\.\.\/images\/[a-zA-Z0-9_./ -]+$/.test(clean) && !clean.slice(3).includes('..')) return clean;
    if (/^images\/[a-zA-Z0-9_./ -]+$/.test(clean) && !clean.includes('..')) return '../' + clean;
    return null;
  }
  function addImage(src, alt, cls) {
    const url = imageSrc(src); if (!url) return null;
    const img = node('img', { src: url, alt: alt || 'Fictional case illustration', loading: 'lazy', class: cls });
    const fullSize = node('a', { href: url, target: '_blank', rel: 'noopener', class: 'image-open', 'aria-label': `Open full-size image: ${alt || 'Fictional case illustration'} (opens in a new tab)` }, [img, node('span', { class: 'image-open-label', text: 'Open full-size image ↗' })]);
    img.addEventListener('error', () => { fullSize.replaceWith(paragraph('Image unavailable in this local copy.', 'notice')); }, { once: true }); return fullSize;
  }
  function artifactImages(a) {
    const values = [];
    if (a.image) values.push(typeof a.image === 'string' ? { src: a.image, alt: a.title } : a.image);
    for (const image of a.images || []) if (!values.some(v => v.src === image.src)) values.push(image);
    return values;
  }
  function renderCompass() {
    main.append(node('header', { class: 'page-heading' }, [node('span', { class: 'eyebrow', text: 'Evidence library / case collection' }), node('h1', { text: 'Start with a clue.' }), paragraph('Search preserved public pages and records supplied to investigators. This library includes both kinds of evidence; the OSINT lab’s Compass searches public pages. Open a source to examine its context, then record its ID in your notebook.') ]));
    const search = node('input', { type: 'search', class: 'search-input', placeholder: 'Search names, handles, or evidence…', autocomplete: 'off' });
    const filter = node('select', {}, [node('option', { value: '', text: 'All source types' })]);
    for (const type of [...new Set(caseData.artifacts.map(a => a.type || 'document'))].sort()) filter.append(node('option', { value: type, text: type[0].toUpperCase() + type.slice(1) }));
    const meta = node('p', { class: 'result-meta', role: 'status', 'aria-live': 'polite' });
    const grid = node('div', { class: 'evidence-grid' });
    const update = () => {
      const term = search.value.trim().toLocaleLowerCase();
      const matches = caseData.artifacts.filter(a => (!filter.value || a.type === filter.value) && [a.id, a.title, a.site, a.author, a.date, a.summary, ...(a.body || []), ...(a.rows || []).flat()].map(safeText).join(' ').toLocaleLowerCase().includes(term));
      meta.textContent = `${matches.length} ${matches.length === 1 ? 'source' : 'sources'}${term ? ' matching your search' : ' in the collection'}. Search is local to this fictional case.`;
      grid.replaceChildren(...matches.map(a => {
        const card = node('article', { class: 'evidence-card' }); const first = artifactImages(a)[0];
        if (first) { const image = addImage(first.src, first.alt || a.title); if (image) card.append(image); }
        card.append(node('div', { class: 'evidence-card-body' }, [node('span', { class: 'eyebrow', text: `${a.site || 'Case evidence'} / ${a.type || 'document'}` }), node('h2', {}, link(a.title, artifactRoute(a.id))), paragraph(a.summary || (a.body || [])[0] || 'Open this source to inspect its contents.'), node('div', { class: 'evidence-card-footer' }, [node('span', { text: a.id }), node('span', { text: a.date || 'Date not stated' })])])); return card;
      }));
      if (!matches.length) grid.append(node('div', { class: 'empty-results' }, [node('h2', { text: 'No matching sources yet.' }), paragraph('Try a shorter name, a different clue, or another source type. This collection is intentionally bounded.') ]));
    };
    search.addEventListener('input', update); filter.addEventListener('change', update);
    main.append(node('div', { class: 'search-toolbar' }, [field('Search the evidence library', search), node('div', { class: 'filter-field' }, field('Source type', filter))]), meta, grid); update();
  }

  function sourceStyle(a) {
    const site = safeText(a.site).toLowerCase();
    if (site.includes('frame')) return 'frame';
    if (site.includes('linked')) return 'linkedup';
    if (a.type === 'forum') return 'forum';
    if (a.id === 'HIGHFIVE-01' || site.includes('company') || site.includes('organization website')) return 'company';
    if (a.type === 'article' || site.includes('news site')) return 'news';
    if (a.type === 'table') return 'table';
    return 'document';
  }
  function renderEvidence(id) {
    const a = artifactMap.get(id);
    if (!a) { main.append(node('section', { class: 'empty-state' }, [node('h1', { text: 'Source not found.' }), paragraph('This source ID is not in the loaded case revision.'), link('Return to the evidence library', '#/compass')])); return; }
    const returnTrack = currentTrackId || state.activeTrack; const returnQuestion = lastQuestionId || state.lastQuestion[returnTrack];
    main.append(node('div', { class: 'evidence-toolbar' }, [link('← Evidence library', '#/compass'), link('Return to your question', guideRoute(returnTrack, returnQuestion)), node('span', { class: 'artifact-tag', text: `Source ID: ${a.id}` })]));
    const content = node('div', { class: 'source-content' }, [node('h1', { text: a.title }), node('div', { class: 'source-byline', text: [a.author, campaignDisplayDate(a.date)].filter(Boolean).join(' · ') || 'Date and author not stated' })]);
    if (caseData.priorArtifactIds?.includes(a.id)) content.append(paragraph('Preserved Chapter 1 source. Its coverage statements describe the earlier collection. Consult the Chapter 2 briefing for the newly supplied records.', 'notice'));
    const images = artifactImages(a);
    const appendFigure = image => {
      const img = addImage(image.src, image.alt || a.title); const portrait = imageSrc(image.src)?.endsWith('-reference.png');
      const caption = image.caption || (portrait ? image.alt || a.title : '');
      if (img) content.append(node('figure', { class: `source-figure${portrait ? ' portrait-figure' : ''}` }, [img, caption ? node('figcaption', { text: caption }) : null]));
    };
    if (images.length) appendFigure(images[0]);
    content.append(node('div', { class: 'source-body' }, (a.body || []).map(text => paragraph(safeText(text)))));
    images.slice(1).forEach(appendFigure);
    if (a.type === 'table' || Array.isArray(a.rows)) content.append(renderDataTable(a));
    const related = (a.links || []).filter(item => artifactMap.has(item.artifactId));
    if (related.length) content.append(node('nav', { class: 'source-links', 'aria-label': 'Links in this source' }, related.map(item => link(item.label, artifactRoute(item.artifactId), 'chip'))));
    const citeStatus = node('span', { class: 'feedback', role: 'status' });
    const cite = button(returnQuestion ? `Cite in ${returnQuestion}` : 'Copy source ID', async () => {
      if (returnQuestion && questionMap.has(returnQuestion)) {
        const note = getNote(returnQuestion); const ids = evidenceIds(note); if (!ids.includes(a.id)) ids.push(a.id); note.evidence = ids.join(', '); saveNow(); citeStatus.textContent = `Added to ${returnQuestion}. Explain what it supports in your answer.`;
      } else {
        try { await navigator.clipboard.writeText(a.id); citeStatus.textContent = 'Source ID copied.'; }
        catch (_) { citeStatus.textContent = `Record this source ID: ${a.id}`; }
      }
    }, 'button-small');
    main.append(node('article', { class: `source-page ${sourceStyle(a)}` }, [node('header', { class: 'source-masthead' }, [node('span', { class: 'source-logo', text: a.site || 'Case archive' }), node('small', { text: 'Fictional source / training use' })]), content, node('footer', { class: 'source-footer' }, [node('div', {}, [node('strong', { text: a.id }), ' · Preserve context when you cite this source.']), node('div', {}, [cite, citeStatus])])]));
  }

  function renderDataTable(a) {
    const columns = a.columns || []; const rows = a.rows || []; let sortIndex = -1; let ascending = true;
    const search = node('input', { type: 'search', placeholder: 'Filter the visible dataset…', autocomplete: 'off' });
    const count = node('p', { class: 'result-meta', role: 'status', 'aria-live': 'polite' });
    const table = node('table', { class: 'data-table' });
    table.append(node('caption', { class: 'sr-only', text: `${a.title}. Select a column heading to sort.` }));
    const head = node('thead'); const body = node('tbody'); table.append(head, body);
    const update = () => {
      const term = search.value.toLowerCase(); const shown = rows.filter(row => row.map(safeText).join(' ').toLowerCase().includes(term)).slice();
      if (sortIndex >= 0) shown.sort((left, right) => {
        const l = safeText(left[sortIndex]); const r = safeText(right[sortIndex]);
        const comparison = l !== '' && r !== '' && Number.isFinite(Number(l)) && Number.isFinite(Number(r)) ? Number(l) - Number(r) : l.localeCompare(r, undefined, { numeric: true, sensitivity: 'base' });
        return ascending ? comparison : -comparison;
      });
      const headerRow = node('tr');
      columns.forEach((column, index) => headerRow.append(node('th', { scope: 'col', 'aria-sort': index === sortIndex ? ascending ? 'ascending' : 'descending' : 'none' }, button(`${column}${index === sortIndex ? ascending ? ' ↑' : ' ↓' : ' ↕'}`, () => { ascending = sortIndex === index ? !ascending : true; sortIndex = index; update(); head.querySelectorAll('button')[index]?.focus(); say(`Sorted by ${column}, ${ascending ? 'ascending' : 'descending'}.`); }))));
      head.replaceChildren(headerRow);
      body.replaceChildren(...shown.map(row => node('tr', {}, columns.map((_, index) => node('td', { text: safeText(row[index]) })))));
      if (!shown.length) body.append(node('tr', {}, node('td', { colspan: Math.max(columns.length, 1), text: 'No rows match this filter.' })));
      count.textContent = `${shown.length} of ${rows.length} rows shown${term ? ' · a local text filter is active' : ''}.`;
    };
    search.addEventListener('input', update); update();
    return node('section', { 'aria-label': 'Source dataset' }, [paragraph('Local table viewer: filtering searches cell text; it does not run KQL. Select a column heading to sort. This is a bounded evidence extract.', 'table-query-warning'), node('div', { class: 'table-tools' }, [field('Filter all columns', search), button('Clear filter', () => { search.value = ''; update(); search.focus(); }, 'button-small')]), count, node('div', { class: 'table-wrap', tabindex: '0', 'aria-label': 'Scrollable evidence table' }, table)]);
  }

  function fileChooser(label, action) {
    const input = node('input', { type: 'file', accept: '.json,application/json', class: 'sr-only', 'aria-label': label });
    input.addEventListener('change', async () => { if (input.files?.[0]) await action(input.files[0]); input.value = ''; });
    return node('label', { class: 'file-label' }, [label, input]);
  }
  function download(name, data, type) {
    saveNow(); const blob = new Blob([data], { type }); const url = URL.createObjectURL(blob);
    const a = node('a', { href: url, download: name }); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    say('Notebook download prepared.');
  }
  function exportObject() { return { version: VERSION, caseTitle: caseData.title, exportedAt: new Date().toISOString(), notes: state.notes, activeTrack: state.activeTrack }; }
  function exportText() {
    const lines = [caseData.title, 'STUDENT EVIDENCE NOTEBOOK', `Exported ${new Date().toISOString()}`, 'Fictional training environment. Completion is self-assessed, not an answer score.', ''];
    for (const track of caseData.tracks) {
      lines.push(track.label.toUpperCase(), '');
      for (const q of questionsFor(track)) {
        const note = state.notes[q.id] || blankNote();
        lines.push(`${q.id} — ${q.prompt}`, `Status: ${note.complete ? 'Ready for review' : 'In progress'} | Confidence: ${note.confidence}`, `Answer: ${note.answer || '(No answer recorded)'}`, `Sources: ${note.evidence || '(No sources recorded)'}`, `Working notes: ${note.notes || '(No notes recorded)'}`, `Query draft: ${note.query || '(No query recorded)'}`, '');
      }
    }
    return lines.join('\n');
  }
  function renderNotebook() {
    main.append(node('header', { class: 'page-heading' }, [node('span', { class: 'eyebrow', text: 'Evidence notebook / your reasoning' }), node('h1', { text: 'Make your case.' }), paragraph('Review your answers, evidence, and uncertainty. Notes are saved only in this browser. Export a copy to keep your work or move it to another device.') ]));
    const message = node('p', { class: 'feedback', role: 'status', 'aria-live': 'polite' });
    const importArea = node('div');
    const previewImport = async file => {
      message.className = 'feedback'; message.textContent = ''; importedPreview = null; importArea.replaceChildren();
      try {
        if (file.size > MAX_IMPORT_BYTES) throw new Error('Choose a notebook smaller than 16 MB.');
        const data = JSON.parse(await file.text()); const notes = validateNotebook(data); const ids = Object.keys(notes);
        const overlaps = ids.filter(id => state.notes[id] && Object.values(state.notes[id]).some(Boolean));
        importedPreview = notes;
        importArea.append(node('div', { class: 'import-preview' }, [node('h2', { text: 'Notebook ready to import' }), paragraph(`${ids.length} valid entries for this case. Import will replace ${overlaps.length} matching entries; other entries will be kept. Export your current notebook first if you want a backup.`), button('Import these entries', () => { Object.assign(state.notes, importedPreview); importedPreview = null; saveNow(); renderNotebookRefresh('Notebook imported. Matching entries have been updated.'); }, 'button-primary'), button('Cancel', () => { importedPreview = null; importArea.replaceChildren(); message.textContent = 'Import cancelled. Your notebook is unchanged.'; }, 'button-subtle')]));
      } catch (error) { message.className = 'feedback error'; message.textContent = `Could not import: ${error.message}`; }
    };
    main.append(node('div', { class: 'notebook-actions' }, [button('Export notebook JSON', () => download((caseData.notebookKey || 'high-five-notebook') + '.json', JSON.stringify(exportObject(), null, 2), 'application/json'), 'button-primary'), button('Download readable text', () => download((caseData.notebookKey || 'high-five-notebook') + '.txt', exportText(), 'text/plain;charset=utf-8')), fileChooser('Import notebook JSON', previewImport)]), message, importArea);
    const entries = node('div'); let entryCount = 0;
    for (const track of caseData.tracks) {
      const populated = questionsFor(track).filter(q => { const n = state.notes[q.id]; return n && (n.answer || n.notes || n.evidence || n.query || n.complete || n.confidence !== 'Not assessed'); });
      if (!populated.length) continue;
      entries.append(node('h2', { text: `${track.label} · ${countDone(track)} / ${questionsFor(track).length} complete` }));
      for (const q of populated) {
        entryCount++; const note = getNote(q.id);
        const sourceLinks = evidenceIds(note).flatMap(id => citationSources(id).length ? citationSources(id).map(sourceId => link(sourceId === id ? id : `${id} · ${sourceId}`, artifactRoute(sourceId), 'chip')) : [node('span', { class: 'chip', text: `${id} (not in collection)` })]);
        entries.append(node('article', { class: 'notebook-entry' }, [node('span', { class: 'eyebrow', text: q.id }), node('h2', {}, link(q.prompt, guideRoute(track.id, q.id))), node('div', { class: 'entry-meta' }, [node('span', { text: note.complete ? '✓ Ready for review' : 'In progress' }), node('span', { text: `Confidence: ${note.confidence}` })]), paragraph(note.answer || 'No answer recorded yet.', 'answer-preview'), node('div', { class: 'source-hints' }, sourceLinks), note.notes ? paragraph(note.notes, 'entry-notes') : null]));
      }
    }
    for (const entry of entries.querySelectorAll('.notebook-entry')) {
      const id = entry.querySelector('.eyebrow')?.textContent; const note = state.notes[id];
      if (note?.query) entry.append(node('details', { class: 'query-notebook-draft' }, [node('summary', { text: 'Saved query draft' }), node('pre', { text: note.query }), link('Continue this query →', '#/query/' + encodeURIComponent(id))]));
    }
    if (!entryCount) entries.append(node('div', { class: 'empty-results' }, [node('h2', { text: 'Your evidence trail starts here.' }), paragraph('Write an answer or working note in the investigation guide. It will appear here automatically.'), link('Start investigating →', '#/guide')]));
    main.append(node('div', { class: 'notebook-layout' }, [entries, node('aside', { class: 'notebook-aside' }, [node('h2', { text: 'Before you make a claim' }), node('ol', {}, [node('li', { text: 'Separate what the source shows from what you infer.' }), node('li', { text: 'Check names, timing, and context across sources.' }), node('li', { text: 'Record an alternative explanation or evidence gap.' })]), paragraph('This workspace has no teacher answer key and does not submit responses anywhere. Export your work when your teacher asks for it.', 'helper')])]));
  }
  function renderNotebookRefresh(text) { render(); say(text); }

  window.addEventListener('hashchange', () => { if (pendingSave) saveNow(); render(); moveFocus(); });
  window.addEventListener('pagehide', () => { if (caseData && pendingSave) saveNow(); });
  window.addEventListener('storage', event => {
    if ((event.key === STORAGE_KEY || event.key === null) && event.storageArea === localStorage) {
      preserveExternalStorage = true;
      clearTimeout(pendingSave); pendingSave = null;
      storageMessage('Another tab changed this notebook · export this tab’s work, then reload', true);
    }
  });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && caseData && pendingSave) saveNow(); });
  const caseGlobal = document.documentElement?.dataset?.caseGlobal || 'CAMPAIGN_CASE';
  if (!['CAMPAIGN_CASE', 'CAMPAIGN_CHAPTER_TWO'].includes(caseGlobal)) {
    renderError('This guide has an unsupported case-data binding.');
  } else if (window[caseGlobal]) {
    try { setCase(window[caseGlobal]); } catch (error) { renderError(error.message); }
  } else {
    fetch('../public-case.json', { cache: 'no-store' }).then(response => { if (!response.ok) throw new Error(`Case file could not be loaded (${response.status}).`); return response.json(); }).then(setCase).catch(error => renderError(error.message));
  }
})();
