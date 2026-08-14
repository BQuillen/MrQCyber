/* ============================================================
   CHALLENGE ENGINE
   Two ways in:
     TRAINING RANGE — pick a cipher, work its set, always told what
                      it is. Later items stop handing you the key.
     LIVE TRIAGE    — endless stream, nothing labelled. Classify it
                      before the answer box unlocks.
   ============================================================ */

CHALLENGES.forEach((ch, i) => {
  ch.id = 'a' + i;
  ch.pts = 100 + (ch.hideKey ? 75 : 0) + (ch.type === 'hash' ? 50 : 0);
});

const DRILLS = {};                                   // built lazily, then cached
const drill = id => (DRILLS[id] ||= drillFor(id));

async function cipherTextOf(ch){
  if (ch.type === 'hash') return await CIPHERS.sha.enc(ch.pt, ch.k);
  const r = CIPHERS[ch.c].enc(ch.pt, ch.k);
  return (r instanceof Promise) ? await r : r;
}

const norm = s => String(s).toUpperCase().replace(/[^A-Z0-9]/g, '');
const rankOf = p => RANKS.filter(r => p >= r[0]).pop()[1];
const G = () => Store.get();

function solvedIn(cipherId){
  const g = G();
  return drill(cipherId).filter(c => g.solved[c.id]).length;
}

function refreshHud(){
  const g = G();
  const total = CIPHER_IDS.reduce((a, id) => a + solvedIn(id), 0);
  $('#stSolved').textContent = total + ' / ' + (CIPHER_IDS.length * DRILL_SIZE);
  $('#stPts').textContent    = g.pts;
  $('#stBest').textContent   = g.triage.best;
  $('#stRank').textContent   = rankOf(g.pts);
  const tb = $('#tcBest'), tt = $('#tcTotal');   // only present on the stream view
  if (tb) tb.textContent = g.triage.best;
  if (tt) tt.textContent = g.triage.solved;
}

function showRange(view){
  $('#rangeHome').hidden  = view !== 'home';
  $('#rangeSolve').hidden = view !== 'solve';
  window.scrollTo({top:0, behavior:'smooth'});
}

/* ============================================================
   CHALLENGE SET PICKER
   A native <select> cannot reliably show a green row and a tick
   on iOS, and progress per set is the whole point of this control,
   so it is a real listbox: a trigger plus a popup of options.
   ============================================================ */
const STREAM = '__stream';                        // the unidentified set
let pickVal = 'caesar';

const TICK = '<svg class="tick" width="15" height="15" viewBox="0 0 14 14" aria-hidden="true">'
  + '<path d="M2 7.5l3.2 3.2L12 4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function buildPicker(){
  const menu = $('#pickMenu'), g = G();
  const cats = {};
  CIPHER_IDS.forEach(id => (cats[CIPHERS[id].cat] ||= []).push(id));

  let html = '<div class="grp">Unidentified</div>'
    + '<button class="pick-opt stream" role="option" data-val="' + STREAM + '" aria-selected="false">'
    + TICK + '<span class="on">Live Triage &mdash; nothing labelled</span>'
    + '<span class="op">' + g.triage.solved + ' broken</span></button>';

  Object.entries(cats).forEach(([cat, ids]) => {
    html += '<div class="grp">' + esc(cat) + '</div>';
    ids.forEach(id => {
      const done = solvedIn(id), full = done === DRILL_SIZE;
      html += '<button class="pick-opt' + (full ? ' done' : '') + '" role="option" data-val="' + id + '" aria-selected="false">'
        + TICK + '<span class="on">' + esc(CIPHERS[id].name) + '</span>'
        + '<span class="op">' + done + ' / ' + DRILL_SIZE + '</span></button>';
    });
  });
  menu.innerHTML = html;

  menu.querySelectorAll('.pick-opt').forEach(o => {
    o.onclick = () => { closePicker(); setPick(o.dataset.val); };
  });
  paintTrigger();
}

function paintTrigger(){
  const g = G();
  const opts = [...$('#pickMenu').querySelectorAll('.pick-opt')];
  opts.forEach(o => o.setAttribute('aria-selected', o.dataset.val === pickVal));
  if (pickVal === STREAM){
    $('#pickName').innerHTML = 'Live Triage<span class="pt-cat" id="pickCat">Unidentified &middot; endless</span>';
    $('#pickProg').textContent = g.triage.solved + ' broken';
    $('#pickProg').className = 'pt-prog';
  } else {
    const c = CIPHERS[pickVal], done = solvedIn(pickVal), full = done === DRILL_SIZE;
    $('#pickName').innerHTML = esc(c.name) + '<span class="pt-cat" id="pickCat">' + esc(c.cat) + '</span>';
    $('#pickProg').innerHTML = (full ? '&#10003; ' : '') + done + ' / ' + DRILL_SIZE;
    $('#pickProg').className = 'pt-prog' + (full ? ' done' : '');
  }
}

