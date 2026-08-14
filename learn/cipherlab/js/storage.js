/* ============================================================
   STORAGE
   Wrapped so the page still works when storage is unavailable
   (private browsing, sandboxed preview, locked-down profile).
   It falls back to memory instead of throwing — progress is lost
   on refresh in that case, but nothing breaks.
   ============================================================ */
const Store = (() => {
  const KEY = 'cipherlab.v1';
  const blank = () => ({solved:{}, pts:0, notes:{}, triage:{best:0, solved:0, runs:0}});
  let mem = blank();
  let ok = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) mem = Object.assign(blank(), JSON.parse(raw));
    mem.triage = Object.assign({best:0, solved:0, runs:0}, mem.triage);
    mem.notes ||= {}; mem.solved ||= {};
  }
  catch(e){ ok = false; }
  return {
    get: () => mem,
    save(){ if(!ok) return; try{ localStorage.setItem(KEY, JSON.stringify(mem)); }catch(e){ ok = false; } },
    reset(){ mem = blank(); this.save(); }
  };
})();

const $ = s => document.querySelector(s);
const el = (tag, cls, html) => { const n = document.createElement(tag); if(cls) n.className = cls; if(html != null) n.innerHTML = html; return n; };
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* ============================================================
   PIGPEN GLYPH RENDERING
   Each letter is drawn as the walls of the cell it occupies.
   Built as real SVG so it scales cleanly and prints legibly for
   paper worksheets.
   ============================================================ */
const PIG = (() => {
  const m = {};
  'ABCDEFGHI'.split('').forEach((c,i) => m[c] = {g:1, r:Math.floor(i/3), c:i%3, dot:false});
  'JKLMNOPQR'.split('').forEach((c,i) => m[c] = {g:1, r:Math.floor(i/3), c:i%3, dot:true});
  ['S','T','U','V'].forEach((c,i) => m[c] = {g:2, d:['up','left','right','down'][i], dot:false});
  ['W','X','Y','Z'].forEach((c,i) => m[c] = {g:2, d:['up','left','right','down'][i], dot:true});
  return m;
})();

function pigSVG(letter, size){
  const d = PIG[letter];
  if (!d) return '';
  const L = [], S = 3, E = 23, M = 13;
  if (d.g === 1){
    if (d.r > 0) L.push([S,S,E,S]);        // top wall exists unless in the top row
    if (d.r < 2) L.push([S,E,E,E]);        // bottom wall
    if (d.c > 0) L.push([S,S,S,E]);        // left wall
    if (d.c < 2) L.push([E,S,E,E]);        // right wall
  } else {
    const wedge = {
      up:    [[S,S,M,M],[E,S,M,M]],
      down:  [[S,E,M,M],[E,E,M,M]],
      left:  [[S,S,M,M],[S,E,M,M]],
      right: [[E,S,M,M],[E,E,M,M]]
    }[d.d];
    L.push(...wedge);
  }
  let dot = '';
  if (d.dot){
    const p = d.g === 1 ? [M,M]
      : {up:[M,8], down:[M,18], left:[8,M], right:[18,M]}[d.d];
    dot = `<circle cx="${p[0]}" cy="${p[1]}" r="2.1"/>`;
  }
  return `<svg class="pig" width="${size}" height="${size}" viewBox="0 0 26 26" aria-label="${letter}">`
    + L.map(([x1,y1,x2,y2]) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`).join('') + dot + '</svg>';
}

function renderGlyphs(target, text, size){
  target.innerHTML = '';
  if (!text.trim()){ target.appendChild(el('span','ph','Nothing to show yet.')); return; }
  for (const ch of text.toUpperCase()){
    if (ch === ' '){ target.appendChild(el('span','sp')); continue; }
    if (!PIG[ch]) continue;
    const w = el('span'); w.innerHTML = pigSVG(ch, size || 30); target.appendChild(w);
  }
}

/* ============================================================
   CAESAR WHEEL  — the signature element
   Two concentric rings. Letters sit radially so the inner disc
   turns the way a physical cardboard wheel turns; the goal is that
   what a student sees here maps onto the one in their hands.
   ============================================================ */
function buildWheel(){
  const R_OUT = 133, R_IN = 100, C = 160, step = 360 / 26;
  const ring = (r, cls) => {
    let s = `<g class="${cls}">`;
    for (let i = 0; i < 26; i++){
      const a = i * step, rad = (a - 90) * Math.PI / 180;
      const x = C + r * Math.cos(rad), y = C + r * Math.sin(rad);
      s += `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle" dominant-baseline="central" transform="rotate(${a.toFixed(2)} ${x.toFixed(1)} ${y.toFixed(1)})" data-i="${i}">${AZ[i]}</text>`;
    }
    return s + '</g>';
  };
  return `<div class="wheelwrap">
  <svg id="wheel" viewBox="0 0 320 320" width="320" height="320" role="img" aria-label="Caesar cipher wheel">
    <circle class="ring-bg" cx="160" cy="160" r="152" stroke-width="1"/>
    <circle class="ring-bg" cx="160" cy="160" r="117" stroke-width="1" fill="none"/>
    <circle class="ring-in-bg" cx="160" cy="160" r="115" stroke-width="1"/>
    ${ring(R_OUT,'outer')}
    <g id="innerRing">${ring(R_IN,'inner')}</g>
    <line class="marker" x1="160" y1="4" x2="160" y2="26"/>
    <circle cx="160" cy="160" r="4" fill="var(--gold)"/>
  </svg></div>
  <div class="wheel-cap" id="wheelCap"></div>`;
}

