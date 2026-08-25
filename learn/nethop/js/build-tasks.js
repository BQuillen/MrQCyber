/* ============================================================
   BUILD TASKS
   Step 2 of every lesson. Not "click the thing you just read
   about" — a scenario, an empty canvas, and a list of conditions
   that get checked against the graph and run through the
   simulator.

   Each requirement is [text, test]. The test gets the map and
   returns true when satisfied, so the checklist can tick itself
   as the student builds.
   ============================================================ */

const cnt   = (m,t) => m.nodes.filter(n => n.t === t).length;
const ends  = m => m.nodes.map((n,i)=>[n,i]).filter(([n]) => DEV[n.t].end);
const addressed = m => ends(m).filter(([n]) => n.c && validIp(n.c.ip));
const allLinked = m => m.nodes.length > 0 && components(m).length === 1
                       && !degrees(m).some(d => d === 0);

// Distinct networks present among addressed endpoints.
function netsOf(m){
  const set = new Set();
  addressed(m).forEach(([n]) => set.add(n2ip(netOf(n.c.ip, n.c.p)) + '/' + n.c.p));
  return [...set];
}
// Everything hangs off one device of this type.
function centeredOn(m, type){
  const hubs = m.nodes.map((n,i)=>[n,i]).filter(([n]) => n.t === type);
  if (hubs.length !== 1) return false;
  const [, hid] = hubs[0];
  return ends(m).every(([,i]) => portsOf(m, i).some(lk => otherEnd(m, lk, i) === hid));
}
// Run a trip and say whether it lands.
function trip(m, srcId, dstIp, port, ttl){
  try{
    const copy = JSON.parse(JSON.stringify(m));
    copy.goal = {src:srcId, dst:dstIp, port:port||80, ttl:ttl||10, proto:'tcp', dnsName:'', pick:false};
    return autosolve(copy, {adversary:null, cut:null, maxTurns:25, fog:false}).ok;
  } catch(e){ return false; }
}
// Any addressed endpoint can reach any other.
function allReach(m){
  const e = addressed(m);
  if (e.length < 2) return false;
  return e.every(([a, ai]) => e.every(([b, bi]) => ai === bi || trip(m, ai, b.c.ip, 80, 12)));
}

