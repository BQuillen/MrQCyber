/* ============================================================
   SIMULATOR
   The rules the whole game rests on. Kept deliberately close to
   how the real thing works, because every simplification here is
   a misconception a student has to unlearn later.

   Key behaviours:
     switch  — reads MAC, blind to IP, blocks across VLANs
     router  — reads IP, matches against interface subnets, costs TTL
     firewall— allows or denies by port
     ARP     — first visit to a node costs a turn, then it is cached
   ============================================================ */

const vlanOf = (node, linkId) => (node.c.vl && node.c.vl[linkId]) || 1;
const L2 = t => t === 'switch' || t === 'hub';

function hasIp(node, ip){
  if (!node || !ip) return false;
  if (node.c && node.c.ip === ip) return true;
  if (node.c && node.c.ifs) return Object.values(node.c.ifs).some(f => f && f.ip === ip);
  return false;
}
function ipOnSegment(map, from, ip){
  return l2Reach(map, from).some(i => hasIp(map.nodes[i], ip));
}

function dnsNode(map){ return map.nodes.findIndex(n => n.t === 'dns'); }

/* Devices reachable without crossing a router — the broadcast domain. */
function l2Reach(map, from){
  const seen = new Set([from]), q = [from], out = [];
  while (q.length){
    const id = q.shift();
    for (const lk of portsOf(map, id)){
      const o = otherEnd(map, lk, id);
      if (seen.has(o)) continue;
      seen.add(o); out.push(o);
      if (L2(map.nodes[o].t)) q.push(o);      // keep spreading through L2 only
    }
  }
  return out;
}

function startRun(map, mods){
  const g = map.goal;
  mods = mods || {adversary:null, cut:null, maxTurns:25, fog:false};
  const src = g.src;
  const dnsId = g.dnsName ? dnsNode(map) : -1;
  const st = {
    map, at:src, from:null,
    dst:g.dst, port:+g.port || 80, proto:g.proto || 'tcp',
    ttl:+g.ttl || 10, maxTtl:+g.ttl || 10,
    target: (dnsId >= 0 && map.nodes[dnsId].c.ip) ? map.nodes[dnsId].c.ip : g.dst,
    resolving: dnsId >= 0,
    arp:new Set(), seen:new Set([src]), charted:new Set([src]), path:[], log:[], turns:0,
    mods, down:new Set(), spoofed:false,
    status:'alive', reason:''
  };
  portsOf(map, src).forEach(lk => st.charted.add(otherEnd(map, lk, src)));
  if (g.dnsName && dnsId < 0){
    st.status = 'dead';
    st.reason = 'You were given a name and there is no resolver on this network to turn it into an address.';
    st.log.push({t:'No DNS server reachable. Nothing can be sent.', k:'x'});
  }
  const s = map.nodes[src];
  st.myIp = s.c.ip || ''; st.myMask = s.c.p || 24; st.myGw = s.c.gw || '';
  if (g.dnsName) st.log.push({t:'You know a name, not an address. Find DNS first.', k:'w'});
  return st;
}

