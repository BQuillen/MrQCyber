/* ============================================================
   ARCHITECT
   The rule that makes this work: you cannot publish a map you have
   not survived yourself. A linter tells a student they were wrong;
   the proof run makes them feel wrong, at the exact hop where their
   thinking broke.
   ============================================================ */
const BUDGET = 15;
let archMode = 'guided';        // guided | free
let curModel = 'star';

function setArchMode(mode){
  archMode = mode;
  $('#mGuided').setAttribute('aria-pressed', mode === 'guided');
  $('#mFree').setAttribute('aria-pressed', mode === 'free');
  $('#guidedPane').hidden = mode !== 'guided';
  $('#freePane').hidden   = mode !== 'guided' ? false : true;
  $('#freeSide').hidden   = mode === 'guided';
  $('#canvasTitle').textContent = mode === 'guided' ? 'Build the shape' : 'Canvas';
  $('#palHint').textContent = mode === 'guided'
    ? 'In this mode only the shape matters. Use any devices you like — nothing needs an address yet.'
    : 'Computers send and receive. Switches join a room together. Routers join networks. Everything else is scenery until you configure it.';
  drawBuild();
}

function buildModelSelect(){
  $('#modelSel').innerHTML = MODEL_IDS.map(id =>
    `<option value="${id}"${id===curModel?' selected':''}>${esc(MODELS[id].name)}</option>`).join('');
  drawModelInfo();
}

function drawModelInfo(){
  const M = MODELS[curModel];
  $('#modelInfo').innerHTML = `
    <p style="margin:0 0 8px;font-size:15px;max-width:62ch">${esc(M.blurb)}</p>
    <dl class="dl" style="margin:0 0 10px">
      <dt>Why anyone uses it</dt><dd>${esc(M.why)}</dd>
      <dt>What it costs you</dt><dd>${esc(M.risk)}</dd>
    </dl>
    <div class="notice"><b>Your build:</b> ${esc(M.target)}</div>`;
  $('#modelResult').innerHTML = '';
}

function checkModel(){
  const M = MODELS[curModel], r = M.check(BM);
  if (r.ok){
    $('#modelResult').innerHTML =
      `<div class="notice teal" style="margin-top:10px"><b>That is a ${esc(M.name.toLowerCase())}.</b> ${esc(r.msg)}</div>`;
  } else {
    // If they have built a valid shape, just the wrong one, name it. Knowing
    // what you DID build is the more useful half of the correction.
    const built = MODEL_IDS.find(id => id !== curModel && MODELS[id].check(BM).ok);
    $('#modelResult').innerHTML =
      `<div class="notice bad" style="margin-top:10px"><b>Not yet.</b> ${esc(r.msg)}</div>` +
      (built ? `<div class="notice" style="margin-top:8px"><b>What you have built is a ${esc(MODELS[built].name.toLowerCase())}.</b>
         ${esc(MODELS[built].risk)} Compare that with what a ${esc(M.name.toLowerCase())} gives you: ${esc(M.risk.toLowerCase())}</div>` : '');
  }
  // Always report anything structurally wrong, whatever the model.
  const stranded = components(BM).length;
  const notes = [];
  if (BM.nodes.length && stranded > 1) notes.push(stranded + ' separate islands — nothing can cross between them.');
  const lonely = degrees(BM).filter(d => d === 0).length;
  if (lonely) notes.push(lonely + ' device' + (lonely===1?' has':'s have') + ' no cable at all.');
  if (notes.length) $('#modelResult').innerHTML += `<p class="hint">${esc(notes.join(' '))}</p>`;
}

function newPrompt(){
  const p = PROMPTS[Math.floor(Math.random() * PROMPTS.length)];
  $('#promptOut').innerHTML = `<div class="notice"><b>Build this:</b> ${esc(p)}</div>
    <p class="hint" style="margin-top:8px">There is more than one right answer. Get it working, prove it, then send the code to somebody.</p>`;
}
let BM = blankMap(11, 7);     // the map being built
let bMode = 'place';          // place | link | erase
let bTool = 'host';           // selected palette device
let bSel = null;              // selected node for the inspector
let linkFrom = null;          // first end of a cable being run
let proved = false;