const BUILD = {

hub:{ brief:'You are setting up a three-machine test bench so a technician can watch every packet that crosses it. This is the one job where a hub is the right answer — you WANT every machine to receive a copy of everything.',
  allow:['host','server','printer','hub','switch'],
  need:[
    ['Three or more machines placed', m => ends(m).length >= 3],
    ['Every machine has an address on the same network', m => addressed(m).length === ends(m).length && addressed(m).length >= 3 && netsOf(m).length === 1],
    ['Exactly one hub, and no switch', m => cnt(m,'hub') === 1 && cnt(m,'switch') === 0],
    ['Every machine cabled to the hub', m => centeredOn(m,'hub')],
    ['A packet can get from any machine to any other', m => allReach(m)]
  ],
  done:'That is a monitoring bench. Every machine on it sees every packet — which is a disaster in an office and exactly the point on a test bench. Now build the same thing properly in the switch lesson and compare.' },

'switch':{ brief:'The office next door has the same three machines, but this is real staff traffic and it must be private. Build it so each machine only receives what was actually addressed to it.',
  allow:['host','server','printer','switch','hub'],
  need:[
    ['Three or more machines placed', m => ends(m).length >= 3],
    ['Every machine addressed, all on one network', m => addressed(m).length === ends(m).length && addressed(m).length >= 3 && netsOf(m).length === 1],
    ['Exactly one switch', m => cnt(m,'switch') === 1],
    ['No hubs anywhere — a hub would leak the traffic', m => ends(m).length >= 3 && cnt(m,'hub') === 0],
    ['Every machine cabled to the switch', m => centeredOn(m,'switch')],
    ['A packet can get from any machine to any other', m => allReach(m)]
  ],
  done:'Same three machines, same cables, completely different privacy. The switch delivers to one port instead of shouting — and nobody had to configure anything for that to happen.' },

router:{ brief:'Sales runs on 10.0.1.x and Design runs on 10.0.2.x. They are separate networks on purpose, but the two teams now need to share files. Build something that lets a machine in one reach a machine in the other.',
  allow:['host','server','printer','switch','router'],
  need:[
    ['At least one machine on each of two different networks', m => netsOf(m).length >= 2 && addressed(m).length >= 2],
    ['At least one router placed', m => cnt(m,'router') >= 1],
    ['Every device is cabled to something', m => allLinked(m)],
    ['Each router interface in use has an address', m => cnt(m,'router') >= 1 &&
        m.nodes.every((n,i) => n.t !== 'router' || portsOf(m,i).every(lk => n.c.ifs && n.c.ifs[lk] && validIp(n.c.ifs[lk].ip)))],
    ['Each machine\u2019s gateway is a router address on its own network', m => netsOf(m).length >= 2 &&
        addressed(m).length >= 2 && addressed(m).every(([n,i]) =>
        n.c.gw && sameNet(n.c.gw, n.c.ip, n.c.p) && ipOnSegment(m, i, n.c.gw))],
    ['A packet crosses from one network to the other', m => {
        const e = addressed(m); if (e.length < 2) return false;
        return e.some(([a, ai]) => e.some(([b]) => !sameNet(a.c.ip, b.c.ip, a.c.p) && trip(m, ai, b.c.ip, 80, 12)));
      }]
  ],
  done:'Two networks that could never have spoken, now joined by the one device that reads IP addresses. Notice how much configuration that took compared with a switch — that is the price of crossing a border.' },

mask:{ brief:'Build a single small network of three machines that can all reach each other directly, with no router involved at all. The masks have to agree, or they will not see each other as neighbours.',
  allow:['host','server','printer','switch'],
  need:[
    ['Three or more machines placed', m => ends(m).length >= 3],
    ['No router anywhere', m => ends(m).length >= 3 && cnt(m,'router') === 0],
    ['All addressed, and every mask the same length', m => {
        const e = addressed(m);
        return e.length >= 3 && e.length === ends(m).length && new Set(e.map(([n]) => n.c.p)).size === 1; }],
    ['Every address falls in the same network under that mask', m => netsOf(m).length === 1],
    ['They can all reach each other', m => allReach(m)]
  ],
  done:'One network, one mask, no router needed. Change one machine to a /25 and watch two of them stop being neighbours without a single cable moving.' },

gateway:{ brief:'A machine on 10.0.1.x must reach a server on 10.0.2.x. Build the path, and set the machine\u2019s gateway to the right address — the one it can actually hand a packet to.',
  allow:['host','server','switch','router'],
  need:[
    ['A machine and a server on two different networks', m => netsOf(m).length >= 2],
    ['A router joining them, with both interfaces addressed', m => cnt(m,'router') >= 1 &&
        m.nodes.every((n,i) => n.t !== 'router' || portsOf(m,i).every(lk => n.c.ifs && n.c.ifs[lk] && validIp(n.c.ifs[lk].ip)))],
    ['Every machine has a gateway set', m => addressed(m).length >= 2 && addressed(m).every(([n]) => validIp(n.c.gw))],
    ['Each gateway is on that machine\u2019s own network', m => addressed(m).length >= 2 && addressed(m).every(([n]) => sameNet(n.c.gw, n.c.ip, n.c.p))],
    ['Each gateway is an address something actually answers to', m => addressed(m).length >= 2 && addressed(m).every(([n,i]) => ipOnSegment(m, i, n.c.gw))],
    ['The trip completes', m => { const e = addressed(m);
        return e.some(([a, ai]) => e.some(([b]) => !sameNet(a.c.ip, b.c.ip, a.c.p) && trip(m, ai, b.c.ip, 80, 12))); }]
  ],
  done:'The machine knows one address and nothing else about the world, and that is enough. Point the gateway at the router\u2019s far interface instead and it breaks immediately — you cannot hand something to a machine you cannot reach.' },

arp:{ brief:'ARP shouts, and a shout only carries so far. Build two networks joined by a router, so that machines on one side can find each other by shouting — but the shout never reaches the other side.',
  allow:['host','server','switch','router'],
  need:[
    ['Two or more machines on one network, and at least one on another', m => {
        const e = addressed(m); if (e.length < 3) return false;
        const groups = {};
        e.forEach(([n]) => { const k = n2ip(netOf(n.c.ip,n.c.p))+'/'+n.c.p; groups[k] = (groups[k]||0)+1; });
        const sizes = Object.values(groups);
        return sizes.length >= 2 && sizes.some(x => x >= 2); }],
    ['A router between the two networks', m => cnt(m,'router') >= 1],
    ['Router interfaces addressed', m => cnt(m,'router') >= 1 &&
        m.nodes.every((n,i) => n.t !== 'router' || portsOf(m,i).every(lk => n.c.ifs && n.c.ifs[lk] && validIp(n.c.ifs[lk].ip)))],
    ['The two same-network machines are in one broadcast domain', m => {
        const e = addressed(m);
        return e.some(([a, ai]) => e.some(([b, bi]) => ai !== bi && sameNet(a.c.ip,b.c.ip,a.c.p) && l2Reach(m, ai).includes(bi))); }],
    ['A machine on the far side is NOT in that broadcast domain', m => {
        const e = addressed(m);
        return e.some(([a, ai]) => e.some(([b, bi]) => !sameNet(a.c.ip,b.c.ip,a.c.p) && !l2Reach(m, ai).includes(bi))); }]
  ],
  done:'The two on the left can shout and hear each other. The one across the router cannot hear a thing — routers do not pass broadcasts, and that is what stops one network\u2019s noise becoming everybody\u2019s problem.' },

dhcp:{ brief:'A brand new laptop is going to be plugged in with no address at all. Build a network where it gets one automatically, and can then reach a server on a different network.',
  allow:['host','server','switch','router','dhcp'],
  need:[
    ['A machine with no address on it', m => ends(m).some(([n]) => n.t === 'host' && !n.c.ip)],
    ['A DHCP server placed, with an address to hand out', m => cnt(m,'dhcp') === 1 &&
        m.nodes.some(n => n.t === 'dhcp' && n.c.lease && validIp(n.c.lease.ip) && validIp(n.c.lease.gw))],
    ['The DHCP server is in the same broadcast domain as that machine', m => {
        const blank = m.nodes.findIndex(n => DEV[n.t].end && !n.c.ip);
        const srv = m.nodes.findIndex(n => n.t === 'dhcp');
        return blank >= 0 && srv >= 0 && l2Reach(m, blank).includes(srv); }],
    ['A server on a different network, reachable through a router', m => cnt(m,'router') >= 1 && netsOf(m).length >= 2],
    ['The new machine can get an address and complete a trip', m => {
        const blank = m.nodes.findIndex(n => DEV[n.t].end && !n.c.ip);
        const far = addressed(m).find(([n]) => n.t === 'server');
        if (blank < 0 || !far) return false;
        return trip(m, blank, far[0].c.ip, 80, 12); }]
  ],
  done:'That laptop knew nothing about this network and is now fully on it. Whoever answers that shout decides its address, its mask and its way out — which is why a rogue DHCP server is such an effective attack.' },

dns:{ brief:'Staff want to type a name instead of an address. Build a network with a resolver on it, and a server that can be reached by name from a machine on a different network.',
  allow:['host','server','switch','router','dns'],
  need:[
    ['A DNS server placed and addressed', m => cnt(m,'dns') === 1 && m.nodes.some(n => n.t === 'dns' && validIp(n.c.ip))],
    ['A machine and a target server, both addressed', m => addressed(m).length >= 2],
    ['The resolver is reachable from the machine', m => {
        const host = addressed(m).find(([n]) => n.t === 'host');
        const dns = m.nodes.findIndex(n => n.t === 'dns');
        return host && dns >= 0 && trip(m, host[1], m.nodes[dns].c.ip, 53, 12); }],
    ['The target server is on a different network from the machine', m => netsOf(m).length >= 2],
    ['The machine can reach that server once it has the address', m => {
        const host = addressed(m).find(([n]) => n.t === 'host');
        const srv = addressed(m).find(([n]) => n.t === 'server');
        return host && srv && !sameNet(host[0].c.ip, srv[0].c.ip, host[0].c.p) && trip(m, host[1], srv[0].c.ip, 80, 12); }]
  ],
  done:'The name buys you the address, and the address does the work. Notice the machine had to reach the resolver first — if that path is broken, nothing resolves and everything looks like the whole internet is down.' },

firewall:{ brief:'A printer sits on its own network. Staff must be able to print to it on port 9100, and nothing else should get through. Build the path and set the firewall so printing works and web traffic does not.',
  allow:['host','printer','switch','router','firewall'],
  need:[
    ['A machine and a printer on different networks', m => netsOf(m).length >= 2 && cnt(m,'printer') >= 1],
    ['A router joining them, interfaces addressed', m => cnt(m,'router') >= 1 &&
        m.nodes.every((n,i) => n.t !== 'router' || portsOf(m,i).every(lk => n.c.ifs && n.c.ifs[lk] && validIp(n.c.ifs[lk].ip)))],
    ['A firewall on the path', m => cnt(m,'firewall') >= 1],
    ['Its allow list contains 9100', m => m.nodes.some(n => n.t === 'firewall' && (n.c.allow||[]).includes(9100))],
    ['Printing on 9100 gets through', m => {
        const h = addressed(m).find(([n]) => n.t === 'host'), p = addressed(m).find(([n]) => n.t === 'printer');
        return h && p && trip(m, h[1], p[0].c.ip, 9100, 12); }],
    ['Web traffic on port 80 does NOT get through', m => {
        const h = addressed(m).find(([n]) => n.t === 'host'), p = addressed(m).find(([n]) => n.t === 'printer');
        return h && p && !trip(m, h[1], p[0].c.ip, 80, 12); }]
  ],
  done:'One service open, everything else shut. That last requirement is the one that matters — a firewall you never tested against the traffic it should block is a firewall you are only guessing about.' },

vlan:{ brief:'One switch, one network, two kinds of people. Staff machines must reach the staff server. The guest machine must not — and you are not allowed to buy a second switch.',
  allow:['host','server','switch'],
  need:[
    ['Exactly one switch', m => cnt(m,'switch') === 1],
    ['Three or more machines, all addressed on one network', m => addressed(m).length >= 3 && netsOf(m).length === 1],
    ['No routers — this has to be done on the switch', m => ends(m).length >= 3 && cnt(m,'router') === 0],
    ['At least two different VLAN numbers in use', m => m.nodes.some(n => n.t === 'switch' && new Set(Object.values(n.c.vl||{})).size >= 2)],
    ['A staff machine can reach the staff server', m => {
        const e = addressed(m);
        return e.some(([a, ai]) => e.some(([b]) => b.t === 'server' && trip(m, ai, b.c.ip, 445, 10))); }],
    ['At least one machine is cut off from that server', m => {
        const e = addressed(m), srv = e.find(([n]) => n.t === 'server');
        return srv && e.some(([a, ai]) => a.t === 'host' && !trip(m, ai, srv[0].c.ip, 445, 10)); }]
  ],
  done:'Same switch, same cables, same address range — and two groups that cannot see each other. That separation cost nothing but a couple of numbers on the ports.' },

ttl:{ brief:'Build a path that crosses at least three routers, then give the trip a TTL that gets there with a hop or two spare. Too little and it dies on the way; too much and a lost packet circles for ages.',
  allow:['host','server','switch','router'],
  need:[
    ['Three or more routers placed', m => cnt(m,'router') >= 3],
    ['A machine and a server at opposite ends', m => addressed(m).length >= 2 && netsOf(m).length >= 2],
    ['Everything cabled up, all router interfaces addressed', m => allLinked(m) && cnt(m,'router') >= 3 &&
        m.nodes.every((n,i) => n.t !== 'router' || portsOf(m,i).every(lk => n.c.ifs && n.c.ifs[lk] && validIp(n.c.ifs[lk].ip)))],
    ['The trip actually completes', m => {
        const h = addressed(m).find(([n]) => n.t === 'host'), s2 = addressed(m).find(([n]) => n.t === 'server');
        return h && s2 && trip(m, h[1], s2[0].c.ip, 80, 20); }],
    ['It crosses at least three routers on the way', m => {
        const h = addressed(m).find(([n]) => n.t === 'host'), s2 = addressed(m).find(([n]) => n.t === 'server');
        if (!h || !s2) return false;
        // a TTL of 3 must fail while a bigger one succeeds — that proves 3+ hops
        return !trip(m, h[1], s2[0].c.ip, 80, 3) && trip(m, h[1], s2[0].c.ip, 80, 20); }]
  ],
  done:'Three routers, three subtractions. Give that same path a TTL of 3 and it dies one hop short — which is precisely what happens to real traffic when someone sets the budget by guessing.' }
};
