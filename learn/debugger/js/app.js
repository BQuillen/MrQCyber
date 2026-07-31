/* ============================================================
   Debugger — app engine
   Renders the lesson data in TRACKS, runs student code, and grades
   the repair jobs against the live result.
   ============================================================ */

(function () {
  'use strict';

  const STORE = 'mrq-debugger-v1';
  const ORDER = ['html', 'css', 'js', 'python'];

  /* ---------- element refs ---------- */
  const $ = sel => document.querySelector(sel);
  const el = {
    picker: $('#view-picker'),
    lesson: $('#view-lesson'),
    langGrid: $('#lang-grid'),
    steps: $('#steps'),
    railBody: $('#rail-body'),
    railFoot: $('#rail-foot'),
    tabs: $('#tabs'),
    editor: $('#editor'),
    gutter: $('#gutter'),
    hl: $('#code-hl'),
    ta: $('#code-ta'),
    outWrap: $('#out-wrap'),
    outLabel: $('#out-label'),
    runBtn: $('#run-btn'),
    resetBtn: $('#reset-btn'),
    barTrack: $('#bar-track'),
    barIcon: $('#bar-icon'),
    barName: $('#bar-name'),
    barFill: $('#bar-fill'),
    barCount: $('#bar-count'),
    toast: $('#toast')
  };

  /* ---------- persisted state ---------- */

  let saved = { progress: {}, code: {} };
  try {
    const raw = localStorage.getItem(STORE);
    if (raw) saved = Object.assign(saved, JSON.parse(raw));
  } catch (e) { /* private browsing — run without saving */ }

  const persist = () => {
    try { localStorage.setItem(STORE, JSON.stringify(saved)); } catch (e) { }
  };

  /* ---------- live state ---------- */

  const S = {
    track: null,
    idx: 0,
    stage: null,
    files: [],        // working copies { name, lang, editable, code }
    active: 0,        // index of the open file tab
    hintLevel: 0,
    results: null,    // last check results, or null
    typing: null
  };

  // stops loadStage()'s own hash update from bouncing back through boot()
  let selfNav = false;

  /* ============================================================
     SYNTAX HIGHLIGHTING
     Purely decorative — it must never change the text, only wrap it.
     ============================================================ */

  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const wrap = (t, c) => (c ? '<span class="' + c + '">' + esc(t) + '</span>' : esc(t));

  function hlHtml(s) {
    let out = '', i = 0, m;
    while (i < s.length) {
      const rest = s.slice(i);
      if ((m = /^<!--[\s\S]*?(?:-->|$)/.exec(rest))) { out += wrap(m[0], 't-com'); i += m[0].length; continue; }
      if ((m = /^<!\[\s\S]*?>|^<![^>]*>/.exec(rest))) { out += wrap(m[0], 't-tag'); i += m[0].length; continue; }
      if ((m = /^<\/?[a-zA-Z][\w:-]*(?:"[^"]*"|'[^']*'|[^>"'])*>?/.exec(rest))) {
        out += hlTag(m[0]); i += m[0].length; continue;
      }
      if ((m = /^&[a-zA-Z#][\w]*;/.exec(rest))) { out += wrap(m[0], 't-num'); i += m[0].length; continue; }
      if ((m = /^[^<&]+/.exec(rest))) { out += esc(m[0]); i += m[0].length; continue; }
      out += esc(s[i]); i++;
    }
    return out;
  }

  function hlTag(t) {
    let out = '', i = 0, m, seenName = false;
    while (i < t.length) {
      const rest = t.slice(i);
      if ((m = /^(<\/|<|\/>|>)/.exec(rest))) { out += wrap(m[0], 't-punc'); i += m[0].length; continue; }
      if ((m = /^"[^"]*"?|^'[^']*'?/.exec(rest))) { out += wrap(m[0], 't-str'); i += m[0].length; continue; }
      if ((m = /^=/.exec(rest))) { out += wrap(m[0], 't-punc'); i += m[0].length; continue; }
      if ((m = /^[a-zA-Z][\w:.-]*/.exec(rest))) {
        out += wrap(m[0], seenName ? 't-atr' : 't-tag');
        seenName = true; i += m[0].length; continue;
      }
      if ((m = /^\s+/.exec(rest))) { out += esc(m[0]); i += m[0].length; continue; }
      out += esc(t[i]); i++;
    }
    return out;
  }

  function hlCss(s) {
    let out = '', i = 0, depth = 0, m;
    while (i < s.length) {
      const rest = s.slice(i);
      if ((m = /^\/\*[\s\S]*?(?:\*\/|$)/.exec(rest))) { out += wrap(m[0], 't-com'); i += m[0].length; continue; }
      if (s[i] === '{') { out += wrap('{', 't-punc'); depth++; i++; continue; }
      if (s[i] === '}') { out += wrap('}', 't-punc'); depth = Math.max(0, depth - 1); i++; continue; }
      if ((m = /^"[^"\n]*"?|^'[^'\n]*'?/.exec(rest))) { out += wrap(m[0], 't-str'); i += m[0].length; continue; }
      if (depth > 0) {
        if ((m = /^[-a-zA-Z]+(?=\s*:)/.exec(rest))) { out += wrap(m[0], 't-prop'); i += m[0].length; continue; }
        if ((m = /^#[0-9a-fA-F]{3,8}/.exec(rest))) { out += wrap(m[0], 't-val'); i += m[0].length; continue; }
        if ((m = /^-?\d*\.?\d+(px|rem|em|%|s|ms|vh|vw|fr|deg|pt)?/.exec(rest))) { out += wrap(m[0], 't-num'); i += m[0].length; continue; }
        if ((m = /^[;:,()]/.exec(rest))) { out += wrap(m[0], 't-punc'); i += m[0].length; continue; }
        if ((m = /^[a-zA-Z][\w-]*/.exec(rest))) { out += wrap(m[0], 't-val'); i += m[0].length; continue; }
      } else {
        if ((m = /^@[a-zA-Z-]+/.exec(rest))) { out += wrap(m[0], 't-key'); i += m[0].length; continue; }
        if ((m = /^[.#]?[a-zA-Z][\w-]*|^[*>+~,]|^:{1,2}[a-zA-Z-]+/.exec(rest))) { out += wrap(m[0], 't-sel'); i += m[0].length; continue; }
      }
      out += esc(s[i]); i++;
    }
    return out;
  }

  const JS_KEY = /^(const|let|var|function|return|if|else|for|while|do|break|continue|new|typeof|instanceof|this|null|undefined|true|false|class|extends|try|catch|finally|throw|switch|case|default|of|in|delete|void|async|await|yield)\b/;

  function hlJs(s) {
    let out = '', i = 0, m;
    while (i < s.length) {
      const rest = s.slice(i);
      if ((m = /^\/\/[^\n]*/.exec(rest))) { out += wrap(m[0], 't-com'); i += m[0].length; continue; }
      if ((m = /^\/\*[\s\S]*?(?:\*\/|$)/.exec(rest))) { out += wrap(m[0], 't-com'); i += m[0].length; continue; }
      if ((m = /^"(?:[^"\\\n]|\\.)*"?|^'(?:[^'\\\n]|\\.)*'?|^`(?:[^`\\]|\\.)*`?/.exec(rest))) {
        out += wrap(m[0], 't-str'); i += m[0].length; continue;
      }
      if ((m = /^\d+\.?\d*/.exec(rest))) { out += wrap(m[0], 't-num'); i += m[0].length; continue; }
      if ((m = JS_KEY.exec(rest))) { out += wrap(m[0], 't-key'); i += m[0].length; continue; }
      if ((m = /^[A-Za-z_$][\w$]*(?=\s*\()/.exec(rest))) { out += wrap(m[0], 't-fn'); i += m[0].length; continue; }
      if ((m = /^[A-Za-z_$][\w$]*/.exec(rest))) { out += esc(m[0]); i += m[0].length; continue; }
      if ((m = /^[{}()[\];,.]/.exec(rest))) { out += wrap(m[0], 't-punc'); i += m[0].length; continue; }
      out += esc(s[i]); i++;
    }
    return out;
  }

  const PY_KEY = /^(def|return|if|elif|else|for|while|in|not|and|or|is|None|True|False|break|continue|pass|import|from|as|class|try|except|finally|raise|with|lambda|global|del|assert)\b/;
  const PY_BUILTIN = /^(print|len|range|str|int|float|bool|list|dict|tuple|sum|min|max|abs|round|sorted|reversed|enumerate|zip|type|input|ord|chr|repr)\b/;

  function hlPy(s) {
    let out = '', i = 0, m;
    while (i < s.length) {
      const rest = s.slice(i);
      if ((m = /^#[^\n]*/.exec(rest))) { out += wrap(m[0], 't-com'); i += m[0].length; continue; }
      if ((m = /^[fFrRbB]{0,2}("""[\s\S]*?(?:"""|$)|'''[\s\S]*?(?:'''|$)|"(?:[^"\\\n]|\\.)*"?|'(?:[^'\\\n]|\\.)*'?)/.exec(rest))) {
        out += wrap(m[0], 't-str'); i += m[0].length; continue;
      }
      if ((m = /^\d+\.?\d*/.exec(rest))) { out += wrap(m[0], 't-num'); i += m[0].length; continue; }
      if ((m = PY_KEY.exec(rest))) { out += wrap(m[0], 't-key'); i += m[0].length; continue; }
      if ((m = PY_BUILTIN.exec(rest))) { out += wrap(m[0], 't-bltn'); i += m[0].length; continue; }
      if ((m = /^[A-Za-z_]\w*(?=\s*\()/.exec(rest))) { out += wrap(m[0], 't-fn'); i += m[0].length; continue; }
      if ((m = /^[A-Za-z_]\w*/.exec(rest))) { out += esc(m[0]); i += m[0].length; continue; }
      if ((m = /^[{}()[\]:;,.]/.exec(rest))) { out += wrap(m[0], 't-punc'); i += m[0].length; continue; }
      out += esc(s[i]); i++;
    }
    return out;
  }

  const HIGHLIGHT = { html: hlHtml, css: hlCss, js: hlJs, python: hlPy };

  /* ============================================================
     PROGRESS
     ============================================================ */

  const key = stage => stage.id;
  const isDone = stage => !!(saved.progress[key(stage)] && saved.progress[key(stage)].done);

  function markDone(stage) {
    if (isDone(stage)) return false;
    saved.progress[key(stage)] = Object.assign(saved.progress[key(stage)] || {}, { done: true });
    persist();
    return true;
  }

  function trackStats(track) {
    const total = track.stages.length;
    const done = track.stages.filter(isDone).length;
    return { total, done, pct: total ? Math.round((done / total) * 100) : 0 };
  }

  /* ============================================================
     PICKER
     ============================================================ */

  function renderPicker() {
    el.langGrid.innerHTML = ORDER.map(id => {
      const t = TRACKS[id];
      const st = trackStats(t);
      const teach = t.stages.filter(s => s.kind === 'teach').length;
      const debug = t.stages.filter(s => s.kind === 'debug').length;
      return '' +
        '<button class="lang-card" data-track="' + id + '" style="--accent:' + t.accent + '">' +
        '<span class="lang-card__icon">' + esc(t.icon) + '</span>' +
        '<span class="lang-card__name">' + esc(t.name) + '</span>' +
        '<span class="lang-card__tag">' + esc(t.tagline) + '</span>' +
        '<span class="lang-card__desc">' + esc(t.desc) + '</span>' +
        '<span class="lang-card__foot">' +
        '<span>' + teach + ' lessons · ' + debug + ' bugs</span>' +
        '<span class="lang-card__bar"><i style="width:' + st.pct + '%"></i></span>' +
        '<span>' + st.done + '/' + st.total + '</span>' +
        '</span>' +
        '</button>';
    }).join('');

    el.langGrid.querySelectorAll('.lang-card').forEach(btn => {
      btn.addEventListener('click', () => openTrack(btn.dataset.track));
    });
  }

  const showLessonChrome = on =>
    document.querySelectorAll('.lesson-only').forEach(n => { n.hidden = !on; });

  function showPicker() {
    S.track = null;
    runToken++;                 // abandon any preview still loading
    el.lesson.hidden = true;
    el.picker.hidden = false;
    showLessonChrome(false);
    el.barTrack.classList.remove('show');
    renderPicker();
    document.title = 'Debugger — Find It. Fix It.';
    if (location.hash) history.replaceState(null, '', location.pathname);
  }

  /* ============================================================
     TRACK / STAGE
     ============================================================ */

  function openTrack(id, idx) {
    const track = TRACKS[id];
    if (!track) return showPicker();
    S.track = track;

    if (idx === undefined) {
      // resume at the first unfinished stage
      const next = track.stages.findIndex(s => !isDone(s));
      idx = next === -1 ? 0 : next;
    }
    el.picker.hidden = true;
    el.lesson.hidden = false;
    showLessonChrome(true);
    el.barTrack.classList.add('show');
    el.barIcon.textContent = track.icon;
    el.barIcon.style.background = track.accent;
    el.barName.textContent = track.name;
    document.documentElement.style.setProperty('--accent', track.accent);
    loadStage(idx);
  }

  function loadStage(idx) {
    const track = S.track;
    S.idx = Math.max(0, Math.min(track.stages.length - 1, idx));
    S.stage = track.stages[S.idx];
    S.hintLevel = 0;
    S.results = null;
    S.active = 0;

    // working copies — restore any saved edits
    S.files = S.stage.files.map(f => {
      const stored = saved.code[S.stage.id + '::' + f.name];
      return {
        name: f.name, lang: f.lang, editable: f.editable !== false,
        code: (f.editable !== false && typeof stored === 'string') ? stored : f.code,
        original: f.code
      };
    });
    const firstEditable = S.files.findIndex(f => f.editable);
    S.active = firstEditable === -1 ? 0 : firstEditable;

    // Only touch the hash when it actually differs — assigning the same value
    // fires no hashchange, which would leave the suppression flag stuck on and
    // swallow the next real back/forward navigation.
    const want = S.track.id + '/' + S.stage.id;
    if (location.hash.replace(/^#/, '') !== want) {
      selfNav = true;
      location.hash = want;
    }
    document.title = S.track.name + ' · ' + S.stage.title + ' — Debugger';

    renderSteps();
    renderRail();
    renderTabs();
    renderEditor();
    updateBar();
    run();
  }

  function renderSteps() {
    el.steps.innerHTML = S.track.stages.map((s, i) =>
      '<button class="step ' +
      (s.kind === 'debug' ? 'is-debug ' : '') +
      (isDone(s) ? 'is-done ' : '') +
      (i === S.idx ? 'is-current' : '') +
      '" data-i="' + i + '" title="' + esc((s.kind === 'debug' ? 'Bug: ' : 'Lesson: ') + s.title) + '">' +
      '<span>' + (i + 1) + '</span></button>'
    ).join('');
    el.steps.querySelectorAll('.step').forEach(b => {
      b.addEventListener('click', () => loadStage(parseInt(b.dataset.i, 10)));
    });
  }

  function updateBar() {
    const st = trackStats(S.track);
    el.barFill.style.width = st.pct + '%';
    el.barCount.textContent = st.done + '/' + st.total;
  }

  /* ---------- the rail ---------- */

  function renderRail() {
    const s = S.stage;
    const debug = s.kind === 'debug';
    let h = '';

    h += '<div class="kicker ' + (debug ? 'kicker--debug' : 'kicker--learn') + '">' +
      (debug ? 'Repair job ' : 'Lesson ') + (S.idx + 1) + ' of ' + S.track.stages.length + '</div>';
    h += '<h2>' + esc(s.title) + '</h2>';

    if (debug) {
      h += '<div class="panel panel--brief"><div class="panel__title">What should happen</div>' +
        '<div class="prose">' + s.brief + '</div></div>';
      h += '<div class="panel"><div class="panel__title">It counts as fixed when</div>' +
        '<ul class="checks" id="checklist">' +
        s.checks.map((c, i) => '<li data-i="' + i + '"><span class="mark"></span><span>' + esc(c.label) + '</span></li>').join('') +
        '</ul></div>';
      h += '<div id="verdict"></div>';
      h += '<div class="hint-box"><div id="hints"></div><div class="hint-actions">' +
        '<button class="btn btn--sm btn--hint" id="hint-btn">Need a nudge?</button>' +
        '</div></div>';
    } else {
      h += '<div class="prose">' + s.concept + '</div>';
      if (s.tryIt && s.tryIt.length) {
        h += '<div class="panel panel--goal"><div class="panel__title">Try it yourself</div>' +
          '<div class="prose"><ul>' + s.tryIt.map(t => '<li>' + t + '</li>').join('') + '</ul></div></div>';
      }
    }

    el.railBody.innerHTML = h;

    if (debug) {
      $('#hint-btn').addEventListener('click', showNextHint);
      renderChecks();
    }
    renderFoot();
  }

  function renderFoot() {
    const last = S.idx === S.track.stages.length - 1;
    let h = '<button class="btn btn--sm" id="prev-btn"' + (S.idx === 0 ? ' disabled' : '') + '>← Back</button>';
    if (S.stage.kind === 'debug') {
      h += '<button class="btn btn--sm btn--check" id="check-btn">Check my fix</button>';
    }
    h += '<button class="btn btn--sm" id="next-btn"' + (last ? ' disabled' : '') + '>' +
      (last ? 'Finished' : 'Next →') + '</button>';
    el.railFoot.innerHTML = h;

    $('#prev-btn').addEventListener('click', () => loadStage(S.idx - 1));
    $('#next-btn').addEventListener('click', () => {
      if (S.stage.kind === 'teach') { if (markDone(S.stage)) { renderSteps(); updateBar(); } }
      loadStage(S.idx + 1);
    });
    const cb = $('#check-btn');
    if (cb) cb.addEventListener('click', () => run(true));
  }

  function renderChecks() {
    const list = $('#checklist');
    if (!list) return;
    list.querySelectorAll('li').forEach((li, i) => {
      li.classList.remove('pass', 'fail');
      if (S.results) li.classList.add(S.results[i] ? 'pass' : 'fail');
    });
  }

  function showNextHint() {
    const hints = S.stage.hints || [];
    if (S.hintLevel >= hints.length) return;
    S.hintLevel++;
    const rec = saved.progress[S.stage.id] || (saved.progress[S.stage.id] = {});
    rec.hints = Math.max(rec.hints || 0, S.hintLevel);
    persist();

    const box = $('#hints');
    const d = document.createElement('div');
    d.className = 'hint';
    d.innerHTML = '<b>Hint ' + S.hintLevel + ' of ' + hints.length + '</b>' + hints[S.hintLevel - 1];
    box.appendChild(d);

    const btn = $('#hint-btn');
    if (S.hintLevel >= hints.length) {
      btn.disabled = true;
      btn.textContent = 'No more hints — you have got this';
    } else {
      btn.textContent = 'Still stuck? (' + (hints.length - S.hintLevel) + ' left)';
    }
  }

  /* ---------- tabs + editor ---------- */

  function renderTabs() {
    el.tabs.innerHTML = S.files.map((f, i) =>
      '<button class="tab' + (i === S.active ? ' active' : '') + '" data-i="' + i + '">' +
      esc(f.name) + (f.editable ? '' : '<span class="lock">read-only</span>') + '</button>'
    ).join('');
    el.tabs.querySelectorAll('.tab').forEach(t => {
      t.addEventListener('click', () => { S.active = parseInt(t.dataset.i, 10); renderTabs(); renderEditor(); });
    });
  }

  function currentFile() { return S.files[S.active]; }

  function renderEditor() {
    const f = currentFile();
    el.ta.value = f.code;
    el.ta.readOnly = !f.editable;
    el.editor.classList.toggle('is-locked', !f.editable);
    let note = el.editor.querySelector('.locked-note');
    if (!f.editable) {
      if (!note) {
        note = document.createElement('div');
        note.className = 'locked-note';
        el.editor.appendChild(note);
      }
      note.textContent = 'read-only — the fix belongs in ' +
        (S.files.filter(x => x.editable).map(x => x.name).join(' / ') || 'another file');
    } else if (note) note.remove();
    paint();
  }

  function paint(errLine) {
    const f = currentFile();
    if (!f.editable) errLine = null;   // the error belongs to a different file
    const fn = HIGHLIGHT[f.lang] || esc;
    el.hl.innerHTML = fn(el.ta.value) + '\n';
    const n = el.ta.value.split('\n').length;
    let g = '';
    for (let i = 1; i <= n; i++) {
      g += '<i' + (errLine === i ? ' class="mark-line"' : '') + '>' + i + '</i>';
    }
    el.gutter.innerHTML = g;
    syncScroll();
  }

  function syncScroll() {
    el.hl.scrollTop = el.ta.scrollTop;
    el.hl.scrollLeft = el.ta.scrollLeft;
    el.gutter.scrollTop = el.ta.scrollTop;
  }

  el.ta.addEventListener('scroll', syncScroll);

  el.ta.addEventListener('input', () => {
    const f = currentFile();
    if (!f.editable) { el.ta.value = f.code; return; }
    f.code = el.ta.value;
    saved.code[S.stage.id + '::' + f.name] = f.code;
    persist();
    paint();
    clearTimeout(S.typing);
    S.typing = setTimeout(() => run(), 450);
  });

  el.ta.addEventListener('keydown', e => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const unit = currentFile().lang === 'python' ? '    ' : '  ';
      const a = el.ta.selectionStart, b = el.ta.selectionEnd;
      el.ta.value = el.ta.value.slice(0, a) + unit + el.ta.value.slice(b);
      el.ta.selectionStart = el.ta.selectionEnd = a + unit.length;
      el.ta.dispatchEvent(new Event('input'));
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      run(S.stage.kind === 'debug');
    }
  });

  el.runBtn.addEventListener('click', () => run(S.stage.kind === 'debug'));

  el.resetBtn.addEventListener('click', () => {
    if (!confirm('Put this file back the way it started? Your changes will be lost.')) return;
    const f = currentFile();
    f.code = f.original;
    delete saved.code[S.stage.id + '::' + f.name];
    persist();
    renderEditor();
    run();
  });

  /* ============================================================
     RUNNING
     ============================================================ */

  const fileOf = lang => S.files.find(f => f.lang === lang);
  const editableFile = () => S.files.find(f => f.editable) || S.files[0];

  const BASE_CSS =
    'html{font-family:system-ui,-apple-system,"Segoe UI",sans-serif;color:#16323d;}' +
    'body{margin:0;padding:22px;background:#ffffff;line-height:1.5;}' +
    'button{font:inherit;padding:9px 16px;border-radius:7px;border:1px solid #1fb6a8;' +
    'background:#e9fbf8;color:#0f5c55;cursor:pointer;}' +
    'button:hover{background:#d3f6f0;}';

  // The hook runs before student code so console output is captured in order.
  const HOOK =
    '<script>(function(){window.__logs=[];' +
    'function fmt(v){try{' +
    'if(typeof v==="string")return v;' +
    'if(v===undefined)return "undefined";' +
    'if(v===null)return "null";' +
    'if(typeof v==="object")return JSON.stringify(v);' +
    'return String(v);}catch(e){return String(v);}}' +
    'function cap(level){var orig=console[level];console[level]=function(){' +
    'window.__logs.push({level:level,text:Array.prototype.map.call(arguments,fmt).join(" ")});' +
    'if(orig)orig.apply(console,arguments);};}' +
    '["log","info","warn","error","debug"].forEach(cap);' +
    'window.addEventListener("error",function(e){' +
    'window.__logs.push({level:"error",text:(e.message||"Error"),line:e.lineno});});' +
    '})();<\/script>';

  /* Build the document to render. Returns { doc, jsOffset } where jsOffset is
     the number of lines before the student's script, so reported error line
     numbers can be translated back to their file. */
  function buildDoc() {
    const stage = S.stage;

    if (stage.runMode === 'raw') {
      return { doc: (fileOf('html') || S.files[0]).code, jsOffset: 0 };
    }

    const html = fileOf('html') ? fileOf('html').code : '';
    const cssFile = fileOf('css');
    const jsFile = fileOf('js');
    const css = (cssFile ? '' : BASE_CSS) + (cssFile ? cssFile.code : '');

    const head = '<!DOCTYPE html><html><head><meta charset="utf-8"><style>\n' + css + '\n</style></head><body>\n';
    const prefix = head + html + '\n' + HOOK + '\n<script>\n';
    const doc = jsFile
      ? prefix + jsFile.code + '\n<\/script>\n</body></html>'
      : head + html + '\n' + HOOK + '\n</body></html>';

    return { doc, jsOffset: jsFile ? prefix.split('\n').length - 1 : 0 };
  }

  let frame = null;
  let pendingCheck = false;
  let runToken = 0;

  function run(withCheck) {
    pendingCheck = !!withCheck;
    clearExpected();
    if (S.stage.runMode === 'python') runPython();
    else runWeb();
  }

  /* ---------- python ---------- */

  function runPython() {
    const f = editableFile();
    const res = MiniPy.run(f.code, { inputs: S.stage.inputs || [], maxLines: 500 });

    el.outLabel.textContent = 'Output — main.py';
    let h = '<div class="console"><div class="stamp">$ python main.py</div>';
    if (res.lines.length) {
      h += res.lines.map(l => '<div class="ln">' + (esc(l) || '&nbsp;') + '</div>').join('');
    } else if (!res.error) {
      h += '<div class="empty">(the program produced no output)</div>';
    }
    if (res.error) h += '<div class="traceback">' + esc(res.traceback) + '</div>';
    h += '</div>';
    el.outWrap.className = 'out out--dark';
    el.outWrap.innerHTML = h;

    paint(res.error && res.error.line ? res.error.line : null);
    appendExpected();

    // A runaway loop buries the traceback under hundreds of lines — and the
    // traceback is the part that explains what went wrong. Scroll only after
    // appendExpected(), which changes how tall the console pane is.
    if (res.error) {
      const pane = el.outWrap.querySelector('.console');
      if (pane) pane.scrollTop = pane.scrollHeight;
    }

    const ctx = {
      lines: res.lines,
      text: res.output,
      output: res.output,
      error: res.error,
      code: f.code
    };
    finish(ctx);
  }

  /* ---------- web ---------- */

  function runWeb() {
    const stage = S.stage;
    const built = buildDoc();
    const mode = stage.outputMode || 'preview';
    const token = ++runToken;

    el.outLabel.textContent = mode === 'console' ? 'Console' : 'Live preview';

    // Rebuild the whole output pane every run so nothing leaks between attempts.
    // The frame and the console pane always both exist — we only hide the one
    // this stage does not use, so the load handler can never destroy the frame
    // it is still reading from.
    el.outWrap.className = 'out';
    el.outWrap.innerHTML = '';
    const shell = document.createElement('div');
    shell.className = 'split-out';
    shell.innerHTML =
      '<div class="out out-frame"></div>' +
      '<div class="console-pane"><div class="console-pane__title">Console</div>' +
      '<div class="console" id="console-pane"></div></div>';
    el.outWrap.appendChild(shell);

    const framePane = shell.querySelector('.out-frame');
    const consolePane = shell.querySelector('.console-pane');
    if (mode === 'preview') consolePane.style.display = 'none';
    if (mode === 'console') { framePane.style.display = 'none'; consolePane.style.flex = '1'; }

    frame = document.createElement('iframe');
    frame.title = 'Code preview';
    frame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-modals allow-forms');

    frame.addEventListener('load', () => {
      if (token !== runToken) return;          // a newer run already started
      let doc = null, win = null, blocked = false;
      try {
        doc = frame.contentDocument;
        win = frame.contentWindow;
        if (!doc || !doc.body) blocked = true;
      } catch (e) { blocked = true; }

      if (blocked) {
        el.outWrap.className = 'out out--dark';
        el.outWrap.innerHTML = '<div class="console"><div class="ln ln--err">' +
          'This browser is blocking the preview.</div><div class="ln ln--info">' +
          'Open the Debugger through a web server (or GitHub Pages) instead of ' +
          'double-clicking the file — a page opened straight off disk cannot inspect its own preview.' +
          '</div></div>';
        return;
      }

      const logs = (win.__logs || []).map(l => ({
        level: l.level,
        text: l.text,
        line: l.line ? l.line - built.jsOffset : null
      }));

      if (mode !== 'preview') renderConsole(logs);

      const jsErr = logs.find(l => l.level === 'error' && l.line > 0);
      paint(jsErr ? jsErr.line : null);
      appendExpected();

      const ctx = {
        doc: doc, win: win,
        logs: logs,
        errors: logs.filter(l => l.level === 'error'),
        lines: logs.filter(l => l.level !== 'error').map(l => l.text),
        text: logs.map(l => l.text).join('\n'),
        code: editableFile().code,
        probe: {},
        css: function (sel, prop) {
          const node = doc.querySelector(sel);
          if (!node) return '';
          return win.getComputedStyle(node)[prop] || '';
        }
      };
      finish(ctx);
    });

    // srcdoc must be set BEFORE insertion, otherwise the browser fires an
    // extra load event for the initial about:blank document.
    frame.srcdoc = built.doc;
    framePane.appendChild(frame);
  }

  function renderConsole(logs) {
    const target = document.getElementById('console-pane');
    if (!target) return;
    let h = '<div class="stamp">console output</div>';
    if (!logs.length) {
      h += '<div class="empty">(nothing logged)</div>';
    } else {
      h += logs.map(l => {
        const cls = l.level === 'error' ? 'ln ln--err' : l.level === 'warn' ? 'ln ln--warn' : 'ln';
        const where = l.level === 'error' && l.line > 0 ? '  (line ' + l.line + ')' : '';
        return '<div class="' + cls + '">' + (esc(l.text) || '&nbsp;') + esc(where) + '</div>';
      }).join('');
    }
    target.innerHTML = h;
  }

  /* ---------- expected-output panel ---------- */

  function appendExpected() {
    const s = S.stage;
    if (s.kind !== 'debug' || !s.goal) return;
    const multi = s.goal.indexOf('\n') !== -1;
    const box = document.createElement('div');
    box.className = 'expected';
    box.innerHTML = '<div class="expected__title">Target — what a fixed version produces</div>' +
      (multi ? '<pre>' + esc(s.goal) + '</pre>' : '<p>' + esc(s.goal) + '</p>');

    // sit it under whatever the output pane currently is
    const holder = el.outWrap.parentElement;
    const old = holder.querySelector('.expected');
    if (old) old.remove();
    holder.appendChild(box);
  }

  function clearExpected() {
    const holder = el.outWrap.parentElement;
    const old = holder.querySelector('.expected');
    if (old) old.remove();
  }

  /* ---------- grading ---------- */

  function finish(ctx) {
    const s = S.stage;

    if (s.kind === 'teach') {
      if (markDone(s)) { renderSteps(); updateBar(); }
      return;
    }
    if (!pendingCheck) return;
    pendingCheck = false;

    if (s.interact) { try { s.interact(ctx); } catch (e) { /* the page is broken; checks will say so */ } }

    S.results = s.checks.map(c => {
      try { return !!c.test(ctx); } catch (e) { return false; }
    });
    renderChecks();

    const passed = S.results.filter(Boolean).length;
    const all = passed === S.results.length;
    const v = document.getElementById('verdict');

    if (all) {
      const first = markDone(s);
      renderSteps(); updateBar();
      v.innerHTML = '<div class="verdict verdict--win"><strong>Fixed.</strong> ' +
        (S.hintLevel === 0
          ? 'Every check passes — and you did it without a single hint.'
          : 'Every check passes. Now say out loud what the bug actually was.') +
        '</div>';
      if (first) toast('Repair job complete', true);
    } else {
      v.innerHTML = '<div class="verdict verdict--no"><strong>' + passed + ' of ' +
        S.results.length + ' checks pass.</strong> Look at the ones marked ✕ — they tell you ' +
        'what is still off, not how to fix it.</div>';
    }
  }

  let toastTimer;
  function toast(msg, win) {
    el.toast.textContent = msg;
    el.toast.className = 'toast show' + (win ? ' win' : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.toast.className = 'toast'; }, 2600);
  }

  /* ============================================================
     BOOT
     ============================================================ */

  document.getElementById('home-btn').addEventListener('click', showPicker);

  window.addEventListener('resize', syncScroll);

  window.addEventListener('hashchange', () => {
    if (selfNav) { selfNav = false; return; }
    boot();
  });

  function boot() {
    const h = (location.hash || '').replace(/^#/, '');
    if (h) {
      const parts = h.split('/');
      const track = TRACKS[parts[0]];
      if (track) {
        const idx = track.stages.findIndex(s => s.id === parts[1]);
        if (S.track === track && idx === S.idx) return;   // already here
        return openTrack(parts[0], idx === -1 ? undefined : idx);
      }
    }
    showPicker();
  }

  boot();
})();