function buildPalette(){
  $('#palette').innerHTML = DEV_IDS.filter(id => !DEV[id].hidden).map(id =>
    `<button data-dev="${id}" aria-pressed="${id===bTool}" title="${esc(DEV[id].blurb)}">
       <span class="pg">${DEV[id].glyph}</span><span class="pn">${esc(DEV[id].name)}</span></button>`).join('');
  $$('#palette [data-dev]').forEach(b => b.onclick = () => {
    bTool = b.dataset.dev; bMode = 'place'; setMode('place'); buildPalette(); drawBuild();
    $('#bTip').textContent = DEV[bTool].blurb + ' Tap a square to place it.';
  });
}

function setMode(m){
  bMode = m; linkFrom = null;
  ['Place','Link','Erase'].forEach(k =>
    $('#bMode'+k).setAttribute('aria-pressed', m === k.toLowerCase()));
  $('#bTip').textContent = m === 'link' ? 'Tap one device, then another, to run a cable between them.'
    : m === 'erase' ? 'Tap a device to remove it, or a cable to cut it.'
    : 'Pick a device, then tap a square to place it.';
  drawBuild();
}

function drawBuild(){
  renderBoard($('#bBoard'), BM, {mode:'build', hotCells:bMode==='place', sel:bSel, linkPick:bMode!=='place'});
  $('#budgetTag').textContent = BM.nodes.length + ' / ' + BUDGET;
  $('#budgetTag').className = 'tag' + (BM.nodes.length >= BUDGET ? ' bad' : '');
  drawInspector();
  drawGoal();
}

function onBoardClick(e){
  const h = boardHit(e);
  if (!h) return;
  invalidate();

  if (bMode === 'place' && h.kind === 'cell'){
    if (BM.nodes.length >= BUDGET){ $('#bTip').textContent = 'Budget full. Fifteen devices is the limit — make the ones you have count.'; return; }
    if (nodeAt(BM, h.value.x, h.value.y) >= 0) return;
    bSel = addNode(BM, bTool, h.value.x, h.value.y);
    drawBuild(); return;
  }
  if (h.kind === 'node'){
    if (bMode === 'erase'){ removeNode(BM, h.value); bSel = null; drawBuild(); return; }
    if (bMode === 'link'){
      if (linkFrom == null){ linkFrom = h.value; bSel = h.value; $('#bTip').textContent = 'Now tap the other end.'; }
      else { addLink(BM, linkFrom, h.value); linkFrom = null; $('#bTip').textContent = 'Cable run. Tap another pair, or switch back to Place.'; }
      drawBuild(); return;
    }
    bSel = h.value; drawBuild(); return;
  }
  if (h.kind === 'link' && bMode === 'erase'){
    BM.links.splice(h.value, 1);
    BM.nodes.forEach(n => { if(n.c.ifs) n.c.ifs = {}; if(n.c.vl) n.c.vl = {}; if('def' in n.c) n.c.def = null; });
    drawBuild(); return;
  }
}

