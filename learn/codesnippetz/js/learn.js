// ── Element refs ──────────────────────────────────────
var selectEl     = document.getElementById('snippet-select');
var htmlEditor   = document.getElementById('editor-html');
var cssEditor    = document.getElementById('editor-css');
var jsEditor     = document.getElementById('editor-js');
var frame        = document.getElementById('preview-frame');
var emptyState   = document.getElementById('empty-state');
var expPanel     = document.getElementById('experiments-panel');
var expList      = document.getElementById('experiment-list');
var jsTab        = document.querySelector('[data-tab="js"]');

var currentSnippet = null;
var debounce;

// ── Build dropdown from snippets[] defined in snippets.js ──
var seen = {};
var categories = [];
snippets.forEach(function(s) {
  if (!seen[s.category]) { seen[s.category] = true; categories.push(s.category); }
});

categories.forEach(function(cat) {
  var grp = document.createElement('optgroup');
  grp.label = cat;
  snippets.filter(function(s) { return s.category === cat; }).forEach(function(s) {
    var opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = s.name;
    grp.appendChild(opt);
  });
  selectEl.appendChild(grp);
});

// ── Live preview ───────────────────────────────────────
function updatePreview() {
  var fonts = 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&family=Syne:wght@400;700;800&display=swap';
  var base  = '*{margin:0;padding:0;box-sizing:border-box;}body{display:flex;align-items:center;justify-content:center;min-height:100vh;background:#0d0f14;font-family:sans-serif;padding:2rem;}';
  var doc   = '<!DOCTYPE html><html><head><meta charset="UTF-8">'
            + '<link rel="stylesheet" href="' + fonts + '">'
            + '<style>' + base + cssEditor.value + '</style>'
            + '</head><body>'
            + htmlEditor.value
            + '<scr' + 'ipt>try{' + jsEditor.value + '}catch(e){console.error(e);}</scr' + 'ipt>'
            + '</body></html>';
  frame.srcdoc = doc;
}

// ── Load a snippet ─────────────────────────────────────
function loadSnippet(id) {
  var s = null;
  for (var i = 0; i < snippets.length; i++) {
    if (snippets[i].id === id) { s = snippets[i]; break; }
  }
  if (!s) return;
  currentSnippet = s;

  htmlEditor.value = s.html;
  cssEditor.value  = s.css;
  jsEditor.value   = s.js || '';

  if (s.js && s.js.trim()) {
    jsTab.classList.remove('hidden');
  } else {
    jsTab.classList.add('hidden');
    if (jsTab.classList.contains('active')) switchTab('html');
  }

  emptyState.style.display = 'none';
  frame.style.display = 'block';
  updatePreview();

  expPanel.style.display = 'block';
  expList.innerHTML = s.experiments.map(function(e, i) {
    return '<li class="experiment-item">'
         + '<span class="exp-num">0' + (i + 1) + '</span>'
         + '<span class="exp-text">' + e + '</span>'
         + '</li>';
  }).join('');
}

// ── Tab switching ──────────────────────────────────────
function switchTab(tab) {
  document.querySelectorAll('.editor-tab').forEach(function(t) {
    t.classList.toggle('active', t.getAttribute('data-tab') === tab);
  });
  document.querySelectorAll('.editor-pane').forEach(function(p) {
    p.classList.toggle('active', p.id === 'pane-' + tab);
  });
}

document.querySelectorAll('.editor-tab').forEach(function(t) {
  t.addEventListener('click', function() { switchTab(t.getAttribute('data-tab')); });
});

// ── Textarea events ────────────────────────────────────
[htmlEditor, cssEditor, jsEditor].forEach(function(ed) {
  ed.addEventListener('input', function() {
    clearTimeout(debounce);
    debounce = setTimeout(updatePreview, 300);
  });
  ed.addEventListener('keydown', function(e) {
    if (e.key === 'Tab') {
      e.preventDefault();
      var s = ed.selectionStart;
      ed.value = ed.value.slice(0, s) + '  ' + ed.value.slice(ed.selectionEnd);
      ed.selectionStart = ed.selectionEnd = s + 2;
    }
  });
});

// ── Dropdown & reset ───────────────────────────────────
selectEl.addEventListener('change', function() {
  if (selectEl.value) loadSnippet(selectEl.value);
});

document.getElementById('reset-btn').addEventListener('click', function() {
  if (currentSnippet) { loadSnippet(currentSnippet.id); switchTab('html'); }
});
