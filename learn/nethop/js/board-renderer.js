/* ============================================================
   BOARD RENDERER
   One renderer, two modes. The architect sees everything. The
   packet sees one hop and fog — which is not a game concession,
   it is what a packet actually knows.
   ============================================================ */
const CELL = 54, PAD = 7;
const cx = n => n.x * CELL + CELL/2;
const cy = n => n.y * CELL + CELL/2;

function renderBoard(svg, map, o){
  o = o || {};
  const W = map.w * CELL, H = map.h * CELL;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  let s = '';

  // grid
  if (o.mode === 'build'){
    for (let y = 0; y < map.h; y++)
      for (let x = 0; x < map.w; x++)
        s += `<rect class="cell${o.hotCells?' hot':''}" data-cell="${x},${y}" x="${x*CELL}" y="${y*CELL}" width="${CELL}" height="${CELL}" rx="3"/>`;
  }

  // Fog: you have drawn a map of everywhere you have been. The machines one
  // hop away are known to exist but not yet identified — they render as '?'.
  const vis = new Set(), ghost = new Set();
  if (o.fog && o.state){
    const st = o.state;
    st.seen.forEach(i => vis.add(i));
    vis.add(st.at);
    (st.charted || new Set()).forEach(i => { if (!vis.has(i)) ghost.add(i); });
  }
  const known = i => !o.fog || vis.has(i) || ghost.has(i);

  // links
  const exitMap = {};
  if (o.exits) o.exits.forEach(e => exitMap[e.lk] = e);
  const trail = new Set((o.state ? o.state.path : []).map(p => p.link));

  map.links.forEach((l, i) => {
    const a = map.nodes[l[0]], b = map.nodes[l[1]];
    if (!a || !b) return;
    let cls = 'link';
    if (exitMap[i]) cls += exitMap[i].ok ? ' legal' : ' illegal';
    else if (trail.has(i)) cls += ' trail';
    else if (o.mode === 'play' && !(vis.has(l[0]) && vis.has(l[1]))) cls += ' link';
    if (o.mode === 'build' && o.linkPick) cls += ' hit';
    if (o.state && o.state.down.has(i)) cls += ' cut';
    if (o.fog && !(known(l[0]) && known(l[1]))) return;   // undiscovered cable
    const op = '';
    s += `<line class="${cls}" data-link="${i}" x1="${cx(a)}" y1="${cy(a)}" x2="${cx(b)}" y2="${cy(b)}"${op}/>`;
  });

  // exit labels sit on the midpoint of each offered link
  if (o.exits) o.exits.forEach(e => {
    const a = map.nodes[o.state.at], b = map.nodes[e.to];
    if (!a || !b) return;
    const mx = (cx(a)+cx(b))/2, my = (cy(a)+cy(b))/2;
    s += `<text class="exitlbl ${e.ok?'yes':'no'}" x="${mx}" y="${my-6}">${e.ok?'OPEN':'BLOCKED'}</text>`;
  });

  // nodes
  map.nodes.forEach((n, i) => {
    if (o.fog && !known(i)) return;                        // not discovered yet
    const isGhost = o.fog && ghost.has(i) && !vis.has(i);
    const d = DEV[n.t];
    let cls = 'node';
    if (o.sel === i) cls += ' sel';
    if (o.state && o.state.at === i) cls += ' here';
    if (isGhost) cls += ' ghost';
    if (o.pickable) cls += ' pick';
    const X = n.x*CELL + PAD, Y = n.y*CELL + PAD, S = CELL - PAD*2;
    s += `<g class="${cls}" data-node="${i}">`;
    s += `<rect x="${X}" y="${Y}" width="${S}" height="${S}" rx="7"/>`;
    s += `<text class="gl" x="${cx(n)}" y="${cy(n)-1}">${isGhost ? '?' : d.glyph}</text>`;
    if (isGhost){ s += `</g>`; return; }
    const sub = n.c && n.c.ip ? n.c.ip.split('.').slice(-2).join('.') : '';
    if (sub) s += `<text class="lb" x="${cx(n)}" y="${cy(n)+12}">${sub}</text>`;
    // The human name sits under the box. Matching "the workshop printer" to a
    // machine is the reading comprehension the dispatch step depends on.
    if (n.c && n.c.who && o.labels !== false){
      const w = n.c.who.length > 17 ? n.c.who.slice(0,16) + '\u2026' : n.c.who;
      s += `<text class="who" x="${cx(n)}" y="${n.y*CELL + CELL - 1}">${esc(w)}</text>`;
    }
    s += `</g>`;
  });

  // the packet itself — absent before dispatch, so guard the lookup
  if (o.state && o.mode === 'play'){
    const n = map.nodes[o.state.at];
    if (n) s += `<circle class="pk" cx="${cx(n)}" cy="${cy(n) - CELL/2 + 3}" r="5"/>`;
  }

  svg.innerHTML = s;
}

/* Click routing: returns {kind:'cell'|'node'|'link', value} or null */
function boardHit(ev){
  const t = ev.target.closest('[data-node]');
  if (t) return {kind:'node', value:+t.dataset.node};
  if (ev.target.dataset.link != null) return {kind:'link', value:+ev.target.dataset.link};
  if (ev.target.dataset.cell) {
    const [x,y] = ev.target.dataset.cell.split(',').map(Number);
    return {kind:'cell', value:{x,y}};
  }
  return null;
}
