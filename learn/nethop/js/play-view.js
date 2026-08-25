/* ============================================================
   PLAY VIEW
   Turn-based on purpose. Every idea here needs a beat to look at.

   Dispatch comes first: work out which address is which, decide
   who is sending, and decide whether this network is safe to send
   on at all. Some of them are not.
   ============================================================ */
let PS = null, playCtx = null;
let dispFrom = null, dispTo = null, dispScans = [], dispUsed = 0;

function startLevel(idx){
  const L = LEVELS[idx];
  playCtx = {kind:'level', idx, title:L.title, brief:L.brief, wantFrom:L.wantFrom,
             wantTo:L.wantTo, map:levelMap(idx),
             mods:modsFor(L, $('#tierOverride') ? $('#tierOverride').value : '')};
  PS = null; dispFrom = null; dispTo = null; dispScans = []; dispUsed = 0;
  $('#lvlPick').hidden = true; $('#lvlPlay').hidden = false;
  if (playCtx.map.goal.pick) drawDispatch();
  else { PS = startRun(playCtx.map, playCtx.mods); drawPlay(); }
  window.scrollTo({top:0,behavior:'smooth'});
}
function startCustom(map, mods){
  playCtx = {kind:'code', title:'Shared map', brief:map.goal.brief || 'Someone else built this.',
             wantTo:map.goal.wantTo || 'the right machine', wantFrom:'the sending machine',
             map:JSON.parse(JSON.stringify(map)), mods:mods || modsOf({tier:'technician'})};
  PS = null; dispFrom = null; dispTo = null; dispScans = []; dispUsed = 0;
  switchTab('play');
  $('#lvlPick').hidden = true; $('#lvlPlay').hidden = false;
  if (playCtx.map.goal.pick) drawDispatch();
  else { PS = startRun(playCtx.map, playCtx.mods); drawPlay(); }
}

const tierBadge = m => `<span class="tag warn">${esc(TIERS[m.tier].name)}</span>`;
const endpointList = map => map.nodes.map((n,i)=>[n,i]).filter(([n]) => DEV[n.t].end && n.c.ip);

