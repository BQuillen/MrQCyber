/* ============================================================
   NETWORK MODELS — guided build
   Shape before configuration. A student can lay cable and be told
   something true about the result long before they know what a
   subnet mask is, and every shape here fails in a different way,
   which is the actual lesson.

   Each model carries a structural test. The tests only look at the
   graph — how many cables touch each device, whether there is a
   loop, whether anything is stranded — so no addressing is needed.
   ============================================================ */

/* --- small graph helpers --- */
function degrees(map){
  const d = map.nodes.map(() => 0);
  map.links.forEach(l => { d[l[0]]++; d[l[1]]++; });
  return d;
}
function components(map){
  const seen = new Set(), out = [];
  map.nodes.forEach((_, i) => {
    if (seen.has(i)) return;
    const q = [i], part = []; seen.add(i);
    while (q.length){
      const a = q.shift(); part.push(a);
      portsOf(map, a).forEach(lk => {
        const b = otherEnd(map, lk, a);
        if (!seen.has(b)){ seen.add(b); q.push(b); }
      });
    }
    out.push(part);
  });
  return out;
}
// A device whose loss splits the network in two.
function chokePoints(map){
  const out = [];
  const base = components(map).length;
  map.nodes.forEach((_, i) => {
    if (portsOf(map, i).length < 2) return;
    const cut = {nodes:map.nodes, links:map.links.filter(l => l[0] !== i && l[1] !== i)};
    const parts = components(cut).filter(p => p.length > 1 || !p.includes(i));
    const reachable = parts.filter(p => !(p.length === 1 && p[0] === i));
    if (reachable.length > base) out.push(i);
  });
  return out;
}

