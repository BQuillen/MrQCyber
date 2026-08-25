/* ============================================================
   LEVEL LIST + UNLOCKS
   Nothing is persisted on purpose. The password IS the save file,
   which is why the game never asks anyone to make an account and
   never loses a class set of progress to a cleared cache.
   ============================================================ */
/* A promise-based dialog, because native confirm() is blocked in sandboxed
   frames and silently returns false — which looks exactly like a dead button. */
function ask(title, bodyHtml, yesLabel){
  return new Promise(resolve => {
    $('#dlgTitle').textContent = title;
    $('#dlgBody').innerHTML = bodyHtml;
    $('#dlgYes').textContent = yesLabel || 'Continue';
    $('#scrim').hidden = false;
    const done = v => {
      $('#scrim').hidden = true;
      $('#dlgYes').onclick = $('#dlgNo').onclick = null;
      document.removeEventListener('keydown', key);
      resolve(v);
    };
    const key = e => { if (e.key === 'Escape') done(false); if (e.key === 'Enter') done(true); };
    $('#dlgYes').onclick = () => done(true);
    $('#dlgNo').onclick  = () => done(false);
    $('#scrim').onclick  = e => { if (e.target === $('#scrim')) done(false); };
    document.addEventListener('keydown', key);
    $('#dlgYes').focus();
  });
}

// Everything is open from the start. Order is a recommendation, not a gate —
// the checkmarks carry the progression instead of a lock.
const cleared = new Set();
function unlock(i){ /* kept so existing callers stay harmless */ }

// Which earlier levels are still unfinished?
function behindOn(i){
  const out = [];
  for (let k = 0; k < i; k++) if (!cleared.has(k)) out.push(k + 1);
  return out;
}

// Ask before skipping over unfinished ground, then get out of the way.
async function enterLevel(i){
  const behind = behindOn(i);
  if (behind.length){
    const list = behind.length > 3
      ? behind.slice(0,3).join(', ') + ' and ' + (behind.length - 3) + ' more'
      : behind.join(', ');
    const ok = await ask('Jumping ahead',
      'You have not finished level <b>' + list + '</b> yet. Each level leans on the one before it — '
      + 'level ' + (i+1) + ' assumes you have already met what those teach.<br><br>Start it anyway?',
      'Start it anyway');
    if (!ok) return;
  }
  startLevel(i);
}

function renderLevels(){
  $('#lvlCount').textContent = cleared.size + ' of ' + LEVELS.length + ' cleared';
  // Grouped by difficulty so the ladder is visible rather than implied.
  let html = '';
  TIER_ORDER.forEach(tk => {
    const items = LEVELS.map((L,i)=>[L,i]).filter(([L]) => (L.tier||'rookie') === tk);
    if (!items.length) return;
    const donecount = items.filter(([,i]) => cleared.has(i)).length;
    html += `<div style="margin:18px 0 8px;display:flex;align-items:baseline;gap:10px;flex-wrap:wrap">
      <span class="eyebrow" style="margin:0">${esc(TIERS[tk].name)}</span>
      <span class="tag${donecount===items.length?' ok':''}">${donecount} / ${items.length}</span>
      <span class="hint" style="margin:0;flex:1 1 240px">${esc(TIERS[tk].note)}</span></div>
      <div class="lvls">` + items.map(([L,i]) => {
        const ov = $('#tierOverride') ? $('#tierOverride').value : '';
        const m = modsFor(L, ov);
        const flags = [];
        if (m.fog) flags.push('fog');
        if (m.probes) flags.push(m.probes + ' scan' + (m.probes>1?'s':''));
        if (m.adversary) flags.push('hostile');
        if (m.cut) flags.push('link failure');
        const fit = tierFits(L.map, m);
        if (!fit.ok) flags.push('needs more scans');
        const done = cleared.has(i);
        const ahead = !done && behindOn(i).length > 0;   // open, but out of order
        return `<button class="lvl${done?' done':''}${ahead?' ahead':''}" data-lv="${i}"
            title="${ahead?'You have unfinished levels before this one':''}">
          <div class="ln">${String(i+1).padStart(2,'0')}${ahead?' <span class="lock">&middot; ahead</span>':''}</div>
          <div class="lt">${done?'<span style="color:var(--teal)">&#10003;</span> ':''}${esc(L.title)}</div>
          ${flags.map(f=>`<span class="tag">${esc(f)}</span>`).join(' ')}
        </button>`;
      }).join('') + '</div>';
  });
  $('#lvlList').innerHTML = html;
  $$('#lvlList [data-lv]').forEach(b => b.onclick = () => enterLevel(+b.dataset.lv));
}

