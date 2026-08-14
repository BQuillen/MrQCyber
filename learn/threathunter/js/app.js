'use strict';
/* =====================================================================
   0. CONFIG — every balance knob in one place
   ===================================================================== */
const CFG = {
  TILE:32, GRAV:0.35, MOVE:3.3, JUMP:-9.8, AIR_JUMPS:1, COYOTE:6, JUMP_BUFFER:7,
  PLAYER_HP:5, SHIELD_MAX:100, SHIELD_DRAIN:0.55, SHIELD_REGEN:0.12,
  HARD_MS:8000, KNOCK:4.2, KNOCK_HARD:6.2, FW_REBOOT_REGEN:0.115,
  SWORD_DMG:2, COMBO_DMG:3, COMBO_WINDOW:50, COMBO_R:74,
  SPIN_DMG:1, SPIN_FRAMES:22, SPIN_CD:46, SPIN_R:46,
  WORM_HP:2, WORM_SPLIT_MS:3500, WORM_CAP:20, HOP_AFTER_MS:10000,  // per-worm, from wake
  WAKE_R:470, KIN_CAP:8, KIN_SPLIT_MS:2200, BLOCK_COST:12,
  BIG_HP:6, BIG_BURST:4, TRAIL_MS:4500, TRAIL_EVERY:26,
  BOSS_HP:160, INTRO_KILLS:5, BOSS_SPIT_MS:2400, BOSS_RAIN_MS:2600, BOSS_SPAWN_MS:8000,
  GLOB_SPLASH:52, SLOW_MS:1800, MFA_MS:12000,
  SPIKE_HIDE:1300, SPIKE_WARN:350, SPIKE_OUT:1200,   // retracting spike cycle
  // --- Level 2: Trojan ---
  CRATE_HP:3, MITE_HP:1, MITE_CAP:16, SENTRY_HP:9, SENTRY_SPD:1.5,
  PAYLOAD_MS:3000, PAYLOAD_R:66, SCAN_START:2, SCAN_MAX:4, SCAN_R:250, SCAN_MS:2600,
  HORSE_HP:120, HORSE_LAUNCH_MS:6000, HORSE_WAVE_CRATES:9,
};
const WORDS = ['CTRL','ALT','DEL','ESC','TAB','F5'];  // keysword easter eggs

/* =====================================================================
   1. LEVEL MAP — generated + validated, but still hand-editable.
   Legend:
   #  solid          P  player start     w  mini worm      W  Heavyworm
   ^  static spikes  x  retracting spikes
   M  moving platform (horizontal)       V  moving platform (vertical)
   f  password fragment (10)  k  decryption key (3)  h  hidden folder
   a  AI token (+1 max HP)    s  shield recharge     m  MFA power-up
   G  encrypted gate (needs all 3 keys)  B  boss trigger  H  health patch (+2)
   ===================================================================== */
const SECTORS={
 1:{name:"The Worm",threat:"WORM",blurb:"Self-replicating malware is chewing through Cache Valley.",levels:[
  {id:"1.1",name:"Boot Sequence",kind:"proving",
   doors:[{"col": 17, "r0": 9, "r1": 10, "req": "walk"}, {"col": 34, "r0": 9, "r1": 10, "req": "clear"}, {"col": 51, "r0": 9, "r1": 10, "req": "clear&combo"}, {"col": 68, "r0": 9, "r1": 10, "req": "walk"}, {"col": 85, "r0": 5, "r1": 6, "req": "double"}, {"col": 102, "r0": 9, "r1": 10, "req": "clear&spin"}, {"col": 119, "r0": 9, "r1": 10, "req": "block"}, {"col": 136, "r0": 9, "r1": 10, "req": "observe"}, {"col": 153, "r0": 9, "r1": 10, "req": "walk"}],
   signs:[{"col": 6, "row": 8, "text": "< >  or  A D   — MOVE"}, {"col": 20, "row": 7, "text": "J — KEYSWORD.  Cut all three."}, {"col": 36, "row": 7, "text": "Three fast hits chain into"}, {"col": 36, "row": 8, "text": "BUFFER OVERFLOW. Watch the pips."}, {"col": 53, "row": 8, "text": "^ / W / SPACE — JUMP"}, {"col": 70, "row": 8, "text": "JUMP AGAIN IN MIDAIR."}, {"col": 70, "row": 9, "text": "Redundancy: a second control"}, {"col": 70, "row": 10, "text": "when the first is spent."}, {"col": 88, "row": 9, "text": "K — MOUSE NUNCHUCK. 360 degrees."}, {"col": 88, "row": 10, "text": "The sword reaches one. This reaches all."}, {"col": 104, "row": 7, "text": "HOLD L — FIREWALL."}, {"col": 104, "row": 8, "text": "It cannot be killed. Block it."}, {"col": 121, "row": 5, "text": "OBSERVE. DO NOT ENGAGE."}, {"col": 121, "row": 6, "text": "One worm. Twenty seconds."}, {"col": 138, "row": 7, "text": "FRAGMENTS build a passphrase."}, {"col": 149, "row": 7, "text": "KEYS open what encryption sealed."}, {"col": 155, "row": 7, "text": "ALL OF IT. ONCE."}],
   terminals:[{"col": 49, "row": 10, "title": "BUFFER OVERFLOW", "body": "Your third strike overflows into an area burst.\n\nThe name is borrowed from a real attack: writing more data than a buffer can hold until it spills into memory it should never touch.\n\nIt is the one move where you use the enemy's own technique."}, {"col": 105, "row": 10, "title": "FIREWALL LIMITS", "body": "Every blocked hit costs power. Drain it to zero and it goes offline for a full reboot.\n\nNo single control is unlimited. That is why defenders layer them — defense in depth.\n\nA patch pickup restores it instantly."}, {"col": 121, "row": 10, "title": "REPLICATION", "body": "A worm needs no user action to spread. It copies itself, and the copies copy themselves.\n\nWhat you are watching is exponential. Three becomes six becomes twelve.\n\nThe cheapest moment to contain an outbreak is always the first one."}],
   rows:[
    "############################################################################################################################################################################",
    "#                #                #                #                #                #                #                #                #                #                 #",
    "#                #                #                #                #                #                #                #                #                #                 #",
    "#                #                #                #                #                #                #                #                #                #                 #",
    "#                #                #                #                #                #                #                #                #                #                 #",
    "#                #                #                #                #                                 #                #                #                #                 #",
    "#                #                #                #                #                                 #                #                #                #                 #",
    "#                #                #                #                #           ############     ######                #     ########   #                #                 #",
    "#                #                #                #                #                #                #                #    #        #  #          G     #                 #",
    "#                                                                                    #                                      #        #             G                       #",
    "#  P                   d  d  d             Q                                         #    d d d d d d              c        #   w    #      f  k   G          w  w   d  D  #",
    "##########################################################   #############        ##########################################################################################",
    "##########################################################   #############        ##########################################################################################",
    "##########################################################   #############        ##########################################################################################",
    "############################################################################################################################################################################",
  ]},
  {id:"1.2",name:"The Underlayer",kind:"gauntlet",
   doors:[],
   signs:[],
   terminals:[],
   rows:[
    "#                                                                                                                                                    #",
    "#                                                                                                                                                    #",
    "#                                                                                                                                                    #",
    "#                                                                                                                                                    #",
    "#                                                                                                                                                    #",
    "#                                                                                                                                                    #",
    "#                                                                                                                                                    #",
    "#                                                 f    m                                                                                             #",
    "#                                  f            #######                                              a                                               #",
    "#                             #######                                                           #######                                              #",
    "#                                                                                                                                                    #",
    "#                           w                           w                                         w                                       D          #",
    "#############################################################                   #########################################             ########       #",
    "#############################################################                   #########################################                            #",
    "#                             f                     f                     #######                     f                         f                    #",
    "#         f               #######                   #######                               f         #######                 #######                  #",
    "#       #######                                                   f                   #######                       s                                #",
    "#                                     #######                   #######                                         #######                              #",
    "#                                                                                                                                                    #",
    "#  P        w       ^^^^      w         W   ^^^^  w         x       w       W         x w   ^^^^        w     W         w           w                #",
    "######################################################################################################################################################",
    "######################################################################################################################################################",
  ]},
  {id:"1.3",name:"Worm Outbreak",kind:"containment",
   doors:[],
   signs:[],
   terminals:[],
   rows:[
"#                                                                                                                                                                                  #",
"#                                                                                                                                                                                  #",
"#                                         f     k                                                                                                                                  #",
"#                                               ##                     f                                                                                                           #",
"#                                 f      ##                           ####                                x k x                                                                    #",
"#                                ###                  ###                                                 #####                      a                                             #",
"#                       ####                                                 f                                                      ####                              ######       #",
"#                f                                                          ####                                              f                                                    #",
"#               ####                                          f      ###                                                    #####                                                  #",
"#                                                           #####                                   #####                                     m             H                  H   #",
"#       #####                                                                                                                               #####          ####               #### #",
"#                                                                                                                                                                                  #",
"#  P           w              w                           w                             M             w         W         w       W       w       f   G     B                      #",
"######################   ###############     #####################   ###############          ##    ##################   ###########################################################",
"######################   ###############^^^^^#####################   ###############          ##^^^^##################   ###########################################################",
"######################   #########################################   ###############          ########################   ###########################################################",
"######################   #########################################V  ###############          ########################   ###########################################################",
"#                                                                                                                                                 ##################################",
"#                                                                                                                                                 ##################################",
"#                        ###                                         ###             f                                   ###                      ##################################",
"#                                                 f                                                 s                               h           k ##################################",
"#                               w     W      xxxx      ^^^  w                 W                w            ^^^              w  xx          xxx   ##################################",
"####################################################################################################################################################################################",
"####################################################################################################################################################################################",
  ]}
 ]},
 2:{name:"The Trojan Horse",threat:"TROJAN HORSE",blurb:"Nothing here forces its way in. All of it was invited.",levels:[
  {id:"2.1",name:"Receiving Dock",kind:"proving",
   doors:[{"col": 18, "r0": 9, "r1": 10, "req": "clear"}, {"col": 36, "r0": 9, "r1": 10, "req": "clear"}, {"col": 54, "r0": 9, "r1": 10, "req": "scan"}, {"col": 72, "r0": 9, "r1": 10, "req": "clear"}, {"col": 90, "r0": 9, "r1": 10, "req": "walk"}, {"col": 108, "r0": 9, "r1": 10, "req": "walk"}, {"col": 126, "r0": 9, "r1": 10, "req": "walk"}],
   signs:[{"col": 3, "row": 8, "text": "SOME THINGS MUST BE OPENED."}, {"col": 20, "row": 7, "text": "IDENTICAL OUTSIDE."}, {"col": 20, "row": 8, "text": "NOT IDENTICAL INSIDE."}, {"col": 38, "row": 7, "text": "I — SIGNATURE SCAN. Use it."}, {"col": 38, "row": 8, "text": "Eight of these are hostile."}, {"col": 56, "row": 7, "text": "ONE CHARGE. THREE CRATES."}, {"col": 74, "row": 7, "text": "IT TICKS. THE CRATE WAS ONLY"}, {"col": 74, "row": 8, "text": "THE DELIVERY. SPIN [K] TO DEFLECT."}, {"col": 92, "row": 7, "text": "STATUARY. DECORATIVE. HARMLESS."}, {"col": 110, "row": 7, "text": "A DELIVERY. FOR YOU."}],
   terminals:[{"col": 52, "row": 10, "title": "SIGNATURE SCAN", "body": "The scan reveals what a container holds before you open it.\n\nCharges are limited, and they always will be. Detection is never free — real teams ration attention the same way.\n\nScan what matters. Guess at the rest."}, {"col": 93, "row": 10, "title": "BRONZE SENTRY", "body": "It moved, didn't it.\n\nIt only moves when you are not facing it. Inert while observed, active the moment you look away.\n\nThat is a Trojan: harmless right up until the instant nobody is watching."}],
   rows:[
    "##################################################################################################################################################",
    "#                 #                 #                 #                 #                 #                 #                 #                  #",
    "#                 #                 #                 #                 #                 #                 #                 #                  #",
    "#                 #                 #                 #                 #                 #                 #                 #                  #",
    "#                 #                 #                 #                 #                 #                 #                 #                  #",
    "#                 #                 #                 #                 #                 #                 #                 #                  #",
    "#                 #                 #                 #                 #                 #                 #                 #                  #",
    "#                 #                 #                 #                 #                 #                 #                 #                  #",
    "#                 #                 #                 #                 #                 #                 #                 #                  #",
    "#                                                                                                                                                #",
    "#  P           O       O  F  U  E      EEEEFEEEE z         E   E F E          Y      Y              T     f          g             C   T  C   D  #",
    "##################################################################################################################################################",
    "##################################################################################################################################################",
    "##################################################################################################################################################",
  ]},
  {id:"2.2",name:"The Long Hall",kind:"gauntlet",
   doors:[],
   signs:[],
   terminals:[],
   rows:[
    "#                                                                                                                                                    #",
    "#                                                                                                                                                    #",
    "#                                                                                                                                                    #",
    "#                                                                                                                                                    #",
    "#                                                                                                                                                    #",
    "#                                           C f                                                 C                                                    #",
    "#                                       #########                                           #########                                                #",
    "#                                                                                                                                                    #",
    "#                               s C T                               C                                                   f C                          #",
    "#             fC              #########                         #########                               C H           #########                      #",
    "#           #########                               C                               f C T           #########                            C           #",
    "#                                               #########                         #########                                           ########       #",
    "#                                                                                                                                                    #",
    "#  P              T     CCC               T       g       CCC         z   T                     CCC           T g             z CC  T            D   #",
    "######################################################################################################################################################",
    "######################################################################################################################################################",
    "######################################################################################################################################################",
  ]},
  {id:"2.3",name:"Trojan Citadel",kind:"containment",
   doors:[],
   signs:[],
   terminals:[],
   rows:[
"#                                                                                                                                                  #",
"#                                                                                                                                                  #",
"#                                                                                                                                                  #",
"#                                                                                                                                                  #",
"#                                                                                                                                                  #",
"#                                                              Cf                                                                                  #",
"#                                   Cf                      #######                                                                                #",
"#                                 ######                                                                              #######                      #",
"#                                                    mC                                                                                            #",
"#                                                   #######               Cz                     sC T                         H                    #",
"#                      fCzT                                             ######                  ######                      ######                 #",
"#                     ######            fC                       CT                                             z                                  #",
"#          fC g                       ########    g           #######                  fC   g                 ######                      H        #",
"#         #######                               #####                                 #######                                           #####      #",
"#                                                                                                                                                  #",
"# P     CC        T CC              CC      T           CC  T         CC    T       CC    T   CC         B                                         #",
"##############################    ############################################    ##################################################################",
"##############################^^^^############################################^^^^##################################################################",
"####################################################################################################################################################",
  ]}
 ]}
};
let CUR=SECTORS[1].levels[0];
let MAP=CUR.rows;

