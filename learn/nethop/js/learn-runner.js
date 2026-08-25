/* ============================================================
   LEARN RUNNER
   The demo is played through the real engine, one scripted action
   at a time, with a line of explanation attached to each. Nothing
   is faked — if the simulator would drop the packet, the demo
   drops it too.
   ============================================================ */
let LS = null;          // lesson state: {lesson, phase, step, sim, pick, done}

function buildLessonList(){
  $('#lsnList').innerHTML = LESSONS.map(l =>
    `<button data-lsn="${l.id}" aria-pressed="${LS && LS.lesson.id===l.id}">
       <span class="pg">${esc(DEV[l.id] ? DEV[l.id].glyph : l.name.slice(0,3).toUpperCase())}</span>
       <span class="pn">${esc(l.name)}</span></button>`).join('');
  $$('#lsnList [data-lsn]').forEach(b => b.onclick = () => openLesson(b.dataset.lsn));
}

function openLesson(id){
  const lesson = LESSONS.find(l => l.id === id);
  LS = {lesson, phase:'watch', step:0, pick:null, done:false};
  LS.sim = startRun(JSON.parse(JSON.stringify(lesson.demo.map)), {adversary:null, cut:null, maxTurns:25, fog:false});
  buildLessonList();
  drawLesson();
}

function setPhase(p){
  if (!LS) return;
  LS.phase = p;
  if (p === 'watch'){ LS.step = 0;
    LS.sim = startRun(JSON.parse(JSON.stringify(LS.lesson.demo.map)), {adversary:null, cut:null, maxTurns:25, fog:false}); }
  if (p === 'do'){ LBM = null; lSel = null; }
  drawLesson();
}

function drawLesson(){
  if (!LS){
    $('#lsnTitle').textContent = 'Pick a component';
    $('#lsnTag').textContent = '';
    $('#lsnIdea').innerHTML = '<p class="hint" style="margin:0">Choose one on the right. You will watch it work, then be asked to supply it yourself.</p>';
    $('#lsnStage').innerHTML = '<p class="hint" style="margin:0">Nothing loaded yet.</p>';
    renderBoard($('#lBoard'), blankMap(9,6), {mode:'build'});
    return;
  }
  const L = LS.lesson;
  $('#lsnTitle').textContent = L.name;
  $('#lsnTag').textContent = L.tag;
  $('#lsnIdea').innerHTML = `<p style="margin:0 0 10px;font-size:15px;max-width:60ch">${esc(L.idea)}</p>`
    + (L.why ? `<dl class="dl" style="margin:0"><dt>Why it exists</dt><dd>${esc(L.why)}</dd></dl>` : '');
  $('#lsnWatch').setAttribute('aria-pressed', LS.phase === 'watch');
  $('#lsnDo').setAttribute('aria-pressed', LS.phase === 'do');
  LS.phase === 'watch' ? drawWatch() : drawDo();
}

/* ---------- 1. Watch it ---------- */
function drawWatch(){
  const L = LS.lesson, steps = L.demo.steps, st = LS.sim;
  $('#lsnReqCard').hidden = true;
  $('#lsnBuildTools').hidden = true;
  $('#lsnInspCard').hidden = true;
  $('#lsnList').hidden = false;
  $('#lsnRightTitle').textContent = 'Components';
  const i = Math.min(LS.step, steps.length - 1);
  const a = actions(st);
  renderBoard($('#lBoard'), st.map, {mode:'play', state:st, fog:false, labels:true,
    exits: a.kind === 'exits' ? a.list : null});

  const last = LS.step >= steps.length - 1;
  $('#lsnStage').innerHTML = `
    <div style="display:flex;gap:9px;align-items:center;flex-wrap:wrap;margin-bottom:9px">
      <span class="tag warn">Step ${i+1} of ${steps.length}</span>
      <span class="tag">TTL ${st.ttl}</span>
      <span class="tag">at ${esc((st.map.nodes[st.at].c && st.map.nodes[st.at].c.who) || DEV[st.map.nodes[st.at].t].name)}</span>
    </div>
    <p style="margin:0 0 12px;font-size:15.5px;max-width:64ch">${esc(steps[i].say)}</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      ${last ? '<button class="btn gold" id="lsnNext">Now your turn &rarr;</button>'
             : '<button class="btn" id="lsnNext">Next step</button>'}
      <button class="btn ghost" id="lsnReplay">Start over</button>
    </div>`;

  $('#lsnReplay').onclick = () => setPhase('watch');
  $('#lsnNext').onclick = () => {
    if (last){ setPhase('do'); return; }
    // Carry out this step's action, then advance the narration.
    const act = steps[LS.step];
    if (act.do === 'arp') doArp(st);
    else if (act.do === 'dhcp') doDhcp(st);
    else if (act.do === 'move'){
      // ARP is required before a move; do it silently so the script stays readable.
      if (actions(st).kind === 'arp') doArp(st);
      move(st, act.link);
    }
    LS.step++;
    drawLesson();
  };
}