function openPicker(){
  buildPicker();
  $('#pickMenu').hidden = false;
  $('#pickBtn').setAttribute('aria-expanded','true');
  const sel = $('#pickMenu .pick-opt[aria-selected="true"]');
  if (sel) sel.focus();
}
function closePicker(){
  $('#pickMenu').hidden = true;
  $('#pickBtn').setAttribute('aria-expanded','false');
}
function togglePicker(){ $('#pickMenu').hidden ? openPicker() : closePicker(); }

function setPick(val){
  pickVal = val;
  G().lastPick = val; Store.save();
  paintTrigger();
  renderSet();
  showRange('home');
}

/* ---------- the content under the picker ---------- */
function renderSet(){
  const host = $('#rangeContent');
  refreshHud();
  if (pickVal === STREAM){ renderStream(host); return; }

  const cipherId = pickVal, c = CIPHERS[cipherId], list = drill(cipherId), g = G();
  const done = solvedIn(cipherId), full = done === DRILL_SIZE;

  host.innerHTML =
    '<div class="card" style="margin-top:14px"><div class="card-h">'
    + '<h2>' + esc(c.name) + '</h2>'
    + '<span class="tag ' + (full ? 'ok' : '') + '">' + (full ? '&#10003; ' : '') + done + ' / ' + DRILL_SIZE + '</span>'
    + '<span style="margin-left:auto"><button class="btn ghost sm" id="setBench">Open in Workbench</button></span>'
    + '</div><div class="card-b">'
    + (full ? '<div class="notice teal"><b>Set complete.</b> Every intercept in this set is broken. Try it unlabelled in Live Triage.</div>' : '')
    + '<div class="notice teal"><b>How to spot it.</b> ' + esc(c.history.tell) + '</div>'
    + '<div class="clist" id="setList" style="margin-top:14px"></div></div></div>';

  const listHost = $('#setList');
  list.forEach((ch, i) => {
    const b = el('button', 'ccard' + (g.solved[ch.id] ? ' done' : ''));
    const keyTag = ch.hideKey ? 'Key withheld' : (CIPHERS[ch.c].keys.length ? 'Key given' : 'No key');
    b.innerHTML = '<div class="num">' + String(i+1).padStart(2,'0') + (ch.generated ? '' : ' &middot; featured') + '</div>'
      + '<div class="ttl">' + esc(ch.t) + '</div>'
      + '<span class="tag ' + (ch.hideKey ? '' : 'ok') + '">' + keyTag + '</span> '
      + '<span class="tag">' + ch.pts + ' pts</span>';
    b.onclick = () => openChallenge(ch, {mode:'drill', cipherId});
    listHost.appendChild(b);
  });

  $('#setBench').onclick = () => { switchTab('bench'); selectCipher(cipherId); window.scrollTo({top:0,behavior:'smooth'}); };
}

function renderStream(host){
  const g = G();
  const complete = CIPHER_IDS.filter(id => solvedIn(id) === DRILL_SIZE).length;
  host.innerHTML =
    '<div class="triage-card" style="margin-top:14px"><div class="tc-body">'
    + '<p class="eyebrow" style="color:var(--navy-900)">Unclassified stream</p>'
    + '<h2>Live Triage</h2>'
    + '<p class="tc-copy">Intercepts arrive with no label. Nothing tells you what you are looking at &mdash; '
    + 'you classify it first, then break it. The stream does not run out.</p>'
    + '<button class="btn" id="btnTriage">Start a run</button></div>'
    + '<div class="tc-side">'
    + '<div><span id="tcBest">' + g.triage.best + '</span><small>best run</small></div>'
    + '<div><span id="tcTotal">' + g.triage.solved + '</span><small>total broken</small></div>'
    + '</div></div>'
    + '<div class="card" style="margin-top:14px"><div class="card-b">'
    + '<p class="hint" style="margin:0">Sets finished so far: <b style="color:var(--teal)">' + complete + ' / ' + CIPHER_IDS.length + '</b>. '
    + 'Every cipher can appear here, including ones you have not drilled yet.</p></div></div>';
  $('#btnTriage').onclick = startTriage;
}

