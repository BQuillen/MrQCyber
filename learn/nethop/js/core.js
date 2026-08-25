/* ============================================================
   NET HOP — core model
   One file, no dependencies, GitHub Pages ready.

   THE MAP OBJECT is the single source of truth. Everything —
   canvas, simulator, hints, map codes — reads from this shape:

   { w, h,
     nodes: [ {t:'router', x, y, c:{…}} ],   // id === array index
     links: [ [nodeA, nodeB] ],              // id === array index
     goal:  { src, dst, port, ttl, proto, dnsName } }

   Node config (c) by type:
     host/server : {ip, p, gw}          p = prefix length (/24 → 24)
     router      : {ifs:{linkId:{ip,p}}, def:linkId|null}
     switch      : {vl:{linkId:vlanId}}
     firewall    : {allow:[ports]}
     dns         : {ip, p, gw}
     dhcp        : {ip, p, gw, lease:{ip,p,gw}}
     hub         : {}
   ============================================================ */

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const el = (t,c,h) => { const n=document.createElement(t); if(c)n.className=c; if(h!=null)n.innerHTML=h; return n; };
const esc = s => String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* ---------------- IP maths ----------------
   Everything the game teaches about subnets comes down to these
   four functions. Kept tiny and honest on purpose. */
function ip2n(s){
  const p = String(s||'').trim().split('.');
  if (p.length !== 4) return null;
  let n = 0;
  for (const o of p){
    if (!/^\d{1,3}$/.test(o)) return null;
    const v = +o; if (v > 255) return null;
    n = (n << 8) | v;
  }
  return n >>> 0;
}
const n2ip = n => [24,16,8,0].map(s => (n >>> s) & 255).join('.');
const maskOf = p => p <= 0 ? 0 : (0xFFFFFFFF << (32 - p)) >>> 0;
const netOf = (ip, p) => (ip2n(ip) & maskOf(p)) >>> 0;
// The single most important comparison in the whole game.
const sameNet = (a, b, p) => a != null && b != null && (ip2n(a) & maskOf(p)) === (ip2n(b) & maskOf(p));
const validIp = s => ip2n(s) !== null;

/* ---------------- device catalog ---------------- */
const DEV = {
  host:    {name:'Computer', glyph:'PC',  tier:0, addr:true, end:true,
            blurb:'A computer. Where a trip usually starts.'},
  server:  {name:'Server',   glyph:'SRV', tier:0, addr:true, end:true,
            blurb:'A machine that answers requests.'},
  printer: {name:'Printer',  glyph:'PRN', tier:0, addr:true, end:true,
            blurb:'An endpoint like any other. It just prints what arrives.'},
  fridge:  {name:'Smart Thing', glyph:'IOT', tier:0, addr:true, end:true,
            blurb:'A fridge, a thermostat, a doorbell. On the network and easy to confuse with something useful.'},
  camera:  {name:'Camera',   glyph:'CAM', tier:0, addr:true, end:true,
            blurb:'Another endpoint. Another way to deliver to the wrong place.'},
  hub:     {name:'Hub',      glyph:'HUB', tier:0,
            blurb:'Copies everything out every port. Collisions live here.'},
  switch:  {name:'Switch',   glyph:'SW',  tier:1,
            blurb:'Reads MAC only. Blind to IP. Can split into VLANs.'},
  router:  {name:'Router',   glyph:'RTR', tier:2, iface:true,
            blurb:'Crosses between networks. Costs one hop of TTL.'},
  firewall:{name:'Firewall', glyph:'FW',  tier:4, ports:true,
            blurb:'Allows or blocks by port number.'},
  dns:     {name:'DNS',      glyph:'DNS', tier:3, addr:true, end:true,
            blurb:'Trades a name for an address.'},
  slot:    {name:'Missing piece', glyph:'?', tier:0, hidden:true,
            blurb:'Something belongs here.'},
  dhcp:    {name:'DHCP',     glyph:'DHCP',tier:3, addr:true, end:true, lease:true,
            blurb:'Hands out an address to a host that has none.'}
};
const DEV_IDS = Object.keys(DEV);

/* ============================================================
   DIFFICULTY TIERS
   Difficulty is a separate axis from topic, so VLANs can appear at
   Technician and again at Operator. A level is a map plus a set of
   modifiers — which is also why an adversary is never "one level".

     labels    show the human name of each machine
     probes    port scans allowed before dispatch (0 = none)
     probeCost TTL charged per scan
     fog       hide everything but where you stand and its exits
   ============================================================ */