/* ---------- glossary ---------- */
let gFilter = null;
function renderGloss(){
  $('#glossCount').textContent = GLOSS.length + ' terms';
  $('#gFilters').innerHTML = `<button class="chip" data-tag="" aria-pressed="${gFilter===null}">All</button>` +
    Object.entries(GTAGS).map(([k,v]) =>
      `<button class="chip" data-tag="${k}" aria-pressed="${gFilter===k}">${v}</button>`).join('');
  $$('#gFilters .chip').forEach(c => c.onclick = () => {
    gFilter = c.dataset.tag || null; renderGloss();
  });
  const list = GLOSS.filter(x => !gFilter || x.g.includes(gFilter));
  $('#gList').innerHTML = list.map(x => `
    <details class="gt">
      <summary><span class="gn">${esc(x.t)}</span>
        ${x.g.map(t => `<span class="tag">${esc(GTAGS[t]||t)}</span>`).join(' ')}
        <span class="tag warn">Tier ${x.k}</span></summary>
      <div class="gin">
        <p class="met">${esc(x.m)}</p>
        <p class="how">${esc(x.h)}</p>
        ${x.i ? `<p class="ing"><b>In the game:</b> ${esc(x.i)}</p>` : ''}
      </div>
    </details>`).join('') || '<p class="hint">Nothing under that tag.</p>';
}

/* ---------- tabs ---------- */
function switchTab(which){
  ['play','learn','build','code','gloss'].forEach(t => {
    const on = t === which;
    $('#tab-'+t).setAttribute('aria-selected', on);
    $('#p-'+t).classList.toggle('active', on);
  });
}

/* ---------- boot ---------- */
document.addEventListener('DOMContentLoaded', () => {
  renderLevels();
  renderGloss();
  buildPalette();
  drawBuild();

  ['play','learn','build','code','gloss'].forEach(t => $('#tab-'+t).onclick = () => switchTab(t));

  // campaign
  $('#tierOverride').onchange = () => {
    const v = $('#tierOverride').value;
    $('#ovNote').textContent = v
      ? TIERS[v].note + ' (Overrides the level\u2019s own setting.)'
      : 'Any level can be replayed at any difficulty.';
    renderLevels();
  };
  $('#btnForget').onclick = async () => {
    if (await ask('Reset progress', 'This clears every checkmark. The levels stay open either way.', 'Clear them')){
      cleared.clear(); renderLevels();
    }
  };

  // architect
  buildLessonList();
  drawLesson();
  $('#lsnWatch').onclick = () => setPhase('watch');
  $('#lsnDo').onclick    = () => setPhase('do');

  $('#bBoard').onclick = onBoardClick;
  buildModelSelect();
  setArchMode('guided');
  $('#mGuided').onclick = () => setArchMode('guided');
  $('#mFree').onclick   = () => setArchMode('free');
  $('#modelSel').onchange = e => { curModel = e.target.value; drawModelInfo(); };
  $('#btnCheckModel').onclick = checkModel;
  $('#btnPrompt').onclick = newPrompt;
  $('#bModePlace').onclick = () => setMode('place');
  $('#bModeLink').onclick  = () => setMode('link');
  $('#bModeErase').onclick = () => setMode('erase');
  $('#bClear').onclick = async () => {
    if (await ask('Wipe the canvas', 'Everything you have placed will be removed.', 'Wipe it')){
      BM = blankMap(11,7); bSel = null; invalidate(); drawBuild();
    }
  };
  $('#hint1').onclick = () => showStatus(1);
  $('#hint2').onclick = () => showStatus(2);
  $('#btnProve').onclick = proveIt;
  $('#btnPublish').onclick = publish;

  // codes
  $('#btnLoadCode').onclick = () => {
    const m = decodeMap($('#codeIn').value);
    if (!m){ $('#codeMsg').innerHTML = '<div class="notice bad">That code did not check out. It may be missing characters — copy the whole thing, including the MAP- prefix.</div>'; return; }
    $('#codeMsg').innerHTML = '<div class="notice teal">Map loaded.</div>';
    startCustom(m, modsOf({tier: $('#codeTier') ? $('#codeTier').value : 'technician'}));
  };
  $('#btnLoadEdit').onclick = () => {
    const m = decodeMap($('#codeIn').value);
    if (!m){ $('#codeMsg').innerHTML = '<div class="notice bad">That code did not check out.</div>'; return; }
    BM = m; bSel = null; invalidate(); drawBuild(); switchTab('build');
  };
});