/* ---------- LIVE TRIAGE: the endless stream ---------- */
let runState = null;

function startTriage(){
  runState = {seed: String(Date.now()), step: 0, streak: 0, broken: 0};
  G().triage.runs++; Store.save();
  nextTriage();
}

function nextTriage(){
  runState.step++;
  const r = rngFrom(runState.seed + ':' + runState.step);
  let ch;
  // Mix authored intercepts into the stream — they carry the better writing.
  if (r() < 0.35){
    const src = CHALLENGES[Math.floor(r() * CHALLENGES.length)];
    ch = Object.assign({}, src, {
      id: 'T:' + runState.seed + ':' + runState.step,
      hideCipher: true,
      hideKey: !!src.hideKey && !!CRACKABLE[src.c],
      brief: 'Pulled off the wire with no header and no classification.'
    });
    ch.pts = 175 + (ch.hideKey ? 75 : 0) + (ch.type === 'hash' ? 50 : 0);
  } else {
    const cid = CIPHER_IDS[Math.floor(r() * CIPHER_IDS.length)];
    ch = generate(cid, pickInt(r, 1, 9999), {
      id: 'T:' + runState.seed + ':' + runState.step,
      hideCipher: true,
      hideKey: !!CRACKABLE[cid] && r() < 0.55
    });
  }
  openChallenge(ch, {mode:'triage'});
}

/* ---------- SOLVE VIEW (shared by both modes) ---------- */
let cur = null, ctx = null, identified = false;