const MODELS = {
  point:{ name:'Point to point', min:2,
    blurb:'Two devices, one cable. The simplest network there is.',
    why:'Used wherever exactly two things need to talk and nothing else is involved — a router to another router, a camera to a recorder.',
    risk:'It does not grow. Adding a third device means rethinking the whole thing.',
    target:'Place exactly 2 devices and run 1 cable between them.',
    check(map){
      const n = map.nodes.length, e = map.links.length;
      if (n < 2) return miss('You need two devices.');
      if (n > 2) return miss('That is ' + n + ' devices. Point to point means exactly two — anything more needs a shape that can share.');
      if (e !== 1) return miss('Two devices, one cable. You have ' + e + '.');
      return hit('That is the whole model. Everything else on this list exists because two is not enough.');
    }},

  bus:{ name:'Bus', min:4,
    blurb:'Every device hangs off one shared line, in a chain.',
    why:'Cheap and quick, which is why early offices were wired this way. One run of cable serves everybody.',
    risk:'One break splits the network, and everything past the break is stranded. Everyone also shares the same line, so they take turns.',
    target:'Chain 4 or more devices in a single line — each device cabled to the next, no branches, no loop.',
    check(map){
      const n = map.nodes.length, d = degrees(map);
      if (n < 4) return miss('Use at least 4 devices so the chain is worth looking at.');
      if (components(map).length > 1) return miss('Some of these are not connected to the rest. A bus is one continuous line.');
      if (map.links.length !== n - 1) return miss('A chain of ' + n + ' devices needs exactly ' + (n-1) + ' cables. You have ' + map.links.length + ' — that is a loop or a branch, not a bus.');
      const ends = d.filter(x => x === 1).length, mids = d.filter(x => x === 2).length;
      if (ends !== 2 || ends + mids !== n)
        return miss('In a line, exactly two devices sit at the ends with one cable each and everything else has two. Yours has ' + ends + ' end' + (ends===1?'':'s') + '.');
      return hit('A clean bus. Now notice the weakness: cut any one of those cables and everything past it is unreachable. That is why nobody wires a building this way any more.');
    }},

  star:{ name:'Star', min:4,
    blurb:'Every device cabled back to one device in the middle.',
    why:'This is how almost every real office and home network is wired. One switch in the middle, everything else plugged into it.',
    risk:'Lose one spoke and you lose one machine. Lose the middle and you lose everything — a single point of failure.',
    target:'Place one device in the middle and cable 3 or more others to it. Nothing else.',
    check(map){
      const n = map.nodes.length, d = degrees(map);
      if (n < 4) return miss('You need a middle plus at least 3 devices around it.');
      if (components(map).length > 1) return miss('Something is not plugged in. In a star, everything reaches the middle.');
      const hub = d.indexOf(Math.max(...d));
      if (d[hub] !== n - 1) return miss('No single device is connected to all the others. In a star, the middle touches everything.');
      if (map.links.length !== n - 1) return miss('There are extra cables between the outer devices. In a star they only ever talk through the middle.');
      const mid = map.nodes[hub];
      const note = (mid.t === 'switch' || mid.t === 'hub') ? ''
        : ' One thing though: your middle is a ' + DEV[mid.t].name + '. In practice that job goes to a switch.';
      return hit('That is a star, and it is what your school is almost certainly wired as.' + note + ' Everything depends on that middle device.');
    }},

  ring:{ name:'Ring', min:3,
    blurb:'Each device cabled to two neighbours, all the way round.',
    why:'Used where a single break must not take the network down — building backbones, industrial sites, some telecom rings.',
    risk:'Survives one break because traffic can go the other way. Two breaks split it in half.',
    target:'Connect 3 or more devices in a closed loop. Every device gets exactly two cables.',
    check(map){
      const n = map.nodes.length, d = degrees(map);
      if (n < 3) return miss('A loop needs at least 3 devices.');
      if (components(map).length > 1) return miss('Not everything is joined up yet.');
      const bad = d.map((x,i)=>[x,i]).filter(([x]) => x !== 2);
      if (bad.length) return miss(bad.length + ' device' + (bad.length===1?' has':'s have') + ' the wrong number of cables. In a ring every single device has exactly two — one to each neighbour.' +
        (bad.some(([x]) => x === 1) ? ' The ones with a single cable are where your loop is still open.' : ''));
      if (map.links.length !== n) return miss('A closed ring of ' + n + ' devices uses exactly ' + n + ' cables.');
      return hit('Closed ring. Cut any one cable and traffic simply reverses direction — nothing is lost. That redundancy is the entire reason to build one.');
    }},

  mesh:{ name:'Full mesh', min:4,
    blurb:'Every device cabled directly to every other device.',
    why:'Maximum redundancy. Used between a small number of critical sites, and in deep space relays where nobody is coming out to fix a cable.',
    risk:'The cable count explodes. Four devices need 6 cables; ten devices need 45. Almost nobody can afford it at scale.',
    target:'Connect 4 or more devices so that every one has a direct cable to every other.',
    check(map){
      const n = map.nodes.length, need = n*(n-1)/2;
      if (n < 4) return miss('Use at least 4 devices — the point is what happens to the cable count.');
      if (map.links.length !== need) return miss('A full mesh of ' + n + ' devices needs ' + need + ' cables. You have ' + map.links.length + '. Every device must reach every other one directly.');
      return hit('Full mesh. Notice what it cost: ' + need + ' cables for ' + n + ' devices. Add one more and you would need ' + (need + n) + '. That growth is why partial mesh exists.');
    }},

  partial:{ name:'Partial mesh', min:5,
    blurb:'Most devices have more than one route out, but not every pair is cabled.',
    why:'The practical compromise, and how the internet itself is built. Important links get redundancy; the rest do not.',
    risk:'Some paths are still single points of failure. You have to know which ones.',
    target:'Connect 5 or more devices so every device has at least 2 cables, but leave at least one pair not directly connected.',
    check(map){
      const n = map.nodes.length, d = degrees(map), need = n*(n-1)/2;
      if (n < 5) return miss('Use at least 5 devices.');
      if (components(map).length > 1) return miss('Part of this is stranded from the rest.');
      const thin = d.filter(x => x < 2).length;
      if (thin) return miss(thin + ' device' + (thin===1?'':'s') + ' still have only one cable. In a partial mesh everything has a second way out.');
      if (map.links.length >= need) return miss('That is a full mesh — every pair is connected. A partial mesh deliberately leaves some pairs out.');
      const chokes = chokePoints(map);
      return hit('Partial mesh: redundancy where it matters, without paying for every cable.' +
        (chokes.length ? ' Worth knowing — ' + chokes.length + ' device' + (chokes.length===1?'':'s') + ' would still split this network if it failed.'
                       : ' No single device failure splits this network.'));
    }},

  tree:{ name:'Tree (hierarchical)', min:6,
    blurb:'Stars joined into bigger stars — a middle device, feeding more middle devices, feeding machines.',
    why:'How real buildings and campuses are wired. A core switch feeds floor switches, which feed the rooms.',
    risk:'Break high up and everything below it goes. The higher the failure, the more it takes with it.',
    target:'Build 6 or more devices in layers — one device at the top, feeding devices below it, with no loops anywhere.',
    check(map){
      const n = map.nodes.length, d = degrees(map);
      if (n < 6) return miss('Use at least 6 devices so there is a genuine second layer.');
      if (components(map).length > 1) return miss('Something is stranded. A tree is all one piece.');
      if (map.links.length !== n - 1) return miss('A tree of ' + n + ' devices has exactly ' + (n-1) + ' cables. You have ' + map.links.length + ' — an extra cable means a loop, and a tree has none.');
      const branches = d.filter(x => x >= 3).length;
      if (branches < 2) return miss('That is closer to a star or a chain. A tree needs at least two devices that branch — a top device feeding others that feed machines of their own.');
      return hit('Hierarchical tree. This is how your building is almost certainly wired: one core, floor switches under it, rooms under those. Nothing loops, so nothing goes round in circles.');
    }}
};
const MODEL_IDS = Object.keys(MODELS);
const hit = m => ({ok:true, msg:m});
const miss = m => ({ok:false, msg:m});