const TIERS = {
  rookie:     {name:'Rookie',        labels:true,  probes:0, probeCost:0, fog:false,
               note:'Everything is labelled. Learn the moves.'},
  technician: {name:'Technician',    labels:false, probes:3, probeCost:0, fog:false,
               note:'Names are gone. Scan the addresses to work out what they are.'},
  analyst:    {name:'Analyst',       labels:false, probes:2, probeCost:1, fog:false,
               note:'Scans cost you a hop. Narrow the field with the mask before you spend one.'},
  operator:   {name:'Operator',      labels:false, probes:1, probeCost:1, fog:true,
               note:'One scan, and you can only see where you are standing.'},
  wizard:     {name:'Network Wizard',labels:false, probes:0, probeCost:0, fog:true,
               note:'No scans. No map. Trust nothing that answers you.'}
};
const TIER_ORDER = ['rookie','technician','analyst','operator','wizard'];

/* Modifiers resolve from the tier, then the level may override any of them. */
function modsOf(L){
  const t = TIERS[L.tier] || TIERS.rookie;
  return Object.assign({tier:L.tier||'rookie', adversary:null, cut:null, maxTurns:25},
                       {labels:t.labels, probes:t.probes, probeCost:t.probeCost, fog:t.fog},
                       L.mods || {});
}

/* ============================================================
   INFORMATION BUDGET
   How much can be worked out WITHOUT spending a scan?

   Addresses and masks are free — you can see them in the dispatch
   list and run them against your own mask. Services are not: the
   only way to learn what a box does is to knock on it.

   So a level is solvable with zero scans when either the target's
   subnet contains exactly one candidate (the mask alone decides),
   or the level hands you a name and a resolver to ask.

   This is what stops a low-scan tier from becoming a coin flip.
   ============================================================ */
function infoBudget(map){
  const g = map.goal;
  const eps = map.nodes.map((n,i)=>[n,i]).filter(([n,i]) => DEV[n.t].end && n.c.ip && i !== g.src);
  const tgt = map.nodes.find(n => n.c && n.c.ip === g.dst);
  if (!tgt) return {need:1, candidates:eps.length, net:null, service:null};

  const net = n2ip(netOf(tgt.c.ip, tgt.c.p)) + '/' + tgt.c.p;
  const inNet = eps.filter(([n]) => sameNet(n.c.ip, tgt.c.ip, tgt.c.p));
  const ports = portsOfNode(tgt);
  const service = ports.length ? (PORT_MEANS[ports[ports.length-1]] || 'an unnamed service')
                               : 'nothing listening at all';

  // Asking a resolver returns an exact address, so a name costs no scans.
  const need = (g.dnsName || inNet.length <= 1) ? 0 : 1;
  return {need, candidates:inNet.length, net, service, byName:!!g.dnsName};
}

/* Is this level fair at that tier? */
function tierFits(map, mods){
  const b = infoBudget(map);
  const need = mods.labels ? 0 : b.need;   // labelled machines need no scan
  return {ok: mods.probes >= need, need, budget:b};
}

/* An override swaps the presentation knobs (labels, scans, fog) but leaves
   what the level IS — its adversary, its failing cable — untouched. */
function modsFor(L, override){
  const base = modsOf(L);
  if (!override || !TIERS[override]) return base;
  const t = TIERS[override];
  return Object.assign({}, base, {tier:override, labels:t.labels,
    probes:t.probes, probeCost:t.probeCost, fog:t.fog});
}

/* ============================================================
   PORT FINGERPRINTS
   What answers when you knock. Identifying an unknown box by the
   services it exposes is the real skill, and it is the same move a
   analyst makes on an unfamiliar host.
   ============================================================ */
const PORT_PROFILE = {
  host:    [],
  server:  [22, 80, 443],
  printer: [80, 631, 9100],
  fridge:  [8883],
  camera:  [80, 554],
  dns:     [53],
  dhcp:    [67],
  router:  [22], firewall:[22], switch:[], hub:[]
};
const PORT_MEANS = {
  22:'remote login (SSH)', 53:'name lookup (DNS)', 67:'address handout (DHCP)',
  80:'web page (HTTP)', 443:'secure web (HTTPS)', 445:'file sharing (SMB)',
  554:'video stream (RTSP)', 631:'printing (IPP)', 2049:'network file storage (NFS)',
  3306:'database (MySQL)', 8080:'admin panel', 8883:'small-device messaging (MQTT)',
  9100:'raw printing'
};
const portsOfNode = n => (n.c && n.c.ports) ? n.c.ports : (PORT_PROFILE[n.t] || []);

/* ---------------- map helpers ---------------- */
const portsOf = (map, id) => map.links.map((l,i)=>[l,i]).filter(([l])=>l[0]===id||l[1]===id).map(([,i])=>i);
const otherEnd = (map, linkId, id) => { const l = map.links[linkId]; return l[0]===id ? l[1] : l[0]; };
const nodeAt = (map, x, y) => map.nodes.findIndex(n => n.x===x && n.y===y);

function blankMap(w,h){
  return {w:w||10, h:h||7, nodes:[], links:[],
          goal:{src:null, dst:'', port:80, ttl:10, proto:'tcp', dnsName:'',
                brief:'', wantFrom:'', wantTo:'', pick:false}};
}