/* ---------- inspector ---------- */
function drawInspector(){
  const host = $('#inspBody');
  if (bSel == null || !BM.nodes[bSel]){
    $('#inspTitle').textContent = 'Inspector';
    host.innerHTML = '<p class="hint" style="margin:0">Tap a device to configure it.</p>';
    return;
  }
  const n = BM.nodes[bSel], d = DEV[n.t], links = portsOf(BM, bSel);
  $('#inspTitle').textContent = d.name + ' [' + bSel + ']';
  let h = `<p class="hint" style="margin:0 0 10px">${esc(d.blurb)}</p>`;

  if (d.addr){
    h += `<div class="frow"><label class="fl" for="fWho">Name it (what the briefing will call it)</label>
      <input type="text" id="fWho" value="${esc(n.c.who||'')}" placeholder="Workshop printer"></div>`;
    h += `<div class="frow two">
      <div><label class="fl" for="fIp">Address</label><input type="text" id="fIp" value="${esc(n.c.ip||'')}" placeholder="10.0.1.10"></div>
      <div><label class="fl" for="fP">Prefix</label><input type="number" id="fP" min="8" max="30" value="${n.c.p||24}"></div></div>
      <div class="frow"><label class="fl" for="fGw">Default gateway</label><input type="text" id="fGw" value="${esc(n.c.gw||'')}" placeholder="10.0.1.1"></div>
      <p class="hint" style="margin:0 0 10px">The <b>address</b> names this machine and the <b>prefix</b> says how much of it is the network part
      (/24 is the usual one). The <b>gateway</b> is the router this machine hands anything to when the destination is not on its own
      network — leave it blank and this device can never leave home.</p>`;
    if (n.c.ip && validIp(n.c.ip))
      h += `<p class="hint" style="margin:0 0 10px">Network: <b>${n2ip(netOf(n.c.ip, n.c.p))}/${n.c.p}</b></p>`;
  }
  if (d.lease){
    const L = n.c.lease || {};
    h += `<div class="iflist" style="margin-bottom:10px"><div class="ifr"><div class="ifh">Address it hands out</div>
      <div class="frow two"><div><input type="text" id="fLIp" value="${esc(L.ip||'')}" placeholder="10.0.1.10"></div>
      <div><input type="number" id="fLP" min="8" max="30" value="${L.p||24}"></div></div>
      <input type="text" id="fLGw" value="${esc(L.gw||'')}" placeholder="gateway 10.0.1.1"></div></div>`;
  }
  if (d.iface){
    h += `<div class="iflist">` + (links.length ? links.map(lk => {
      const ifc = (n.c.ifs||{})[lk] || {};
      const to = otherEnd(BM, lk, bSel);
      return `<div class="ifr"><div class="ifh">Cable ${lk} &rarr; ${DEV[BM.nodes[to].t].name} [${to}]</div>
        <div class="frow two" style="margin:0">
          <input type="text" data-if="${lk}" data-k="ip" value="${esc(ifc.ip||'')}" placeholder="10.0.1.1">
          <input type="number" data-if="${lk}" data-k="p" min="8" max="30" value="${ifc.p||24}"></div></div>`;
    }).join('') : '<div class="ifr"><p class="hint" style="margin:0">No cables yet.</p></div>') + `</div>
      <div class="frow" style="margin-top:10px"><label class="fl" for="fDef">Default route (everything else goes here)</label>
      <select id="fDef"><option value="">none</option>` +
      links.map(lk => `<option value="${lk}"${String(n.c.def)===String(lk)?' selected':''}>cable ${lk} &rarr; ${DEV[BM.nodes[otherEnd(BM,lk,bSel)].t].name}</option>`).join('') +
      `</select></div>
      <div class="frow"><label class="fl" for="fRoutes">Static routes — one per line, e.g. <span style="font-family:var(--mono)">10.0.3.0/24 via 4</span></label>
      <textarea class="codebox" id="fRoutes" style="min-height:62px;color:var(--text);font-size:12px">${esc((n.c.routes||[]).map(r=>r.net+'/'+r.p+' via '+r.lk).join('\n'))}</textarea></div>`;
  }
  if (n.t === 'switch'){
    h += `<div class="iflist">` + (links.length ? links.map(lk => {
      const to = otherEnd(BM, lk, bSel);
      return `<div class="ifr"><div class="ifh">Cable ${lk} &rarr; ${DEV[BM.nodes[to].t].name} [${to}]</div>
        <label class="fl" for="v${lk}">VLAN</label>
        <input type="number" id="v${lk}" data-vl="${lk}" min="1" max="9" value="${(n.c.vl||{})[lk]||1}"></div>`;
    }).join('') : '<div class="ifr"><p class="hint" style="margin:0">No cables yet.</p></div>') + `</div>
      <p class="hint">Ports with different numbers cannot talk to each other, even on this same switch.</p>`;
  }
  if (n.t === 'firewall'){
    h += `<div class="frow"><label class="fl" for="fAllow">Allowed ports (comma separated)</label>
      <input type="text" id="fAllow" value="${esc((n.c.allow||[]).join(','))}" placeholder="80,443"></div>
      <p class="hint">A firewall only checks the <b>port number</b> — which service the traffic is for, not who sent it.
      Anything you do not list here is turned away. Common ones: <b>80</b> and <b>443</b> web, <b>445</b> file sharing,
      <b>9100</b> printing, <b>22</b> remote login. If your trip uses port 9100 and this list says 80, nothing gets through.</p>`;
  }
  h += `<button class="btn ghost sm" id="fDel" style="margin-top:10px">Remove this device</button>`;
  host.innerHTML = h;

  const bind = (id, fn) => { const e = $(id); if (e) e.oninput = () => { fn(e.value); invalidate(); drawBuild(); }; };
  bind('#fWho', v => n.c.who = v);
  bind('#fIp', v => n.c.ip = v.trim());
  bind('#fP',  v => n.c.p = clampP(v));
  bind('#fGw', v => n.c.gw = v.trim());
  bind('#fLIp',v => (n.c.lease ||= {}).ip = v.trim());
  bind('#fLP', v => (n.c.lease ||= {}).p = clampP(v));
  bind('#fLGw',v => (n.c.lease ||= {}).gw = v.trim());
  bind('#fAllow', v => n.c.allow = v.split(',').map(x => parseInt(x,10)).filter(Number.isFinite));
  $$('#inspBody [data-if]').forEach(inp => inp.oninput = () => {
    const lk = inp.dataset.if, k = inp.dataset.k;
    n.c.ifs ||= {}; n.c.ifs[lk] ||= {ip:'', p:24};
    n.c.ifs[lk][k] = k === 'p' ? clampP(inp.value) : inp.value.trim();
    invalidate();
  });
  $$('#inspBody [data-vl]').forEach(inp => inp.oninput = () => {
    n.c.vl ||= {}; n.c.vl[inp.dataset.vl] = Math.max(1, Math.min(9, parseInt(inp.value,10)||1));
    invalidate();
  });
  const rt = $('#fRoutes');
  if (rt) rt.oninput = () => {
    n.c.routes = rt.value.split('\n').map(line => {
      const m = line.trim().match(/^(\d+\.\d+\.\d+\.\d+)\s*\/\s*(\d+)\s+via\s+(\d+)$/i);
      return m ? {net:m[1], p:+m[2], lk:+m[3]} : null;
    }).filter(Boolean);
    invalidate();
  };
  const dsel = $('#fDef'); if (dsel) dsel.onchange = () => { n.c.def = dsel.value === '' ? null : +dsel.value; invalidate(); };
  $('#fDel').onclick = () => { removeNode(BM, bSel); bSel = null; invalidate(); drawBuild(); };
}
const clampP = v => Math.max(8, Math.min(30, parseInt(v,10) || 24));