/* Real-world intel. One fragment per level; three completes a file. */
const DOSSIERS={
 1:{title:"THE WORM",frags:[
  {t:"Patient Zero",d:"November 2, 1988",
   b:"A Cornell graduate student released a program meant to measure the size of the internet. A flaw let it reinfect machines over and over until they ground to a halt. It reached roughly 6,000 machines — about 10% of the internet as it then existed.\n\nHe became the first person convicted under the Computer Fraud and Abuse Act. In the aftermath, the first computer emergency response team was created — the ancestor of every SOC that exists today, including the one talking in your ear."},
  {t:"The One That Never Left",d:"November 2008",
   b:"Conficker infected somewhere between 9 and 15 million machines. Microsoft had released the patch the month before.\n\nYears later it was still being found on live networks, running on hardware nobody remembered was connected.\n\nThe most common way a worm spreads is not a clever exploit. It is an unapplied patch."},
  {t:"The One That Broke Something Real",d:"Discovered June 2010",
   b:"Stuxnet spread by USB drive to reach machines never connected to the internet. It carried four previously unknown vulnerabilities and ignored nearly every computer it infected.\n\nIt was hunting one model of industrial controller running centrifuges at a uranium enrichment facility in Natanz, Iran. When it found them, it spun them to destruction while reporting normal readings to the operators.\n\nThis is where malware stopped being about data and started being about physical consequences. It was also far beyond the means of any individual — which raises the question: who builds a thing like that?"}]},
 2:{title:"THE TROJAN HORSE",frags:[
  {t:"The Oldest Trick Recorded",d:"December 1989",
   b:"The original is roughly 3,000 years old and worked because the target chose to bring it inside.\n\nThe first computer version: 20,000 floppy disks mailed to attendees of a World Health Organization AIDS conference, labeled as medical research software. The disks worked as advertised — and after 90 reboots, encrypted the victim's filenames and demanded $189 be mailed to a post office box in Panama.\n\nThe first Trojan and the first ransomware in one package. The delivery method was the postal service."},
  {t:"Industrialized",d:"2007 onward",
   b:"Zeus turned Trojans into a business — a banking Trojan that watched quietly for login credentials and moved money. Its source code leaked in 2011 and fragmented into a generation of descendants.\n\nEmotet went further and became delivery as a service: a Trojan whose product was smuggling other people's malware inside, rented to whoever paid. Dismantling it took an international law-enforcement operation in January 2021.\n\nTrojans stopped being written by individuals and became infrastructure with customers."},
  {t:"Signed, Sealed, Trusted",d:"December 2020",
   b:"Attackers compromised the build system of a widely used network-monitoring product and inserted a backdoor before the software was compiled and cryptographically signed. Around 18,000 organizations installed it as a routine update.\n\nNothing was disguised. Nothing was hidden. The software was legitimate, correctly signed, and delivered through the proper channel.\n\nThe Horse hid in its own cargo. This hid in the supply chain — and every control designed to verify authenticity confirmed it was safe, because it was authentically compromised."}]}
};


/* =====================================================================
   2. STATE + DOM
   ===================================================================== */
const cvs=document.getElementById('game'), ctx=cvs.getContext('2d');
const $=id=>document.getElementById(id);
const S={mode:'title',level:1,sector:1,lidx:0,kind:'containment',t0:0,elapsed:0,frags:0,fragsTotal:0,keys:0,keysTotal:0,
         wormsKilled:0,introKills:0,msg:null,msgT:0,seen:{},wordIdx:0,spinId:0,
         scanT:0,scanX:0,scanY:0,obsT:0,termOpen:null,nearTerm:null};
// progress persists between sessions; falls back to memory if storage is blocked
let PROGRESS={};
try{PROGRESS=JSON.parse(localStorage.getItem('threathunter-progress')||'{}');}catch(e){PROGRESS={};}
PROGRESS.done=PROGRESS.done||{};PROGRESS.frags=PROGRESS.frags||{};
function lvlDone(id){return !!PROGRESS.done[id];}
function secCount(sid){return SECTORS[sid].levels.filter(L=>lvlDone(L.id)).length;}
function secDone(sid){return secCount(sid)===SECTORS[sid].levels.length;}
function allDone(){return Object.keys(SECTORS).every(secDone);}
function saveProgress(){try{localStorage.setItem('threathunter-progress',JSON.stringify(PROGRESS));}catch(e){}}
let player,entities,movers,trails,booms,particles,spikesStatic,camera,shake,
    levelW,levelH,boss,walls,gate,crateGrid,doors,signs,terminals;

/* =====================================================================
   3. AUDIO — tiny WebAudio synth, no files
   ===================================================================== */
let AC=null;
function beep(freq,dur=0.08,type='square',vol=0.12,slide=0){
  if(!AC)return;
  const o=AC.createOscillator(),g=AC.createGain();
  o.type=type;o.frequency.setValueAtTime(freq,AC.currentTime);
  if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(30,freq+slide),AC.currentTime+dur);
  g.gain.setValueAtTime(vol,AC.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001,AC.currentTime+dur);
  o.connect(g).connect(AC.destination);o.start();o.stop(AC.currentTime+dur);
}
const SFX={
  jump:()=>beep(300,0.1,'square',0.1,200),
  djump:()=>beep(420,0.09,'square',0.1,260),
  slash:()=>beep(680,0.06,'sawtooth',0.09,-300),
  combo:()=>{beep(200,0.2,'sawtooth',0.16,-80);beep(800,0.15,'square',0.08,400);},
  spin:()=>beep(500,0.16,'triangle',0.1,-260),
  hurt:()=>beep(140,0.18,'sawtooth',0.14,-60),
  pick:()=>beep(880,0.09,'sine',0.12,300),
  key:()=>{beep(660,0.1,'sine',0.12,200);setTimeout(()=>beep(990,0.12,'sine',0.12,200),90);},
  split:()=>beep(220,0.14,'square',0.1,-120),
  block:()=>beep(950,0.05,'square',0.1,120),
  alert:()=>beep(520,0.05,'square',0.06),
  boom:()=>beep(90,0.3,'sawtooth',0.18,-40),
  slam:()=>{beep(60,0.4,'sawtooth',0.2,-20);beep(120,0.3,'square',0.12,-60);},
};

/* =====================================================================
   4. INPUT
   ===================================================================== */
const keys={},pressed={};
addEventListener('keydown',e=>{
  if(['ArrowLeft','ArrowRight','ArrowUp',' '].includes(e.key))e.preventDefault();
  if(!keys[e.code])pressed[e.code]=true;
  keys[e.code]=true;
  if((e.code==='KeyP'||e.code==='Escape')&&(S.mode==='play'||S.mode==='pause'))togglePause();
  if(S.mode==='terminal'&&(e.code==='KeyF'||e.code==='Escape'||e.code==='Enter'))closeTerminal();
});
addEventListener('keyup',e=>keys[e.code]=false);
const down=(...c)=>c.some(k=>keys[k]);
const tapped=(...c)=>c.some(k=>pressed[k]);

/* =====================================================================
   5. LEVEL HELPERS
   ===================================================================== */
const T=CFG.TILE;
const tileAt=(c,r)=> (r<0||c<0) ? ' ' : ((MAP[r]||'')[c]||' ');
function solidAt(px,py){
  const c=Math.floor(px/T), r=Math.floor(py/T);
  if(tileAt(c,r)==='#')return true;
  if(crateGrid&&crateGrid.has(c+','+r))return true;   // crates block the path — break them
  if(doors)for(const d of doors){                     // objective doors: open when the skill is shown
    if(!d.open&&c===d.col&&r>=d.r0&&r<=d.r1)return true;
  }
  if(gate && S.keys<S.keysTotal && c===gate.col && r<=gate.bottom)return true;
  return false;
}
function moveAndCollide(b){
  b.x+=b.vx;
  if(b.vx>0){ if(solidAt(b.x+b.w,b.y+1)||solidAt(b.x+b.w,b.y+b.h-1)){
    b.x=Math.floor((b.x+b.w)/T)*T-b.w-0.01;b.vx=0;b.hitWall=true;} }
  else if(b.vx<0){ if(solidAt(b.x,b.y+1)||solidAt(b.x,b.y+b.h-1)){
    b.x=Math.floor(b.x/T+1)*T+0.01;b.vx=0;b.hitWall=true;} }
  b.y+=b.vy; b.grounded=false;
  if(b.vy>0){ if(solidAt(b.x+2,b.y+b.h)||solidAt(b.x+b.w-2,b.y+b.h)){
    b.y=Math.floor((b.y+b.h)/T)*T-b.h-0.01;b.vy=0;b.grounded=true;} }
  else if(b.vy<0){ if(solidAt(b.x+2,b.y)||solidAt(b.x+b.w-2,b.y)){
    b.y=Math.floor(b.y/T+1)*T+0.01;b.vy=0;} }
}
const overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
const dist=(x1,y1,x2,y2)=>Math.hypot(x2-x1,y2-y1);
const center=e=>[e.x+e.w/2,e.y+e.h/2];

/* =====================================================================
   6. ALERTS — the teaching layer (first-time by default)
   ===================================================================== */
function alertMsg(id,text,always=false){
  if(!always&&S.seen[id])return;
  S.seen[id]=true; S.msg=text; S.msgT=270; SFX.alert();
}

/* =====================================================================
   7. SPAWNING
   ===================================================================== */
function spawnFromMap(){
  entities=[];movers=[];trails=[];booms=[];particles=[];spikesStatic=new Set();
  crateGrid=new Set();boss=null;walls=null;gate=null;shake=0;
  doors=(CUR.doors||[]).map(d=>({...d,open:false}));
  signs=CUR.signs||[];terminals=(CUR.terminals||[]).map(t=>({...t}));
  S.obsT=0;S.termOpen=null;S.nearTerm=null;
  Object.assign(S,{frags:0,fragsTotal:0,keys:0,keysTotal:0,wormsKilled:0,
                   introKills:0,msg:null,msgT:0,seen:{},wordIdx:0,spinId:0});
  levelH=MAP.length*T;
  levelW=Math.max(...MAP.map(r=>r.length))*T;
  MAP.forEach((row,r)=>[...row].forEach((ch,c)=>{
    const x=c*T,y=r*T;
    if(ch==='P')player=makePlayer(x,y-16);
    if(ch==='w'){const w=makeWorm(x,y);if(CUR.kind==='proving')w.dormant=false;entities.push(w);}
    if(ch==='W')entities.push(makeBig(x,y));
    if(ch==='f'){entities.push(makePickup('frag',x+8,y+8));S.fragsTotal++;}
    if(ch==='k'){entities.push(makePickup('key',x+6,y+4));S.keysTotal++;}
    if(ch==='a')entities.push(makePickup('token',x+7,y+6));
    if(ch==='s')entities.push(makePickup('shield',x+7,y+6));
    if(ch==='m')entities.push(makePickup('mfa',x+6,y+4));
    if(ch==='H')entities.push(makePickup('health',x+7,y+6));
    if(ch==='h')entities.push(makePickup('folder',x+6,y+4));
    if(ch==='^')spikesStatic.add(c+','+r);
    if(ch==='x')entities.push({type:'rspike',x,y,w:T,h:T,off:(c*137)%2850});
    if(ch==='M')movers.push(makeMover(x,y,'x',3.5*T));
    if(ch==='V')movers.push(makeMover(x,y,'y',4*T));   // elevator: underground ↔ surface
    if(ch==='G')gate={col:c,bottom:r};
    if(ch==='B')entities.push({type:'bossTrigger',x,y:0,w:T,h:levelH});
    if(ch==='C')addCrate(c,r,'roll');
    if(ch==='O')addCrate(c,r,'empty');
    if(ch==='E')addCrate(c,r,'enemy');
    if(ch==='F')addCrate(c,r,'frag');
    if(ch==='Y')addCrate(c,r,'payload');
    if(ch==='U')addCrate(c,r,'powerup');
    if(ch==='d')entities.push(makeDummy(x,y,false));
    if(ch==='Q')entities.push(makeDummy(x,y,true));
    if(ch==='c')entities.push(makeCharger(x,y));
    if(ch==='D')entities.push(makePickup('dossier',x+6,y+4));
    if(ch==='T')entities.push(makeSentry(x,y));
    if(ch==='g')entities.push({type:'package',x:x+3,y:y+4,w:26,h:26,bob:Math.random()*6,idx:0});
    if(ch==='z')entities.push(makePickup('scan',x+7,y+6));
    if(ch==='H')entities.push(makePickup('health',x+7,y+6));
  }));
  // the first package you'd naturally reach is the gift; the rest are the trap
  entities.filter(e=>e.type==='package').sort((a,b)=>a.x-b.x).forEach((p,i)=>p.idx=i);
  player.scans=S.sector===2?CFG.SCAN_START:0;
}
function makePlayer(x,y){return{x,y,w:22,h:30,vx:0,vy:0,face:1,hp:CFG.PLAYER_HP,
  maxHp:CFG.PLAYER_HP,shield:CFG.SHIELD_MAX,shielding:false,inv:0,coyote:0,jbuf:0,
  airJumps:CFG.AIR_JUMPS,atkT:0,atkCd:0,combo:0,comboT:0,word:'CTRL',
  spinT:0,spinCd:0,slow:0,mfa:0,mfaGuard:false,hardT:0,fwDown:false,walk:0,
  didDouble:false,didBlock:false,didSpin:false,didCombo:false,didScan:false,scans:0,spawnX:x,spawnY:y,onMover:null};}