function updateWheel(shift, litLetter){
  const inner = document.getElementById('innerRing');
  if (!inner) return;
  inner.style.transform = `rotate(${(-shift * 360 / 26).toFixed(3)}deg)`;
  document.querySelectorAll('#wheel .lit, #wheel .lit-in').forEach(n => n.classList.remove('lit','lit-in'));
  const cap = document.getElementById('wheelCap');
  if (cap) cap.innerHTML = `Shift <b>${shift}</b> &nbsp;·&nbsp; A &rarr; <b>${AZ[shift % 26]}</b>`;
  if (litLetter){
    const p = AZ.indexOf(litLetter);
    if (p >= 0){
      const o = document.querySelector(`#wheel .outer text[data-i="${p}"]`);
      const n = document.querySelector(`#wheel .inner text[data-i="${(p + shift) % 26}"]`);
      if (o) o.classList.add('lit');
      if (n) n.classList.add('lit-in');
      if (cap) cap.innerHTML = `<b>${litLetter}</b> &rarr; <b>${AZ[(p + shift) % 26]}</b> &nbsp;·&nbsp; shift ${shift}`;
    }
  }
}

/* ---------- other visuals ---------- */
function alphaTable(cipherAlpha, label){
  const row = (s, cls) => `<tr>${s.split('').map(c => `<td class="${cls}">${c}</td>`).join('')}</tr>`;
  return `<div class="tabula"><table style="font-size:11px">
    ${row(AZ,'')}${row(cipherAlpha,'hit')}</table></div>
    <p class="hint">${label} Top row is what you type; bottom row is what comes out.</p>`;
}

function buildTabula(){
  let s = '<div class="tabula"><table><tr><th class="rowh"></th>';
  for (let c = 0; c < 26; c++) s += `<th>${AZ[c]}</th>`;
  s += '</tr>';
  for (let r = 0; r < 26; r++){
    s += `<tr><th class="rowh">${AZ[r]}</th>`;
    for (let c = 0; c < 26; c++) s += `<td data-r="${r}" data-c="${c}">${AZ[(r + c) % 26]}</td>`;
    s += '</tr>';
  }
  return s + '</table></div><p class="hint">Row = keyword letter. Column = plain letter. Where they cross is the cipher letter.</p>';
}

function railsView(text, n){
  const s = onlyLetters(text).slice(0, 60);
  if (!s) return '<p class="hint">Type something to see the zigzag.</p>';
  const rows = Array.from({length:n}, () => Array(s.length).fill('·'));
  let r = 0, d = 1;
  for (let i = 0; i < s.length; i++){ rows[r][i] = s[i]; if (r === 0) d = 1; else if (r === n-1) d = -1; r += d; }
  return `<pre style="font-family:var(--mono);font-size:12px;color:var(--teal);overflow:auto;margin:0;line-height:1.7">`
    + rows.map(x => x.join(' ')).join('\n') + `</pre>
    <p class="hint">Read down the zigzag to write it, then across each row to send it.</p>`;
}