/* ---------- the trip ---------- */
function drawGoal(){
  const g = BM.goal;
  const hosts = BM.nodes.map((n,i)=>[n,i]).filter(([n]) => n.t === 'host');
  $('#goalBody').innerHTML = `
    <p class="hint" style="margin:0 0 12px">This is the job the packet has to do: who is sending, what they are aiming at, and how far it is allowed to travel.</p>
    <div class="frow"><label class="fl" for="gSrc">Starts at</label>
      <select id="gSrc"><option value="">choose a host</option>` +
      hosts.map(([n,i]) => `<option value="${i}"${g.src===i?' selected':''}>Host [${i}] ${esc(n.c.ip||'no address')}</option>`).join('') +
      `</select></div>
    <div class="frow"><label class="fl" for="gDst">Destination address</label>
      <input type="text" id="gDst" value="${esc(g.dst||'')}" placeholder="10.0.2.50"></div>
    <div class="frow two">
      <div><label class="fl" for="gPort">Port</label><input type="number" id="gPort" value="${g.port||80}"></div>
      <div><label class="fl" for="gTtl">TTL</label><input type="number" id="gTtl" min="2" max="30" value="${g.ttl||10}"></div></div>
    <p class="hint" style="margin:0 0 12px"><b>Port</b> says which service the message is for — 80 for a web page, 9100 to a printer,
      445 for file sharing. Firewalls check it. <b>TTL</b> is how many routers the packet may pass through before it is thrown away;
      it stops a lost packet circling forever. Your best run plus two spare hops is a fair budget.</p>
    <div class="frow"><label class="fl" for="gDns">Give them a name instead of an address (optional)</label>
      <input type="text" id="gDns" value="${esc(g.dnsName||'')}" placeholder="files.school — needs a DNS device"></div>
    <div class="frow"><label class="fl" for="gBrief">Briefing</label>
      <input type="text" id="gBrief" value="${esc(g.brief||'')}" placeholder="Who is sending what, and why?"></div>
    <div class="frow"><label class="fl" for="gWantTo">Describe the recipient in words</label>
      <input type="text" id="gWantTo" value="${esc(g.wantTo||'')}" placeholder="the workshop printer"></div>
    <label class="fl" style="display:flex;gap:8px;align-items:center;text-transform:none;letter-spacing:.02em;font-family:var(--body);font-size:13.5px;color:var(--text)">
      <input type="checkbox" id="gPick" ${g.pick?'checked':''} style="width:auto"> Make the player choose sender and recipient
    </label>`;
  const b = (id, fn) => { const e = $(id); e[e.tagName==='SELECT'?'onchange':'oninput'] = () => { fn(e.value); invalidate(); }; };
  b('#gSrc',  v => g.src = v === '' ? null : +v);
  b('#gDst',  v => g.dst = v.trim());
  b('#gPort', v => g.port = parseInt(v,10) || 80);
  b('#gTtl',  v => g.ttl = Math.max(2, Math.min(30, parseInt(v,10) || 10)));
  b('#gDns',  v => g.dnsName = v.trim());
  b('#gBrief', v => g.brief = v);
  b('#gWantTo', v => g.wantTo = v);
  const pk = $('#gPick'); pk.onchange = () => { g.pick = pk.checked; invalidate(); };
}