function makeWorm(x,y,fromSplit=false,bossKin=false){return{type:'worm',x,y:y-4,w:26,h:18,
  vx:(Math.random()<.5?-1:1)*1.4,vy:0,hp:CFG.WORM_HP,born:performance.now(),
  dormant:!fromSplit&&!bossKin,   // map-placed worms sleep until you approach
  bossKin,hopT:0,flash:0,stun:0,spinHit:-1};}
function makeBig(x,y){return{type:'big',x,y:y-10,w:40,h:26,
  vx:(Math.random()<.5?-1:1)*0.9,vy:0,hp:CFG.BIG_HP,trailT:0,flash:0,stun:0,spinHit:-1};}
function makeMover(x,y,axis,amp){return{x,y,w:3*T,h:12,axis,cx:x,cy:y,amp,t:Math.random()*6,dx:0,dy:0};}
function makePickup(kind,x,y){return{type:'pickup',kind,x,y,w:18,h:18,bob:Math.random()*6};}
function makeGlob(x,y,vx,vy){return{type:'glob',x,y,w:12,h:12,vx,vy};}
function makeBoss(x,y){return{type:'boss',x,y,w:88,h:64,vx:1.2,vy:0,
  hp:CFG.BOSS_HP,maxHp:CFG.BOSS_HP,state:'perch',
  spitT:CFG.BOSS_SPIT_MS,rainT:1400,spawnT:CFG.BOSS_SPAWN_MS,flash:0,phase:1,spinHit:-1};}

/* =====================================================================
   8. PLAYER
   ===================================================================== */
function updatePlayer(){
  const p=player;
  const spd=CFG.MOVE*(p.slow>0?0.45:1);
  p.shielding=down('KeyL')&&p.shield>0&&!p.fwDown;   // usable to the last drop — then it burns out
  const mv=p.shielding?spd*0.4:spd;
  if(down('ArrowLeft','KeyA')){p.vx=-mv;p.face=-1;}
  else if(down('ArrowRight','KeyD')){p.vx=mv;p.face=1;}
  else p.vx=0;
  p.walk+= Math.abs(p.vx)*0.22;

  // jump: coyote+buffer, then one air jump
  p.coyote=p.grounded?CFG.COYOTE:Math.max(0,p.coyote-1);
  p.jbuf=tapped('ArrowUp','KeyW','Space')?CFG.JUMP_BUFFER:Math.max(0,p.jbuf-1);
  if(p.jbuf>0&&!p.shielding){
    if(p.coyote>0){p.vy=CFG.JUMP;p.coyote=0;p.jbuf=0;SFX.jump();}
    else if(p.airJumps>0){p.airJumps--;p.vy=CFG.JUMP*0.92;p.jbuf=0;p.didDouble=true;SFX.djump();
      for(let i=0;i<7;i++)particles.push({x:p.x+p.w/2,y:p.y+p.h,vx:(Math.random()-.5)*3,
        vy:1+Math.random()*2,t:14,color:'#35f0dc'});
    }
  }
  p.vy=Math.min(p.vy+CFG.GRAV,11);
  p.onMover=null;
  moveAndCollide(p);

  // ride moving platforms (land on top band only)
  movers.forEach(m=>{
    if(p.vy>=0 && p.x+p.w>m.x+3 && p.x<m.x+m.w-3 &&
       p.y+p.h>=m.y-2 && p.y+p.h<=m.y+m.h+8){
      p.y=m.y-p.h-0.01;p.vy=0;p.grounded=true;p.onMover=m;
      p.x+=m.dx; p.y+=m.dy;
    }
  });
  if(p.grounded){p.airJumps=CFG.AIR_JUMPS; if(!p.onMover){p.spawnX=p.x;p.spawnY=p.y-4;}}

  if(p.y>levelH+40){damagePlayer(1,true);p.x=p.spawnX;p.y=p.spawnY-40;p.vy=0;}

  // spikes (static tiles + extended retractors) — checked with a small inset
  const inset={x:p.x+4,y:p.y+6,w:p.w-8,h:p.h-6};
  for(const key of spikesStatic){
    const [c,r]=key.split(',').map(Number);
    if(overlap(inset,{x:c*T+4,y:r*T+12,w:T-8,h:T-12})){spikeHit();break;}
  }

  if(p.shielding){
    if(p.hardT<=0)p.shield=Math.max(0,p.shield-CFG.SHIELD_DRAIN);
    alertMsg('fw','FIREWALL ACTIVE — blocks frontal attacks and knocks intruders back. Don\'t let it hit zero!');}
  else if(p.fwDown){
    // fully depleted: rebooting — unusable until back to 100%
    p.shield=Math.min(CFG.SHIELD_MAX,p.shield+CFG.FW_REBOOT_REGEN);
    if(p.shield>=CFG.SHIELD_MAX){p.fwDown=false;
      alertMsg('fwUp','FIREWALL REBOOTED — back online at full strength.',true);}
  }
  else p.shield=Math.min(CFG.SHIELD_MAX,p.shield+CFG.SHIELD_REGEN);
  if(!p.fwDown&&p.shield<=0){p.fwDown=true;SFX.hurt();
    alertMsg('fwDown','FIREWALL OFFLINE — it burned out and must fully reboot. A patch would restore it instantly.',true);}
  if(p.hardT>0)p.hardT-=16.7;

  // keysword — combo counter, rotating keycap words
  if(p.atkCd>0)p.atkCd--;
  if(p.atkT>0)p.atkT--;
  if(p.comboT>0)p.comboT--; else p.combo=0;
  if(tapped('KeyJ')&&p.atkCd===0&&!p.shielding&&p.spinT===0){
    p.atkT=8;p.atkCd=15;
    p.combo=(p.comboT>0?p.combo:0)+1;p.comboT=CFG.COMBO_WINDOW;
    p.word=WORDS[S.wordIdx++%WORDS.length];
    SFX.slash();
    if(p.combo>=3){comboBurst();p.combo=0;p.didCombo=true;}
  }
  // nunchuck 360° spin
  if(p.spinCd>0)p.spinCd--;
  if(p.spinT>0)p.spinT--;
  if(tapped('KeyK')&&p.spinCd===0&&!p.shielding&&p.atkT===0){
    p.spinT=CFG.SPIN_FRAMES;p.spinCd=CFG.SPIN_CD;S.spinId++;p.didSpin=true;SFX.spin();
    alertMsg('spin','PERIMETER SWEEP — the nunchuck hits everything around you. Use it when surrounded.');
  }

  // corrupted trails slow you
  trails.forEach(tr=>{ if(overlap(inset,tr)) p.slow=Math.max(p.slow,700); });

  if(tapped('KeyI')&&S.sector===2)doScan();
  if(S.scanT>0)S.scanT-=16.7;
  if(p.slow>0)p.slow-=16.7;
  if(p.inv>0)p.inv--;
  if(p.mfa>0){p.mfa-=16.7;if(p.mfa<=0){p.mfa=0;p.mfaGuard=false;}}
}
function spikeHit(){
  if(player.inv>0)return;
  damagePlayer(1);player.vy=-6.5;
  alertMsg('spike','INTRUSION SPIKES — watch the floor. Some hazards telegraph before they strike.');
}
function comboBurst(){
  const p=player;
  const cy=p.y+p.h/2;
  const centers=[p.face>0?p.x+p.w+22:p.x-22];
  void 0;
  if(p.mfa>0)centers.push(p.face>0?p.x-48:p.x+p.w+48);   // clone bursts behind you
  centers.forEach(cx=>{
    booms.push({x:cx,y:cy,r:CFG.COMBO_R,t:14,color:'#ffd75e'});
    entities.forEach(e=>{
      if(e.dead||!HITTABLE.has(e.type))return;
      const [ex,ey]=center(e);
      if(dist(cx,cy,ex,ey)<CFG.COMBO_R+Math.max(e.w,e.h)/2) hitEnemy(e,CFG.COMBO_DMG);
    });
  });
  shake=9;SFX.combo();
  alertMsg('combo','BUFFER OVERFLOW — three rapid strikes overflow into an area burst!');
}
function attackBoxes(){
  const p=player,boxes=[];
  if(p.atkT>0){
    boxes.push({x:p.face>0?p.x+p.w:p.x-36,y:p.y-6,w:36,h:p.h+10,dmg:CFG.SWORD_DMG});
    // MFA clone strikes your blind side at the same moment
    if(p.mfa>0){
      const cx=p.x-p.face*26;
      boxes.push({x:p.face>0?cx-36:cx+p.w,y:p.y-6,w:36,h:p.h+10,dmg:CFG.SWORD_DMG});
    }
  }
  return boxes;
}
function damagePlayer(n,envHit=false){
  const p=player;
  if(p.inv>0)return;
  if(p.mfaGuard&&!envHit){p.mfaGuard=false;p.mfa=0;p.inv=50;
    burst(p.x-p.face*15,p.y+p.h/2,'#ffd75e',14);
    alertMsg('mfaSave','YOUR MFA LAYER TOOK THE HIT — the factor is spent, but you\'re untouched. Defense in depth.',true);return;}
  p.hp-=n;p.inv=70;SFX.hurt();shake=Math.max(shake,5);
  burst(p.x+p.w/2,p.y+p.h/2,'#ff5d7a',10);
  if(p.hp<=0)endGame(false);
}

/* =====================================================================
   9. ENEMIES
   ===================================================================== */
const HITTABLE=new Set(['worm','big','boss','mite','sentry','crate','horse','dummy','charger']);
function wormCount(){return entities.filter(e=>!e.dead&&((e.type==='worm'&&!e.bossKin)||e.type==='big')).length;}
function kinCount(){return entities.filter(e=>!e.dead&&e.type==='worm'&&e.bossKin).length;}

function hitEnemy(e,dmg){
  if(e.type==='crate'){
    e.hp-=dmg;e.flash=5;
    burst(e.x+16,e.y+16,'#c98b4b',4);
    if(e.hp<=0)breakCrate(e);
    return;
  }
  if(e.type==='horse'){
    if(e.state==='hidden')return;              // untouchable while it hides in cargo
    e.hp-=dmg;e.flash=6;
    burst(...center(e),'#ffd75e',7);
    if(e.hp<=0){e.dead=true;SFX.boom();endGame(true);}
    return;
  }
  if(e.type==='charger')return;                 // trainer: cannot be destroyed, only blocked
  if(e.type==='dummy'){
    e.hp-=dmg;e.flash=6;burst(...center(e),'#35f0dc',7);
    if(e.hp<=0){e.dead=true;SFX.boom();burst(...center(e),'#35f0dc',12);}
    return;
  }
  if(e.type==='mite'||e.type==='sentry'){
    e.hp-=dmg;e.flash=6;
    burst(...center(e),e.type==='sentry'?'#c9a227':'#8f6cff',7);
    if(e.hp<=0){e.dead=true;S.wormsKilled++;SFX.boom();burst(...center(e),'#8f6cff',12);}
    return;
  }
  if(e.type==='boss'){
    if(e.state==='perch')return;                       // out of reach = untouchable
    if(S.frags<S.fragsTotal)dmg*=0.5;                  // encrypted shield halves damage
  }
  e.hp-=dmg;e.flash=6;
  burst(...center(e),e.type==='boss'?'#ffd75e':'#35f0dc',7);
  if(e.hp<=0){
    e.dead=true;SFX.boom();
    if(e.type==='worm'){S.wormsKilled++;if(boss&&boss.state==='perch')introKill();
      burst(...center(e),'#8f6cff',12);}
    if(e.type==='big'){S.wormsKilled++;
      burst(...center(e),'#8f6cff',18);shake=Math.max(shake,5);
      // containment side effect: bursts into minis (cap-respecting)
      const n=Math.min(CFG.BIG_BURST,CFG.WORM_CAP-wormCount());
      for(let i=0;i<n;i++){const m2=makeWorm(e.x+i*8,e.y+8,true);
        m2.vx=(i%2?1:-1)*1.6;m2.vy=-4;entities.push(m2);}
      if(n>0)alertMsg('bigburst','HEAVYWORM RUPTURED — it burst into copies. Finish the cleanup!',true);
      if(boss&&boss.state==='perch')introKill();
    }
    if(e.type==='boss')endGame(true);
  }
}
function introKill(){
  S.introKills++;
  if(S.introKills>=CFG.INTRO_KILLS&&boss&&boss.state==='perch'){
    boss.state='falling';SFX.slam();
    alertMsg('slam','MEGAWORM DESTABILIZED — it\'s coming down. STRIKE NOW!',true);
  }
}

function updateWorm(w){
  if(w.dormant){
    // asleep until the player gets close — its clocks start on wake
    if(dist(...center(w),...center(player))<CFG.WAKE_R){
      w.dormant=false;w.born=performance.now();
    }
    return;
  }
  if(w.stun>0){w.stun--;
    w.vy=Math.min(w.vy+CFG.GRAV,10);moveAndCollide(w);
    if(w.flash>0)w.flash--;
    if(w.y>levelH+60)w.dead=true;
    return;}
  const heading=w.vx||w.lastVx||1.4;
  w.hitWall=false;
  w.vy=Math.min(w.vy+CFG.GRAV,10);
  moveAndCollide(w);
  if(w.hitWall)w.vx=-heading;
  const age=performance.now()-w.born;
  const mutated=w.bossKin||age>CFG.HOP_AFTER_MS;   // kin hunt from birth
  if(!mutated){
    const aheadX=w.vx>0?w.x+w.w+2:w.x-2;
    if(w.grounded&&!solidAt(aheadX,w.y+w.h+4))w.vx*=-1;
  }else{
    // hopper: leaps toward the player, ignores ledges
    if(!w.bossKin)
      alertMsg('mut','WORM MUTATED — malware left alive gets more aggressive. It\'s hunting you now.');
    w.hopT--;
    if(w.grounded&&w.hopT<=0){
      w.hopT=80+Math.random()*40;
      w.vy=-7.4;w.vx=2.0*Math.sign(player.x-w.x||1);
    }
  }
  w.lastVx=w.vx||heading;
  if(w.y>levelH+60){w.dead=true;return;}
  // replication — every few seconds until the pool's cap
  const room=w.bossKin?kinCount()<CFG.KIN_CAP:wormCount()<CFG.WORM_CAP;
  const splitAt=w.bossKin?CFG.KIN_SPLIT_MS:CFG.WORM_SPLIT_MS;
  if(age>splitAt&&room){
    w.born=performance.now();
    const c2=makeWorm(w.x,w.y+4,true,w.bossKin);c2.vx=-(w.vx||1.4);entities.push(c2);
    SFX.split();burst(w.x+w.w/2,w.y,'#8f6cff',8);
    alertMsg('split','REPLICATION EVENT — worms copy themselves without any user action. Contain them!');
  }
  if(w.flash>0)w.flash--;
  if(overlap(w,player))tryHitPlayer(w,1);
}