/* ============================================================
   2. YOUR TURN — build the network
   No multiple choice. A scenario, an empty canvas, and a list of
   conditions checked against the graph and run through the
   simulator. Conditions tick themselves as you build, so the
   checklist is a workbench rather than a grade.
   ============================================================ */
let LBM = null, lMode = 'place', lTool = 'host', lSel = null, lFrom = null;

function startBuild(){
  const L = LS.lesson;
  LBM = blankMap(11, 7);
  lMode = 'place'; lSel = null; lFrom = null;
  lTool = (BUILD[L.id].allow || ['host'])[0];
  drawLesson();
}

function drawDo(){
  const L = LS.lesson, T = BUILD[L.id];
  if (!LBM) { startBuild(); return; }

  $('#lsnReqCard').hidden = false;
  $('#lsnBuildTools').hidden = false;
  $('#lsnInspCard').hidden = false;
  $('#lsnRightTitle').textContent = 'Build it';
  $('#lsnList').hidden = true;

  $('#lsnStage').innerHTML = `
    <p style="margin:0 0 10px;font-size:15.5px;max-width:64ch">${esc(T.brief)}</p>
    <p class="hint" style="margin:0">Place devices, run cables, then tap each one to give it an address. Nothing is graded — the list below just tells you what is still missing.</p>
    <div id="lsnDone"></div>`;

  // palette limited to what this scenario needs
  $('#lsnPal').innerHTML = (T.allow || []).map(id =>
    `<button data-ltool="${id}" aria-pressed="${lTool===id}">
       <span class="pg">${esc(DEV[id].glyph)}</span><span class="pn">${esc(DEV[id].name)}</span></button>`).join('');
  $$('#lsnPal [data-ltool]').forEach(b => b.onclick = () => {
    lTool = b.dataset.ltool; setLMode('place'); $('#lsnTip').textContent = DEV[lTool].blurb;
    drawDo();
  });
  ['Place','Link','Erase'].forEach(k => {
    const el2 = $('#l' + k);
    el2.setAttribute('aria-pressed', lMode === k.toLowerCase());
    el2.onclick = () => setLMode(k.toLowerCase());
  });
  $('#lWipe').onclick = async () => {
    if (await ask('Clear the canvas', 'Everything you have built for this task will be removed.', 'Clear it')) startBuild();
  };
  $('#lsnCheck').onclick = judgeBuild;

  renderBoard($('#lBoard'), LBM, {mode:'build', hotCells:lMode==='place', sel:lSel, labels:true});
  $('#lBoard').onclick = onLearnBoard;
  drawReqs();
  drawLInspector();
}

function setLMode(m){
  lMode = m; lFrom = null;
  $('#lsnTip').textContent = m === 'link' ? 'Tap one device, then another, to cable them together.'
    : m === 'erase' ? 'Tap a device to remove it, or a cable to cut it.'
    : 'Pick a device, then tap a square to place it.';
  drawDo();
}