async function openChallenge(ch, context){
  cur = ch; ctx = context;
  identified = !ch.hideCipher;
  ch._ct = await cipherTextOf(ch);
  const g = G();
  const already = !!g.solved[ch.id];

  const ctBlock = ch.c === 'pigpen'
    ? '<div class="cipherbox" id="ctGlyph"></div>'
    : '<div class="cipherbox">' + esc(ch._ct) + '</div>';

  const candBlock = ch.candidates
    ? '<p class="hint" style="margin:12px 0 0">Candidate passwords &mdash; hash each one and compare:</p><div class="cands">'
      + ch.candidates.map(x => '<code>' + esc(x) + '</code>').join('') + '</div>'
    : '';

  const idBlock = ch.hideCipher
    ? '<div class="idrow"><label class="fl" for="idSel">Classify this intercept</label>'
      + '<div style="display:flex;gap:9px;flex-wrap:wrap">'
      + '<select id="idSel" style="flex:1 1 220px"></select>'
      + '<button class="btn gold" id="btnId" type="button">Classify</button></div>'
      + '<div id="idMsg"></div></div>'
    : '';

  const runBar = ctx.mode === 'triage'
    ? '<div class="runbar"><span class="lbl">Intercept</span><b id="rbStep">' + runState.step + '</b>'
      + '<span class="lbl" style="margin-left:14px">Streak</span><b id="rbStreak">' + runState.streak + '</b>'
      + '<span class="lbl" style="margin-left:14px">Best</span><b id="rbBest">' + g.triage.best + '</b>'
      + '<span style="margin-left:auto;display:flex;gap:8px">'
      + '<button class="btn ghost sm" id="btnSkip">Skip</button>'
      + '<button class="btn ghost sm" id="btnEnd">End run</button></span></div>'
    : '';

  const coldNudge = 'Start with what the message is <i>made of</i>, not what it says. '
    + 'Letters only? Numbers? Just two symbols repeating? Shapes with corners? Hex pairs? '
    + 'That narrows it to two or three before you try anything.';

  $('#rangeSolve').innerHTML =
    '<div style="margin-top:20px;display:flex;gap:10px;align-items:center;flex-wrap:wrap">'
    + '<button class="btn ghost sm" id="btnBack">' + (ctx.mode === 'triage' ? '&larr; Leave run' : '&larr; Back') + '</button>'
    + '<span class="eyebrow" style="margin:0">'
    + (ctx.mode === 'triage' ? 'Live Triage &middot; unclassified' : esc(CIPHERS[ch.c].name))
    + ' &middot; ' + ch.pts + ' points</span></div>'
    + runBar
    + '<div class="grid2" style="margin-top:12px"><div class="card">'
    + '<div class="card-h"><h2>' + esc(ch.t) + '</h2><span id="keySlot"></span></div>'
    + '<div class="card-b">'
    + '<div class="brief">' + esc(ch.brief) + '</div>'
    + ctBlock + candBlock
    + idBlock
    + '<div class="answerrow">'
    + '<input type="text" id="ansBox" placeholder="'
    + (ch.type === 'hash' ? 'Which candidate produces this hash?' : 'Type the decoded message…')
    + '" ' + (identified ? '' : 'disabled') + ' autocomplete="off" spellcheck="false">'
    + '<button class="btn" id="btnAns" ' + (identified ? '' : 'disabled') + '>Submit</button>'
    + '<button class="btn ghost" id="btnBench">Open in Workbench</button></div>'
    + '<div id="ansMsg">' + (already ? '<div class="notice teal">Already solved. Run it again if you want the practice.</div>' : '') + '</div>'
    + '<details class="hintbox"><summary>Need a nudge?</summary><div class="in" id="nudge">'
    + (identified ? esc(CIPHERS[ch.c].history.tell) : coldNudge) + '</div></details>'
    + '</div></div>'
    + '<div class="card scratch"><div class="card-h"><h3>Scratch pad</h3></div><div class="card-b">'
    + '<p class="hint" style="margin:0 0 8px">Yours alone. Nothing here is submitted or graded.</p>'
    + '<textarea id="scratch" spellcheck="false" placeholder="Working…"></textarea>'
    + '</div></div></div>';

  if (ch.c === 'pigpen') renderGlyphs($('#ctGlyph'), ch._ct, 30);
  paintKeySlot();

  if (ch.hideCipher){
    const cats = {};
    CIPHER_IDS.forEach(id => (cats[CIPHERS[id].cat] ||= []).push(id));
    $('#idSel').innerHTML = '<option value="">— choose —</option>'
      + Object.entries(cats).map(([cat, ids]) =>
        '<optgroup label="' + cat + '">'
        + ids.map(id => '<option value="' + id + '">' + CIPHERS[id].name + '</option>').join('')
        + '</optgroup>').join('');
    $('#btnId').onclick = () => {
      const guess = $('#idSel').value;
      if (!guess) return;
      if (guess === ch.c){
        identified = true;
        $('#idMsg').innerHTML = '<div class="notice teal"><b>Classified &mdash; ' + esc(CIPHERS[ch.c].name)
          + '.</b> ' + esc(CIPHERS[ch.c].history.tell) + '</div>';
        $('#nudge').innerHTML = esc(CIPHERS[ch.c].history.tell);
        $('#ansBox').disabled = false; $('#btnAns').disabled = false; $('#ansBox').focus();
        paintKeySlot();
      } else {
        if (ctx.mode === 'triage'){ runState.streak = 0; $('#rbStreak').textContent = '0'; }
        $('#idMsg').innerHTML = '<div class="notice bad">Not ' + esc(CIPHERS[guess].name)
          + '. Look at the raw material again &mdash; which characters actually appear, and how are they grouped?</div>';
      }
    };
  }

  $('#scratch').value = g.notes[ch.id] || '';
  $('#scratch').addEventListener('input', e => { G().notes[ch.id] = e.target.value; Store.save(); });

  $('#btnBack').onclick = () => { if (ctx.mode === 'triage') endRun(); else setPick(ctx.cipherId); };
  $('#btnAns').onclick = checkAnswer;
  $('#ansBox').addEventListener('keydown', e => { if (e.key === 'Enter') checkAnswer(); });
  $('#btnBench').onclick = toBench;
  if (ctx.mode === 'triage'){
    $('#btnSkip').onclick = () => { runState.streak = 0; nextTriage(); };
    $('#btnEnd').onclick  = endRun;
  }

  showRange('solve');
}

// The key is only shown once you have earned the right to see it:
// in triage that means after you have classified the intercept.
function paintKeySlot(){
  const ch = cur, slot = $('#keySlot');
  if (!slot) return;
  if (ch.hideCipher && !identified){ slot.innerHTML = '<span class="tag">Classify first</span>'; return; }
  if (ch.hideKey){ slot.innerHTML = '<span class="tag">Key withheld</span>'; return; }
  const ks = CIPHERS[ch.c].keys;
  slot.innerHTML = ks.length
    ? ks.map(f => '<span class="tag ok">' + esc(f.label) + ': ' + (esc(String(ch.k[f.id] ?? '')) || '(none)') + '</span>').join(' ')
    : '<span class="tag">No key needed</span>';
}