function updateBig(b){
  if(b.stun>0){b.stun--;
    b.vy=Math.min(b.vy+CFG.GRAV,10);moveAndCollide(b);
    if(b.flash>0)b.flash--;
    if(b.y>levelH+60)b.dead=true;
    return;}
  const heading=b.vx||b.lastVx||0.9;
  b.hitWall=false;
  b.vy=Math.min(b.vy+CFG.GRAV,10);
  moveAndCollide(b);
  if(b.hitWall)b.vx=-heading;
  const aheadX=b.vx>0?b.x+b.w+2:b.x-2;
  if(b.grounded&&!solidAt(aheadX,b.y+b.h+4))b.vx*=-1;
  b.lastVx=b.vx||heading;
  if(b.y>levelH+60){b.dead=true;return;}
  // corrupted trail
  b.trailT--;
  if(b.grounded&&b.trailT<=0){
    b.trailT=CFG.TRAIL_EVERY;
    trails.push({x:b.x+b.w/2-14,y:b.y+b.h-6,w:28,h:10,t:CFG.TRAIL_MS});
    if(trails.length>40)trails.shift();
  }
  alertMsg('big','HEAVYWORM — it corrupts the ground behind it and ruptures into copies when killed.');
  if(b.flash>0)b.flash--;
  if(overlap(b,player))tryHitPlayer(b,1);
}

function tryHitPlayer(src,dmg){
  const p=player;
  const frontal=(src.x+src.w/2-(p.x+p.w/2))*p.face>0;
  if(p.shielding&&frontal&&p.shield>0){
    p.didBlock=true;
    if(p.hardT<=0)p.shield=Math.max(0,p.shield-CFG.BLOCK_COST);   // every bounce costs power
    burst(p.x+(p.face>0?p.w+6:-6),p.y+p.h/2,p.hardT>0?'#ffd75e':'#35f0dc',6);
    // the firewall REJECTS the packet: bounce the attacker (boss is too heavy)
    if(src.type!=='boss'){
      const k=p.hardT>0?CFG.KNOCK_HARD:CFG.KNOCK;
      src.vx=Math.sign(src.x+src.w/2-(p.x+p.w/2))*k;
      src.vy=-3.2; src.stun=p.hardT>0?26:18;
      SFX.block();
    }
    return;
  }
  damagePlayer(dmg);
}

/* ---------- boss ---------- */
function updateBoss(b){
  if(b.flash>0)b.flash--;
  b.phase=b.hp<=b.maxHp/2?2:1;

  if(b.state==='perch'){
    // hovering out of reach: rains minions + lobs globs until minions purged
    b.y+=Math.sin(performance.now()/300)*0.4;
    b.rainT-=16.7;
    if(b.rainT<=0){
      b.rainT=CFG.BOSS_RAIN_MS;
      if(kinCount()<CFG.KIN_CAP){
        const m=makeWorm(b.x+b.w/2,b.y+b.h,false,true);
        m.vx=-(1.5+Math.random()*2);m.vy=-5;entities.push(m);SFX.split();
      }
    }
    b.spitT-=16.7;
    if(b.spitT<=0){
      b.spitT=CFG.BOSS_SPIT_MS;
      const dx=player.x-(b.x+b.w/2);
      entities.push(makeGlob(b.x+b.w/2,b.y+b.h-8,Math.max(-4,Math.min(4,dx/90)),-2));
    }
    return;
  }
  if(b.state==='falling'){
    b.vy=Math.min(b.vy+CFG.GRAV,12);
    b.y+=b.vy;
    if(solidAt(b.x+b.w/2,b.y+b.h)){
      b.y=Math.floor((b.y+b.h)/T)*T-b.h-0.01;b.vy=0;b.state='fight';
      shake=12;SFX.slam();
      burst(b.x+b.w/2,b.y+b.h,'#ff5d7a',22);
      if(S.frags>=S.fragsTotal)
        alertMsg('shieldOff','PASSPHRASE COMPLETE — its encrypted shield is BROKEN. Full damage!',true);
      else
        alertMsg('shieldOn','ENCRYPTED SHIELD ACTIVE — without the full passphrase your hits do half damage.',true);
    }
    return;
  }

  // fight: pace, spit, spawn; phase 2 closes the walls
  b.vy=Math.min(b.vy+CFG.GRAV,10);
  b.hitWall=false;
  moveAndCollide(b);
  if(b.hitWall)b.vx=-b.vx||1.2;
  if(walls){
    if(b.x<walls.left+8){b.x=walls.left+8;b.vx=Math.abs(b.vx);}
    if(b.x+b.w>walls.right-8){b.x=walls.right-8-b.w;b.vx=-Math.abs(b.vx);}
  }
  b.spitT-=16.7*(b.phase===2?1.6:1);
  if(b.spitT<=0){
    b.spitT=CFG.BOSS_SPIT_MS;
    const dir=Math.sign(player.x-b.x)||1;
    for(let i=0;i<(b.phase===2?3:2);i++)
      entities.push(makeGlob(b.x+b.w/2,b.y+10,dir*(2+i*0.9),-6-i));
    SFX.spin();
  }
  b.spawnT-=16.7;
  if(b.spawnT<=0){
    b.spawnT=CFG.BOSS_SPAWN_MS;
    if(kinCount()<CFG.KIN_CAP){
      entities.push(makeWorm(b.x+b.w/2,b.y,false,true));SFX.split();
      alertMsg('bossSpawn','MEGAWORM IS PROPAGATING — purge minions before they replicate!');
    }
  }
  if(b.phase===2&&walls){
    alertMsg('walls','SEGMENTS COLLAPSING — the infection is squeezing your workspace. Finish it!');
    const minGap=13*T;
    if(walls.right-walls.left>minGap){walls.left+=0.08;walls.right-=0.08;}
  }
  if(overlap(b,player))tryHitPlayer(b,2);
}

/* ---------- globs: splash on any impact ---------- */
function explodeGlob(g){
  g.dead=true;
  booms.push({x:g.x+6,y:g.y+6,r:CFG.GLOB_SPLASH,t:12,color:'#8f6cff'});
  burst(g.x,g.y,'#8f6cff',8);
  const [px,py]=center(player);
  if(dist(g.x+6,g.y+6,px,py)<CFG.GLOB_SPLASH+10){
    const frontal=(g.x-(player.x+player.w/2))*player.face>0;
    if(player.shielding&&frontal){player.shield=Math.max(0,player.shield-6);}
    else{
      player.slow=CFG.SLOW_MS;damagePlayer(1);
      alertMsg('slow','PAYLOAD SPLASH — malware damages AND degrades performance. Keep your distance.');
    }
  }
}
function updateGlob(g){
  g.vy=Math.min(g.vy+CFG.GRAV,10);
  g.x+=g.vx;g.y+=g.vy;
  if(solidAt(g.x+g.w/2,g.y+g.h)||solidAt(g.x+g.w/2,g.y)||
     solidAt(g.x,g.y+g.h/2)||solidAt(g.x+g.w,g.y+g.h/2)){explodeGlob(g);return;}
  if(overlap(g,player)){explodeGlob(g);return;}
  if(g.y>levelH+60)g.dead=true;
}

/* ---------- retracting spikes ---------- */
const SPIKE_TOTAL=CFG.SPIKE_HIDE+CFG.SPIKE_WARN+CFG.SPIKE_OUT;
function rspikePhase(sp){
  const t=(performance.now()+sp.off)%SPIKE_TOTAL;
  if(t<CFG.SPIKE_HIDE)return'hide';
  if(t<CFG.SPIKE_HIDE+CFG.SPIKE_WARN)return'warn';
  return'out';
}
function updateRspike(sp){
  if(rspikePhase(sp)!=='out')return;
  const inset={x:player.x+4,y:player.y+6,w:player.w-8,h:player.h-6};
  if(overlap(inset,{x:sp.x+4,y:sp.y+10,w:T-8,h:T-10}))spikeHit();
}

/* =====================================================================
   10. PICKUPS
   ===================================================================== */
function updatePickup(e){
  e.bob+=0.06;
  const box={x:e.x,y:e.y+Math.sin(e.bob)*3,w:e.w,h:e.h};
  if(!overlap(box,player))return;
  e.dead=true;
  switch(e.kind){
    case'frag':S.frags++;SFX.pick();
      alertMsg('frag','PASSWORD FRAGMENT — collect all 10 to complete the passphrase and break the boss\'s encrypted shield.');
      if(S.frags===S.fragsTotal)
        alertMsg('fragAll','PASSPHRASE COMPLETE — the Megaworm\'s encrypted shield can now be broken!',true);
      break;
    case'key':S.keys++;SFX.key();
      alertMsg('key'+S.keys,`DECRYPTION KEY ${S.keys}/${S.keysTotal} — ${S.keys>=S.keysTotal?'the encrypted gate will now open!':'the gate needs the full keyring.'}`,true);
      break;
    case'shield':player.shield=CFG.SHIELD_MAX;player.hardT=CFG.HARD_MS;
      player.fwDown=false;SFX.pick();
      alertMsg('sp','HARDENED FIREWALL — reboot skipped, 8s of zero drain and heavy knockback. Patch deployed!',true);break;
    case'dossier':SFX.key();endGame(true);break;
    case'scan':player.scans=Math.min(CFG.SCAN_MAX,player.scans+1);SFX.pick();
      alertMsg('scanUp','SIGNATURE DATABASE UPDATED — +1 scan charge.',true);break;
    case'health':player.hp=Math.min(player.maxHp,player.hp+2);SFX.pick();
      alertMsg('hp','INTEGRITY PATCHED — +2 restored.',true);break;
    case'token':player.maxHp++;player.hp=player.maxHp;SFX.key();
      alertMsg('ai','AI TOKEN — automation extends your capacity. +1 max integrity.',true);break;
    case'mfa':player.mfa=CFG.MFA_MS;player.mfaGuard=true;SFX.key();
      alertMsg('mfa','MFA CLONE ACTIVE — it mirrors your attacks and will take the next hit for you.',true);break;
    case'folder':SFX.key();player.hp=Math.min(player.maxHp,player.hp+1);
      alertMsg('folder','HIDDEN FOLDER FOUND — attackers hide persistence below the surface. Nice hunting, analyst.',true);break;
  }
}

/* =====================================================================
   11. PARTICLES / FX
   ===================================================================== */
function burst(x,y,color,n){
  for(let i=0;i<n;i++)particles.push({x,y,vx:(Math.random()-.5)*5,
    vy:(Math.random()-.7)*5,t:20+Math.random()*14,color});
}
function updateFX(){
  particles.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.vy+=0.2;p.t--;});
  particles=particles.filter(p=>p.t>0);
  booms.forEach(b=>b.t--);booms=booms.filter(b=>b.t>0);
  trails.forEach(tr=>tr.t-=16.7);
  trails=trails.filter(tr=>tr.t>0);
  if(shake>0)shake*=0.85;
}

/* =====================================================================
   12. MAIN UPDATE
   ===================================================================== */
function update(){
  // movers first so their frame delta is ready for the player
  movers.forEach(m=>{
    m.t+=0.02;
    const off=Math.sin(m.t)*m.amp;
    const nx=m.axis==='x'?m.cx+off:m.cx, ny=m.axis==='y'?m.cy+off:m.cy;
    m.dx=nx-m.x;m.dy=ny-m.y;m.x=nx;m.y=ny;
  });

  updatePlayer();

  // keysword hits
  const boxes=attackBoxes();
  entities.forEach(e=>{
    if(e.dead||!HITTABLE.has(e.type))return;
    boxes.forEach(b=>{if(!b.used&&overlap(b,e)){b.used=true;hitEnemy(e,b.dmg);}});
  });
  // nunchuck spin ring
  if(player.spinT>0){
    const [px,py]=center(player);
    entities.forEach(e=>{
      if(e.dead||!HITTABLE.has(e.type))return;
      if(e.spinHit===S.spinId)return;
      const [ex,ey]=center(e);
      const d=dist(px,py,ex,ey);
      if(d>18&&d<CFG.SPIN_R+26){e.spinHit=S.spinId;
        hitEnemy(e,CFG.SPIN_DMG*(player.mfa>0?2:1));}   // clone spins too
    });
  }

  entities.forEach(e=>{
    if(e.dead)return;
    if(e.type==='worm')updateWorm(e);
    else if(e.type==='big')updateBig(e);
    else if(e.type==='boss')updateBoss(e);
    else if(e.type==='glob')updateGlob(e);
    else if(e.type==='pickup')updatePickup(e);
    else if(e.type==='rspike')updateRspike(e);
    else if(e.type==='horse')updateHorse(e);
    else if(e.type==='mite')updateMite(e);
    else if(e.type==='sentry')updateSentry(e);
    else if(e.type==='payload')updatePayload(e);
    else if(e.type==='package')updatePackage(e);
    else if(e.type==='dummy')updateDummy(e);
    else if(e.type==='charger')updateCharger(e);
    else if(e.type==='bossTrigger'){
      if(overlap(e,player)&&!boss){
        e.dead=true;
        if(S.sector===2){
          boss=makeHorse(130*T,12*T);
          entities.push(boss);
          alertMsg('horse','⚠ THE HORSE — it delivers crates instead of blows. Open them, or dodge them.',true);
          return;
        }
        // quarantine: the outbreak converges on its source (frees the fight's worm budget)
        entities.forEach(o=>{
          if((o.type==='worm'||o.type==='big')&&!o.dead){o.dead=true;burst(...center(o),'#8f6cff',8);}
        });
        boss=makeBoss(167*T,6*T-64-6);       // hovers just above the perch
        entities.push(boss);
        walls={left:152*T,right:178*T};
        alertMsg('boss','⚠ SECTOR QUARANTINED — the outbreak converges on its source. Purge its spawn to force it down!',true);
      }
    }
  });
  entities=entities.filter(e=>!e.dead);

  if(walls&&boss&&boss.state==='fight'){
    if(player.x<walls.left)player.x=walls.left;
    if(player.x+player.w>walls.right)player.x=walls.right-player.w;
  }

  updateDoors();updateTerminals();
  updateFX();

  const nearWorm=entities.find(e=>e.type==='worm'&&Math.abs(e.x-player.x)<420);
  if(nearWorm)alertMsg('worm','WORM DETECTED — self-replicating malware. If you leave it alive, it multiplies.');

  if(S.msgT>0)S.msgT--;

  camera.x+=(player.x+player.w/2-480-camera.x)*0.12;
  camera.y+=(player.y+player.h/2-280-camera.y)*0.10;
  camera.x=Math.max(0,Math.min(levelW-960,camera.x));
  camera.y=Math.max(0,Math.min(levelH-512,camera.y));

  S.elapsed=performance.now()-S.t0;
  for(const k in pressed)pressed[k]=false;
}