/* ---------- DISPATCH ---------- */
function drawDispatch(){
  const map = playCtx.map, g = map.goal, m = playCtx.mods;
  const eps = endpointList(map);
  const ttlAfter = Math.max(1, g.ttl - dispUsed * m.probeCost);

  // At Rookie the machines are labelled. Above that you get bare addresses
  // and have to work out what they are.
  const opt = (n,i,cur) => `<option value="${i}"${cur===i?' selected':''}>`
    + (m.labels && n.c.who ? esc(n.c.who) + ' — ' : '') + esc(n.c.ip) + '</option>';

  const fit = tierFits(map, m), b = fit.budget;
  const knowPanel = m.labels ? '' : `
    <div class="card" style="margin-top:14px"><div class="card-h"><h3>What you already know</h3></div>
      <div class="card-b">
        <p class="hint" style="margin:0 0 9px">Addresses and masks are free — you can read them off the list and run them against your own. Only <b>services</b> cost a scan.</p>
        ${b.byName ? `<div class="notice teal">You have a name, not an address. Asking the resolver costs no scan.</div>`
          : `<div class="notice teal">The brief points at <b>${esc(b.service)}</b> on the <b>${esc(b.net)}</b> network.
             <b>${b.candidates}</b> address${b.candidates===1?'':'es'} in the list sit${b.candidates===1?'s':''} on that network.
             ${b.candidates===1 ? 'That is enough on its own — no scan needed.' : 'Narrow it with the mask first, then spend a scan to tell them apart.'}</div>`}
        ${!fit.ok ? `<div class="notice bad">Fair warning: at this difficulty you have ${m.probes} scan${m.probes===1?'':'s'} and this map needs ${fit.need}. Played as designed it is <b>${esc(TIERS[LEVELS[playCtx.idx]?LEVELS[playCtx.idx].tier:'technician'].name)}</b>.</div>` : ''}
      </div></div>`;

  const scanPanel = m.probes > 0 ? `
    <div class="card" style="margin-top:14px"><div class="card-h"><h3>Port scan</h3>
      <span class="tag${dispUsed>=m.probes?' bad':''}">${m.probes - dispUsed} left</span>
      ${m.probeCost?`<span class="tag warn">costs ${m.probeCost} TTL each</span>`:''}</div>
      <div class="card-b">
        <p class="hint" style="margin:0 0 9px">Knock on an address and see what answers. What is listening tells you what the machine is.</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <select id="sIp" style="flex:1 1 150px">${eps.filter(([,i]) => i !== g.src)
            .map(([n])=>`<option value="${esc(n.c.ip)}">${esc(n.c.ip)}</option>`).join('')}</select>
          <button class="btn ghost" id="sGo" ${dispUsed>=m.probes?'disabled':''}>Scan</button>
        </div>
        <div id="scanOut">${dispScans.map(r => `
          <div class="notice teal" style="margin-top:9px"><b>${esc(r.ip)}</b><br>${
            r.ports.length ? r.ports.map(p=>`<span style="font-family:var(--mono)">${p}</span> ${esc(PORT_MEANS[p]||'unknown service')}`).join('<br>')
                           : esc(r.note)}</div>`).join('')}</div>
      </div></div>` : (m.probes === 0 && m.tier !== 'rookie'
        ? `<div class="notice" style="margin-top:14px">No scans at this tier. You work it out from the addresses, the mask, and whatever the network tells you on the way.</div>` : '');

  $('#lvlPlay').innerHTML = `
    <div style="margin-top:18px;display:flex;gap:10px;align-items:center;flex-wrap:wrap">
      <button class="btn ghost sm" id="pQuit">&larr; Levels</button>
      <span class="eyebrow" style="margin:0">${esc(playCtx.title)}</span>
      ${tierBadge(m)}
    </div>
    <div class="stage">
      <div>
        <div class="card"><div class="card-h"><h2>Briefing</h2></div>
          <div class="card-b">
            <p style="margin:0 0 12px;font-size:15.5px;max-width:66ch">${esc(playCtx.brief)}</p>
            <p class="hint" style="margin:0">${esc(TIERS[m.tier].note)}</p>
          </div></div>
        <div class="boardwrap" style="margin-top:14px"><svg class="board" id="dBoard"></svg></div>
        ${m.fog ? '<p class="hint">Nothing is charted yet. The map fills in behind you, one hop at a time.</p>' : ''}
      </div>
      <div>
        <div class="card"><div class="card-h"><h3>Dispatch</h3>
          <span class="tag">TTL ${ttlAfter}</span></div>
          <div class="card-b">
            <div class="frow"><label class="fl" for="dFrom">Which machine is sending?</label>
              <select id="dFrom"><option value="">choose…</option>${eps.map(([n,i])=>opt(n,i,dispFrom)).join('')}</select></div>
            <div class="frow"><label class="fl" for="dTo">Which address should receive it?</label>
              <select id="dTo"><option value="">choose…</option>${
                g.dnsName ? `<option value="__dns"${dispTo==='__dns'?' selected':''}>Look it up — ask DNS for ${esc(g.dnsName)}</option>` : ''
              }${eps.map(([n,i])=>opt(n,i,dispTo)).join('')}</select></div>
            ${g.dnsName ? '<p class="hint" style="margin:-4px 0 12px">You only have a name. You can guess an address from the list, or go and ask.</p>' : ''}
            <p class="hint" style="margin:0 0 12px">The brief asks for <b>${esc(playCtx.wantTo||'the right machine')}</b>.</p>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <button class="btn gold" id="dGo">Send it</button>
              <button class="btn ghost" id="dAbort">Refuse to send</button>
            </div>
            <p class="hint" style="margin:9px 0 0">Refusing is the right call on a network you cannot trust — and the wrong call on one you can.</p>
            <div id="dMsg"></div>
          </div></div>
        ${knowPanel}
        ${scanPanel}
      </div>
    </div>`;

  renderBoard($('#dBoard'), map, m.fog
    ? {mode:'play', fog:true, labels:false, state:{at:-1, seen:new Set(), path:[], down:new Set()}}
    : {mode:'build', labels:m.labels});
  $('#dFrom').onchange = e => { dispFrom = e.target.value===''?null:+e.target.value; };
  $('#dTo').onchange   = e => { const v = e.target.value; dispTo = v==='' ? null : (v==='__dns' ? '__dns' : +v); };
  $('#pQuit').onclick = quitPlay;

  if (m.probes > 0) $('#sGo').onclick = () => {
    const ip = $('#sIp').value, r = scan(map, ip);
    dispScans.push({ip, ports:r.ports, note:r.note || 'Nothing answered.'});
    dispUsed++; drawDispatch();
  };

  $('#dAbort').onclick = () => {
    const st = startRun(JSON.parse(JSON.stringify(map)), m);
    PS = st; abortRun(st); drawPlay();
  };

  $('#dGo').onclick = () => {
    if (dispFrom == null || dispTo == null){
      $('#dMsg').innerHTML = '<div class="notice bad">Pick both before you send.</div>'; return; }
    if (dispFrom !== g.src){
      $('#dMsg').innerHTML = '<div class="notice bad">That is not where the file is. The brief says it starts at <b>'
        + esc(playCtx.wantFrom) + '</b>.</div>'; return; }
    const run = JSON.parse(JSON.stringify(map));
    run.goal.ttl = ttlAfter;                       // scans were paid for in hops
    if (dispTo === '__dns'){
      PS = startRun(run, m);                       // resolver decides the address
      PS.want = g.dst;                             // …but a lying one still counts as wrong
      PS.chose = 'whatever DNS answers';
    } else {
      const target = map.nodes[dispTo];
      run.goal.dst = target.c.ip || '0.0.0.0';
      run.goal.dnsName = '';                       // they guessed rather than asked
      PS = startRun(run, m);
      PS.want = g.dst;
      PS.chose = target.c.who || target.c.ip;
    }
    drawPlay();
  };
}