// Carries the ciphertext AND, where the student is allowed to see it,
// the key straight into the Workbench so nobody is retyping.
function toBench(){
  const ch = cur;
  switchTab('bench');
  if (identified){
    selectCipher(ch.c);
    if (!ch.hideKey) CIPHERS[ch.c].keys.forEach(f => {
      const n = $('#k_' + f.id);
      if (n && ch.k[f.id] != null && ch.k[f.id] !== '') n.value = ch.k[f.id];
    });
  }
  setDir(ch.type === 'hash' ? 'enc' : 'dec');
  if (ch.c === 'pigpen') glyphBuf = '';
  else if (ch.type !== 'hash') $('#inBox').value = ch._ct;
  run();
  window.scrollTo({top:0, behavior:'smooth'});
}

async function checkAnswer(){
  const ch = cur, val = $('#ansBox').value;
  if (!val.trim()) return;
  // Bacon folds I/J and U/V together, so accept either spelling there.
  const fold = s => ch.c === 'bacon' ? norm(s).replace(/J/g,'I').replace(/V/g,'U') : norm(s);
  const right = (ch.type === 'hash')
    ? (await CIPHERS.sha.enc(val.trim(), ch.k)) === ch._ct
    : fold(val) === fold(ch.pt);
  const g = G();

  if (right){
    if (ctx.mode === 'triage'){
      runState.broken++; runState.streak++;
      g.pts += ch.pts; g.triage.solved++;
      if (runState.streak > g.triage.best) g.triage.best = runState.streak;
      Store.save();
      $('#rbStreak').textContent = runState.streak;
      $('#rbBest').textContent = g.triage.best;
      $('#ansMsg').innerHTML = '<div class="notice teal"><b>Broken.</b> +' + ch.pts
        + ' points &middot; streak ' + runState.streak
        + '. Plaintext: <span style="font-family:var(--mono)">' + esc(ch.pt) + '</span>'
        + '<div style="margin-top:10px"><button class="btn" id="btnNext">Next intercept &rarr;</button></div></div>';
      $('#btnNext').onclick = nextTriage;
    } else {
      const first = !g.solved[ch.id];
      if (first){ g.solved[ch.id] = true; g.pts += ch.pts; Store.save(); }
      $('#ansMsg').innerHTML = '<div class="notice teal"><b>Solved.</b> '
        + (first ? '+' + ch.pts + ' points. ' : 'Already credited. ')
        + 'Plaintext: <span style="font-family:var(--mono)">' + esc(ch.pt) + '</span>'
        + '<div style="margin-top:10px"><button class="btn ghost" id="btnNextDrill">Back to the set</button></div></div>';
      $('#btnNextDrill').onclick = () => setPick(ctx.cipherId);
    }
    $('#btnAns').disabled = true;
    refreshHud();
  } else {
    if (ctx.mode === 'triage'){ runState.streak = 0; $('#rbStreak').textContent = '0'; }
    $('#ansMsg').innerHTML = '<div class="notice bad">Not yet. Spacing and punctuation are ignored, so only the letters and digits have to match &mdash; look for one wrong letter rather than rereading the whole thing.</div>';
    refreshHud();
  }
}

function endRun(){
  const g = G(), broken = runState ? runState.broken : 0;
  $('#rangeSolve').innerHTML =
    '<div class="card" style="margin-top:20px"><div class="card-h"><h2>Run complete</h2></div><div class="card-b">'
    + '<div class="hud" style="margin-top:0">'
    + '<div class="stat"><div class="n">' + broken + '</div><div class="l">Broken this run</div></div>'
    + '<div class="stat"><div class="n gold">' + g.triage.best + '</div><div class="l">Best streak</div></div>'
    + '<div class="stat"><div class="n">' + g.triage.solved + '</div><div class="l">Career total</div></div></div>'
    + '<div style="display:flex;gap:9px;margin-top:16px;flex-wrap:wrap">'
    + '<button class="btn" id="againBtn">Run it again</button>'
    + '<button class="btn ghost" id="homeBtn">Back to the range</button></div></div></div>';
  $('#againBtn').onclick = startTriage;
  $('#homeBtn').onclick  = () => { setPick(STREAM); };
  runState = null;
  refreshHud();
}

/* ============================================================
   FIELD GUIDE
   ============================================================ */