/* =====================================================================
   13. RENDER
   ===================================================================== */
function render(){
  // sky gradient — lighter than v1 so the hero pops
  const grad=ctx.createLinearGradient(0,0,0,512);
  grad.addColorStop(0,'#26386e');grad.addColorStop(1,'#141f4a');
  ctx.fillStyle=grad;ctx.fillRect(0,0,960,512);

  // circuit parallax
  ctx.save();
  const px=-camera.x*0.3,py=-camera.y*0.2;
  ctx.strokeStyle='rgba(53,240,220,0.09)';ctx.lineWidth=1;
  for(let i=0;i<14;i++){const y=((i*90+py)%600+600)%600-40;
    ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(960,y);ctx.stroke();}
  for(let i=0;i<20;i++){const x=((i*120+px)%1100+1100)%1100-60;
    ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,512);ctx.stroke();}
  ctx.restore();

  ctx.save();
  const sx=(Math.random()-.5)*shake, sy=(Math.random()-.5)*shake;
  ctx.translate(-Math.round(camera.x+sx),-Math.round(camera.y+sy));

  // tiles
  const c0=Math.floor(camera.x/T),c1=c0+32,r0=Math.floor(camera.y/T),r1=r0+18;
  for(let r=r0;r<=r1;r++)for(let c=c0;c<=c1;c++){
    const ch=tileAt(c,r);
    if(ch==='#'){
      ctx.fillStyle='#2c4184';ctx.fillRect(c*T,r*T,T,T);
      ctx.strokeStyle='rgba(140,180,255,0.16)';ctx.strokeRect(c*T+0.5,r*T+0.5,T-1,T-1);
      if(tileAt(c,r-1)!=='#'){ctx.fillStyle='#35f0dc';ctx.fillRect(c*T,r*T,T,3);}
    }
    if(ch==='^')drawSpike(c*T,r*T,1);
  }
  // retracting spikes
  entities.forEach(e=>{
    if(e.type!=='rspike')return;
    const ph=rspikePhase(e);
    if(ph==='warn')drawSpike(e.x,e.y,0.28,true);
    else if(ph==='out')drawSpike(e.x,e.y,1,true);
  });

  // gate
  if(gate&&S.keys<S.keysTotal){
    for(let r=3;r<=gate.bottom;r++){
      const gx=gate.col*T,gy=r*T;
      ctx.fillStyle='#221a44';ctx.fillRect(gx,gy,T,T);
      ctx.strokeStyle='#8f6cff';ctx.lineWidth=2;ctx.strokeRect(gx+3,gy+3,T-6,T-6);
      ctx.fillStyle='#8f6cff';ctx.font='15px "JetBrains Mono"';ctx.textAlign='center';
      ctx.fillText('🔒',gx+T/2,gy+T/2+6);ctx.textAlign='left';
    }
    ctx.fillStyle='#ffd75e';ctx.font='700 11px "Orbitron"';ctx.textAlign='center';
    ctx.fillText(`${S.keys}/${S.keysTotal} KEYS`,gate.col*T+T/2,2.6*T);ctx.textAlign='left';
  }

  // corrupted trails
  trails.forEach(tr=>{
    ctx.globalAlpha=Math.min(0.55,tr.t/2000);
    ctx.fillStyle='#8f6cff';
    ctx.beginPath();ctx.ellipse(tr.x+tr.w/2,tr.y+tr.h/2,tr.w/2,tr.h/2,0,0,7);ctx.fill();
    ctx.globalAlpha=1;
  });

  // movers
  movers.forEach(m=>{
    ctx.fillStyle='#2c4184';ctx.fillRect(m.x,m.y,m.w,m.h);
    ctx.fillStyle='#35f0dc';ctx.fillRect(m.x,m.y,m.w,3);
    ctx.fillStyle='rgba(53,240,220,0.5)';
    for(let i=0;i<3;i++)ctx.fillRect(m.x+8+i*((m.w-16)/2),m.y+m.h,3,4+Math.random()*3);
  });

  // closing walls
  if(walls&&boss&&boss.state==='fight'&&boss.phase===2){
    ctx.fillStyle='rgba(255,93,122,0.22)';
    ctx.fillRect(walls.left-40,0,40,levelH);ctx.fillRect(walls.right,0,40,levelH);
    ctx.fillStyle='#ff5d7a';
    ctx.fillRect(walls.left-3,0,3,levelH);ctx.fillRect(walls.right,0,3,levelH);
  }

  entities.forEach(e=>{
    if(e.type==='pickup')drawPickup(e);
    else if(e.type==='worm')drawWorm(e);
    else if(e.type==='big')drawBig(e);
    else if(e.type==='boss')drawBoss(e);
    else if(e.type==='glob'){ctx.fillStyle='#8f6cff';
      ctx.beginPath();ctx.arc(e.x+6,e.y+6,7,0,7);ctx.fill();}
    else if(e.type==='crate')drawCrate(e);
    else if(e.type==='dummy')drawDummy(e);
    else if(e.type==='charger')drawCharger(e);
    else if(e.type==='mite')drawMite(e);
    else if(e.type==='sentry')drawSentry(e);
    else if(e.type==='payload')drawPayload(e);
    else if(e.type==='package')drawPackage(e);
    else if(e.type==='horse')drawHorse(e);
  });

  // teaching layer: painted wall text, doors, terminals
  if(signs)signs.forEach(s=>{
    ctx.save();
    ctx.fillStyle='rgba(53,240,220,0.85)';
    ctx.font='700 13px "JetBrains Mono"';
    ctx.fillText(s.text,s.col*T,s.row*T+16);
    ctx.fillStyle='rgba(53,240,220,0.25)';
    ctx.fillRect(s.col*T,s.row*T+22,ctx.measureText(s.text).width,1);
    ctx.restore();
  });
  if(doors)doors.forEach(d=>{
    if(d.open)return;
    const x=d.col*T;
    for(let r=d.r0;r<=d.r1;r++){
      ctx.fillStyle='#1d2b5e';ctx.fillRect(x,r*T,T,T);
      ctx.strokeStyle='#35f0dc';ctx.lineWidth=2;ctx.strokeRect(x+3,r*T+3,T-6,T-6);
    }
    const lab={clear:'CLEAR THE ROOM',double:'DOUBLE JUMP',block:'BLOCK IT',
               spin:'USE THE SPIN',combo:'3-HIT COMBO',scan:'SCAN A CRATE',
               observe:'OBSERVING…',walk:''}[d.req]||'';
    if(lab){
      ctx.save();ctx.fillStyle='#ffd75e';ctx.font='700 10px "Orbitron"';ctx.textAlign='center';
      let txt=lab;
      if(d.req==='observe')txt=`OBSERVING… ${Math.max(0,Math.ceil((20000-S.obsT)/1000))}s`;
      ctx.fillText(txt,x+T/2,d.r0*T-8);ctx.restore();ctx.textAlign='left';
    }
  });
  if(terminals)terminals.forEach(t=>{
    const x=t.col*T,y=t.row*T;
    ctx.save();
    ctx.fillStyle=t.read?'#1d2b5e':'#24356f';ctx.fillRect(x+6,y+4,20,24);
    ctx.strokeStyle=t.read?'#35f0dc88':'#35f0dc';ctx.lineWidth=2;
    ctx.strokeRect(x+6,y+4,20,24);
    ctx.fillStyle=t.read?'#35f0dc88':'#ffd75e';
    ctx.font='700 11px "JetBrains Mono"';ctx.textAlign='center';
    ctx.fillText('i',x+16,y+21);
    if(S.nearTerm===t){
      ctx.fillStyle='#ffd75e';ctx.font='700 10px "Orbitron"';
      ctx.fillText('[F] READ',x+16,y-6);
    }
    ctx.textAlign='left';ctx.restore();
  });

  drawPlayer();

  booms.forEach(b=>{
    ctx.globalAlpha=b.t/14;
    ctx.strokeStyle=b.color;ctx.lineWidth=4;
    ctx.beginPath();ctx.arc(b.x,b.y,b.r*(1-(b.t/14))+b.r*0.3,0,7);ctx.stroke();
    ctx.globalAlpha=1;
  });
  particles.forEach(p=>{ctx.globalAlpha=Math.min(1,p.t/12);
    ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,3,3);});
  ctx.globalAlpha=1;
  ctx.restore();

  drawHUD();
}

function drawSpike(x,y,scale,retract=false){
  ctx.save();
  ctx.fillStyle=retract?'#ff5d7a':'#e0496a';
  const h=20*scale;
  for(let i=0;i<3;i++){
    const bx=x+3+i*9;
    ctx.beginPath();
    ctx.moveTo(bx,y+T);ctx.lineTo(bx+8,y+T);ctx.lineTo(bx+4,y+T-h);
    ctx.closePath();ctx.fill();
  }
  ctx.restore();
}

