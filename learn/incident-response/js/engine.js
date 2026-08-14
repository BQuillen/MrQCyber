/* ════════════════════════════════════════════════════════════════════
   INCIDENT RESPONSE — engine
   Generic phase state machine. Knows the shape of a scenario object
   (see scenarios.js) but nothing about any specific case, so new
   cases just get appended to SCENARIOS.
   ════════════════════════════════════════════════════════════════════ */

/* Phase list is built per scenario — a scenario that defines a `decrypt`
   block gets that phase inserted automatically, and the protect-phase
   label follows the scenario's own orgName, so nothing here is tied to
   any one case. */
function phasesFor(scn) {
  const phases = [
    { key:'briefing',    label:'Briefing' },
    { key:'locker',      label:'Evidence Locker' },
    { key:'timeline',    label:'Build the Timeline' }
  ];
  if (scn.decrypt) phases.push({ key:'decrypt', label:'Decrypt the Note' });
  phases.push(
    { key:'factcheck',         label:'Fact-Check the Board' },
    { key:'whatHappened',      label:'What Happened' },
    { key:'strongestEvidence', label:'Strongest Evidence' },
    { key:'protectHill',       label:'Protect ' + scn.orgName },
    { key:'reflect',           label:'Reflect' }
  );
  return phases;
}

const CAT_LABELS = { inbox:'Inbox', statements:'Statements', logs:'Logs', board:'Board' };

let S = null; // current game state

function evById(id) { return S.scn.evidence.find(e => e.id === id); }

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function esc(str) {
  const d = document.createElement('div');
  d.textContent = str == null ? '' : str;
  return d.innerHTML;
}

/* Escapes text, then highlights any clock-time mention within it —
   there's no separate time badge, so a time only stands out if the
   reader actually reads the evidence it's embedded in. */
function highlightTimes(str) {
  return esc(str).replace(/\b\d{1,2}:\d{2}\s*(?:a\.m\.|p\.m\.)?/gi, m => `<span class="ev-time-inline">${m}</span>`);
}

const TEACHER_HASH = '0ef9ab5dd7be8d31a8ea4c7ea4ab67c07af71f302940e514a20f12fbfb816cb5';
const TEACHER_KEY = 'ir-teacher-mode';