function chartView(kind){
  if (kind === 'morse')
    return '<div class="chart">' + Object.entries(MORSE).slice(0,26)
      .map(([k,v]) => `<div><b>${k}</b><span>${v}</span></div>`).join('') + '</div>';
  if (kind === 'bacon')
    return '<div class="chart">' + BACON_AZ.split('')
      .map((c,i) => `<div><b>${c}${c==='I'?'/J':c==='U'?'/V':''}</b><span>${baconCode(i)}</span></div>`).join('') + '</div>';
  return '<div class="chart">' + AZ.split('')
    .map((c,i) => `<div><b>${c}</b><span>${i+1}</span></div>`).join('') + '</div>';
}

/* ============================================================
   WORKBENCH
   ============================================================ */
let curId = 'caesar', dir = 'enc', glyphBuf = '';

function buildCipherSelect(){
  const sel = $('#cipherSel'), cats = {};
  CIPHER_IDS.forEach(id => (cats[CIPHERS[id].cat] ||= []).push(id));
  sel.innerHTML = Object.entries(cats).map(([cat, ids]) =>
    `<optgroup label="${cat}">` + ids.map(id => `<option value="${id}">${CIPHERS[id].name}</option>`).join('') + '</optgroup>'
  ).join('');
}

function keyVals(){
  const k = {};
  document.querySelectorAll('#keyBar [data-key]').forEach(n => k[n.dataset.key] = n.value);
  return k;
}

function buildKeyBar(){
  const c = CIPHERS[curId], bar = $('#keyBar');
  bar.innerHTML = '';
  c.keys.forEach(f => {
    const wrap = el('div', 'keyfield' + (f.narrow ? ' narrow' : ''));
    wrap.innerHTML = `<label class="fl" for="k_${f.id}">${f.label}</label>`;
    let inp;
    if (f.type === 'select'){
      inp = el('select');
      inp.innerHTML = f.options.map(o => `<option${o == f.def ? ' selected' : ''}>${o}</option>`).join('');
    } else {
      inp = el('input');
      inp.type = f.type === 'number' ? 'number' : 'text';
      if (f.type === 'number'){ inp.min = f.min; inp.max = f.max; }
      inp.value = f.def;
    }
    inp.id = 'k_' + f.id; inp.dataset.key = f.id;
    inp.addEventListener('input', run);
    inp.addEventListener('change', run);
    wrap.appendChild(inp);
    bar.appendChild(wrap);
  });
  if (curId === 'caesar'){
    const q = el('div', 'keyfield');
    q.innerHTML = '<label class="fl">Quick shifts</label>';
    const row = el('div'); row.style.display = 'flex'; row.style.gap = '5px'; row.style.flexWrap = 'wrap';
    [1,3,5,13,21].forEach(v => {
      const b = el('button', 'btn ghost sm', String(v));
      b.type = 'button';
      b.onclick = () => { $('#k_shift').value = v; run(); };
      row.appendChild(b);
    });
    q.appendChild(row); bar.appendChild(q);
  }
}

function buildVisual(){
  const c = CIPHERS[curId], body = $('#visBody'), title = $('#visTitle');
  const v = c.visual || 'none';
  const map = {wheel:'Cipher wheel', pigpen:'Pigpen key', tabula:'Tabula recta', rails:'The zigzag',
               mirror:'Folded alphabet', table:'Alphabet mapping', chart:'Reference chart', none:'Reference'};
  title.textContent = map[v];
  if (v === 'wheel'){ body.innerHTML = buildWheel(); }
  else if (v === 'pigpen'){
    body.innerHTML = '<div class="glyphgrid">' + AZ.split('').map(c2 =>
      `<div class="glyphbtn" style="cursor:default">${pigSVG(c2, 30)}<span>${c2}</span></div>`).join('') + '</div>'
      + '<p class="hint">Every letter is the walls of its box. The second grid adds a dot.</p>';
  }
  else if (v === 'tabula'){ body.innerHTML = buildTabula(); }
  else if (v === 'rails'){ body.innerHTML = '<div id="railHost"></div>'; }
  else if (v === 'mirror'){ body.innerHTML = alphaTable([...AZ].reverse().join(''), 'The alphabet folded end to end.'); }
  else if (v === 'table'){ body.innerHTML = '<div id="tableHost"></div>'; }
  else if (v === 'chart'){
    body.innerHTML = chartView(curId === 'morse' ? 'morse' : curId === 'bacon' ? 'bacon' : 'a1z26');
  }
  else {
    body.innerHTML = `<p class="hint" style="margin:0">${esc(c.blurb)}</p>`
      + (c.oneWay ? '<div class="notice">One-way. Encoding only — there is no matching decode.</div>' : '');
  }
}