/* ---------- THE TRIP ---------- */
function drawPlay(){
  const st = PS, map = st.map, g = map.goal, m = st.mods;
  const a = actions(st);
  const exits = a.kind === 'exits' ? a.list : null;
  const node = map.nodes[st.at];
  const ttlPct = Math.max(0, st.ttl / st.maxTtl * 100);
  const src = map.nodes[g.src];

  $('#lvlPlay').innerHTML = `
    <div style="margin-top:18px;display:flex;gap:10px;align-items:center;flex-wrap:wrap">
      <button class="btn ghost sm" id="pQuit">&larr; Levels</button>
      <span class="eyebrow" style="margin:0">${esc(playCtx.title)}</span>
      ${tierBadge(m)}
      <span style="margin-left:auto"><button class="btn ghost sm" id="pRestart">Restart</button></span>
    </div>
    <div class="stage">
      <div>
        <div class="card"><div class="card-b" style="padding-bottom:6px">
          <p class="hint" style="margin:0 0 10px">${esc(playCtx.brief)}</p></div>
          <div class="boardwrap"><svg class="board" id="pBoard"></svg></div>
        </div>
        <div class="card" style="margin-top:14px">
          <div class="card-h"><h3>Trip log</h3><span class="tag">${st.turns} turns</span></div>
          <div class="card-b"><div class="logbox" id="pLog"></div></div>
        </div>
      </div>
      <div>
        <div class="hud">
          <div class="band ip"><div class="bl">Addressed to</div><div class="bv">${esc(st.resolving ? (g.dnsName||'?') : st.dst)}</div></div>
          <div class="band port"><div class="bl">Port</div><div class="bv">${st.port}</div></div>
          <div class="band ttl"><div class="bl">TTL</div><div class="bv">${st.ttl} / ${st.maxTtl}</div>
            <div class="ttlbar${ttlPct<35?' low':''}"><i style="width:${ttlPct}%"></i></div></div>
        </div>
        <div class="hud">
          <div class="band ip${src.c.ip?'':' dim'}"><div class="bl">My address</div>
            <div class="bv">${esc(src.c.ip||'none')}${src.c.ip?'/'+src.c.p:''}</div></div>
          <div class="band mac"><div class="bl">My gateway</div><div class="bv">${esc(src.c.gw||'none')}</div></div>
        </div>
        <div class="card"><div class="card-h"><h3 id="actTitle">Your move</h3></div>
          <div class="card-b" id="actBody"></div></div>
      </div>
    </div>`;

  renderBoard($('#pBoard'), map, {mode:'play', state:st, exits, fog:m.fog, labels:m.labels});
  $('#pBoard').onclick = e => {
    const h = boardHit(e);
    if (h && h.kind === 'link' && exits){
      const ex = exits.find(x => x.lk === h.value);
      if (ex && ex.ok) step(ex.lk);
    }
  };
  const log = $('#pLog');
  log.innerHTML = st.log.map(l => `<div class="${l.k}">${esc(l.t)}</div>`).join('') || '<div>Nothing yet.</div>';
  log.scrollTop = log.scrollHeight;
  $('#pQuit').onclick = quitPlay;
  $('#pRestart').onclick = restart;

  const body = $('#actBody');

  // Refused to transmit.
  if (st.aborted){
    body.innerHTML = st.status === 'win'
      ? `<div class="notice teal"><b>Correct call.</b> ${esc(st.reason)} Sending would have handed the traffic straight to whoever set this up.</div>
         <div style="display:flex;gap:8px;margin-top:12px"><button class="btn" id="aBack">Back to levels</button></div>`
      : `<div class="notice bad"><b>${esc(st.reason)}</b> Refusing is only right when something is actually wrong.</div>
         <div style="display:flex;gap:8px;margin-top:12px"><button class="btn" id="aAgain">Try again</button></div>`;
    if ($('#aBack')) $('#aBack').onclick = quitPlay;
    if ($('#aAgain')) $('#aAgain').onclick = restart;
    if (st.status === 'win' && playCtx.kind === 'level') awardPass(body);
    return;
  }

  // Delivered flawlessly to the wrong machine.
  if (st.status === 'win' && st.want && st.dst !== st.want){
    const right = map.nodes.find(n => n.c && n.c.ip === st.want);
    body.innerHTML = `<div class="notice bad"><b>Delivered — to the wrong machine.</b>
      It went to <b>${esc(st.chose||st.dst)}</b>. The brief asked for <b>${esc(playCtx.wantTo||'')}</b>${
        right && right.c.who ? ', which is ' + esc(right.c.who) + ' at ' + esc(st.want) : ''}.
      The network did its job perfectly. You addressed it wrong.</div>
      <div style="display:flex;gap:8px;margin-top:12px"><button class="btn" id="aRedisp">Re-address it</button></div>`;
    $('#aRedisp').onclick = drawDispatch;
    return;
  }

  if (st.status === 'win'){
    body.innerHTML = `<div class="notice teal"><b>Delivered.</b> ${st.turns} turns, ${st.ttl} TTL left.</div>`;
    if (playCtx.kind === 'proof'){
      proved = true; $('#btnPublish').disabled = false;
      body.innerHTML += `<div class="notice teal">Proof run cleared. You can publish now.</div>
        <div style="display:flex;gap:8px;margin-top:12px"><button class="btn" id="aArch">Back to Architect</button></div>`;
      $('#aArch').onclick = () => { quitPlay(); switchTab('build'); };
      return;
    }
    if (playCtx.kind === 'level') awardPass(body);
    else body.innerHTML += `<div style="display:flex;gap:8px;margin-top:12px"><button class="btn" id="aBack">Back</button></div>`,
         $('#aBack').onclick = quitPlay;
    return;
  }

  if (st.status === 'dead'){
    body.innerHTML = `<div class="notice bad"><b>Dropped.</b> ${esc(st.reason)}</div>
      <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
        <button class="btn" id="aRewind">Back one hop</button>
        <button class="btn ghost" id="aAgain">Start over</button></div>`;
    $('#aRewind').onclick = rewind; $('#aAgain').onclick = restart;
    return;
  }

  const abortBtn = `<button class="btn ghost sm" id="aAbort" style="margin-top:12px">Abort transmission</button>`;

  if (a.kind === 'dhcp'){
    $('#actTitle').textContent = 'No address';
    body.innerHTML = `<p class="hint" style="margin:0 0 10px">You cannot work out where to send yourself without an address of your own.</p>
      <button class="btn gold" id="aDhcp">Broadcast DHCP request</button>${abortBtn}`;
    $('#aDhcp').onclick = () => { doDhcp(st); drawPlay(); };
    $('#aAbort').onclick = () => { abortRun(st); drawPlay(); };
    return;
  }

  if (a.kind === 'arp'){
    const me = node.c, local = sameNet(st.target, me.ip, me.p);
    $('#actTitle').textContent = 'Who is next door?';
    body.innerHTML = `<p class="hint" style="margin:0 0 10px">You know the address you are aiming at, but not the hardware address of whoever has to carry you next.</p>
      <div class="notice">Target ${esc(st.target)} is <b>${local ? 'on this subnet' : 'outside this subnet'}</b>, so the next hop is
        <b>${esc(local ? st.target : (me.gw || 'a gateway that is not set'))}</b>.</div>
      <button class="btn gold" id="aArp" style="margin-top:10px">Send ARP request</button>${abortBtn}`;
    $('#aArp').onclick = () => { doArp(st); drawPlay(); };
    $('#aAbort').onclick = () => { abortRun(st); drawPlay(); };
    return;
  }

  const legal = exits.filter(e => e.ok);
  $('#actTitle').textContent = legal.length ? 'Choose an exit' : 'Nowhere to go';
  body.innerHTML = `<p class="hint" style="margin:0 0 4px">${esc(deviceLine(node, st))}</p>
    <div class="exits">` + exits.map(e => {
      const t = map.nodes[e.to];
      const nm = (m.labels && t.c && t.c.who) ? t.c.who : DEV[t.t].name;
      return `<button class="exit ${e.ok?'go':'no'}" data-lk="${e.lk}" ${e.ok?'':'disabled'}>
        <span class="en">to ${esc(nm)}${t.c && t.c.ip ? ' · ' + esc(t.c.ip) : ''}</span>
        <span class="er">${esc(e.why)}</span></button>`;
    }).join('') + '</div>' + abortBtn;
  $$('#actBody .exit').forEach(b => { if (!b.disabled) b.onclick = () => step(+b.dataset.lk); });
  $('#aAbort').onclick = () => { abortRun(st); drawPlay(); };

  if (!legal.length){
    st.status = 'dead';
    // Distinguish "wrong turn" from "you addressed something nothing can reach".
    let why = ' Nothing here will carry you any further.';
    try {
      const probe = JSON.parse(JSON.stringify(playCtx.map));
      probe.goal.dst = st.dst; probe.goal.dnsName = ''; probe.goal.ttl = st.maxTtl;
      const reach = autosolve(probe, Object.assign({}, m, {cut:null, adversary:null}));
      why = reach.ok
        ? ' There was a route to ' + st.dst + ' on this network — just not from where you are standing now.'
        : ' Nothing on this network can reach ' + st.dst + ' at all. Worth asking whether that is really the machine the brief wanted.';
    } catch(e){}
    st.reason = 'Every exit is closed.' + why;
    st.log.push({t:'No legal exit. Packet dropped.', k:'x'});
    drawPlay();
  }
}