/* ---------- hero: visible limbs + walk cycle ---------- */
function drawPlayer(){
  const p=player;
  if(p.inv>0&&(p.inv>>2)%2===0)return;
  if(p.mfa>0){ctx.save();ctx.globalAlpha=0.45;
    drawHero(p.x-p.face*26,p.y,-p.face,p.walk,'#ffd75e');ctx.restore();}
  drawHero(p.x,p.y,p.face,p.walk,'#35f0dc');

  // keysword slash: an actual blade of keycaps + gold arc
  if(p.atkT>0){
    const dir=p.face,hx=dir>0?p.x+p.w-2:p.x+2,hy=p.y+13;
    ctx.save();
    ctx.strokeStyle='#ffd75e';ctx.lineWidth=3;ctx.shadowColor='#ffd75e';ctx.shadowBlur=10;
    ctx.beginPath();
    ctx.arc(hx,p.y+p.h/2,34,dir>0?-1.2:Math.PI-0.9,dir>0?0.9:Math.PI+1.2);
    ctx.stroke();
    ctx.shadowBlur=0;
    const word=p.word;
    for(let i=0;i<word.length;i++){
      const kx=hx+dir*(8+i*11)-5, ky=hy-4-i*7;
      ctx.fillStyle='#e8eefc';ctx.fillRect(kx,ky,11,11);
      ctx.strokeStyle='#26386e';ctx.lineWidth=1;ctx.strokeRect(kx+0.5,ky+0.5,10,10);
      ctx.fillStyle='#141f4a';ctx.font='700 8px "JetBrains Mono"';ctx.textAlign='center';
      ctx.fillText(word[i],kx+5.5,ky+8);
    }
    ctx.textAlign='left';
    // combo pips over the hero
    for(let i=0;i<3;i++){
      ctx.fillStyle=i<p.combo?'#ffd75e':'rgba(255,215,94,0.25)';
      ctx.fillRect(p.x+2+i*7,p.y-9,5,5);
    }
    ctx.restore();
  }
  // MFA clone mirrors the slash on your blind side
  if(p.atkT>0&&p.mfa>0){
    const dir=-p.face,ccx=p.x-p.face*26+11;
    ctx.save();ctx.globalAlpha=0.6;
    ctx.strokeStyle='#ffd75e';ctx.lineWidth=3;ctx.shadowColor='#ffd75e';ctx.shadowBlur=8;
    ctx.beginPath();
    ctx.arc(ccx+dir*11,p.y+p.h/2,34,dir>0?-1.2:Math.PI-0.9,dir>0?0.9:Math.PI+1.2);
    ctx.stroke();ctx.restore();
  }
  // nunchuck: mouse orbits a full circle on its cord (clone adds a second)
  if(p.spinT>0){
    const [cx,cy]=center(p);
    const a=(1-p.spinT/CFG.SPIN_FRAMES)*Math.PI*2*(p.face>0?1:-1)-Math.PI/2;
    const mice=p.mfa>0?[a,a+Math.PI]:[a];
    ctx.save();
    mice.forEach((ang,i)=>{
      const mx=cx+Math.cos(ang)*CFG.SPIN_R,my=cy+Math.sin(ang)*CFG.SPIN_R;
      ctx.globalAlpha=i===0?1:0.6;
      ctx.strokeStyle='rgba(53,240,220,0.35)';ctx.lineWidth=8;
      ctx.beginPath();ctx.arc(cx,cy,CFG.SPIN_R,ang-1.1,ang+0.1);ctx.stroke();
      ctx.strokeStyle='#9fb2dd';ctx.lineWidth=2;
      ctx.beginPath();ctx.moveTo(cx,cy);
      ctx.quadraticCurveTo((cx+mx)/2,(cy+my)/2-8,mx,my);ctx.stroke();
      ctx.fillStyle=i===0?'#e8eefc':'#ffd75e';
      ctx.beginPath();ctx.ellipse(mx,my,7,10,ang+Math.PI/2,0,7);ctx.fill();
      ctx.fillStyle='#141f4a';ctx.fillRect(mx-1,my-8,2,5);
    });
    ctx.restore();
  }
  // firewall shield
  if(p.shielding){
    const sx2=p.face>0?p.x+p.w+4:p.x-10;
    const col=p.hardT>0?'#ffd75e':'#35f0dc';
    ctx.save();
    ctx.fillStyle=col;ctx.shadowColor=col;ctx.shadowBlur=p.hardT>0?16:12;
    for(let i=0;i<5;i++)ctx.fillRect(sx2+((i%2)*2-1),p.y-4+i*8,6,6);
    ctx.restore();
  }
}
function drawHero(x,y,face,walk,trim){
  ctx.save();
  ctx.translate(x+11,y);ctx.scale(face,1);
  const leg=Math.sin(walk)*4;
  // legs (animated)
  ctx.strokeStyle='#8fa6d8';ctx.lineWidth=4;ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(-3,22);ctx.lineTo(-4+leg,30);ctx.stroke();
  ctx.beginPath();ctx.moveTo(3,22);ctx.lineTo(4-leg,30);ctx.stroke();
  // boots
  ctx.fillStyle='#c8d6f5';
  ctx.fillRect(-8+leg,28,7,4);ctx.fillRect(1-leg,28,7,4);
  // torso
  ctx.fillStyle='#3a568f';ctx.fillRect(-8,7,16,16);
  ctx.fillStyle=trim;ctx.fillRect(-8,7,16,3);
  // back arm
  ctx.strokeStyle='#8fa6d8';ctx.lineWidth=4;
  ctx.beginPath();ctx.moveTo(-6,11);ctx.lineTo(-9,17+Math.sin(walk+2)*2);ctx.stroke();
  // hood + face
  ctx.fillStyle='#3a568f';
  ctx.beginPath();ctx.arc(0,3,9,Math.PI,0);ctx.fill();
  ctx.fillRect(-9,3,18,4);
  ctx.fillStyle='#141f4a';ctx.fillRect(-6,0,12,6);
  ctx.fillStyle='#ffd75e';ctx.fillRect(0,1,7,4);     // visor
  // front arm (holds gear)
  ctx.strokeStyle='#c8d6f5';ctx.lineWidth=4;
  ctx.beginPath();ctx.moveTo(6,11);ctx.lineTo(10,16+Math.sin(walk)*2);ctx.stroke();
  ctx.restore();
}
function drawWorm(w){
  ctx.save();
  if(w.dormant)ctx.globalAlpha=0.45;
  const flash=w.flash>0;
  const age=w.dormant?0:performance.now()-w.born;
  const mutated=age>CFG.HOP_AFTER_MS;
  for(let i=2;i>=0;i--){
    ctx.fillStyle=flash?'#ffffff'
      :w.bossKin?(i===0?'#ff7bb0':'#f0559f')
      :(mutated?(i===0?'#c46bff':'#a24df0'):(i===0?'#a88bff':'#8f6cff'));
    ctx.beginPath();ctx.arc(w.x+6+i*8,w.y+10,8-i*1.2,0,7);ctx.fill();
  }
  ctx.fillStyle=w.dormant?'#5a6a99':'#ff5d7a';
  const ex=w.vx>0?w.x+18:w.x+2;
  ctx.fillRect(ex,w.y+6,mutated?6:4,mutated?6:4);
  if(!w.dormant&&age>(w.bossKin?CFG.KIN_SPLIT_MS:CFG.WORM_SPLIT_MS)-1400&&(w.bossKin?kinCount()<CFG.KIN_CAP:wormCount()<CFG.WORM_CAP)){
    ctx.globalAlpha=0.5+0.5*Math.sin(performance.now()/80);
    ctx.strokeStyle='#ff5d7a';ctx.lineWidth=2;
    ctx.strokeRect(w.x-3,w.y-3,w.w+6,w.h+6);
  }
  ctx.restore();
}
function drawBig(b){
  ctx.save();
  const flash=b.flash>0;
  for(let i=3;i>=0;i--){
    ctx.fillStyle=flash?'#fff':(i===0?'#b58bff':'#7a4de0');
    ctx.beginPath();ctx.arc(b.x+9+i*9,b.y+14,12-i*1.4,0,7);ctx.fill();
  }
  ctx.fillStyle='#ff5d7a';
  ctx.fillRect(b.vx>0?b.x+30:b.x+2,b.y+8,6,6);
  // drip
  ctx.fillStyle='rgba(143,108,255,0.6)';
  ctx.beginPath();ctx.arc(b.x+b.w/2,b.y+b.h+2,3+Math.sin(performance.now()/200)*2,0,7);ctx.fill();
  ctx.restore();
}
function drawBoss(b){
  ctx.save();
  const flash=b.flash>0;
  for(let i=4;i>=0;i--){
    ctx.fillStyle=flash?'#fff':(i===0?'#b58bff':'#6a48f0');
    ctx.beginPath();
    ctx.arc(b.x+b.w/2+Math.sin(performance.now()/300+i)*8,b.y+b.h-10-i*12,26-i*2.5,0,7);
    ctx.fill();
  }
  ctx.fillStyle='#141f4a';
  ctx.beginPath();ctx.arc(b.x+b.w/2,b.y+8,12,0,Math.PI);ctx.fill();
  ctx.fillStyle='#ff5d7a';
  ctx.fillRect(b.x+b.w/2-16,b.y-2,8,6);ctx.fillRect(b.x+b.w/2+8,b.y-2,8,6);
  // encrypted shield shimmer (until all fragments collected)
  if(S.frags<S.fragsTotal&&b.state!=='perch'){
    ctx.globalAlpha=0.35+0.15*Math.sin(performance.now()/150);
    ctx.strokeStyle='#ffd75e';ctx.lineWidth=3;
    ctx.beginPath();ctx.arc(b.x+b.w/2,b.y+b.h/2,56,0,7);ctx.stroke();
    ctx.font='10px "JetBrains Mono"';ctx.fillStyle='#ffd75e';ctx.textAlign='center';
    ctx.fillText('🔒',b.x+b.w/2,b.y-14);ctx.textAlign='left';
    ctx.globalAlpha=1;
  }
  if(b.state==='perch'){
    ctx.globalAlpha=0.5;
    ctx.strokeStyle='#8f6cff';ctx.lineWidth=2;
    ctx.setLineDash([4,4]);
    ctx.beginPath();ctx.arc(b.x+b.w/2,b.y+b.h/2,60,0,7);ctx.stroke();
    ctx.setLineDash([]);ctx.globalAlpha=1;
  }
  ctx.restore();
}
function drawPickup(e){
  const y=e.y+Math.sin(e.bob)*3;
  ctx.save();ctx.textAlign='center';ctx.font='15px "JetBrains Mono"';
  ctx.shadowBlur=10;
  ctx.shadowColor=(e.kind==='frag'||e.kind==='key')?'#ffd75e':'#35f0dc';
  if(e.kind==='frag'){
    ctx.fillStyle='#ffd75e';ctx.fillRect(e.x+4,y+4,10,10);
    ctx.fillStyle='#141f4a';ctx.font='9px "JetBrains Mono"';ctx.fillText('*',e.x+9,y+12);
  }else{
    const glyph={key:'🗝️',shield:'🛡️',token:'🤖',mfa:'✌️',folder:'📁',health:'✚'}[e.kind];
    ctx.fillText(glyph,e.x+9,y+15);
  }
  ctx.restore();
}


function drawCrate(c){
  // tremble is the tell: the boss crate can't hold still
  let ox=0,oy=0;
  if(c.content==='boss'){
    ox=Math.sin(performance.now()/47)*1.4;
    oy=Math.cos(performance.now()/61)*1.1;
  }
  const x=c.x+ox,y=c.y+oy;
  ctx.save();
  ctx.fillStyle=c.flash>0?'#fff':'#8a5a2b';
  ctx.fillRect(x+1,y+1,T-2,T-2);
  ctx.fillStyle=c.flash>0?'#fff':'#c98b4b';
  ctx.fillRect(x+3,y+3,T-6,T-6);
  ctx.strokeStyle='#5c3a1a';ctx.lineWidth=2;
  ctx.strokeRect(x+3,y+3,T-6,T-6);
  ctx.beginPath();ctx.moveTo(x+3,y+3);ctx.lineTo(x+T-3,y+T-3);
  ctx.moveTo(x+T-3,y+3);ctx.lineTo(x+3,y+T-3);ctx.stroke();
  // damage cracks
  if(c.hp<CFG.CRATE_HP){
    ctx.strokeStyle='rgba(30,15,0,0.6)';ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(x+8,y+6);ctx.lineTo(x+14,y+16);ctx.lineTo(x+9,y+26);ctx.stroke();
  }
  // scan reveal
  if(S.scanT>0&&dist(S.scanX,S.scanY,c.x+16,c.y+16)<CFG.SCAN_R){
    const g={empty:['·','#9fb2dd'],frag:['*','#ffd75e'],enemy:['!','#ff5d7a'],
             payload:['◔','#ff5d7a'],powerup:['+','#35f0dc'],boss:['★','#ffd75e']}[c.content];
    ctx.globalAlpha=Math.min(1,S.scanT/400);
    ctx.fillStyle='rgba(13,21,48,0.75)';ctx.fillRect(x+6,y+6,T-12,T-12);
    ctx.fillStyle=g[1];ctx.font='700 16px "JetBrains Mono"';ctx.textAlign='center';
    ctx.fillText(g[0],x+T/2,y+T/2+6);ctx.textAlign='left';ctx.globalAlpha=1;
  }
  ctx.restore();
}
function drawMite(m){
  ctx.save();
  ctx.fillStyle=m.flash>0?'#fff':'#a24df0';
  ctx.beginPath();ctx.arc(m.x+9,m.y+7,8,0,7);ctx.fill();
  ctx.fillStyle='#ff5d7a';
  ctx.fillRect(m.vx>0?m.x+11:m.x+3,m.y+4,4,4);
  ctx.strokeStyle='#a24df0';ctx.lineWidth=2;
  for(let i=-1;i<2;i+=2){
    ctx.beginPath();ctx.moveTo(m.x+9,m.y+12);ctx.lineTo(m.x+9+i*7,m.y+16);ctx.stroke();
  }
  ctx.restore();
}
function drawSentry(s){
  ctx.save();
  const lit=s.moving;
  ctx.fillStyle=s.flash>0?'#fff':(lit?'#d8b048':'#8a7a52');
  ctx.fillRect(s.x+4,s.y+10,18,24);           // body
  ctx.beginPath();ctx.arc(s.x+13,s.y+9,8,0,7);ctx.fill();   // head
  ctx.fillStyle=lit?'#ff5d7a':'#5d5238';      // eyes wake up when unwatched
  ctx.fillRect(s.x+8,s.y+7,4,3);ctx.fillRect(s.x+15,s.y+7,4,3);
  ctx.fillStyle=s.flash>0?'#fff':(lit?'#b8912f':'#6f6242');
  ctx.fillRect(s.x,s.y+32,26,4);              // plinth
  if(!lit){                                    // dormant sheen
    ctx.globalAlpha=0.25;ctx.fillStyle='#fff';
    ctx.fillRect(s.x+6,s.y+12,3,18);ctx.globalAlpha=1;
  }
  ctx.restore();
}
function drawPayload(p){
  const urgent=p.t<1200;
  const pulse=0.5+0.5*Math.sin(performance.now()/(urgent?60:150));
  ctx.save();
  ctx.fillStyle='#2b2b3d';
  ctx.beginPath();ctx.arc(p.x+7,p.y+7,8,0,7);ctx.fill();
  ctx.fillStyle=`rgba(255,93,122,${0.4+0.6*pulse})`;
  ctx.beginPath();ctx.arc(p.x+7,p.y+7,4.5,0,7);ctx.fill();
  ctx.strokeStyle='#ff5d7a';ctx.lineWidth=1.5;ctx.globalAlpha=0.6*pulse;
  ctx.beginPath();ctx.arc(p.x+7,p.y+7,13,0,7);ctx.stroke();
  ctx.globalAlpha=1;
  ctx.fillStyle='#e8eefc';ctx.font='700 9px "JetBrains Mono"';ctx.textAlign='center';
  ctx.fillText(Math.ceil(p.t/1000),p.x+7,p.y-8);ctx.textAlign='left';
  ctx.restore();
}
function drawPackage(e){
  const y=e.y+Math.sin(e.bob)*2;
  ctx.save();
  ctx.fillStyle='#c98b4b';ctx.fillRect(e.x,y,26,26);
  ctx.fillStyle='#ffd75e';ctx.fillRect(e.x+10,y,6,26);ctx.fillRect(e.x,y+10,26,6);
  ctx.strokeStyle='#ffd75e';ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(e.x+13,y);ctx.lineTo(e.x+8,y-7);
  ctx.moveTo(e.x+13,y);ctx.lineTo(e.x+18,y-7);ctx.stroke();
  ctx.shadowColor='#ffd75e';ctx.shadowBlur=12;ctx.strokeRect(e.x,y,26,26);
  ctx.restore();
}
function drawHorse(b){
  if(b.state==='hidden')return;
  ctx.save();
  const flash=b.flash>0;
  const f=b.vx>0?1:-1;
  ctx.translate(b.x+b.w/2,b.y);ctx.scale(f,1);
  ctx.fillStyle=flash?'#fff':'#8a5a2b';
  ctx.fillRect(-40,26,78,34);                        // plank body
  ctx.fillStyle=flash?'#fff':'#c98b4b';
  ctx.fillRect(-36,30,70,26);
  ctx.strokeStyle='#5c3a1a';ctx.lineWidth=2;
  for(let i=-30;i<34;i+=13){ctx.beginPath();ctx.moveTo(i,30);ctx.lineTo(i,56);ctx.stroke();}
  ctx.fillStyle=flash?'#fff':'#a06a33';              // neck + head
  ctx.fillRect(20,-4,20,34);
  ctx.fillRect(30,-12,30,18);
  ctx.fillStyle='#5c3a1a';ctx.fillRect(46,-12,6,10);ctx.fillRect(36,-18,5,8);
  ctx.fillStyle='#ff5d7a';ctx.fillRect(44,-6,7,5);   // burning eye
  ctx.fillStyle=flash?'#fff':'#8a5a2b';              // legs
  ctx.fillRect(-32,56,12,20);ctx.fillRect(-12,56,12,20);
  ctx.fillRect(8,56,12,20);ctx.fillRect(26,56,12,20);
  // hatch in the belly — where the cargo comes from
  ctx.fillStyle='#3a2410';ctx.fillRect(-16,48,26,10);
  ctx.restore();
}