/* What the packet is allowed to do right now. */
function actions(st){
  const map = st.map, node = map.nodes[st.at], t = node.t;

  if (st.status !== 'alive') return {kind:'over', list:[]};

  // No address yet — the only move is to shout for one.
  if (DEV[t].end && !node.c.ip && map.nodes.some(n => n.t === 'dhcp')) return {kind:'dhcp', list:[]};

  // Endpoints and routers must learn the next hop's MAC before sending.
  const needsArp = (DEV[t].end || t === 'router');
  if (needsArp && !st.arp.has(st.at)) return {kind:'arp', list:[]};

  // A cut cable is simply not there any more.
  const links = portsOf(map, st.at).filter(lk => !st.down.has(lk));
  const list = [];

  if (DEV[t].end){
    const me = node.c;                       // always this device's own settings
    const local = sameNet(st.target, me.ip, me.p);
    const nextHop = local ? st.target : me.gw;
    for (const lk of links){
      const to = otherEnd(map, lk, st.at);
      if (!me.ip) list.push({lk, to, ok:false, why:'no address on this device'});
      else if (!nextHop) list.push({lk, to, ok:false, why:'no gateway set'});
      else if (!ipOnSegment(map, st.at, nextHop))
        list.push({lk, to, ok:false, why:'nothing on this network answers to ' + nextHop});
      else list.push({lk, to, ok:true, why: local ? 'same subnet — deliver locally' : 'not local — via gateway ' + nextHop});
    }
  }

  else if (t === 'switch'){
    const inV = st.from != null ? vlanOf(node, st.from) : null;
    for (const lk of links){
      if (lk === st.from) continue;
      const to = otherEnd(map, lk, st.at), outV = vlanOf(node, lk);
      if (inV != null && outV !== inV) list.push({lk, to, ok:false, why:'VLAN ' + outV + ' — you are on ' + inV});
      else list.push({lk, to, ok:true, why:'switched'});
    }
  }

  else if (t === 'hub'){
    for (const lk of links){
      if (lk === st.from) continue;
      list.push({lk, to:otherEnd(map, lk, st.at), ok:true, why:'copied out every port'});
    }
  }

  else if (t === 'router'){
    const def = node.c.def, routes = node.c.routes || [];
    for (const lk of links){
      if (lk === st.from) continue;
      const to = otherEnd(map, lk, st.at), ifc = node.c.ifs && node.c.ifs[lk];
      // A real routing table can list several ways to the same place, which
      // is what makes a router a decision point instead of a corridor.
      const r = routes.find(rt => String(rt.lk) === String(lk) &&
                                  (ip2n(st.target) & maskOf(rt.p)) === (ip2n(rt.net) & maskOf(rt.p)));
      if (!ifc || !ifc.ip) list.push({lk, to, ok:false, why:'interface not configured'});
      else if (sameNet(st.target, ifc.ip, ifc.p))
        list.push({lk, to, ok:true, why:'directly connected — ' + n2ip(netOf(ifc.ip, ifc.p)) + '/' + ifc.p});
      else if (r) list.push({lk, to, ok:true, why:'route to ' + r.net + '/' + r.p});
      else if (String(lk) === String(def)) list.push({lk, to, ok:true, why:'default route'});
      else list.push({lk, to, ok:false, why:'no route this way'});
    }
  }

  else if (t === 'firewall'){
    const allow = node.c.allow || [];
    for (const lk of links){
      if (lk === st.from) continue;
      const to = otherEnd(map, lk, st.at);
      if (allow.includes(st.port)) list.push({lk, to, ok:true, why:'port ' + st.port + ' allowed'});
      else list.push({lk, to, ok:false, why:'denied: port ' + st.port});
    }
  }

  return {kind:'exits', list};
}

function doArp(st){
  const map = st.map, n = map.nodes[st.at];
  st.arp.add(st.at); st.turns++;
  st.log.push({t:'ARP: "who has the next hop?" — answer cached at ' + label(map, st.at), k:''});

  maybeSpoof(st);
  return st;
}

/* ARP has no way to verify an answer, so whoever replies is believed —
   but only machines on the same segment can hear the question at all.
   Route into the liar's segment and you are caught. Route around it and
   you never meet it. */
function maybeSpoof(st){
  const map = st.map;
  if (st.mods.adversary !== 'arp' || st.spoofed) return;
  const here = map.nodes[st.at];
  // Only a shared segment (a switch or hub domain, or your own LAN) carries it.
  if (!L2(here.t) && st.path.length) return;
  const near = new Set(l2Reach(map, st.at));
  const liar = map.nodes.findIndex((x,i) => x.c && x.c.attacker && near.has(i));
  if (liar < 0) return;
  st.spoofed = true;
  st.target = map.nodes[liar].c.ip;
  st.log.push({t:'ARP reply received. (Nothing about it looks unusual.)', k:''});
}

function doDhcp(st){
  const map = st.map;
  const reach = l2Reach(map, st.at).filter(id => map.nodes[id].t === 'dhcp');
  // A rogue server answers faster than the real one. First reply wins.
  const rogue = reach.find(id => map.nodes[id].c && map.nodes[id].c.attacker);
  const server = (st.mods.adversary === 'dhcp' && rogue != null) ? rogue : reach[0];
  st.turns++;
  if (server == null){
    st.log.push({t:'DHCP broadcast — nobody answered. No DHCP server in this broadcast domain.', k:'x'});
    st.status = 'dead'; st.reason = 'No address, and no DHCP server could hear you.';
    return st;
  }
  const lease = map.nodes[server].c.lease || {};
  st.myIp = lease.ip || ''; st.myMask = lease.p || 24; st.myGw = lease.gw || '';
  map.nodes[st.at].c.ip = st.myIp; map.nodes[st.at].c.p = st.myMask; map.nodes[st.at].c.gw = st.myGw;
  st.log.push({t:'DHCP: leased ' + st.myIp + '/' + st.myMask + ', gateway ' + (st.myGw||'none'), k:'w'});
  return st;
}