function addNode(map, t, x, y){
  const c = {};
  if (DEV[t].addr)  Object.assign(c, {ip:'', p:24, gw:'', who:''});
  if (DEV[t].iface) Object.assign(c, {ifs:{}, def:null});
  if (t === 'switch')   c.vl = {};
  if (t === 'firewall') c.allow = [80,443];
  if (DEV[t].lease)  c.lease = {ip:'', p:24, gw:''};
  map.nodes.push({t, x, y, c});
  return map.nodes.length - 1;
}

// Removing a node reindexes everything after it, so links and the goal
// have to be rewritten rather than just filtered.
function removeNode(map, id){
  map.links = map.links.filter(l => l[0]!==id && l[1]!==id)
                       .map(l => [l[0]>id?l[0]-1:l[0], l[1]>id?l[1]-1:l[1]]);
  map.nodes.splice(id,1);
  if (map.goal.src === id) map.goal.src = null;
  else if (map.goal.src > id) map.goal.src--;
  // interface/vlan configs are keyed by link id, which just shifted
  map.nodes.forEach(n => { if(n.c.ifs) n.c.ifs = {}; if(n.c.vl) n.c.vl = {}; if('def' in n.c) n.c.def = null; });
}

function addLink(map, a, b){
  if (a === b) return false;
  if (map.links.some(l => (l[0]===a&&l[1]===b)||(l[0]===b&&l[1]===a))) return false;
  map.links.push([a,b]);
  return true;
}

/* ============================================================
   CODEC — Crockford Base32
   I, L, O and U are not in the alphabet, so 0/O and 1/I cannot be
   confused when a password is read aloud or copied off a board.
   A checksum character makes a typo fail loudly instead of loading
   a half-corrupt map.
   ============================================================ */
const B32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

function b32enc(bytes){
  let bits = 0, val = 0, out = '';
  for (const b of bytes){
    val = (val << 8) | b; bits += 8;
    while (bits >= 5){ out += B32[(val >>> (bits-5)) & 31]; bits -= 5; }
  }
  if (bits > 0) out += B32[(val << (5-bits)) & 31];
  return out;
}
function b32dec(str){
  const s = String(str).toUpperCase().replace(/[^0-9A-Z]/g,'')
    .replace(/[IL]/g,'1').replace(/O/g,'0').replace(/U/g,'V');
  let bits = 0, val = 0; const out = [];
  for (const ch of s){
    const i = B32.indexOf(ch);
    if (i < 0) return null;
    val = (val << 5) | i; bits += 5;
    if (bits >= 8){ out.push((val >>> (bits-8)) & 255); bits -= 8; }
  }
  return out;
}
const sum32 = bytes => B32[bytes.reduce((a,b)=>(a+b)&0xFF,7) & 31];

/* ---- level passwords: short enough to read across a room ---- */
function levelPassword(idx){
  // Scrambled so the codes are not guessable in sequence.
  const b = [(idx ^ 0xA7) & 0xFF, (idx*37 + 11) & 0xFF, 0x10 | (idx & 0x0F)];
  const body = b32enc(b) + sum32(b);
  return 'HOP-' + body.slice(0,3) + '-' + body.slice(3);
}
function readPassword(code){
  const body = String(code).toUpperCase().replace(/^HOP-?/,'');
  const bytes = b32dec(body);
  if (!bytes || bytes.length < 3) return null;
  const b = bytes.slice(0,3);
  const raw = b32enc(b) + sum32(b);
  if (b32dec(body.replace(/[^0-9A-Z]/gi,'')).slice(0,3).join() !== b.join()) return null;
  // verify by rebuilding: cheapest correct check is to re-derive the index
  const idx = (b[0] ^ 0xA7) & 0xFF;
  return levelPassword(idx) === ('HOP-'+raw.slice(0,3)+'-'+raw.slice(3)) ? idx : null;
}

/* ---- map codes: long, meant for copy-paste ---- */
function encodeMap(map){
  const compact = {
    w:map.w, h:map.h,
    n:map.nodes.map(n => [n.t, n.x, n.y, n.c]),
    l:map.links,
    g:map.goal
  };
  const bytes = [...new TextEncoder().encode(JSON.stringify(compact))];
  return 'MAP-' + b32enc(bytes) + sum32(bytes);
}
function decodeMap(code){
  try{
    const body = String(code).trim().replace(/^MAP-?/i,'').replace(/\s+/g,'');
    const all = b32dec(body);
    if (!all) return null;
    // last character is the checksum; strip the byte it contributed to
    const raw = b32dec(body.slice(0, -1));
    if (!raw) return null;
    if (sum32(raw) !== body.slice(-1).toUpperCase()
        .replace(/[IL]/g,'1').replace(/O/g,'0').replace(/U/g,'V')) return null;
    const o = JSON.parse(new TextDecoder().decode(new Uint8Array(raw)));
    return {w:o.w, h:o.h, nodes:o.n.map(a=>({t:a[0],x:a[1],y:a[2],c:a[3]})), links:o.l, goal:o.g};
  } catch(e){ return null; }
}