function onLearnBoard(e){
  const h = boardHit(e);
  if (!h) return;
  if (lMode === 'place' && h.kind === 'cell'){
    if (nodeAt(LBM, h.value.x, h.value.y) >= 0) return;
    lSel = addNode(LBM, lTool, h.value.x, h.value.y);
  } else if (h.kind === 'node'){
    if (lMode === 'erase'){ removeNode(LBM, h.value); lSel = null; }
    else if (lMode === 'link'){
      if (lFrom == null){ lFrom = h.value; lSel = h.value; $('#lsnTip').textContent = 'Now tap the other end.'; }
      else { addLink(LBM, lFrom, h.value); lFrom = null; }
    } else lSel = h.value;
  } else if (h.kind === 'link' && lMode === 'erase'){
    LBM.links.splice(h.value, 1);
    LBM.nodes.forEach(n => { if(n.c.ifs) n.c.ifs = {}; if(n.c.vl) n.c.vl = {}; if('def' in n.c) n.c.def = null; });
  }
  drawDo();
}

/* live checklist */
function drawReqs(){
  const T = BUILD[LS.lesson.id];
  const results = T.need.map(([text, test]) => {
    let ok = false; try { ok = !!test(LBM); } catch(e){ ok = false; }
    return {text, ok};
  });
  const done = results.filter(r => r.ok).length;
  $('#lsnReqCount').textContent = done + ' / ' + results.length;
  $('#lsnReqCount').className = 'tag' + (done === results.length ? ' ok' : '');
  $('#lsnReqs').innerHTML = results.map(r =>
    `<div style="display:flex;gap:9px;align-items:flex-start;padding:6px 0;border-bottom:1px solid rgba(30,65,98,.4)">
       <span style="color:${r.ok?'var(--teal)':'var(--muted)'};font-family:var(--mono);flex:none">${r.ok?'&#10003;':'&mdash;'}</span>
       <span style="font-size:14px;color:${r.ok?'var(--text)':'var(--muted)'}">${esc(r.text)}</span></div>`).join('');
  return results;
}

function judgeBuild(){
  const T = BUILD[LS.lesson.id];
  const results = drawReqs();
  const missing = results.filter(r => !r.ok);
  $('#lsnDone').innerHTML = missing.length
    ? `<div class="notice bad" style="margin-top:12px"><b>Not finished.</b> ${missing.length} condition${missing.length===1?'':'s'} still unmet — the first one is <i>${esc(missing[0].text)}</i>.</div>`
    : `<div class="notice teal" style="margin-top:12px"><b>Built and working.</b> ${esc(T.done)}</div>
       <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
         <button class="btn ghost sm" id="lsnBack">Watch it again</button>
         <button class="btn sm" id="lsnNextLesson">Next component &rarr;</button></div>`;
  if ($('#lsnBack')) $('#lsnBack').onclick = () => setPhase('watch');
  if ($('#lsnNextLesson')) $('#lsnNextLesson').onclick = () => {
    const i = LESSON_IDS.indexOf(LS.lesson.id);
    openLesson(LESSON_IDS[(i + 1) % LESSON_IDS.length]);
  };
}