/* Move along a link. This is the only thing that advances the game. */
function move(st, linkId){
  const map = st.map, fromNode = map.nodes[st.at];

  if (fromNode.t === 'router'){
    st.ttl--;
    if (st.ttl <= 0){
      st.status = 'dead';
      st.reason = 'TTL hit zero. The packet was discarded in transit.';
      st.log.push({t:'TTL exhausted at ' + label(map, st.at), k:'x'});
      return st;
    }
    st.log.push({t:'Router rewrote the MAC band. TTL ' + st.ttl, k:''});
    st.arp.delete(st.at);              // new segment, new neighbour to resolve
  }

  const to = otherEnd(map, linkId, st.at);
  st.path.push({from:st.at, link:linkId, to});
  st.at = to; st.from = linkId; st.turns++;
  st.seen.add(to);            // fog lifts one hop at a time
  // Anything you have laid eyes on stays on your map, even after you move on.
  portsOf(map, to).forEach(lk => st.charted.add(otherEnd(map, lk, to)));

  // Scheduled link failure. The exit you were reaching for goes dark.
  const cut = st.mods.cut;
  if (cut && st.path.length === cut.after && !st.down.has(cut.link)){
    st.down.add(cut.link);
    st.log.push({t:'A cable just dropped. Link ' + cut.link + ' is down.', k:'x'});
  }

  // Switches do not decrement TTL, so a loop would otherwise run forever.
  if (st.turns > (st.mods.maxTurns || 25)){
    st.status = 'dead';
    st.reason = 'You have been going in circles. Nothing here counts hops, so nothing was ever going to stop you.';
    st.log.push({t:'Looping. Give up and start again.', k:'x'});
    return st;
  }

  const n = map.nodes[to];
  st.log.push({t:'→ ' + label(map, to), k:''});
  if (L2(n.t)) maybeSpoof(st);

  // Arrival at an endpoint decides the run.
  if (DEV[n.t].end){
    if (st.resolving && n.t === 'dns' && n.c.ip === st.target){
      st.resolving = false;
      // A poisoned resolver hands back a real, reachable, wrong address.
      if (st.mods.adversary === 'dns' && n.c.lies){
        st.dst = n.c.lies;
        st.log.push({t:'DNS answered: ' + st.map.goal.dnsName + ' is ' + n.c.lies + '.', k:''});
        st.target = st.dst; st.arp.delete(to);
        return st;
      }
      st.target = st.dst;
      st.log.push({t:'DNS answered: ' + st.map.goal.dnsName + ' is ' + st.dst + '. New target set.', k:'w'});
      st.arp.delete(to);
      return st;
    }
    if (n.c.ip === st.dst){
      st.status = 'win';
      st.reason = 'Delivered.';
      st.log.push({t:'Delivered to ' + n.c.ip + '. Trip complete.', k:'w'});
      return st;
    }
    st.status = 'dead';
    st.reason = 'Delivered to the wrong host. This one is ' + (n.c.ip || 'unaddressed') + ', you wanted ' + st.dst + '.';
    st.log.push({t:'Wrong host.', k:'x'});
    return st;
  }
  return st;
}

/* Some networks cannot be routed out of safely. On those, the right
   answer is to notice and refuse to send — so aborting is a win, and
   aborting a healthy network is not. */
function abortRun(st){
  if (st.mods.trap){
    st.status = 'win'; st.aborted = true;
    st.reason = 'You spotted it and refused to transmit.';
    st.log.push({t:'Transmission aborted. Nothing left the machine.', k:'w'});
  } else {
    st.status = 'dead'; st.aborted = true;
    st.reason = 'Nothing was actually wrong with this network. The message never went.';
    st.log.push({t:'Aborted for no reason.', k:'x'});
  }
  return st;
}

/* A port scan: knock on an address and see what answers. */
function scan(map, ip){
  const id = map.nodes.findIndex(n => n.c && n.c.ip === ip);
  if (id < 0) return {ok:false, ports:[], note:'Nothing answered at that address.'};
  const ports = portsOfNode(map.nodes[id]);
  return {ok:true, id, ports,
          note: ports.length ? '' : 'It is on the network, but nothing is listening.'};
}

const label = (map, id) => {
  const n = map.nodes[id];
  return DEV[n.t].name + (n.c && n.c.ip ? ' ' + n.c.ip : '') + ' [' + id + ']';
};

/* ============================================================
   AUTO-SOLVER
   Breadth-first over the same rules the player plays by. Used to
   answer one question: can this map be finished at all? That powers
   the unreachable check and suggests a fair TTL.
   ============================================================ */