async function sha256Hex(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function isTeacherMode() {
  return localStorage.getItem(TEACHER_KEY) === '1';
}

function initTeacherGate() {
  const gate = document.getElementById('teacherGate');
  const popover = document.getElementById('teacherPopover');
  const pin = document.getElementById('teacherPin');
  const unlockBtn = document.getElementById('teacherUnlock');

  if (isTeacherMode()) gate.classList.add('active');

  gate.addEventListener('click', () => {
    if (isTeacherMode()) {
      autoSolveCurrentPhase();
      return;
    }
    popover.hidden = !popover.hidden;
    if (!popover.hidden) pin.focus();
  });

  async function tryUnlock() {
    const hash = await sha256Hex(pin.value);
    if (hash === TEACHER_HASH) {
      localStorage.setItem(TEACHER_KEY, '1');
      gate.classList.add('active');
      popover.hidden = true;
      pin.value = '';
    } else {
      pin.classList.add('wrong');
      popover.classList.add('shake');
      setTimeout(() => popover.classList.remove('shake'), 300);
      pin.value = '';
      pin.focus();
    }
  }

  unlockBtn.addEventListener('click', tryUnlock);
  pin.addEventListener('input', () => pin.classList.remove('wrong'));
  pin.addEventListener('keydown', e => { if (e.key === 'Enter') tryUnlock(); });
  document.addEventListener('click', e => {
    if (!popover.hidden && !popover.contains(e.target) && e.target !== gate) popover.hidden = true;
  });
}

/* Solves whatever phase is currently active exactly the way a correct
   playthrough would, then advances — same state transitions a student
   would trigger, just done instantly. */
function autoSolveCurrentPhase() {
  const key = S.phases[S.currentIdx].key;

  // briefing, locker, reflect: nothing to reveal — nothing to do

  if (key === 'timeline') {
    const t = S.timeline;
    t.slots = S.scn.timeline.slice();
    t.pool = S.scn.evidence.map(e => e.id).filter(id => !t.slots.includes(id));
    t.lastResult = t.slots.map((id, i) => id === S.scn.timeline[i]);
    renderPhase();
    return;
  }

  if (key === 'decrypt') {
    const st = S.decrypt;
    st.input = S.scn.decrypt.encoded;
    st.decoded = atob(st.input);
    st.selected = st.options.findIndex(o => o.correct);
    st.checked = true;
    st.correct = true;
    renderPhase();
    return;
  }

  if (key === 'factcheck') {
    const st = S.factcheck;
    st.items.forEach(it => { st.answers[it.id] = it.relevant; });
    st.checked = true;
    renderPhase();
    return;
  }

  if (key === 'whatHappened') {
    const st = S.whatHappened;
    st.selected = st.options.findIndex(o => o.correct);
    st.checked = true;
    st.correct = true;
    renderPhase();
    return;
  }

  if (key === 'strongestEvidence') {
    const st = S.strongestEvidence;
    const goods = st.options.filter(o => o.good).slice(0, S.scn.strongestEvidence.pick).map(o => o.id);
    st.selected = new Set(goods);
    st.checked = true;
    st.correct = true;
    renderPhase();
    return;
  }

  if (key === 'protectHill') {
    const st = S.protectHill;
    const goods = st.options.map((o, i) => ({ ...o, id:String(i) })).filter(o => o.good).slice(0, S.scn.protectHill.pick).map(o => o.id);
    st.selected = new Set(goods);
    st.checked = true;
    st.correct = true;
    renderPhase();
    return;
  }
}

/* ---------------- init / scenario load ---------------- */

function init() {
  const sel = document.getElementById('scenarioSel');
  sel.innerHTML = SCENARIOS.map((s, i) => `<option value="${i}">Case ${s.seq} · #${esc(s.caseNumber)} — ${esc(s.title)}</option>`).join('');
  sel.addEventListener('change', () => loadScenario(+sel.value));
  initTeacherGate();
  loadScenario(0);
}

function loadScenario(idx) {
  const scn = SCENARIOS[idx];
  S = {
    idx,
    scn,
    phases: phasesFor(scn),
    currentIdx: 0,
    unlockedIdx: 0,
    lockerCat: Object.keys(CAT_LABELS)[0],
    timeline: {
      pool: shuffle(scn.evidence.map(e => e.id)),
      slots: new Array(scn.timeline.length).fill(null),
      lastResult: null
    },
    decrypt: scn.decrypt ? {
      input: scn.decrypt.encoded,
      decoded: null,
      options: shuffle(scn.decrypt.question.options),
      selected: null,
      checked: false,
      correct: false
    } : null,
    factcheck: {
      items: shuffle(scn.factCheck.items),
      answers: {},
      checked: false
    },
    whatHappened: { options: shuffle(scn.whatHappened.options), selected: null, checked: false, correct: false },
    strongestEvidence: { options: shuffle(scn.strongestEvidence.options), selected: new Set(), checked: false, correct: false },
    protectHill: { options: shuffle(scn.protectHill.options), selected: new Set(), checked: false, correct: false }
  };
  document.getElementById('scenarioSel').value = idx;
  document.getElementById('caseBadge').textContent = 'Case ' + scn.seq + ' · #' + scn.caseNumber;
  renderPhaseList();
  renderPhase();
}

function goToPhase(i) {
  if (i > S.unlockedIdx) return;
  S.currentIdx = i;
  renderPhaseList();
  renderPhase();
  document.getElementById('phaseRoot').scrollIntoView({ behavior:'smooth', block:'start' });
}

function unlockNext() {
  S.currentIdx = Math.min(S.currentIdx + 1, S.phases.length - 1);
  S.unlockedIdx = Math.max(S.unlockedIdx, S.currentIdx);
  renderPhaseList();
  renderPhase();
}

function renderPhaseList() {
  const ol = document.getElementById('phaseList');
  ol.innerHTML = S.phases.map((p, i) => {
    let cls = 'locked';
    if (i < S.unlockedIdx || (i <= S.unlockedIdx && i < S.currentIdx)) cls = 'done';
    if (i === S.currentIdx) cls = 'active';
    if (i > S.unlockedIdx) cls = 'locked';
    const clickable = i <= S.unlockedIdx;
    return `<li class="${cls}" data-i="${i}" style="${clickable ? 'cursor:pointer' : ''}">
      <span class="dot">${cls === 'done' ? '' : i + 1}</span>${esc(p.label)}
    </li>`;
  }).join('');
  ol.querySelectorAll('li').forEach(li => {
    li.addEventListener('click', () => goToPhase(+li.dataset.i));
  });
}

function renderPhase() {
  const key = S.phases[S.currentIdx].key;
  const root = document.getElementById('phaseRoot');
  const renderers = {
    briefing: renderBriefing,
    locker: renderLocker,
    timeline: renderTimeline,
    decrypt: renderDecrypt,
    factcheck: renderFactCheck,
    whatHappened: renderWhatHappened,
    strongestEvidence: renderStrongestEvidence,
    protectHill: renderProtectHill,
    reflect: renderReflect
  };
  root.innerHTML = renderers[key]();
  wirePhase(key);
}

/* ---------------- briefing ---------------- */

function renderBriefing() {
  const b = S.scn.briefing;
  return `<div class="panel">
    <span class="eyebrow">${esc(S.scn.caseNumber)} · Mission briefing</span>
    <h2>${esc(b.heading)}</h2>
    ${b.lines.map(l => `<p>${esc(l)}</p>`).join('')}
    ${b.messages ? `<ul class="msg-list">${b.messages.map(m => `<li>${esc(m)}</li>`).join('')}</ul>` : ''}
    ${(b.linesAfter || []).map(l => `<p>${esc(l)}</p>`).join('')}
    <ul class="mission-list">${b.mission.map(m => `<li>${esc(m)}</li>`).join('')}</ul>
    <div class="panel-actions">
      <button class="btn gold" id="startBtn">Open the evidence locker →</button>
    </div>
  </div>`;
}

/* ---------------- evidence locker ---------------- */

function renderEvidenceBody(ev) {
  if (ev.email) {
    return `<div class="ev-mail">
      <div><strong>From:</strong> ${highlightTimes(ev.email.from)}</div>
      <div><strong>Subject:</strong> ${highlightTimes(ev.email.subject)}</div>
      <div>${highlightTimes(ev.email.body)}</div>
      <div><a class="ev-link" href="#" onclick="return false;">${esc(ev.email.linkText)}</a> → <span class="ev-link">${esc(ev.email.linkHref)}</span></div>
    </div>`;
  } else if (ev.lines) {
    return ev.lines.map(l => `<div class="ev-log-line">${highlightTimes(l)}</div>`).join('');
  } else if (ev.code) {
    return `<div class="ev-code">${esc(ev.code)}</div>`;
  } else if (ev.text) {
    return `<div>${highlightTimes(ev.text)}</div>`;
  }
  return '';
}

function renderEvidenceCard(ev) {
  return `<div class="ev-card">
    <div class="ev-head"><span class="ev-title">${esc(ev.title)}${ev.who ? ' — ' + esc(ev.who) : ''}</span></div>
    <div class="ev-body">${renderEvidenceBody(ev)}</div>
    <span class="ev-cat">${esc(CAT_LABELS[ev.cat] || ev.cat)}</span>
  </div>`;
}

function renderLocker() {
  const cats = Object.keys(CAT_LABELS);
  const items = S.scn.evidence.filter(e => e.cat === S.lockerCat);
  return `<div class="panel">
    <span class="eyebrow">${esc(S.scn.caseNumber)} · Evidence locker</span>
    <h2>Review everything on the table</h2>
    <p>Statements, logs, and items pulled from the staff room — some are timestamped, some aren't. Work through each category before you build the timeline.</p>
    <div class="locker-tabs">
      ${cats.map(c => `<button class="locker-tab ${S.lockerCat === c ? 'active' : ''}" data-cat="${c}">${esc(CAT_LABELS[c])}</button>`).join('')}
    </div>
    <div class="evidence-grid">${items.map(renderEvidenceCard).join('')}</div>
    <div class="panel-actions">
      <button class="btn gold" id="toTimelineBtn">Start building the timeline →</button>
    </div>
  </div>`;
}

/* ---------------- timeline ---------------- */

function renderTimelineCard(id, source) {
  const ev = evById(id);
  return `<div class="ev-card tl-card" draggable="true" data-id="${id}" data-source="${source}">
    <div class="ev-head"><span class="ev-title">${esc(ev.title)}${ev.who ? ' — ' + esc(ev.who) : ''}</span></div>
    <div class="ev-body">${renderEvidenceBody(ev)}</div>
    <span class="ev-cat">${esc(CAT_LABELS[ev.cat] || ev.cat)} · <em>drag or click</em></span>
  </div>`;
}

function renderTimeline() {
  const t = S.timeline;
  return `<div class="panel">
    <span class="eyebrow">${esc(S.scn.caseNumber)} · Timeline</span>
    <h2>Fill in the ${t.slots.length}-step timeline</h2>
    <p>Not everything below belongs on the timeline — some items describe the same moment from another angle, and a couple have nothing to do with this incident at all. Figure out which ${t.slots.length} mark a distinct step in what happened, then drag (or click) them into order below. Not everything has a timestamp — you'll have to reason some of these into place.</p>
    <div class="tl-sub">Unplaced (${t.pool.length})</div>
    <div class="evidence-grid" id="tlPool">
      ${t.pool.map(id => renderTimelineCard(id, 'pool')).join('') || '<p style="font-size:.82rem;color:var(--text-muted);">All items placed.</p>'}
    </div>
    <div class="tl-sub" style="margin-top:18px;">Timeline</div>
    <div class="tl-slots-full">
      ${t.slots.map((id, i) => {
        let cls = 'slot-full' + (id ? ' filled' : '');
        if (t.lastResult) cls += t.lastResult[i] ? ' correct' : ' wrong';
        return `<div class="${cls}" data-slot="${i}">
          <span class="slot-num">${i + 1}</span>
          <div class="slot-body">${id ? renderTimelineCard(id, i) : '<span class="slot-empty">Drop or click an item here</span>'}</div>
        </div>`;
      }).join('')}
    </div>
    ${t.lastResult ? `<div class="rationale-box ${t.lastResult.every(Boolean) ? 'good' : 'bad'}">
      <strong>${t.lastResult.every(Boolean) ? 'Timeline confirmed' : 'Not quite yet'}</strong>
      ${t.lastResult.filter(Boolean).length} of ${t.slots.length} in the right position. ${t.lastResult.every(Boolean) ? '' : 'Rework the order and check again — positions aren\'t shown, so re-reason from what each event describes.'}
    </div>` : ''}
    <div class="panel-actions">
      <button class="btn gold" id="checkTimelineBtn" ${t.slots.includes(null) ? 'disabled' : ''}>Check timeline</button>
      <button class="btn" id="toFactCheckBtn" ${t.lastResult && t.lastResult.every(Boolean) ? '' : 'disabled'}>Continue →</button>
    </div>
  </div>`;
}

function timelineMove(id, source, dest) {
  const t = S.timeline;
  if (source === 'pool') {
    t.pool = t.pool.filter(x => x !== id);
  } else {
    t.slots[source] = null;
  }
  if (dest === 'pool') {
    t.pool.push(id);
  } else {
    const occupant = t.slots[dest];
    if (occupant) {
      if (source === 'pool') t.pool.push(occupant);
      else t.slots[source] = occupant;
    }
    t.slots[dest] = id;
  }
  t.lastResult = null;
  renderPhase();
}

/* ---------------- decrypt the note ---------------- */

function renderDecrypt() {
  const d = S.scn.decrypt;
  const st = S.decrypt;
  return `<div class="panel">
    <span class="eyebrow">${esc(S.scn.caseNumber)} · Decrypt the note</span>
    <h2>${esc(d.heading)}</h2>
    <p>${esc(d.intro)}</p>
    <div class="tl-sub">Encoded text</div>
    <textarea id="decodeInput" class="decode-input" spellcheck="false">${esc(st.input)}</textarea>
    <div class="panel-actions">
      <button class="btn gold" id="decodeBtn">Decode</button>
    </div>
    ${st.decoded !== null ? `
      <div class="tl-sub" style="margin-top:16px;">Decoded text</div>
      <div class="decode-output">${esc(st.decoded)}</div>
      <h2 style="margin-top:22px;">${esc(d.question.prompt)}</h2>
      ${renderMCOptions(st.options, st)}
    ` : ''}
    <div class="panel-actions">
      ${st.decoded !== null && st.checked && !st.correct ? '<button class="btn gold" id="retryDecryptBtn">Try again</button>' : ''}
      ${st.decoded !== null && !st.checked ? `<button class="btn gold" id="submitDecryptBtn" ${st.selected === null ? 'disabled' : ''}>Submit answer</button>` : ''}
      <button class="btn" id="toFactCheckFromDecryptBtn" ${st.correct ? '' : 'disabled'}>Continue to fact-check →</button>
    </div>
  </div>`;
}

/* ---------------- fact check ---------------- */

function renderFactCheck() {
  const fc = S.scn.factCheck;
  const st = S.factcheck;
  const allAnswered = st.items.every(it => st.answers[it.id] !== undefined);
  const allCorrect = st.checked && st.items.every(it => st.answers[it.id] === it.relevant);
  return `<div class="panel">
    <span class="eyebrow">${esc(S.scn.caseNumber)} · Fact-check</span>
    <h2>${esc(fc.prompt)}</h2>
    <div class="fc-list">
      ${st.items.map(it => {
        const ev = evById(it.id);
        const ans = st.answers[it.id];
        let itemCls = '';
        if (st.checked) itemCls = (ans === it.relevant) ? 'correct' : 'wrong';
        return `<div class="fc-item ${itemCls}" data-id="${it.id}">
          <div class="fc-text"><strong>${esc(ev.title)}${ev.who ? ' — ' + esc(ev.who) : ''}:</strong> ${highlightTimes(ev.text || (ev.lines ? ev.lines.join(' ') : ''))}</div>
          <div class="fc-toggle">
            <button data-val="1" class="${ans === true ? 'selected' : ''}">Relevant</button>
            <button data-val="0" class="${ans === false ? 'selected' : ''}">Not relevant</button>
          </div>
          ${st.checked ? `<div class="fc-why">${esc(it.why)}</div>` : ''}
        </div>`;
      }).join('')}
    </div>
    <div class="panel-actions">
      <button class="btn gold" id="checkFactBtn" ${allAnswered ? '' : 'disabled'}>Check answers</button>
      <button class="btn" id="toWhatHappenedBtn" ${allCorrect ? '' : 'disabled'}>Continue →</button>
    </div>
  </div>`;
}

/* ---------------- single-choice MC (shared by "what happened" and any
   scenario's decrypt comprehension check) ---------------- */

function renderMCOptions(options, st) {
  return `<div class="opt-list">
    ${options.map((o, i) => {
      let cls = 'opt mc';
      if (st.selected === i) cls += ' selected';
      if (st.checked && st.selected === i) cls += o.correct ? ' correct' : ' incorrect';
      if (st.checked) cls += ' disabled';
      return `<button class="${cls}" data-i="${i}" ${st.checked ? 'disabled' : ''}>
        <span class="opt-mark">${st.selected === i ? '●' : ''}</span>
        <span>${esc(o.text)}</span>
      </button>`;
    }).join('')}
  </div>
  ${st.checked ? `<div class="rationale-box ${st.correct ? 'good' : 'bad'}">
    <strong>${st.correct ? 'Correct' : 'Not quite'}</strong>
    ${esc(options[st.selected].rationale)}
  </div>` : ''}`;
}

function wireMCOptions(root, options, st, { submitBtnId, retryBtnId }) {
  root.querySelectorAll('.opt.mc').forEach(btn => {
    btn.addEventListener('click', () => { st.selected = +btn.dataset.i; renderPhase(); });
  });
  const submitBtn = root.querySelector('#' + submitBtnId);
  if (submitBtn) submitBtn.addEventListener('click', () => {
    st.checked = true;
    st.correct = options[st.selected].correct;
    renderPhase();
  });
  const retryBtn = root.querySelector('#' + retryBtnId);
  if (retryBtn) retryBtn.addEventListener('click', () => { st.checked = false; renderPhase(); });
}

/* ---------------- what happened (single MC, gates the rest) ---------------- */

function renderWhatHappened() {
  const wh = S.scn.whatHappened;
  const st = S.whatHappened;
  return `<div class="panel">
    <span class="eyebrow">${esc(S.scn.caseNumber)} · What happened</span>
    <h2>${esc(wh.prompt)}</h2>
    ${renderMCOptions(st.options, st)}
    <div class="panel-actions">
      ${st.checked && !st.correct ? '<button class="btn gold" id="retryWhBtn">Try again</button>' : ''}
      ${!st.checked ? `<button class="btn gold" id="submitWhBtn" ${st.selected === null ? 'disabled' : ''}>Submit answer</button>` : ''}
      <button class="btn" id="toStrongestBtn" ${st.correct ? '' : 'disabled'}>Continue →</button>
    </div>
  </div>`;
}

/* ---------------- strongest evidence (multi-select) ---------------- */

function renderMultiSelect(cfg) {
  const { eyebrow, prompt, list, pickN, selectedSet, checked, correct, rationaleGood, rationaleBad, labelFor, nextBtnId, submitBtnId, retryBtnId } = cfg;
  return `<div class="panel">
    <span class="eyebrow">${esc(eyebrow)}</span>
    <h2>${esc(prompt)}</h2>
    <div class="pick-counter">Selected ${selectedSet.size} of ${pickN}</div>
    <div class="opt-list">
      ${list.map((item, i) => {
        const key = item.key;
        let cls = 'opt';
        if (selectedSet.has(key)) cls += ' selected';
        if (checked && selectedSet.has(key)) cls += item.good ? ' correct' : ' incorrect';
        if (checked) cls += ' disabled';
        return `<button class="${cls}" data-key="${esc(key)}" ${checked ? 'disabled' : ''}>
          <span class="opt-mark">${selectedSet.has(key) ? '✓' : ''}</span>
          <span class="opt-label">${labelFor(item)}</span>
        </button>`;
      }).join('')}
    </div>
    ${checked ? `<div class="rationale-box ${correct ? 'good' : 'bad'}">
      <strong>${correct ? 'Solid reasoning' : 'Reconsider'}</strong>
      ${esc(correct ? rationaleGood : rationaleBad)}
    </div>` : ''}
    <div class="panel-actions">
      ${checked && !correct ? `<button class="btn gold" id="${retryBtnId}">Try again</button>` : ''}
      ${!checked ? `<button class="btn gold" id="${submitBtnId}" ${selectedSet.size === pickN ? '' : 'disabled'}>Submit</button>` : ''}
      <button class="btn" id="${nextBtnId}" ${correct ? '' : 'disabled'}>Continue →</button>
    </div>
  </div>`;
}

function renderStrongestEvidence() {
  const se = S.scn.strongestEvidence;
  const st = S.strongestEvidence;
  return renderMultiSelect({
    eyebrow: `${S.scn.caseNumber} · Strongest evidence`,
    prompt: se.prompt,
    list: st.options.map(o => ({ key:o.id, good:o.good, blurb:o.blurb })),
    pickN: se.pick,
    selectedSet: st.selected,
    checked: st.checked,
    correct: st.correct,
    rationaleGood: se.rationaleGood,
    rationaleBad: se.rationaleBad,
    labelFor: item => {
      const ev = evById(item.key);
      return `<span class="opt-title">${esc(ev.title)}${ev.who ? ' — ' + esc(ev.who) : ''}</span><span class="opt-desc">${esc(item.blurb)}</span>`;
    },
    nextBtnId: 'toProtectBtn',
    submitBtnId: 'submitStrongestBtn',
    retryBtnId: 'retryStrongestBtn'
  });
}

/* ---------------- protect the hill (multi-select) ---------------- */

function renderProtectHill() {
  const ph = S.scn.protectHill;
  const st = S.protectHill;
  return renderMultiSelect({
    eyebrow: `${S.scn.caseNumber} · Protect ${S.scn.orgName}`,
    prompt: ph.prompt,
    list: st.options.map((o, i) => ({ key:String(i), good:o.good, text:o.text })),
    pickN: ph.pick,
    selectedSet: st.selected,
    checked: st.checked,
    correct: st.correct,
    rationaleGood: 'These three cut off the attacker\'s access, close the open door, and get ahead of the harm already done — that\'s the core of an immediate response.',
    rationaleBad: 'Some of these feel responsible, but slow you down or don\'t actually address what\'s still happening right now. Think about what genuinely stops harm in the next five minutes.',
    labelFor: item => esc(item.text),
    nextBtnId: 'toReflectBtn',
    submitBtnId: 'submitProtectBtn',
    retryBtnId: 'retryProtectBtn'
  });
}

/* ---------------- reflect ---------------- */

function renderReflect() {
  const r = S.scn.reflect;
  return `<div class="panel">
    <span class="eyebrow">${esc(S.scn.caseNumber)} · Case closed — reflect</span>
    <h2>What we believe happened</h2>
    <div class="reveal-box">${r.reveal.map(l => `<p>${esc(l)}</p>`).join('')}</div>

    <p>Consider the following questions to better understand the process of thinking through an investigation.</p>

    <ol class="reflect-q-list">${r.questions.map(q => `<li>${esc(q)}</li>`).join('')}</ol>

    <div class="panel-actions">
      <button class="btn gold" id="copyReflectBtn">⧉ Copy questions</button>
    </div>
  </div>`;
}

/* ---------------- wiring ---------------- */

function wirePhase(key) {
  const root = document.getElementById('phaseRoot');

  if (key === 'briefing') {
    root.querySelector('#startBtn').addEventListener('click', unlockNext);
  }

  if (key === 'locker') {
    root.querySelectorAll('.locker-tab').forEach(btn => {
      btn.addEventListener('click', () => { S.lockerCat = btn.dataset.cat; renderPhase(); });
    });
    root.querySelector('#toTimelineBtn').addEventListener('click', unlockNext);
  }

  if (key === 'timeline') {
    root.querySelectorAll('.tl-card').forEach(card => {
      const id = card.dataset.id;
      const source = card.dataset.source === 'pool' ? 'pool' : +card.dataset.source;

      card.addEventListener('click', () => {
        if (source === 'pool') {
          const openIdx = S.timeline.slots.indexOf(null);
          if (openIdx !== -1) timelineMove(id, 'pool', openIdx);
        } else {
          timelineMove(id, source, 'pool');
        }
      });

      card.addEventListener('dragstart', e => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', JSON.stringify({ id, source }));
        card.classList.add('dragging');
      });
      card.addEventListener('dragend', () => card.classList.remove('dragging'));
    });

    const dropZones = [root.querySelector('#tlPool'), ...root.querySelectorAll('.slot-full')];
    dropZones.forEach(zone => {
      zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
      zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
      zone.addEventListener('drop', e => {
        e.preventDefault();
        zone.classList.remove('drag-over');
        let data;
        try { data = JSON.parse(e.dataTransfer.getData('text/plain')); } catch (err) { return; }
        const dest = zone.id === 'tlPool' ? 'pool' : +zone.dataset.slot;
        if (data.source === dest) return;
        timelineMove(data.id, data.source, dest);
      });
    });

    const checkBtn = root.querySelector('#checkTimelineBtn');
    if (checkBtn) checkBtn.addEventListener('click', () => {
      S.timeline.lastResult = S.timeline.slots.map((id, i) => id === S.scn.timeline[i]);
      renderPhase();
    });
    root.querySelector('#toFactCheckBtn').addEventListener('click', unlockNext);
  }

  if (key === 'factcheck') {
    root.querySelectorAll('.fc-toggle button').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = btn.closest('.fc-item');
        S.factcheck.answers[item.dataset.id] = btn.dataset.val === '1';
        S.factcheck.checked = false;
        renderPhase();
      });
    });
    const checkBtn = root.querySelector('#checkFactBtn');
    if (checkBtn) checkBtn.addEventListener('click', () => { S.factcheck.checked = true; renderPhase(); });
    const nextBtn = root.querySelector('#toWhatHappenedBtn');
    if (nextBtn) nextBtn.addEventListener('click', unlockNext);
  }

  if (key === 'whatHappened') {
    wireMCOptions(root, S.whatHappened.options, S.whatHappened, { submitBtnId:'submitWhBtn', retryBtnId:'retryWhBtn' });
    const nextBtn = root.querySelector('#toStrongestBtn');
    if (nextBtn) nextBtn.addEventListener('click', unlockNext);
  }

  if (key === 'decrypt') {
    const input = root.querySelector('#decodeInput');
    if (input) input.addEventListener('input', () => { S.decrypt.input = input.value; });
    const decodeBtn = root.querySelector('#decodeBtn');
    if (decodeBtn) decodeBtn.addEventListener('click', () => {
      try {
        S.decrypt.decoded = atob(S.decrypt.input.trim());
      } catch (e) {
        S.decrypt.decoded = 'That doesn’t decode as valid Base64 — check for typos or missing characters and try again.';
      }
      renderPhase();
    });
    if (S.decrypt.decoded !== null) {
      wireMCOptions(root, S.decrypt.options, S.decrypt, { submitBtnId:'submitDecryptBtn', retryBtnId:'retryDecryptBtn' });
    }
    const nextBtn = root.querySelector('#toFactCheckFromDecryptBtn');
    if (nextBtn) nextBtn.addEventListener('click', unlockNext);
  }

  if (key === 'strongestEvidence') {
    wireMultiSelect({
      st: S.strongestEvidence,
      options: S.strongestEvidence.options,
      pickN: S.scn.strongestEvidence.pick,
      keyOf: o => o.id,
      submitBtnId: 'submitStrongestBtn',
      retryBtnId: 'retryStrongestBtn',
      nextBtnId: 'toProtectBtn'
    });
  }

  if (key === 'protectHill') {
    wireMultiSelect({
      st: S.protectHill,
      options: S.protectHill.options.map((o, i) => ({ ...o, id:String(i) })),
      pickN: S.scn.protectHill.pick,
      keyOf: o => o.id,
      submitBtnId: 'submitProtectBtn',
      retryBtnId: 'retryProtectBtn',
      nextBtnId: 'toReflectBtn'
    });
  }

  if (key === 'reflect') {
    root.querySelector('#copyReflectBtn').addEventListener('click', async () => {
      const text = S.scn.reflect.questions.map((q, i) => `${i + 1}. ${q}`).join('\n');
      try {
        await navigator.clipboard.writeText(text);
        const btn = root.querySelector('#copyReflectBtn');
        const old = btn.textContent;
        btn.textContent = '✓ Copied';
        setTimeout(() => { btn.textContent = old; }, 1600);
      } catch (e) { /* clipboard unavailable — nothing further to do */ }
    });
  }
}

function wireMultiSelect({ st, options, pickN, keyOf, submitBtnId, retryBtnId, nextBtnId }) {
  const root = document.getElementById('phaseRoot');
  root.querySelectorAll('.opt:not(.mc)').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.key;
      if (st.selected.has(key)) {
        st.selected.delete(key);
      } else if (st.selected.size < pickN) {
        st.selected.add(key);
      }
      renderPhase();
    });
  });
  const submitBtn = root.querySelector('#' + submitBtnId);
  if (submitBtn) submitBtn.addEventListener('click', () => {
    st.checked = true;
    st.correct = [...st.selected].every(key => {
      const opt = options.find(o => keyOf(o) === key);
      return opt && opt.good;
    });
    renderPhase();
  });
  const retryBtn = root.querySelector('#' + retryBtnId);
  if (retryBtn) retryBtn.addEventListener('click', () => {
    st.checked = false;
    st.selected = new Set();
    renderPhase();
  });
  const nextBtn = root.querySelector('#' + nextBtnId);
  if (nextBtn) nextBtn.addEventListener('click', unlockNext);
}

init();