function drawDummy(d){
  ctx.save();
  ctx.fillStyle=d.flash>0?'#fff':(d.tough?'#3f5aa8':'#33477f');
  ctx.fillRect(d.x+2,d.y+6,20,26);
  ctx.fillStyle=d.flash>0?'#fff':'#5b76c4';
  ctx.beginPath();ctx.arc(d.x+12,d.y+6,8,Math.PI,0);ctx.fill();
  ctx.fillStyle='#9fb2dd';
  ctx.fillRect(d.x+6,d.y+12,12,3);ctx.fillRect(d.x+6,d.y+20,12,3);
  ctx.fillStyle='#141f4a';ctx.fillRect(d.x,d.y+32,24,3);
  if(d.tough){ctx.strokeStyle='#ffd75e';ctx.lineWidth=2;
    ctx.strokeRect(d.x+1,d.y+5,22,28);}
  ctx.restore();
}
function drawCharger(c){
  ctx.save();
  ctx.fillStyle='#4a5f9e';
  ctx.beginPath();ctx.ellipse(c.x+13,c.y+10,13,10,0,0,7);ctx.fill();
  ctx.fillStyle='#ffd75e';
  ctx.fillRect(c.vx>0?c.x+18:c.x+4,c.y+6,5,5);
  ctx.strokeStyle='#9fb2dd';ctx.lineWidth=2;
  ctx.beginPath();ctx.arc(c.x+13,c.y+10,17,0,7);ctx.stroke();
  ctx.restore();
}

function drawHUD(){
  ctx.save();
  ctx.font='700 13px "JetBrains Mono"';
  for(let i=0;i<player.maxHp;i++){
    ctx.fillStyle=i<player.hp?'#35f0dc':'rgba(53,240,220,0.15)';
    ctx.fillRect(14+i*18,14,13,13);
    ctx.strokeStyle='rgba(53,240,220,0.5)';ctx.strokeRect(14+i*18,14,13,13);
  }
  ctx.fillStyle='#9fb2dd';ctx.fillText('INTEGRITY',14,42);
  ctx.fillStyle='rgba(53,240,220,0.15)';ctx.fillRect(14,50,120,8);
  ctx.fillStyle=player.fwDown
    ?`rgba(255,93,122,${0.5+0.4*Math.sin(performance.now()/120)})`
    :(player.hardT>0?'#ffd75e':(player.shield>25?'#35f0dc':'#ff5d7a'));
  ctx.fillRect(14,50,120*player.shield/CFG.SHIELD_MAX,8);
  ctx.fillStyle=player.fwDown?'#ff5d7a':'#9fb2dd';
  ctx.fillText(player.fwDown?'FW REBOOTING…':'FIREWALL',14,72);
  // combo pips
  for(let i=0;i<3;i++){
    ctx.fillStyle=i<player.combo?'#ffd75e':'rgba(255,215,94,0.2)';
    ctx.fillRect(14+i*12,80,8,8);
  }
  ctx.fillStyle='#9fb2dd';ctx.fillText('COMBO',52,88);

  ctx.fillStyle='#ffd75e';
  ctx.fillText(CUR.id+' · '+CUR.name.toUpperCase(),14,100);
  ctx.fillText(`FRAGMENTS ${S.frags}/${S.fragsTotal}`,772,24);
  if(S.keysTotal>0)ctx.fillText(`KEYS ${S.keys}/${S.keysTotal}`,772,44);
  ctx.fillStyle='#ffd75e';
  if(player.mfa>0)ctx.fillText(`MFA CLONE ${Math.ceil(player.mfa/1000)}s`,772,64);
  if(player.hardT>0)ctx.fillText(`HARD FW ${Math.ceil(player.hardT/1000)}s`,772,84);

  if(S.sector===2){
    ctx.fillStyle=player.scans>0?'#35f0dc':'#ff5d7a';
    ctx.fillText(`SCANS ${player.scans}  [I]`,772,44);
  }
  if(boss&&!boss.dead){
    ctx.fillStyle='rgba(255,93,122,0.2)';ctx.fillRect(280,18,400,12);
    ctx.fillStyle='#ff5d7a';ctx.fillRect(280,18,400*boss.hp/boss.maxHp,12);
    ctx.fillStyle='#e8eefc';ctx.font='700 11px "Orbitron"';ctx.textAlign='center';
    let tag;
    if(boss.type==='horse')
      tag=boss.state==='hidden'?'THE HORSE · HIDING IN ITS CARGO · FIND THE TREMBLING CRATE':'THE HORSE';
    else tag=boss.state==='perch'
      ?`MEGAWORM · OUT OF REACH · PURGE ${Math.max(0,CFG.INTRO_KILLS-S.introKills)} MINIONS`
      :(S.frags<S.fragsTotal?'MEGAWORM · 🔒 ENCRYPTED SHIELD':'MEGAWORM');
    ctx.fillText(tag,480,44);ctx.textAlign='left';
  }
  // scan pulse
  if(S.scanT>0){
    ctx.save();ctx.globalAlpha=Math.min(0.5,S.scanT/2600);
    ctx.strokeStyle='#35f0dc';ctx.lineWidth=2;
    ctx.beginPath();
    ctx.arc(S.scanX-camera.x,S.scanY-camera.y,CFG.SCAN_R*(1.05-S.scanT/CFG.SCAN_MS*0.25),0,7);
    ctx.stroke();ctx.restore();
  }
  if(S.msg&&S.msgT>0){
    ctx.globalAlpha=Math.min(1,S.msgT/30);
    ctx.fillStyle='rgba(13,21,48,0.92)';ctx.fillRect(60,452,840,44);
    ctx.strokeStyle='#ffd75e';ctx.lineWidth=1.5;ctx.strokeRect(60,452,840,44);
    ctx.fillStyle='#ffd75e';ctx.font='700 11px "Orbitron"';ctx.fillText('SOC ALERT',74,470);
    ctx.fillStyle='#e8eefc';ctx.font='13px "JetBrains Mono"';ctx.fillText(S.msg,74,488);
    ctx.globalAlpha=1;
  }
  ctx.restore();
}


/* =====================================================================
   12b. TRAINERS & THE TEACHING LAYER (Proving Ground levels)
   ===================================================================== */
function makeDummy(x,y,tough){return{type:'dummy',x:x+4,y:y-2,w:24,h:32,vx:0,vy:0,
  hp:tough?7:2,tough,flash:0,spinHit:-1};}   // tough needs the combo burst to fall
function updateDummy(d){
  d.vy=Math.min(d.vy+CFG.GRAV,10);moveAndCollide(d);
  if(d.flash>0)d.flash--;
}
function makeCharger(x,y){return{type:'charger',x,y:y-2,w:26,h:20,vx:0,vy:0,
  hp:9999,flash:0,spinHit:-1};}              // unkillable: it exists to be blocked
function updateCharger(c){
  c.vy=Math.min(c.vy+CFG.GRAV,10);
  c.vx=1.9*Math.sign(player.x-c.x||1);
  moveAndCollide(c);
  if(overlap(c,player)){tryHitPlayer(c,1);c.vx=-c.vx;}
}
function updateDoors(){
  if(!doors)return;
  for(const d of doors){
    if(d.open)continue;
    let ok=true;
    for(const part of String(d.req).split('&')){ if(!reqMet(part,d)){ok=false;break;} }
    if(ok){
      d.open=true;
      burst(d.col*T+16,(d.r0+d.r1)/2*T+16,'#35f0dc',16);SFX.key();
      if(String(d.req).includes('observe'))
        alertMsg('obs','CONTAINMENT BREACHED — that is twenty seconds of unchecked replication. Clean it up.',true);
    }
  }
}
function reqMet(req,d){
    let ok=false;
    switch(req){
      case'walk':ok=true;break;
      case'clear':ok=!entities.some(e=>!e.dead&&(e.type==='dummy'||e.type==='worm'||
                     e.type==='mite'||e.type==='crate'||e.type==='sentry')&&e.x<d.col*T);break;
      case'double':ok=player.didDouble;break;
      case'block':ok=player.didBlock;break;
      case'spin':ok=player.didSpin;break;
      case'combo':ok=player.didCombo;break;
      case'scan':ok=player.didScan;break;
      case'observe':{
        const near=Math.abs(player.x-d.col*T)<430;   // clock runs only while you're at the glass
        if(near)S.obsT+=16.7;
        ok=S.obsT>20000;
        break;}
    }
    return ok;
}
function updateTerminals(){
  const near=terminals.find(t=>
    Math.abs(t.col*T+16-(player.x+player.w/2))<44&&
    Math.abs(t.row*T+16-(player.y+player.h/2))<52);
  S.nearTerm=near||null;
  if(near&&tapped('KeyF')){
    near.read=true;S.termOpen=near;S.mode='terminal';
    $('termTitle').textContent=near.title;
    $('termBody').textContent=near.body;
    $('terminalScreen').classList.remove('hidden');
    SFX.key();
  }
}

/* =====================================================================
   13b. LEVEL 2 — TROJAN SYSTEMS
   Everything here shares one idea: the threat is inside something that
   looks harmless. Crates, gifts, statues. You have to open it to know.
   ===================================================================== */
const CRATE_ROLL=['empty','empty','frag','enemy','enemy','payload','powerup','empty','frag','enemy'];
function addCrate(col,row,content){
  if(content==='roll')content=CRATE_ROLL[Math.floor(Math.random()*CRATE_ROLL.length)];
  const c={type:'crate',x:col*T,y:row*T,w:T,h:T,hp:CFG.CRATE_HP,content,col,row,flash:0,spinHit:-1};
  crateGrid.add(col+','+row);
  if(content==='frag')S.fragsTotal++;
  entities.push(c);
  return c;
}
function crateFloorRow(col){                     // first solid row under a column
  for(let r=0;r<MAP.length;r++) if(tileAt(col,r)==='#') return r-1;
  return -1;
}
function breakCrate(c){
  c.dead=true;crateGrid.delete(c.col+','+c.row);
  burst(c.x+16,c.y+16,'#c98b4b',14);shake=Math.max(shake,4);SFX.boom();
  switch(c.content){
    case'frag':entities.push(makePickup('frag',c.x+7,c.y+7));break;
    case'powerup':{
      const k=['mfa','shield','health','scan'][Math.floor(Math.random()*4)];
      entities.push(makePickup(k,c.x+7,c.y+7));
      alertMsg('cratePow','SUPPLY CRATE — not every container is a threat. But you only knew by opening it.');
      break;}
    case'payload':
      entities.push({type:'payload',x:c.x+10,y:c.y+10,w:14,h:14,vx:0,vy:-3,t:CFG.PAYLOAD_MS});
      alertMsg('payload','TICKING PAYLOAD — the crate was only the delivery vehicle. Spin (K) to bat it away!');
      break;
    case'enemy':{
      const n=Math.min(3,CFG.MITE_CAP-miteCount());
      for(let i=0;i<n;i++){
        const m=makeMite(c.x+i*6,c.y);
        m.vx=(i-1)*2.4;m.vy=-7-Math.random()*2;entities.push(m);
      }
      alertMsg('crateEnemy','AMBUSH — the container was the disguise. That is a Trojan: harmless shell, hostile cargo.');
      break;}
    case'boss':releaseHorse(c);break;
  }
}
function makeMite(x,y){return{type:'mite',x,y,w:18,h:14,vx:0,vy:0,hp:CFG.MITE_HP,
  hopT:20+Math.random()*40,flash:0,stun:0,spinHit:-1};}
function updateMite(m){
  if(m.stun>0){m.stun--;m.vy=Math.min(m.vy+CFG.GRAV,10);moveAndCollide(m);return;}
  m.vy=Math.min(m.vy+CFG.GRAV,10);
  m.hitWall=false;moveAndCollide(m);
  if(m.grounded){
    m.hopT--;
    if(m.hopT<=0){m.hopT=34+Math.random()*26;m.vy=-6.6;m.vx=2.3*Math.sign(player.x-m.x||1);}
    else m.vx*=0.86;
  }
  if(m.flash>0)m.flash--;
  if(m.y>levelH+60){m.dead=true;return;}
  if(overlap(m,player))tryHitPlayer(m,1);
}
function miteCount(){return entities.filter(e=>!e.dead&&e.type==='mite').length;}

/* --- Sentry: a statue that only moves when you look away --- */
function makeSentry(x,y){return{type:'sentry',x,y:y-2,w:26,h:34,vx:0,vy:0,
  hp:CFG.SENTRY_HP,flash:0,stun:0,moving:false,spinHit:-1};}
function updateSentry(s){
  s.vy=Math.min(s.vy+CFG.GRAV,10);
  if(s.stun>0){s.stun--;s.moving=false;moveAndCollide(s);return;}
  // "watched" = the player is facing toward it
  const toward=Math.sign(s.x+s.w/2-(player.x+player.w/2))||1;
  const watched=toward===player.face;
  s.moving=!watched;
  s.vx=watched?0:-toward*CFG.SENTRY_SPD;
  moveAndCollide(s);
  if(s.moving&&s.grounded&&s.hitWall)s.vy=-7.2;     // hop obstacles while unwatched
  if(s.flash>0)s.flash--;
  if(!watched)alertMsg('sentry','BRONZE SENTRY — it only moves when you are not looking. Trojans stay inert while observed.');
  if(overlap(s,player))tryHitPlayer(s,2);
}

/* --- Ticking payload: batted by the nunchuck spin --- */
function updatePayload(p){
  p.t-=16.7;
  p.vy=Math.min(p.vy+CFG.GRAV,10);
  p.hitWall=false;moveAndCollide(p);
  if(p.grounded)p.vx*=0.9;
  // spin knocks it away instead of detonating on you
  if(player.spinT>0&&p.spinHit!==S.spinId){
    const d=dist(...center(p),...center(player));
    if(d<CFG.SPIN_R+22){
      p.spinHit=S.spinId;
      p.vx=Math.sign(p.x-player.x||1)*9;p.vy=-5;
      SFX.block();
      alertMsg('batted','PAYLOAD DEFLECTED — quarantined before detonation. Good response time.',true);
    }
  }
  if(p.t<=0)detonate(p);
}
function detonate(p){
  p.dead=true;
  booms.push({x:p.x+7,y:p.y+7,r:CFG.PAYLOAD_R,t:14,color:'#ff5d7a'});
  burst(p.x,p.y,'#ff5d7a',18);shake=Math.max(shake,10);SFX.slam();
  const [px,py]=center(player);
  if(dist(p.x+7,p.y+7,px,py)<CFG.PAYLOAD_R+10)damagePlayer(2);
  entities.forEach(e=>{                      // payloads hurt their own side too
    if(e.dead||e===p)return;
    if(e.type==='mite'||e.type==='sentry'){
      if(dist(p.x+7,p.y+7,...center(e))<CFG.PAYLOAD_R+10)hitEnemy(e,3);
    }
    if(e.type==='crate'&&dist(p.x+7,p.y+7,...center(e))<CFG.PAYLOAD_R)hitEnemy(e,2);
  });
}