/* a compact inspector, same fields as the Architect but scoped to the lesson */
function drawLInspector(){
  const host = $('#lsnInsp');
  if (lSel == null || !LBM.nodes[lSel]){
    $('#lsnInspTitle').textContent = 'Set up';
    host.innerHTML = '<p class="hint" style="margin:0">Tap a device to give it an address.</p>';
    return;
  }
  const n = LBM.nodes[lSel], d = DEV[n.t], links = portsOf(LBM, lSel);
  $('#lsnInspTitle').textContent = d.name;
  let h = `<p class="hint" style="margin:0 0 10px">${esc(d.blurb)}</p>`;
  if (d.addr){
    h += `<div class="frow two">
      <div><label class="fl" for="lIp">Address</label><input type="text" id="lIp" value="${esc(n.c.ip||'')}" placeholder="10.0.1.10"></div>
      <div><label class="fl" for="lP">Prefix</label><input type="number" id="lP" min="8" max="30" value="${n.c.p||24}"></div></div>
      <div class="frow"><label class="fl" for="lGw">Gateway</label><input type="text" id="lGw" value="${esc(n.c.gw||'')}" placeholder="10.0.1.1"></div>`;
    if (n.c.ip && validIp(n.c.ip)) h += `<p class="hint" style="margin:0 0 10px">Network: <b>${n2ip(netOf(n.c.ip,n.c.p))}/${n.c.p}</b></p>`;
  }
  if (d.lease){
    const L2 = n.c.lease || {};
    h += `<div class="frow"><label class="fl">Address it hands out</label>
      <div class="frow two" style="margin:0"><input type="text" id="lLIp" value="${esc(L2.ip||'')}" placeholder="10.0.1.40">
      <input type="text" id="lLGw" value="${esc(L2.gw||'')}" placeholder="gateway"></div></div>`;
  }
  if (d.iface){
    h += links.length ? `<div class="iflist">` + links.map(lk => {
      const f = (n.c.ifs||{})[lk] || {}, to = otherEnd(LBM, lk, lSel);
      return `<div class="ifr"><div class="ifh">Cable ${lk} &rarr; ${DEV[LBM.nodes[to].t].name}</div>
        <div class="frow two" style="margin:0">
          <input type="text" data-lif="${lk}" data-k="ip" value="${esc(f.ip||'')}" placeholder="10.0.1.1">
          <input type="number" data-lif="${lk}" data-k="p" min="8" max="30" value="${f.p||24}"></div></div>`;
    }).join('') + `</div>` : '<p class="hint">Cable it up first.</p>';
  }
  if (n.t === 'switch' && links.length){
    h += `<div class="iflist">` + links.map(lk => {
      const to = otherEnd(LBM, lk, lSel);
      return `<div class="ifr"><div class="ifh">Cable ${lk} &rarr; ${DEV[LBM.nodes[to].t].name}</div>
        <label class="fl" for="lv${lk}">VLAN</label>
        <input type="number" id="lv${lk}" data-lvl="${lk}" min="1" max="9" value="${(n.c.vl||{})[lk]||1}"></div>`;
    }).join('') + `</div>`;
  }
  if (n.t === 'firewall'){
    h += `<div class="frow"><label class="fl" for="lAllow">Allowed ports</label>
      <input type="text" id="lAllow" value="${esc((n.c.allow||[]).join(','))}" placeholder="9100"></div>
      <p class="hint">Anything not listed is turned away.</p>`;
  }
  host.innerHTML = h;

  const bind = (id, fn) => { const e = $(id); if (e) e.oninput = () => { fn(e.value); drawReqs(); renderBoard($('#lBoard'), LBM, {mode:'build', hotCells:lMode==='place', sel:lSel, labels:true}); }; };
  bind('#lIp', v => n.c.ip = v.trim());
  bind('#lP',  v => n.c.p = Math.max(8, Math.min(30, parseInt(v,10)||24)));
  bind('#lGw', v => n.c.gw = v.trim());
  bind('#lLIp',v => (n.c.lease ||= {ip:'',p:24,gw:''}).ip = v.trim());
  bind('#lLGw',v => (n.c.lease ||= {ip:'',p:24,gw:''}).gw = v.trim());
  bind('#lAllow', v => n.c.allow = v.split(',').map(x => parseInt(x,10)).filter(Number.isFinite));
  $$('#lsnInsp [data-lif]').forEach(inp => inp.oninput = () => {
    const lk = inp.dataset.lif, k = inp.dataset.k;
    n.c.ifs ||= {}; n.c.ifs[lk] ||= {ip:'', p:24};
    n.c.ifs[lk][k] = k === 'p' ? (parseInt(inp.value,10)||24) : inp.value.trim();
    drawReqs();
  });
  $$('#lsnInsp [data-lvl]').forEach(inp => inp.oninput = () => {
    n.c.vl ||= {}; n.c.vl[inp.dataset.lvl] = Math.max(1, Math.min(9, parseInt(inp.value,10)||1));
    drawReqs();
  });
}

