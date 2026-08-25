/* ============================================================
   LEARN BY DOING
   Three beats per component: watch it work, read why, then supply
   the missing piece yourself.

   The demos are driven by the real simulator — the same actions(),
   doArp() and move() the campaign uses — so nothing shown here is
   a cartoon of the rules. If the engine changes, the demos change
   with it or they break loudly.

   Task kinds:
     place  — a '?' slot on the map; choose which device belongs
     value  — choose a setting (a mask, a gateway, a TTL)
     choose — a plain question with a teaching answer
   ============================================================ */

const LN = (t,x,y,c) => ({t,x,y,c:c||{}});
const LE = (who,ip,p,gw) => ({who, ip, p:p||24, gw:gw||''});

const LESSONS = [

{ id:'hub', name:'Hub', tag:'Hardware',
  idea:'A hub joins machines together by shouting everything at all of them.',
  why:'So why would anyone build one? Two reasons. It was dirt cheap and needed no configuration at all — you plugged cables in and it worked, which is why offices in the 1990s were full of them. And there is one job where copying everything to every port is exactly what you want: watching traffic. Put a hub on a test bench and every machine on it, including yours, sees every packet. Analysts still reach for that deliberately. The problem is only a problem when you did not choose it.',
  demo:{
    map:{ w:9, h:7, nodes:[
        LN('host',1,3,LE('Ada','10.0.0.10')), LN('hub',4,3),
        LN('server',7,1,LE('File server','10.0.0.50')), LN('host',7,5,LE('Ben','10.0.0.11')) ],
      links:[[0,1],[1,2],[1,3]],
      goal:{src:0,dst:'10.0.0.50',port:80,ttl:6,proto:'tcp',dnsName:''} },
    steps:[
      {say:'Ada wants to send a file to the file server. First she has to find out who is next door, so she shouts — that is ARP.', do:'arp'},
      {say:'Now watch the hub. It has one cable in and two out, and it has no memory of anything.', do:'move', link:0},
      {say:'The hub offers every port. It cannot tell which one leads to the server, so it copies the message to Ben as well. Ben did not ask for this file, and he gets it anyway.'},
      {say:'Take the correct exit and it arrives. But a copy went the other way too — on a hub, privacy does not exist and everybody shares the same line.', do:'move', link:1}
    ]},
  task:{ kind:'place',
    prompt:'Three machines in a small workshop need to be joined together with one device in the middle. Which piece goes in the gap?',
    options:['hub','switch','router','firewall'],
    answer:['hub','switch'],
    map:{ w:9, h:7, nodes:[
        LN('host',1,3,LE('Ada','10.0.0.10')), LN('slot',4,3),
        LN('server',7,1,LE('File server','10.0.0.50')), LN('host',7,5,LE('Ben','10.0.0.11')) ],
      links:[[0,1],[1,2],[1,3]],
      goal:{src:0,dst:'10.0.0.50',port:80,ttl:6,proto:'tcp',dnsName:''} },
    feedback:{
      hub:'Correct — a hub joins them. It is also the worst of the two right answers: everything Ada sends, Ben receives too. Try the switch and see the difference.',
      switch:'Also correct, and the better answer. A switch does the same joining job but delivers to one machine instead of shouting at everybody.',
      router:'A router joins different networks. All three of these are on 10.0.0.x — the same network — so a router has nothing to route.',
      firewall:'A firewall filters traffic; it does not join machines together. You would still have three unconnected machines and a bouncer standing between them.'
    }}},

{ id:'switch', name:'Switch', tag:'Layer 2',
  idea:'A switch learns which machine is on which port, and delivers to one of them.',
  why:'A switch exists to undo the hub\u2019s two problems at once. Traffic stops being everybody\u2019s business, and machines stop taking turns on one shared line — each conversation gets its own path, so ten machines talking at once do not slow each other down. That is why every network you have ever used is built on these.',
  demo:{
    map:{ w:10, h:7, nodes:[
        LN('host',1,3,LE('Ada','10.0.0.10')), LN('switch',4,3),
        LN('server',8,1,LE('File server','10.0.0.50')), LN('host',8,5,LE('Ben','10.0.0.11')) ],
      links:[[0,1],[1,2],[1,3]],
      goal:{src:0,dst:'10.0.0.50',port:80,ttl:6,proto:'tcp',dnsName:''} },
    steps:[
      {say:'Same office, same machines. The only thing that changed is the device in the middle.', do:'arp'},
      {say:'Into the switch. It reads the MAC band — the hardware address of the machine — and nothing else. Your IP address is invisible to it.', do:'move', link:0},
      {say:'It still offers you both exits here, because it has not learned where the server lives yet. The first message to an unknown machine does get flooded.'},
      {say:'But it wrote down which port Ada arrived on. Next time anyone sends to Ada, it goes straight there — no shouting. That memory is the whole difference between a switch and a hub.', do:'move', link:1}
    ]},
  task:{ kind:'place',
    prompt:'A school office is wired through a hub, and one student worked out he can read everyone else\u2019s traffic because he receives a copy of all of it. Replace the device in the gap so each machine only gets what was sent to it.',
    options:['hub','switch','router','repeater'],
    answer:['switch'],
    map:{ w:10, h:7, nodes:[
        LN('host',1,3,LE('Office PC','10.0.0.10')), LN('slot',4,3),
        LN('server',8,1,LE('Records server','10.0.0.50')), LN('host',8,5,LE('Student PC','10.0.0.11')) ],
      links:[[0,1],[1,2],[1,3]],
      goal:{src:0,dst:'10.0.0.50',port:445,ttl:6,proto:'tcp',dnsName:''} },
    feedback:{
      switch:'Right. The switch learns which port each machine is on and sends each message to exactly one of them. The student stops receiving other people\u2019s traffic.',
      hub:'That is what they already had, and it is the cause of the problem — a hub copies everything to every port.',
      router:'A router would work only by splitting them into separate networks, which is a much bigger change than the problem needs. Everything here is on 10.0.0.x already.',
      repeater:'A repeater only makes a weak signal stronger. It makes no decisions at all, so every machine would still receive everything.'
    }}},

{ id:'router', name:'Router', tag:'Layer 3',
  idea:'A router is the only device that can move traffic between two different networks.',
  why:'Networks are kept separate on purpose — to contain the shouting, to apply different rules to different groups, and because one flat network of a million machines would drown in its own broadcasts. A router is the border crossing that makes separation survivable. It is also the natural place to put rules, because everything leaving has to pass it.',
  demo:{
    map:{ w:12, h:6, nodes:[
        LN('host',1,3,LE('Ada','10.0.1.10',24,'10.0.1.1')), LN('switch',3,3),
        LN('router',6,3,{ifs:{1:{ip:'10.0.1.1',p:24},2:{ip:'10.0.2.1',p:24}},def:null}),
        LN('switch',9,3), LN('server',11,3,LE('Far server','10.0.2.50',24,'10.0.2.1')) ],
      links:[[0,1],[1,2],[2,3],[3,4]],
      goal:{src:0,dst:'10.0.2.50',port:80,ttl:6,proto:'tcp',dnsName:''} },
    steps:[
      {say:'Ada is 10.0.1.10. The server is 10.0.2.50. Run those through her mask and they are not on the same network, so she cannot deliver it herself.', do:'arp'},
      {say:'She hands it to her gateway instead — the router. The switch just carries it there.', do:'move', link:0},
      {say:'Through the switch, which as always reads only the hardware address.', do:'move', link:1},
      {say:'Now the router. It reads the IP address, checks it against each of its interfaces, and finds 10.0.2.50 matches the network on its other side.'},
      {say:'Watch two things happen on the way out: the TTL drops by one, and the hardware address is torn off and replaced for the next stretch. Only routers do that.', do:'move', link:2},
      {say:'The far switch carries it the last step. Delivered — across two networks that could never have reached each other without that router.', do:'move', link:3}
    ]},
  task:{ kind:'place',
    prompt:'Two departments each have their own network — 10.0.1.x and 10.0.2.x. They are cabled to the same gap but cannot reach each other. What belongs in the middle?',
    options:['switch','router','hub','firewall'],
    answer:['router'],
    map:{ w:11, h:6, nodes:[
        LN('host',1,3,LE('Sales PC','10.0.1.10',24,'10.0.1.1')), LN('slot',5,3),
        LN('server',9,3,LE('Design server','10.0.2.50',24,'10.0.2.1')) ],
      links:[[0,1],[1,2]],
      goal:{src:0,dst:'10.0.2.50',port:80,ttl:6,proto:'tcp',dnsName:''} },
    feedback:{
      router:'Right. Two different networks means a router — it is the only device that reads IP addresses and can carry traffic across the boundary.',
      switch:'A switch never looks at an IP address, so it cannot tell that 10.0.1.x and 10.0.2.x are different places. It would join the cables and still deliver nothing.',
      hub:'A hub is a switch with less sense. It also has no idea what an IP address is.',
      firewall:'A firewall decides what is allowed through a boundary. It does not create one, and there is no crossing here for it to police yet.'
    },
    fill:{router:{ifs:{0:{ip:'10.0.1.1',p:24},1:{ip:'10.0.2.1',p:24}},def:null}}}},

{ id:'mask', name:'Subnet mask', tag:'Addressing',
  idea:'The mask is the rule that decides whether a destination is local or has to go through the gateway.',
  why:'Without a mask, a machine would have to keep a list of every address in the world and where it lives. The mask replaces that list with one piece of arithmetic it can do in an instant: is this mine, or not mine? Every routing decision on the internet starts with that same question.',
  demo:{
    map:{ w:10, h:6, nodes:[
        LN('host',1,3,LE('Ada','10.0.1.10',24,'10.0.1.1')), LN('switch',4,3),
        LN('host',7,1,LE('Ben','10.0.1.11',24,'10.0.1.1')),
        LN('server',7,5,LE('Neighbour','10.0.1.50',24,'10.0.1.1')) ],
      links:[[0,1],[1,2],[1,3]],
      goal:{src:0,dst:'10.0.1.50',port:80,ttl:6,proto:'tcp',dnsName:''} },
    steps:[
      {say:'Ada is 10.0.1.10 with a /24 mask. That /24 means the first three numbers are the network and only the last one identifies the machine.', do:'arp'},
      {say:'Her target is 10.0.1.50. First three numbers match hers, so it is a neighbour — she can deliver it directly with no router involved.', do:'move', link:0},
      {say:'If the target had been 10.0.2.50, those first three would not match and she would have had to hand it to her gateway instead. Same machine, same cable, completely different decision.'},
      {say:'Delivered locally.', do:'move', link:2}
    ]},
  task:{ kind:'value',
    prompt:'This machine is 10.0.5.40 and needs to reach 10.0.5.200 without going through a router. Which prefix puts them both on the same network?',
    options:[{v:'/24', ok:true}, {v:'/25', ok:false}, {v:'/30', ok:false}, {v:'/16', ok:true}],
    feedback:{
      '/24':'Right. /24 means the first three numbers are the network, so 10.0.5.40 and 10.0.5.200 are both on 10.0.5.0 — neighbours.',
      '/16':'Technically yes — /16 makes the network 10.0.0.0, which contains both. It works, but it lumps in thousands of other addresses too. /24 is the tighter answer.',
      '/25':'Careful. /25 splits the last number in half: 0 to 127 in one network, 128 to 255 in the other. 40 and 200 land on opposite sides, so they would need a router.',
      '/30':'/30 leaves room for only two machines. That is used for a cable between two routers, not for a network with hosts on it.'
    }}},

{ id:'gateway', name:'Default gateway', tag:'Addressing',
  idea:'The gateway is the address a machine hands anything to when the destination is not local.',
  why:'It is what lets an ordinary machine know almost nothing and still reach the whole internet. Your laptop does not know a route to Australia. It knows one address to hand things to, and trusts that whoever holds it knows more than it does. That chain of trust, repeated, is the entire internet.',
  demo:{
    map:{ w:11, h:6, nodes:[
        LN('host',1,3,LE('Ada','10.0.1.10',24,'10.0.1.1')),
        LN('router',5,3,{ifs:{0:{ip:'10.0.1.1',p:24},1:{ip:'10.0.2.1',p:24}},def:null}),
        LN('server',9,3,LE('Far server','10.0.2.50',24,'10.0.2.1')) ],
      links:[[0,1],[1,2]],
      goal:{src:0,dst:'10.0.2.50',port:80,ttl:6,proto:'tcp',dnsName:''} },
    steps:[
      {say:'Ada\u2019s mask tells her 10.0.2.50 is not local. So she does not need to know where it is — she only needs to know who to give it to.', do:'arp'},
      {say:'That is her gateway: 10.0.1.1. Notice it is on her own network, because you can only hand something to a neighbour.', do:'move', link:0},
      {say:'The router takes it from here. Ada has no idea what happens next and does not need to.', do:'move', link:1}
    ]},
  task:{ kind:'value',
    prompt:'A machine at 10.0.7.25 /24 needs to reach the internet. The router has two interfaces: 10.0.7.1 and 10.0.8.1. Which one should be set as this machine\u2019s gateway?',
    options:[{v:'10.0.7.1', ok:true}, {v:'10.0.8.1', ok:false}, {v:'10.0.7.25', ok:false}, {v:'none needed', ok:false}],
    feedback:{
      '10.0.7.1':'Right. The gateway has to be an address on your own network, because handing something over is a local delivery. 10.0.7.1 shares the 10.0.7.x network with this machine.',
      '10.0.8.1':'That is the router\u2019s other side. The machine cannot reach it directly — it is on a different network, which is the whole problem the gateway is meant to solve.',
      '10.0.7.25':'That is the machine\u2019s own address. It would be handing the packet to itself.',
      'none needed':'Without a gateway this machine can only ever talk to its own network. Anything further has nowhere to go.'
    }}},

{ id:'arp', name:'ARP', tag:'Protocol',
  idea:'ARP is how a machine finds out the hardware address of the neighbour it is about to hand a packet to.',
  why:'IP addresses are an idea layered on top of cables that know nothing about them. Something has to translate between the two, and ARP is it. It exists because addresses move and hardware does not — you can hand a machine a new IP this morning, and ARP will still find it on the wire this afternoon.',
  demo:{
    map:{ w:10, h:6, nodes:[
        LN('host',1,3,LE('Ada','10.0.0.10')), LN('switch',4,3),
        LN('server',8,3,LE('Server','10.0.0.50')), LN('host',8,5,LE('Ben','10.0.0.11')) ],
      links:[[0,1],[1,2],[1,3]],
      goal:{src:0,dst:'10.0.0.50',port:80,ttl:6,proto:'tcp',dnsName:''} },
    steps:[
      {say:'Ada knows the address she wants: 10.0.0.50. But the cable does not carry IP addresses — the next machine along has to be named by its hardware address, and she does not know it.'},
      {say:'So she shouts to the whole local network: who has 10.0.0.50? Everybody hears the question, including Ben, who ignores it.', do:'arp'},
      {say:'The server answers with its hardware address. Ada writes it down and will not have to ask again for a while.'},
      {say:'Now she can send. Notice ARP has no way of checking that answer — whoever replies first is believed. That is the hole an attacker climbs through.', do:'move', link:0},
      {say:'The switch carries it the last step, using the hardware address ARP just found. Without that shout, none of this could have started.', do:'move', link:1}
    ]},
  task:{ kind:'choose',
    prompt:'A machine already knows the IP address it wants to reach. What is ARP actually finding out for it?',
    options:[
      {v:'The hardware (MAC) address of the next machine along', ok:true},
      {v:'The fastest route to the destination', ok:false},
      {v:'Which port number the service is listening on', ok:false},
      {v:'The name behind the address', ok:false}],
    feedback:{
      'The hardware (MAC) address of the next machine along':'Right. IP addresses get you across networks; hardware addresses get you across one cable. ARP turns one into the other.',
      'The fastest route to the destination':'That is a router\u2019s job, using its routing table. ARP never looks beyond the local network.',
      'Which port number the service is listening on':'Ports identify a service on a machine. Finding those out is a port scan, not ARP.',
      'The name behind the address':'That is DNS, and it works the other way round — name to address.'
    }}},

{ id:'dhcp', name:'DHCP', tag:'Protocol',
  idea:'DHCP hands a machine an address, a mask and a gateway when it has none of its own.',
  why:'Somebody has to make sure no two machines get the same address, and doing that by hand across a school is a full-time job that goes wrong constantly. DHCP does the bookkeeping. It also means a visitor\u2019s laptop works the moment it is plugged in, without anyone touching it.',
  demo:{
    map:{ w:10, h:7, nodes:[
        LN('host',1,3,{who:'New laptop', ip:'', p:24, gw:''}), LN('switch',4,3),
        LN('dhcp',4,6,{who:'DHCP server', ip:'10.0.1.5', p:24, gw:'10.0.1.1',
                       lease:{ip:'10.0.1.40',p:24,gw:'10.0.1.1'}}),
        LN('server',8,3,LE('File server','10.0.1.50',24,'10.0.1.1')) ],
      links:[[0,1],[1,2],[1,3]],
      goal:{src:0,dst:'10.0.1.50',port:80,ttl:6,proto:'tcp',dnsName:''} },
    steps:[
      {say:'This laptop has just been plugged in. It has no address at all, which means it cannot even work out whether anything is local — every decision a machine makes starts from its own address.'},
      {say:'So it shouts, the same way ARP does. Anything on this local network can hear it.', do:'dhcp'},
      {say:'The DHCP server answers with three things at once: an address, a mask, and a gateway. Now the laptop knows who it is and how to leave.', do:'arp'},
      {say:'And now it can send normally.', do:'move', link:0},
      {say:'Delivered. Notice what just happened though: whoever answered that shout decided this laptop\u2019s address, its mask and its way out. Answering it first is a whole attack on its own.', do:'move', link:2}
    ]},
  task:{ kind:'place',
    prompt:'A new machine has been plugged into this network and has no address. Nobody wants to type one in by hand. What belongs in the gap?',
    options:['dhcp','dns','router','switch'],
    answer:['dhcp'],
    map:{ w:10, h:7, nodes:[
        LN('host',1,3,{who:'New laptop', ip:'', p:24, gw:''}), LN('switch',4,3),
        LN('slot',4,6), LN('server',8,3,LE('File server','10.0.1.50',24,'10.0.1.1')) ],
      links:[[0,1],[1,2],[1,3]],
      goal:{src:0,dst:'10.0.1.50',port:80,ttl:6,proto:'tcp',dnsName:''} },
    feedback:{
      dhcp:'Right. DHCP is the front desk that hands out an address, a mask and a gateway to anything that turns up without them.',
      dns:'DNS turns names into addresses for a machine that already has one of its own. This machine cannot use DNS yet — it has no address to ask from.',
      router:'A router moves traffic between networks. It does not hand out addresses, and this machine cannot reach one anyway.',
      switch:'There is already a switch here. Joining the cables does not give anybody an address.'
    },
    fill:{dhcp:{who:'DHCP server', ip:'10.0.1.5', p:24, gw:'10.0.1.1', lease:{ip:'10.0.1.40',p:24,gw:'10.0.1.1'}}}}},

{ id:'dns', name:'DNS', tag:'Protocol',
  idea:'DNS turns a name people can remember into the address a machine actually needs.',
  why:'Partly because nobody can remember addresses. But mostly because it lets the address change without the name changing — a service can move to new hardware, or to a different country, and everyone keeps typing the same thing. Names are a layer of indirection, and indirection is what makes big systems changeable.',
  demo:{
    map:{ w:11, h:7, nodes:[
        LN('host',1,3,LE('Ada','10.0.1.10',24,'10.0.1.1')), LN('switch',4,3),
        LN('dns',4,6,LE('Resolver','10.0.1.53',24,'10.0.1.1')),
        LN('server',9,3,LE('Web server','10.0.1.80',24,'10.0.1.1')) ],
      links:[[0,1],[1,2],[1,3]],
      goal:{src:0,dst:'10.0.1.80',port:80,ttl:8,proto:'tcp',dnsName:'files.school'} },
    steps:[
      {say:'Ada wants files.school. That is a name, and names mean nothing to a network — it can only deliver to addresses.', do:'arp'},
      {say:'So her first trip is not to the destination at all. It is to the resolver, to ask what that name means.', do:'move', link:0},
      {say:'The resolver answers with an address, and only now does Ada know where she is actually going.', do:'move', link:1},
      {say:'She has to come back out the way she came. That detour cost hops she might have needed later.', do:'move', link:1},
      {say:'And now, finally, to the address she was given. This is also why a lying resolver is so dangerous — you go wherever it tells you and everything looks normal.', do:'move', link:2}
    ]},
  task:{ kind:'place',
    prompt:'Staff keep typing files.school into their browsers and getting nothing. The file server is up and reachable by its address. What is missing from the gap?',
    options:['dns','dhcp','firewall','hub'],
    answer:['dns'],
    map:{ w:11, h:7, nodes:[
        LN('host',1,3,LE('Staff PC','10.0.1.10',24,'10.0.1.1')), LN('switch',4,3),
        LN('slot',4,6), LN('server',9,3,LE('File server','10.0.1.80',24,'10.0.1.1')) ],
      links:[[0,1],[1,2],[1,3]],
      goal:{src:0,dst:'10.0.1.80',port:80,ttl:8,proto:'tcp',dnsName:'files.school'} },
    feedback:{
      dns:'Right. Everything works by address already — the only missing piece is something that can turn the name into one.',
      dhcp:'These machines already have addresses, so DHCP has nothing to give them. The problem is the name, not the address.',
      firewall:'Nothing is being blocked. The traffic never starts, because the name cannot be turned into an address.',
      hub:'Joining more cables does not help anyone look up a name.'
    },
    fill:{dns:{who:'Resolver', ip:'10.0.1.53', p:24, gw:'10.0.1.1'}}}},

{ id:'firewall', name:'Firewall', tag:'Security',
  idea:'A firewall allows or blocks traffic based on the port number — which service it is for.',
  why:'A machine offering one service should not be reachable for twenty others. Most attacks begin by connecting to something nobody meant to expose. A firewall shrinks what an outsider can even attempt, which is cheaper and more reliable than trying to make every service on every machine perfectly safe.',
  demo:{
    map:{ w:11, h:6, nodes:[
        LN('host',1,3,LE('Ada','10.0.1.10',24,'10.0.1.1')),
        LN('router',4,3,{ifs:{0:{ip:'10.0.1.1',p:24},1:{ip:'10.0.2.1',p:24}},def:null}),
        LN('firewall',7,3,{allow:[80,443]}),
        LN('server',10,3,LE('Web server','10.0.2.50',24,'10.0.2.1')) ],
      links:[[0,1],[1,2],[2,3]],
      goal:{src:0,dst:'10.0.2.50',port:80,ttl:6,proto:'tcp',dnsName:''} },
    steps:[
      {say:'Ada is loading a web page, so this packet is carrying port 80 — the number that says "this is web traffic".', do:'arp'},
      {say:'Across the router as usual.', do:'move', link:0},
      {say:'Now the firewall. It does not care who sent this or where it is going. It looks at one thing: the port number.', do:'arp'},
      {say:'Its list allows 80 and 443. Port 80 is on the list, so through it goes. Had this been port 22 for remote login, it would have been dropped right here without explanation.', do:'move', link:1},
      {say:'Delivered.', do:'move', link:2}
    ]},
  task:{ kind:'value',
    prompt:'A firewall protects a printer. Staff need to print, and printing uses port 9100. The firewall\u2019s allow list currently reads 80, 443. What should it be?',
    options:[{v:'80, 443, 9100', ok:true}, {v:'9100 only', ok:true}, {v:'80, 443', ok:false}, {v:'allow everything', ok:false}],
    feedback:{
      '80, 443, 9100':'Right. Add the port the service actually uses. The others stay if the printer also has a web page for its settings.',
      '9100 only':'Also correct, and tighter. If nobody needs the printer\u2019s web settings page, allowing only what is needed is the safer habit.',
      '80, 443':'That is what it says now, and it is why printing fails. Neither of those numbers is the printing port.',
      'allow everything':'That works and it is exactly what a firewall exists to prevent. You have solved printing by removing the protection.'
    }}},

{ id:'vlan', name:'VLAN', tag:'Layer 2',
  idea:'A VLAN splits one physical switch into separate networks that cannot reach each other.',
  why:'Separation used to mean buying a second switch and running a second set of cables through the walls. VLANs give you the same separation in software, on hardware you already own — so guests, staff, phones and cameras can share one physical network and still be strangers to each other.',
  demo:{
    map:{ w:10, h:8, nodes:[
        LN('host',1,4,LE('Staff PC','10.0.0.10')),
        LN('switch',4,4,{vl:{0:2, 1:1, 2:2}}),
        LN('host',8,1,LE('Guest PC','10.0.0.21')),
        LN('server',8,7,LE('Staff server','10.0.0.50')) ],
      links:[[0,1],[1,2],[1,3]],
      goal:{src:0,dst:'10.0.0.50',port:445,ttl:6,proto:'tcp',dnsName:''} },
    steps:[
      {say:'One switch, three machines, all on 10.0.0.x. By address alone every one of these should be able to reach every other.', do:'arp'},
      {say:'But the ports have been tagged with colours. The staff PC and the staff server are on colour 2; the guest PC is on colour 1.', do:'move', link:0},
      {say:'Look at the exits. The guest port is blocked, and the reason given is the VLAN — not the address, not a cable. The cable is right there and perfectly fine.'},
      {say:'The staff server is on the same colour, so that door opens. One switch, two networks, no extra hardware.', do:'move', link:2}
    ]},
  task:{ kind:'choose',
    prompt:'A guest laptop and the accounts computer are plugged into the same switch and are both on 10.0.0.x. The guest must never reach accounts. What is the cheapest fix?',
    options:[
      {v:'Put them on different VLANs on the switch they already share', ok:true},
      {v:'Buy a second switch and separate the cables', ok:false},
      {v:'Give the accounts computer a firewall', ok:false},
      {v:'Change the accounts computer\u2019s address', ok:false}],
    feedback:{
      'Put them on different VLANs on the switch they already share':'Right. VLANs give you the separation of two switches without buying one. The cables do not move.',
      'Buy a second switch and separate the cables':'That works, and it is what VLANs were invented to save you from. Same result, more hardware, more cabling.',
      'Give the accounts computer a firewall':'A firewall filters by port, so it would block services rather than the guest specifically — and the guest would still be sitting on the same network.',
      'Change the accounts computer\u2019s address':'Changing the address alone changes nothing, because the switch does not read addresses. The guest could still reach it.'
    }}},

{ id:'ttl', name:'TTL', tag:'Packet',
  idea:'TTL is a countdown that stops a lost packet from circling the network forever.',
  why:'Routers can disagree. If two of them each think the other is the way onwards, a packet bounces between them until something stops it — and nothing else would. TTL is the network admitting it will sometimes be wrong, and building in a guarantee that the mistake expires.',
  demo:{
    map:{ w:12, h:6, nodes:[
        LN('host',1,3,LE('Ada','10.0.1.10',24,'10.0.1.1')),
        LN('router',4,3,{ifs:{0:{ip:'10.0.1.1',p:24},1:{ip:'10.0.9.1',p:24}},routes:[{net:'10.0.2.0',p:24,lk:1}]}),
        LN('router',7,3,{ifs:{1:{ip:'10.0.9.2',p:24},2:{ip:'10.0.2.1',p:24}}}),
        LN('server',10,3,LE('Far server','10.0.2.50',24,'10.0.2.1')) ],
      links:[[0,1],[1,2],[2,3]],
      goal:{src:0,dst:'10.0.2.50',port:80,ttl:4,proto:'tcp',dnsName:''} },
    steps:[
      {say:'This packet starts with a TTL of 4. Think of it as a tank of gas measured in routers, not miles.', do:'arp'},
      {say:'Into the first router.', do:'move', link:0},
      {say:'Watch the number as it leaves. Every router subtracts one — switches and cables cost nothing.', do:'arp'},
      {say:'Second router, another one gone.', do:'move', link:1},
      {say:'It arrives with fuel to spare. If the routers had been wired in a loop, this countdown is the only thing that would ever have stopped it going round forever.', do:'arp'},
      {say:'Delivered.', do:'move', link:2}
    ]},
  task:{ kind:'value',
    prompt:'A packet has to cross four routers to reach its destination. What is a sensible TTL to give it?',
    options:[{v:'6', ok:true}, {v:'4', ok:false}, {v:'2', ok:false}, {v:'64', ok:true}],
    feedback:{
      '6':'Right — four hops needed plus a couple spare. Enough to survive a small detour, tight enough that a lost packet dies quickly.',
      '64':'Also fine, and it is what real systems use as a default. It is generous rather than wrong: a lost packet just takes longer to give up.',
      '4':'That is exactly enough with nothing to spare. One wrong turn or one rerouted link and it dies in transit.',
      '2':'It would run out at the second router and never arrive. TTL is not a distance in miles — it counts routers.'
    }}}

];
const LESSON_IDS = LESSONS.map(l => l.id);