function awardPass(body){
  cleared.add(playCtx.idx);
  if (playCtx.idx + 1 < LEVELS.length){
    body.innerHTML += `<p class="hint" style="margin:12px 0 4px">Next up: <b>${esc(LEVELS[playCtx.idx+1].title)}</b></p>`;
  } else {
    body.innerHTML += `<div class="notice teal" style="margin-top:12px">That was the last one. You have run every device, every topology, and every liar in the set.</div>`;
  }
  const more = playCtx.idx + 1 < LEVELS.length;
  body.innerHTML += `<div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
    ${more ? '<button class="btn" id="aNextLvl">Next level &rarr;</button>' : ''}
    <button class="btn ghost" id="aAgain">Run it again</button>
    <button class="btn ghost" id="aBack">Back to levels</button></div>`;
  if ($('#aNextLvl')) $('#aNextLvl').onclick = () => startLevel(playCtx.idx + 1);
  $('#aAgain').onclick = restart; $('#aBack').onclick = quitPlay;
}

function deviceLine(node, st){
  switch(node.t){
    case 'switch':  return 'A switch. It reads your MAC band and cannot see your IP at all.';
    case 'hub':     return 'A hub. It has no idea where anything is, so it offers you every port.';
    case 'router':  return 'A router. It checks your address against its interfaces and its routing table, and it will cost you a hop.';
    case 'firewall':return 'A firewall. It is looking only at your port number: ' + st.port + '.';
    default:        return 'An endpoint. It compares the target against its own address and mask to decide local or gateway.';
  }
}

function step(lk){ move(PS, lk); drawPlay(); }
function restart(){
  if (playCtx.map && playCtx.map.goal.pick){ drawDispatch(); return; }
  PS = startRun(JSON.parse(JSON.stringify(playCtx.map)), playCtx.mods);
  drawPlay();
}
function rewind(){
  const hist = PS.path.slice(0, -1), keep = PS.map;
  PS = startRun(JSON.parse(JSON.stringify(playCtx.map)), playCtx.mods);
  PS.want = keep.goal ? undefined : undefined;
  PS.goalDst = null;
  PS.dst = keep.goal.dst; PS.target = PS.resolving ? PS.target : PS.dst;
  for (const h of hist){
    const a = actions(PS);
    if (a.kind === 'arp') doArp(PS);
    else if (a.kind === 'dhcp') doDhcp(PS);
    if (PS.at === h.from) move(PS, h.link);
  }
  PS.status = 'alive'; PS.reason = '';
  PS.log.push({t:'Rewound one hop. Try a different exit.', k:'w'});
  drawPlay();
}
function quitPlay(){ $('#lvlPlay').hidden = true; $('#lvlPick').hidden = false; renderLevels(); }