/* --- Gift packages: the invitation beat --- */
function updatePackage(e){
  e.bob+=0.05;
  const box={x:e.x,y:e.y+Math.sin(e.bob)*2,w:e.w,h:e.h};
  if(!overlap(box,player))return;
  e.dead=true;
  burst(e.x+13,e.y+13,'#ffd75e',16);
  if(e.idx===0){
    player.mfa=CFG.MFA_MS;player.mfaGuard=true;SFX.key();
    alertMsg('gift1','DELIVERY ACCEPTED — a genuine gift. MFA online. Now you trust packages, don\'t you?',true);
  }else{
    SFX.slam();shake=Math.max(shake,8);
    const n=Math.min(3,CFG.MITE_CAP-miteCount());
    for(let i=0;i<n;i++){const m=makeMite(e.x+i*7,e.y);
      m.vx=(i-1)*2.6;m.vy=-7.5;entities.push(m);}
    alertMsg('gift2','TROJAN DELIVERED — it never broke in. You carried it inside. That is the whole trick.',true);
  }
}

/* --- Signature scan: limited-charge reveal --- */
function doScan(){
  if(player.scans<=0){alertMsg('noscan','NO SIGNATURES LEFT — find another database update.',true);return;}
  player.scans--;player.didScan=true;
  [S.scanX,S.scanY]=center(player);
  S.scanT=CFG.SCAN_MS;
  SFX.key();
  alertMsg('scan','SIGNATURE SCAN — contents revealed nearby. Detection is finite: spend it where it counts.');
}

/* --- The Horse: hides inside its own supply chain --- */
function makeHorse(x,y){return{type:'horse',x,y,w:96,h:76,vx:1.6,vy:0,
  hp:CFG.HORSE_HP,maxHp:CFG.HORSE_HP,state:'fight',launchT:CFG.HORSE_LAUNCH_MS,
  nextGate:0.75,flash:0,spinHit:-1};}
function horseArena(){return{left:104*T,right:146*T};}
function launchCrate(hx){
  const a=horseArena();
  const col=Math.floor((a.left+Math.random()*(a.right-a.left))/T);
  const row=crateFloorRow(col);
  if(row<1)return null;
  if(crateGrid.has(col+','+row))return null;
  // 10% supply, otherwise 0-3 hostiles
  const roll=Math.random();
  let content='empty';
  if(roll<0.10)content='powerup';
  else if(roll<0.75)content='enemy';
  const c=addCrate(col,row,content);
  burst(c.x+16,c.y+16,'#c98b4b',6);
  return c;
}
function startHideWave(b){
  b.state='hidden';
  b.flash=0;
  const a=horseArena();
  const cols=[];
  for(let i=0;i<CFG.HORSE_WAVE_CRATES;i++){
    const col=Math.floor((a.left+ (i+0.5)*(a.right-a.left)/CFG.HORSE_WAVE_CRATES)/T);
    const row=crateFloorRow(col);
    if(row>0&&!crateGrid.has(col+','+row))cols.push([col,row]);
  }
  // half hostile, one hides the boss — that one trembles
  const bossIdx=Math.floor(Math.random()*cols.length);
  cols.forEach(([col,row],i)=>{
    addCrate(col,row,i===bossIdx?'boss':(Math.random()<0.5?'enemy':'empty'));
  });
  SFX.slam();shake=12;
  alertMsg('hide','THE HORSE IS HIDING IN ITS OWN CARGO — one crate trembles. Find it.',true);
}
function releaseHorse(c){
  const b=boss;
  b.state='fight';
  b.x=c.x-30;b.y=c.y-b.h+T;b.vy=0;
  b.launchT=CFG.HORSE_LAUNCH_MS;
  shake=14;SFX.slam();
  burst(c.x+16,c.y+16,'#ffd75e',26);
  // decoys collapse: the wave resets
  entities.forEach(o=>{
    if(o.type==='crate'&&!o.dead&&o!==c){
      o.dead=true;crateGrid.delete(o.col+','+o.row);
      burst(o.x+16,o.y+16,'#c98b4b',8);
    }
  });
  alertMsg('found','FOUND IT — the decoys collapse. Hunting the indicator beat opening every box.',true);
}
function updateHorse(b){
  if(b.flash>0)b.flash--;
  if(b.state==='hidden')return;              // it is inside a crate; nothing to update
  b.vy=Math.min(b.vy+CFG.GRAV,10);
  b.hitWall=false;
  moveAndCollide(b);
  if(b.hitWall)b.vx=-b.vx||1.6;
  const a=horseArena();
  if(b.x<a.left){b.x=a.left;b.vx=Math.abs(b.vx);}
  if(b.x+b.w>a.right){b.x=a.right-b.w;b.vx=-Math.abs(b.vx);}
  if(b.grounded&&Math.random()<0.012)b.vy=-8;   // canters over the colonnade
  b.launchT-=16.7;
  if(b.launchT<=0){
    b.launchT=CFG.HORSE_LAUNCH_MS/5;           // ~5 crates per 30s
    launchCrate(b.x+b.w/2);
  }
  if(overlap(b,player))tryHitPlayer(b,2);
  // quarter-health thresholds trigger a hide wave
  if(b.hp/b.maxHp<=b.nextGate){
    b.nextGate-=0.25;
    startHideWave(b);
  }
}

/* =====================================================================
   14. GAME FLOW
   ===================================================================== */
const ALL_SCREENS=['titleScreen','hubScreen','levelScreen','archiveScreen','terminalScreen',
                   'pauseScreen','overScreen','winScreen'];
function hideScreens(){ALL_SCREENS.forEach(id=>$(id).classList.add('hidden'));}

function startGame(sid,idx){
  if(!AC){try{AC=new(window.AudioContext||window.webkitAudioContext)();}catch(e){}}
  S.sector=sid||S.sector||1;S.lidx=idx==null?(S.lidx||0):idx;
  CUR=SECTORS[S.sector].levels[S.lidx];
  S.kind=CUR.kind;S.level=S.sector;
  MAP=CUR.rows;
  spawnFromMap();
  camera={x:0,y:Math.max(0,levelH-512)};
  S.mode='play';S.t0=performance.now();
  hideScreens();
}

/* ---------- the Threat Board: a vulnerability scan of the network ---------- */
function card(cls,html,go){
  const el=document.createElement('div');
  el.className=cls;el.tabIndex=0;el.innerHTML=html;
  if(go){el.onclick=go;el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();go();}};}
  return el;
}
function openHub(){
  S.mode='hub';hideScreens();
  const ids=Object.keys(SECTORS);
  const done=ids.filter(secDone).length,total=ids.length;
  const wrap=$('hubCards');wrap.innerHTML='';
  ids.forEach(id=>{
    const L=SECTORS[id],n=secCount(id),m=L.levels.length,clear=n===m;
    wrap.appendChild(card('card'+(clear?' done':''),
      `<span class="lv">SECTOR ${id} · ${n}/${m}</span>
       <span class="nm">${L.name}</span>
       <span class="th">THREAT · ${L.threat}</span>
       <span class="bl">${L.blurb}</span>
       <span class="st">${clear?'✔ CONTAINED':'◍ ACTIVE THREAT'}</span>`,
      ()=>openSector(id)));
  });
  // the Hacker: sealed until every other scan comes back clean
  const unlocked=allDone();
  const fin=document.createElement('div');
  fin.className='card '+(unlocked?'ready':'locked');
  fin.innerHTML=`<span class="lv">FINAL SECTOR</span>
    <span class="nm">${unlocked?'The Hacker':'🔒 SEALED'}</span>
    <span class="th">THREAT · THREAT ACTOR</span>
    <span class="bl">${unlocked
      ?'Every attack you have faced was a tool. This is the hand that wielded them.'
      :'Scan incomplete. Contain every active threat to expose the actor behind them.'}</span>
    <span class="st">${unlocked?'⚑ SCAN CLEAN — DEPLOYING SOON':`◍ ${done}/${total} PREREQUISITES MET`}</span>`;
  wrap.appendChild(fin);
  $('scanTally').textContent=`VULNERABILITY SCAN · ${done} / ${total} THREATS CONTAINED`;
  $('hubScreen').classList.remove('hidden');
}

/* level list inside a sector — unlocks in order */
const KINDLABEL={proving:'PROVING GROUND · learn the tools',
                 gauntlet:'GAUNTLET · no instructions',
                 containment:'CONTAINMENT · boss'};
function openSector(sid){
  S.mode='levels';hideScreens();S.sector=Number(sid);
  const L=SECTORS[sid];
  $('lvlSectorName').textContent=`Sector ${sid} · ${L.name}`;
  $('lvlSectorBlurb').textContent=L.blurb;
  const wrap=$('lvlCards');wrap.innerHTML='';
  L.levels.forEach((lev,i)=>{
    const clear=lvlDone(lev.id);
    const open=i===0||lvlDone(L.levels[i-1].id);
    const frag=(DOSSIERS[sid]||{}).frags?.[i];
    wrap.appendChild(card('card'+(clear?' done':'')+(open?'':' locked'),
      `<span class="lv">LEVEL ${lev.id}</span>
       <span class="nm">${open?lev.name:'🔒 LOCKED'}</span>
       <span class="th">${KINDLABEL[lev.kind]}</span>
       <span class="bl">${open?(clear&&frag?'Dossier recovered: '+frag.t:'Dossier fragment '+(i+1)+'/3 awaits.')
         :'Complete the previous level first.'}</span>
       <span class="st">${clear?'✔ COMPLETE — replay':(open?'◍ AVAILABLE':'◍ SEALED')}</span>`,
      open?()=>startGame(Number(sid),i):null));
  });
  $('levelScreen').classList.remove('hidden');
}

/* the archive: every dossier fragment recovered so far */
function openArchive(){
  S.mode='archive';hideScreens();
  const b=$('archiveBody');b.innerHTML='';
  Object.entries(DOSSIERS).forEach(([sid,D])=>{
    const got=PROGRESS.frags[sid]||[];
    const n=D.frags.filter((_,i)=>got[i]).length;
    let html=`<div class="item"><b>DOSSIER ${String(sid).padStart(2,'0')} · ${D.title}</b> — ${n}/${D.frags.length} recovered</div>`;
    D.frags.forEach((f,i)=>{
      html+=got[i]
        ? `<div class="item"><b>${f.d} · ${f.t}</b><br>${f.b.replace(/\n/g,'<br>')}</div>`
        : `<div class="item" style="opacity:.45;border-left-color:#8f6cff"><b>FRAGMENT ${i+1}/3 — NOT RECOVERED</b><br>Complete level ${sid}.${i+1} to recover this file.</div>`;
    });
    b.innerHTML+=html;
  });
  $('archiveScreen').classList.remove('hidden');
}
function togglePause(){
  if(S.mode==='play'){S.mode='pause';$('pauseScreen').classList.remove('hidden');}
  else if(S.mode==='pause'){S.mode='play';$('pauseScreen').classList.add('hidden');}
}
const DEBRIEFS={
 1:[['DEBRIEF','You fought a <b>worm</b>: it replicated on its own, mutated when ignored, degraded performance, and hid behind encryption. Real worms — Conficker, WannaCry\'s spreader — behave the same way. Speed and layers win.'],
    ['THREAT ACTOR','Worms are tools. Someone deployed this one — and the trace routes lead onward.']],
 2:[['DEBRIEF','A <b>Trojan</b> never breaks in. It arrives as a crate, a gift, a statue — something you open, accept, or walk past. You carried one inside yourself. Every container looked identical until you inspected it.'],
    ['THREAT ACTOR','The Horse hid inside its own supply chain. Real attackers do the same: they hide in the software you already trust.']]
};
function endGame(won){
  S.mode=won?'win':'over';
  if(won){
    PROGRESS.done[CUR.id]=true;
    PROGRESS.frags[S.sector]=PROGRESS.frags[S.sector]||[];
    PROGRESS.frags[S.sector][S.lidx]=true;
    saveProgress();
    const secs=Math.floor(S.elapsed/1000);
    $('statFrags').textContent=`${S.frags}/${S.fragsTotal}`;
    $('statWorms').textContent=S.wormsKilled;
    $('statTime').textContent=`${Math.floor(secs/60)}:${String(secs%60).padStart(2,'0')}`;
    const f=(DOSSIERS[S.sector]||{}).frags?.[S.lidx];
    let html='';
    if(f)html+=`<div class="item"><b>DOSSIER FRAGMENT ${S.lidx+1}/3 · ${f.d}</b><br>
      <b style="color:var(--teal)">${f.t}</b><br>${f.b.replace(/\n/g,'<br>')}</div>`;
    if(secDone(S.sector))
      html+=(DEBRIEFS[S.sector]||[]).map(([t,b])=>`<div class="item"><b>${t}</b> — ${b}</div>`).join('');
    $('winDebrief').innerHTML=html;
    $('winTitle').innerHTML=secDone(S.sector)
      ?'<span class="gold">THREAT</span> CONTAINED'
      :'<span class="gold">LEVEL</span> CLEAR';
    $('winScreen').classList.remove('hidden');
  }else $('overScreen').classList.remove('hidden');
}
function closeTerminal(){S.termOpen=null;S.mode='play';$('terminalScreen').classList.add('hidden');}
$('startBtn').onclick=openHub;
$('retryBtn').onclick=()=>startGame(S.sector,S.lidx);
$('againBtn').onclick=()=>openSector(S.sector);
$('backBtn').onclick=openHub;
$('archiveBtn').onclick=openArchive;
$('archBackBtn').onclick=openHub;
$('termBtn').onclick=closeTerminal;
$('resumeBtn').onclick=togglePause;

/* =====================================================================
   15. LOOP
   ===================================================================== */
let last=0,acc=0;
function loop(t){
  requestAnimationFrame(loop);
  const dt=Math.min(50,t-last);last=t;
  if(S.mode!=='play'){for(const k in pressed)pressed[k]=false;return;}
  acc+=dt;
  while(acc>=16.6){update();acc-=16.6;}
  render();
}
requestAnimationFrame(loop);