function autosolve(map, mods){
  const g = map.goal;
  const want = g.dst;              // what was actually asked for, before any resolver spoke
  if (g.src == null || !validIp(g.dst)) return {ok:false, why:'goal not set'};
  const start = startRun(JSON.parse(JSON.stringify(map)), mods);
  if (start.status !== 'alive') return {ok:false, why:'cannot start'};

  const key = s => [s.at, s.from, s.target, s.dst, s.ttl, s.resolving, s.spoofed,
                    [...s.arp].sort().join('.'), [...s.down].sort().join('.'),
                    s.map.nodes[s.map.goal.src].c.ip].join('|');
  const q = [start], seen = new Set([key(start)]);
  let guard = 0;

  while (q.length && guard++ < 20000){
    const s = q.shift();
    const a = actions(s);

    if (a.kind === 'dhcp'){ const n = clone(s); doDhcp(n); if(n.status==='alive'){const k=key(n); if(!seen.has(k)){seen.add(k);q.push(n);} } continue; }
    if (a.kind === 'arp'){  const n = clone(s); doArp(n);  const k=key(n); if(!seen.has(k)){seen.add(k);q.push(n);} continue; }

    for (const ex of a.list){
      if (!ex.ok) continue;
      const n = clone(s);
      move(n, ex.lk);
      if (n.status === 'win'){
        if (n.dst !== want) continue;   // delivered, but to an address a liar supplied
        return {ok:true, hops:n.path.length, ttlUsed:s.maxTtl - n.ttl};
      }
      if (n.status !== 'alive') continue;
      const k = key(n);
      if (!seen.has(k)){ seen.add(k); q.push(n); }
    }
  }
  return {ok:false, why:'no surviving path'};
}
function clone(s){
  const n = Object.assign({}, s);
  n.arp = new Set(s.arp); n.down = new Set(s.down); n.seen = new Set(s.seen); n.charted = new Set(s.charted); n.path = s.path.slice(); n.log = s.log.slice();
  return n;
}

/* ============================================================
   FAULTS — the status check
   Reported in travel order, one at a time. Fixing a later fault
   while an earlier one still kills you teaches nothing.
   Every fault carries three strings: area (hint 1), gap (hint 2),
   and fix (only offered after a failed proof run).
   ============================================================ */
function faults(map){
  const f = [], g = map.goal;
  const nm = id => label(map, id);

  if (g.src == null) f.push({kind:'goal', area:"I'd check the trip settings.", gap:'No starting host is set.', fix:'Pick a host as the source in The Trip panel.'});
  if (!validIp(g.dst)) f.push({kind:'goal', area:"I'd check the trip settings.", gap:'The destination address is missing or malformed.', fix:'Enter a full address like 10.0.2.50.'});
  if (f.length) return f;

  map.nodes.forEach((n,i) => {
    if (!portsOf(map,i).length)
      f.push({kind:'structure', at:i, area:"I'd check the "+DEV[n.t].name+" at "+n.x+","+n.y+".", gap:nm(i)+' has nothing plugged into it.', fix:'Run a cable to it, or erase it.'});
  });

  const s = map.nodes[g.src];
  const hasDhcp = map.nodes.some(n => n.t === 'dhcp');
  if (!s.c.ip && !hasDhcp)
    f.push({kind:'config', at:g.src, area:"I'd check the starting host.", gap:'The source host has no IP address and there is no DHCP server.', fix:'Give the host an address, or place a DHCP server it can reach.'});
  if (s.c.ip && !sameNet(g.dst, s.c.ip, s.c.p) && !s.c.gw)
    f.push({kind:'config', at:g.src, area:"I'd check the starting host.", gap:'The destination is outside its subnet and no default gateway is set.', fix:'Set the gateway to the router interface on the host\u2019s own network.'});

  map.nodes.forEach((n,i) => {
    if (n.t !== 'router') return;
    for (const lk of portsOf(map,i)){
      const ifc = n.c.ifs && n.c.ifs[lk];
      if (!ifc || !validIp(ifc.ip))
        f.push({kind:'config', at:i, area:"I'd check the router at "+n.x+","+n.y+".", gap:'One of its interfaces has no address or mask.', fix:'Give every used interface an address on the network it faces.'});
    }
  });

  if (!f.length){
    const r = autosolve(map, arguments[1]);
    if (!r.ok){
      // Only now is a blocking firewall interesting: a decoy that denies
      // traffic is a legitimate design, not a mistake.
      const fw = map.nodes.findIndex(n => n.t === 'firewall' && !(n.c.allow||[]).includes(+g.port));
      const vl = map.nodes.some(n => n.t === 'switch' && Object.keys(n.c.vl||{}).length);
      f.push({kind:'unreach',
        area:'Everything is configured, but the packet still cannot arrive.',
        gap:'No surviving path from the source to the destination within the TTL budget.'
             + (fw >= 0 ? ' Every route passes a firewall that denies port ' + g.port + '.' : '')
             + (vl ? ' There are VLAN tags in play — check they match end to end.' : ''),
        fix:'Is that intended? If not, raise the TTL, or open the port, or check the VLAN tags.'});
    } else if (r.ttlUsed >= map.goal.ttl){
      f.push({kind:'unreach', area:"I'd check the TTL budget.",
        gap:'The only surviving path uses every hop you allowed, leaving no room for a wrong turn.',
        fix:'Your best run took ' + r.ttlUsed + '. Two spare hops is the usual budget.'});
    }
  }
  return f;
}