function buildGuide(){
  $('#guideCount').textContent = CIPHER_IDS.length + ' entries';
  $('#guideBody').innerHTML = CIPHER_IDS.map(id => {
    const c = CIPHERS[id], h = c.history;
    return '<details class="hintbox" style="margin-bottom:9px">'
      + '<summary style="color:var(--teal);font-size:12px">' + esc(c.name)
      + ' <span style="color:var(--muted);letter-spacing:.06em">&middot; ' + esc(c.cat) + '</span></summary>'
      + '<div class="in"><dl class="dl">'
      + '<dt>Where it comes from</dt><dd>' + esc(h.origin) + '</dd>'
      + '<dt>The story</dt><dd>' + esc(h.story) + '</dd>'
      + '<dt>What it was used for</dt><dd>' + esc(h.usedFor) + '</dd>'
      + '<dt>How to spot it</dt><dd class="q">' + esc(h.tell) + '</dd></dl>'
      + '<div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">'
      + '<button class="btn ghost sm" data-open="' + id + '">Try it in the Workbench</button>'
      + '<button class="btn ghost sm" data-drill="' + id + '">Practise it</button>'
      + '</div></div></details>';
  }).join('');
  $('#guideBody').querySelectorAll('[data-open]').forEach(b =>
    b.onclick = () => { switchTab('bench'); selectCipher(b.dataset.open); window.scrollTo({top:0,behavior:'smooth'}); });
  $('#guideBody').querySelectorAll('[data-drill]').forEach(b =>
    b.onclick = () => { switchTab('range'); setPick(b.dataset.drill); });
}

/* ============================================================
   WIRING
   ============================================================ */
function switchTab(which){
  ['bench','range','learn'].forEach(t => {
    const on = t === which;
    $('#tab-' + t).setAttribute('aria-selected', on);
    $('#p-' + t).classList.toggle('active', on);
  });
  if (which === 'range') refreshHud();
}

document.addEventListener('DOMContentLoaded', () => {
  buildCipherSelect();
  buildGuide();
  buildPicker();
  pickVal = G().lastPick || 'caesar';
  if (pickVal !== STREAM && !CIPHERS[pickVal]) pickVal = 'caesar';
  setPick(pickVal);

  $('#cipherSel').addEventListener('change', e => selectCipher(e.target.value));
  $('#inBox').addEventListener('input', run);
  $('#dirEnc').onclick = () => setDir('enc');
  $('#dirDec').onclick = () => setDir('dec');

  $('#btnSwap').onclick = () => {
    if (curId === 'pigpen') return;
    $('#inBox').value = $('#outBox').value;
    setDir(dir === 'enc' ? 'dec' : 'enc');
  };
  $('#btnClear').onclick = () => { $('#inBox').value = ''; glyphBuf = ''; run(); };
  $('#btnCopy').onclick = async () => {
    try { await navigator.clipboard.writeText($('#outBox').value); }
    catch(e){ $('#outBox').select(); document.execCommand('copy'); }
    $('#btnCopy').textContent = 'Copied';
    setTimeout(() => { $('#btnCopy').textContent = 'Copy'; }, 1200);
  };
  $('#btnPaste').onclick = async () => {
    try { $('#inBox').value = await navigator.clipboard.readText(); run(); }
    catch(e){ $('#inBox').focus(); }
  };

  $('#glyphBack').onclick  = () => { glyphBuf = glyphBuf.slice(0,-1); run(); };
  $('#glyphSpace').onclick = () => { glyphBuf += ' '; run(); };
  $('#glyphWipe').onclick  = () => { glyphBuf = ''; run(); };

  $('#tab-bench').onclick = () => switchTab('bench');
  $('#tab-range').onclick = () => switchTab('range');
  $('#tab-learn').onclick = () => switchTab('learn');

  // picker interaction
  $('#pickBtn').onclick = togglePicker;
  document.addEventListener('click', e => {
    if (!e.target.closest('.picker')) closePicker();
  });
  document.addEventListener('keydown', e => {
    if ($('#pickMenu').hidden) return;
    const opts = [...$('#pickMenu').querySelectorAll('.pick-opt')];
    const i = opts.indexOf(document.activeElement);
    if (e.key === 'Escape'){ closePicker(); $('#pickBtn').focus(); }
    else if (e.key === 'ArrowDown'){ e.preventDefault(); opts[Math.min(i+1, opts.length-1)].focus(); }
    else if (e.key === 'ArrowUp'){ e.preventDefault(); opts[Math.max(i-1, 0)].focus(); }
  });

  $('#btnReset').onclick = () => {
    if (confirm('Clear all solved intercepts, points, streaks and scratch notes?')){
      Store.reset(); buildPicker(); setPick(pickVal);
    }
  };

  selectCipher('caesar');
  setDir('enc');
  $('#inBox').value = 'THE PATTERN IS THE KEY';
  run();
});