/* ============================================================
   INSPIRATION
   Prompts for free build. Each names a situation and a constraint
   but never the answer — the shape is left to the builder.
   ============================================================ */
const PROMPTS = [
  'A classroom shares one switch. One printer is plugged into the teacher\u2019s computer instead of the network. Build it so a student can still reach the printer — and think about what that means for the teacher\u2019s machine.',
  'Two buildings, one cable between them. Each building has its own machines. Make it so anyone in either building can reach a server that lives in the first one.',
  'A small office where the guest wifi must never reach the accounts computer, but both need to reach the internet. Use badge colours, not extra cables.',
  'A shop with a till, a stock computer and a card reader. The card reader may only be reached on one specific port and nothing else.',
  'A house where a smart doorbell, a games console and a laptop all share one connection. The doorbell should not be able to reach the laptop.',
  'A library with three floors. Each floor has its own switch, and all three feed one device at the bottom. A single printer on the top floor serves everybody.',
  'A lab where a machine has no address of its own and has to be given one before it can do anything. Somebody has to be there to hand it out.',
  'A network where one route is short and one is long, and the short one is guarded so tightly that most traffic has to take the long way.',
  'Two departments that must never reach each other, but both need the same file server. Build it so the server is shared and the departments are not.',
  'A site so remote that nobody can drive out to fix a broken cable. Build it so one failure changes nothing at all.',
  'An office where every machine talks to a server in another city. The path crosses three routers and the message must survive the trip.',
  'A network where somebody has plugged in a machine that nobody put on the plan. Build the network first, then decide where it would do the most damage.',
  'A school hall set up for exams. Machines must reach the exam server and absolutely nothing else — not the printer, not each other.',
  'A hospital ward where a monitor sends readings to a station down the corridor, and a spare route exists in case the first one drops.'
];