/* ---------- status check ---------- */
function showStatus(level){
  const f = faults(JSON.parse(JSON.stringify(BM)));
  const out = $('#statusOut');
  if (!f.length){
    const r = autosolve(JSON.parse(JSON.stringify(BM)));
    out.innerHTML = `<div class="notice teal"><b>Nothing wrong that I can see.</b> A packet can finish this in ${r.hops} moves using ${r.ttlUsed} of your ${BM.goal.ttl} TTL.</div>`;
    return;
  }
  // One fault at a time, in travel order. Fixing a later one while an
  // earlier one still kills you teaches nothing.
  const first = f[0];
  out.innerHTML = `<div class="notice${first.kind==='unreach'?'':' bad'}">
    ${esc(level === 1 ? first.area : first.gap)}
    ${level === 2 && proved === 'failed' ? '<div style="margin-top:8px;opacity:.85">' + esc(first.fix) + '</div>' : ''}
  </div>` + (f.length > 1 ? `<p class="hint">${f.length - 1} other thing${f.length>2?'s':''} to look at after this one.</p>` : '');
}

/* ---------- prove it, then publish ---------- */
function invalidate(){ proved = false; $('#btnPublish').disabled = true; $('#pubOut').innerHTML = ''; }

function proveIt(){
  const f = faults(JSON.parse(JSON.stringify(BM)));
  if (f.length){
    proved = 'failed';
    $('#pubOut').innerHTML = '<div class="notice bad">Fix the status check first — the map cannot be finished as it stands.</div>';
    showStatus(1);
    return;
  }
  const copy = JSON.parse(JSON.stringify(BM));
  playCtx = {kind:'proof', title:'Proof run — your own map', brief:'Survive your own maze before you hand it to anybody.'};
  PS = startRun(copy);
  PS.onWin = () => {};
  drawPlay();
  switchTab('play');
  $('#lvlPick').hidden = true; $('#lvlPlay').hidden = false;
  proofPending = true;
}
let proofPending = false;

function publish(){
  const r = autosolve(JSON.parse(JSON.stringify(BM)));
  const code = encodeMap(BM);
  $('#pubOut').innerHTML = `
    <div class="notice teal" style="margin-top:12px"><b>Published.</b> Your best run used ${r.ttlUsed} hops, so the TTL budget is fair at ${BM.goal.ttl}.</div>
    <p class="hint" style="margin:10px 0 6px">Send this code. It carries the whole map.</p>
    <textarea class="codebox" readonly>${esc(code)}</textarea>
    <button class="btn ghost sm" id="cpCode" style="margin-top:8px">Copy code</button>`;
  $('#cpCode').onclick = async () => {
    try { await navigator.clipboard.writeText(code); $('#cpCode').textContent = 'Copied'; } catch(e){}
  };
}