function buildLearn(){
  const c = CIPHERS[curId], h = c.history;
  $('#learnTitle').textContent = c.name;
  $('#learnBody').innerHTML = `
    <dt>Where it comes from</dt><dd>${esc(h.origin)}</dd>
    <dt>The story</dt><dd>${esc(h.story)}</dd>
    <dt>What it was used for</dt><dd>${esc(h.usedFor)}</dd>
    <dt>How to spot it</dt><dd class="q">${esc(h.tell)}</dd>`;
}

function setPigpenMode(){
  const isPig = curId === 'pigpen';
  const decoding = dir === 'dec';
  $('#glyphInput').hidden = !(isPig && decoding);
  $('#inBox').hidden = isPig && decoding;
  $('#btnPaste').hidden = isPig && decoding;
  $('#glyphOut').hidden = !(isPig && !decoding);
  $('#outBox').hidden = isPig && !decoding;
  if (isPig && decoding && !$('#glyphPad').childElementCount){
    $('#glyphPad').innerHTML = AZ.split('').map(c =>
      `<button class="glyphbtn mute" type="button" data-g="${c}" aria-label="${c}">${pigSVG(c,28)}<span>${c}</span></button>`).join('');
    $('#glyphPad').querySelectorAll('[data-g]').forEach(b =>
      b.addEventListener('click', () => { glyphBuf += b.dataset.g; run(); }));
  }
}

async function run(){
  const c = CIPHERS[curId], k = keyVals();
  const isPig = curId === 'pigpen';
  const src = (isPig && dir === 'dec') ? glyphBuf : $('#inBox').value;

  // one-way ciphers: force encrypt and say why
  if (c.oneWay && dir === 'dec'){
    $('#outBox').value = c.dec();
  } else {
    let out = '';
    try {
      const r = (dir === 'enc') ? c.enc(src, k) : c.dec(src, k);
      out = (r instanceof Promise) ? await r : r;
    } catch(e){ out = '⚠ Could not process that input.'; }
    if (isPig && dir === 'enc') renderGlyphs($('#glyphOut'), out, 32);
    else $('#outBox').value = out;
  }

  if (isPig && dir === 'dec'){
    renderGlyphs($('#glyphStage'), glyphBuf, 30);
    $('#outBox').value = glyphBuf;
  }

  // live visuals
  const lastLetter = (src.toUpperCase().match(/[A-Z](?=[^A-Z]*$)/) || [])[0];
  if (c.visual === 'wheel') updateWheel(curId === 'rot13' ? 13 : clampInt(k.shift, 0, 25, 3), lastLetter);
  if (c.visual === 'rails' && $('#railHost')) $('#railHost').innerHTML = railsView(src, clampInt(k.rails, 2, 8, 3));
  if (c.visual === 'table' && $('#tableHost')){
    const alpha = curId === 'keyword' ? keyedAlphabet(k.kw || 'A')
      : AZ.split('').map((_, i) => AZ[(parseInt(k.a,10) * i + clampInt(k.b,0,25,0)) % 26]).join('');
    $('#tableHost').innerHTML = alphaTable(alpha, curId === 'keyword' ? 'Keyed alphabet.' : 'Affine mapping.');
  }
}

function selectCipher(id){
  curId = id;
  $('#cipherSel').value = id;
  const c = CIPHERS[id];
  $('#benchCat').textContent = c.cat;
  $('#benchCat').className = 'tag ' + (c.cat === 'Hashing' ? 'hash' : 'enc');
  $('#cipherBlurb').textContent = c.blurb;
  $('#benchNote').innerHTML = c.oneWay
    ? '<div class="notice">This is a hash, not a cipher. It only runs one way — there is no key that undoes it.</div>'
    : (c.cat === 'Encoding'
      ? '<div class="notice teal">This is an <b>encoding</b>, not encryption. It has no key, so anyone can reverse it. Knowing the difference is half the job.</div>'
      : '');
  buildKeyBar(); buildVisual(); buildLearn(); setPigpenMode(); run();
}

function setDir(d){
  dir = d;
  $('#dirEnc').setAttribute('aria-pressed', d === 'enc');
  $('#dirDec').setAttribute('aria-pressed', d === 'dec');
  $('#inLabel').textContent  = d === 'enc' ? 'Plain text' : 'Cipher text';
  $('#outLabel').textContent = d === 'enc' ? 'Cipher text' : 'Plain text';
  setPigpenMode(); run();
}
