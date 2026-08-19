/* app.js — builds the notes, the sidebar and the search, and wires the
   "Try it" buttons to the code window. */
(function () {
  'use strict';

  var NOTES   = window.NOTES || [];
  var navEl   = document.getElementById('nav');
  var notesEl = document.getElementById('notes');
  var search  = document.getElementById('search');
  var hits    = document.getElementById('hitcount');
  var editor  = document.getElementById('editor');
  var stdinEl = document.getElementById('stdin');
  var stdinWrap = document.getElementById('stdinWrap');
  var output  = document.getElementById('output');
  var runBtn  = document.getElementById('runBtn');
  var stopBtn = document.getElementById('stopBtn');
  var resetBtn= document.getElementById('resetBtn');
  var clearBtn= document.getElementById('clearBtn');
  var boot    = document.getElementById('boot');
  var bootMsg = document.getElementById('bootMsg');
  var runnerTitle = document.getElementById('runnerTitle');
  var main    = document.getElementById('main');

  var originalCode = editor.value;
  var originalStdin = '';

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function slug(id) { return 'l' + String(id).replace(/\./g, '-'); }

  /* ---------------- build the page ---------------- */
  var navHtml = [], bodyHtml = [];

  NOTES.forEach(function (u, ui) {
    var uslug = 'u' + u.num.split(' ').pop();

    navHtml.push('<div class="nav-unit" data-unit="' + ui + '">');
    navHtml.push('<button type="button" aria-expanded="true"><span class="unum">' +
      esc(u.num) + '</span><span>' + esc(u.title) + '</span></button><ul>');
    u.lessons.forEach(function (l) {
      navHtml.push('<li><a href="#' + slug(l.id) + '" data-lesson="' + esc(l.id) + '"><b>' +
        esc(l.id) + '</b>' + esc(l.title) + '</a></li>');
    });
    navHtml.push('</ul></div>');

    bodyHtml.push('<div class="unit" id="' + uslug + '" data-unit="' + ui + '">');
    bodyHtml.push('<div class="unit-head"><h2><span>' + esc(u.num) + '</span> — ' +
      esc(u.title) + '</h2><p>' + u.intro + '</p></div>');

    u.lessons.forEach(function (l, li) {
      bodyHtml.push('<article class="lesson" id="' + slug(l.id) + '" data-lesson="' + esc(l.id) + '">');
      bodyHtml.push('<h3><span class="lid">' + esc(l.id) + '</span>' + esc(l.title) + '</h3>');
      bodyHtml.push('<div class="obj"><b>Objective:</b> ' + esc(l.obj) + '</div>');

      l.concepts.forEach(function (c, ci) {
        bodyHtml.push('<div class="concept">');
        bodyHtml.push('<h4>' + c.h + '</h4>');
        if (c.code) {
          var bar = '<div class="codebar"><span>' + esc(c.lang) + '</span><span class="sp"></span>';
          if (c.kind === 'run') {
            bar += '<button class="try" type="button" data-u="' + ui + '" data-l="' + li +
                   '" data-c="' + ci + '">▶ Try it</button>';
          } else if (c.kind === 'karel') {
            bar += '<span class="tagk">Karel — runs in CodeHS</span>';
          } else {
            bar += '<span class="tagk">reference</span>';
          }
          bar += '<button class="copy" type="button">copy</button></div>';
          bodyHtml.push('<div class="codewrap">' + bar + '<pre><code>' + esc(c.code) + '</code></pre></div>');
        }
        if (c.out) {
          bodyHtml.push('<div class="out"><span class="lbl">Output</span><pre>' + esc(c.out) + '</pre></div>');
        }
        if (c.does) bodyHtml.push('<p><span class="lbl-in l-does">What it does</span>' + c.does + '</p>');
        if (c.use)  bodyHtml.push('<p><span class="lbl-in l-use">Why you\'d use it</span>' + c.use + '</p>');
        if (c.syn)  bodyHtml.push('<div class="syn"><p><span class="lbl-in l-syn">Syntax matters</span>' + c.syn + '</p></div>');
        bodyHtml.push('</div>');
      });

      if (l.practice) {
        bodyHtml.push('<div class="prac"><b>CodeHS practice</b><br>' + esc(l.practice) + '</div>');
      }
      bodyHtml.push('</article>');
    });
    bodyHtml.push('</div>');
  });

  navEl.innerHTML = navHtml.join('');
  notesEl.innerHTML = bodyHtml.join('');

  /* ---------------- sidebar behaviour ---------------- */
  navEl.addEventListener('click', function (e) {
    var btn = e.target.closest('.nav-unit > button');
    if (btn) { btn.parentNode.classList.toggle('collapsed'); return; }
    var a = e.target.closest('a[data-lesson]');
    if (a) {
      navEl.querySelectorAll('a.active').forEach(function (x) { x.classList.remove('active'); });
      a.classList.add('active');
    }
  });

  document.getElementById('expandAll').addEventListener('click', function () {
    var units = navEl.querySelectorAll('.nav-unit');
    var anyOpen = false;
    units.forEach(function (u) { if (!u.classList.contains('collapsed')) anyOpen = true; });
    units.forEach(function (u) { u.classList.toggle('collapsed', anyOpen); });
  });

  /* ---------------- search ---------------- */
  var lessonEls = Array.prototype.slice.call(notesEl.querySelectorAll('.lesson'));
  var unitEls   = Array.prototype.slice.call(notesEl.querySelectorAll('.unit'));
  var navLinks  = Array.prototype.slice.call(navEl.querySelectorAll('a[data-lesson]'));

  search.addEventListener('input', function () {
    var q = search.value.trim().toLowerCase();
    if (!q) {
      lessonEls.forEach(function (el) { el.classList.remove('hidden'); });
      unitEls.forEach(function (el) { el.classList.remove('hidden'); });
      navLinks.forEach(function (a) { a.classList.remove('hidden'); });
      hits.textContent = '';
      return;
    }
    var shown = 0;
    lessonEls.forEach(function (el) {
      var hit = el.textContent.toLowerCase().indexOf(q) !== -1;
      el.classList.toggle('hidden', !hit);
      if (hit) shown++;
      var a = navEl.querySelector('a[data-lesson="' + el.dataset.lesson + '"]');
      if (a) a.classList.toggle('hidden', !hit);
    });
    unitEls.forEach(function (u) {
      var any = u.querySelector('.lesson:not(.hidden)');
      u.classList.toggle('hidden', !any);
    });
    hits.textContent = shown + ' lesson' + (shown === 1 ? '' : 's');
  });

  /* ---------------- copy + try it ---------------- */
  notesEl.addEventListener('click', function (e) {
    var copy = e.target.closest('button.copy');
    if (copy) {
      var code = copy.closest('.codewrap').querySelector('code').textContent;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(code).then(function () {
          var old = copy.textContent; copy.textContent = 'copied';
          setTimeout(function () { copy.textContent = old; }, 1200);
        });
      }
      return;
    }
    var tryb = e.target.closest('button.try');
    if (tryb) {
      var u = NOTES[+tryb.dataset.u];
      var l = u.lessons[+tryb.dataset.l];
      var c = l.concepts[+tryb.dataset.c];
      loadIntoRunner(c, l);
    }
  });

  function loadIntoRunner(c, l) {
    originalCode = c.code;
    originalStdin = c.stdin || '';
    editor.value = c.code;
    stdinEl.value = originalStdin;
    if (originalStdin) stdinWrap.setAttribute('open', '');
    runnerTitle.textContent = l.id + ' — ' + stripTags(c.h);
    main.classList.remove('runner-hidden');
    output.innerHTML = '<span class="sys">Loaded ' + esc(l.id) + '. Press Run, or change the code first.</span>';
    editor.focus();
    editor.setSelectionRange(0, 0);
    editor.scrollTop = 0;
  }

  function stripTags(s) {
    var d = document.createElement('div'); d.innerHTML = s; return d.textContent;
  }

  /* ---------------- runner wiring ---------------- */
  function write(cls, text) {
    var span = document.createElement('span');
    span.className = cls;
    span.textContent = text;
    output.appendChild(span);
    output.scrollTop = output.scrollHeight;
  }

  var started = 0;
  var runner = new window.PyRunner({
    onOut: function (t) { write('o', t); },
    onErr: function (t) { write('e', t); },
    onStatus: function (s) {
      if (s === 'boot') { boot.classList.remove('hide'); bootMsg.textContent = 'Starting Python… (first run only, this can take 10–20 seconds)'; }
      else if (s === 'run') { boot.classList.remove('hide'); bootMsg.textContent = 'Running…'; }
      else if (s === 'ready') { boot.classList.add('hide'); }
    },
    onDone: function () {
      boot.classList.add('hide');
      runBtn.disabled = false;
      stopBtn.disabled = true;
      var ms = Date.now() - started;
      write('sys', '\n— finished in ' + (ms / 1000).toFixed(1) + 's —\n');
    }
  });

  function doRun() {
    output.textContent = '';
    runBtn.disabled = true;
    started = Date.now();
    /* run() spawns the worker on first use, so ask about Stop afterwards */
    runner.run(editor.value, stdinEl.value);
    stopBtn.disabled = !runner.supportsStop();
    if (!runner.supportsStop()) {
      write('sys', 'Note: Stop is unavailable here (this page is running without a Web Worker, which happens if it was opened straight from disk). Avoid infinite loops.\n\n');
    }
  }

  runBtn.addEventListener('click', doRun);
  stopBtn.addEventListener('click', function () {
    if (!runner.stop()) write('sys', 'Stop is not available in this mode.\n');
  });
  resetBtn.addEventListener('click', function () {
    editor.value = originalCode;
    stdinEl.value = originalStdin;
    output.innerHTML = '<span class="sys">Example restored.</span>';
  });
  clearBtn.addEventListener('click', function () { output.textContent = ''; });

  editor.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); doRun(); return; }
    if (e.key === 'Tab') {
      e.preventDefault();
      var s = editor.selectionStart, t = editor.selectionEnd;
      editor.value = editor.value.slice(0, s) + '    ' + editor.value.slice(t);
      editor.selectionStart = editor.selectionEnd = s + 4;
    }
  });

  document.getElementById('runnerToggle').addEventListener('click', function () {
    main.classList.toggle('runner-hidden');
  });

  /* Start downloading Python quietly as soon as the page is idle, so the
     first Run feels fast. Harmless if it never finishes. */
  if ('requestIdleCallback' in window) {
    requestIdleCallback(function () { runner.warm(); }, { timeout: 4000 });
  } else {
    setTimeout(function () { runner.warm(); }, 2500);
  }

  /* highlight the lesson currently on screen */
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var a = navEl.querySelector('a[data-lesson="' + en.target.dataset.lesson + '"]');
        if (!a) return;
        navEl.querySelectorAll('a.active').forEach(function (x) { x.classList.remove('active'); });
        a.classList.add('active');
      });
    }, { rootMargin: '-10% 0px -80% 0px' });
    lessonEls.forEach(function (el) { io.observe(el); });
  }
})();
