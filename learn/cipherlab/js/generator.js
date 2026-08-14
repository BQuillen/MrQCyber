/* ============================================================
   INTERCEPT GENERATOR
   The authored bank above is finite. This builds unlimited extra
   intercepts by combining a message pool with a randomly chosen
   key, using a SEEDED random number generator.

   Seeding matters: challenge "caesar #7" is generated from the
   seed "caesar:7", so it is the same message every time the page
   loads. That means progress can be saved against it, a student
   can come back to it tomorrow, and every student in the room
   gets the identical puzzle — without storing 200 challenges by
   hand or calling any API.

   TO ADD MATERIAL: drop new strings into the pools below. Every
   cipher immediately gets more to work with.
   ============================================================ */

/* Deterministic PRNG (mulberry32) — small, fast, good enough for puzzles. */
function rngFrom(str){
  let h = 2166136261;
  for (let i = 0; i < str.length; i++){ h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  let a = h >>> 0;
  return function(){
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const pick = (r, arr) => arr[Math.floor(r() * arr.length) % arr.length];
const pickInt = (r, lo, hi) => lo + Math.floor(r() * (hi - lo + 1));

/* ---------- message pools ---------- */

// Letters-only phrases for the classical ciphers.
const POOL_PHRASE = [
'THE COURIER LEAVES BEFORE FIRST LIGHT','HOLD THE NORTH GATE UNTIL RELIEVED',
'SUPPLIES ARE RUNNING SHORT AT CAMP TWO','THE SIGNAL FIRE MEANS FALL BACK',
'DO NOT TRUST THE MAP THEY GAVE YOU','ANSWER ONLY TO THE PHRASE OPEN WATER',
'THE BRIDGE WILL NOT HOLD ANOTHER CROSSING','SEND THE SECOND COLUMN AROUND THE RIDGE',
'BURN THE LEDGER IF THEY REACH THE DOOR','THE WELL BEHIND THE CHAPEL IS DRY',
'COUNT THE LANTERNS BEFORE YOU ANSWER','WAIT FOR THE BELL THEN MOVE QUICKLY',
'THE HARBOUR IS WATCHED AT EVERY HOUR','LEAVE THE PACKAGE UNDER THE STONE BENCH',
'THE THIRD WINDOW WILL BE UNLATCHED','NOTHING LEAVES THIS ROOM IN WRITING',
'AN ANALYST NOTICED THE TRAFFIC AT MIDNIGHT','ISOLATE THE HOST BEFORE IT SPREADS',
'THE ACCOUNT WAS CREATED ONLY YESTERDAY','SOMEONE COPIED THE DATABASE ON SUNDAY',
'CHECK THE LOGS BEFORE YOU CLOSE THE TICKET','THE PHISHING MAIL CAME FROM INSIDE',
'ROTATE EVERY CREDENTIAL BY MORNING','A SERVICE ACCOUNT IS DOING SOMETHING STRANGE',
'THE BACKUP DRIVE WAS NEVER ENCRYPTED','TWO FACTOR WOULD HAVE STOPPED ALL OF THIS',
'THE ATTACKER WAITED ELEVEN DAYS BEFORE MOVING','REPORT IT EVEN IF YOU CLICKED THE LINK',
'PATCH THE EDGE DEVICE THIS AFTERNOON','THE ALERT WAS REAL AND NOBODY READ IT',
'EVERY PATTERN LOOKS OBVIOUS ONCE YOU SEE IT','FREQUENCY WILL BETRAY A LAZY CIPHER',
'A KEY REUSED IS A KEY REVEALED','THE WEAKEST LINK IS ALWAYS A HABIT',
'SLOW DOWN AND COUNT THE LETTERS FIRST','GUESSING IS FASTER WHEN YOU GUESS WELL',
'NEVER CONFUSE ENCODING WITH ENCRYPTION','THE ONE TIME PAD IS ONLY USED ONCE',
'SHORT KEYS FALL TO PATIENT PEOPLE','WHAT LOOKS RANDOM RARELY IS'
];

// Single words / short strings — used where the ciphertext balloons,
// like Bacon, where every letter becomes five symbols.
const POOL_SHORT = ['CIPHER','SHADOW','BEACON','VAULT','FALCON','HOLLOW','QUARRY','LANTERN','THICKET',
'GRANITE','HARBOR','TUNDRA','EMBER','KESTREL','OUTPOST','SILENT','MARROW','DECOY','ANVIL','RELAY',
'BRAMBLE','COBALT','DRIFT','ECHO'];

// Realistic technical strings for the encoding tools.
const POOL_TECH = [
'GET /admin/config.php HTTP/1.1','user=svc_backup;role=administrator',
'C:\\Users\\Public\\update.exe','payroll_export_final.xlsx','api_key=sk_live_4f9c2a',
'ssh root@10.0.4.21 -p 2222','DROP TABLE sessions;','failed login attempt x47',
'\\\\FILESRV01\\HR\\terminations','powershell -enc -nop -w hidden','beacon check-in 300s',
'certificate expires in 3 days','SELECT * FROM users WHERE id=1','/etc/shadow',
'mail.contoso-secure.co attachment','RDP from 203.0.113.88','scheduled task: OneDriveSync',
'quarantine host WKSTN-114','MZ header detected','port 4444 outbound','disable_logging=true',
'backup_2024_q3.tar.gz','svchost.exe (not System32)','token refresh failed 401'
];

// Short lowercase payload-ish strings for XOR.
const POOL_PAYLOAD = ['connect to the beacon','stage two ready','exfil at 0300','drop the loader',
'callback every 60s','wipe the logs','open the tunnel','key is in memory','sleep then retry',
'move to the file server','escalate and persist','check for sandbox'];

// Deliberately weak passwords for the hash-matching challenges. Students
// are given a candidate list, so this is a matching exercise about why
// weak passwords fall instantly — not a cracking recipe.
const POOL_PASSWORD = ['password','123456','qwerty','letmein','dragon','football','iloveyou',
'monkey','sunshine','princess','welcome','admin','trustno1','baseball','shadow','master'];

const POOL_KEYWORD = ['FALCON','LEXINGTON','BLUEGRASS','MERIDIAN','THUNDER','CIPHER','HARBOR',
'GRANITE','KESTREL','OUTPOST','LANTERN','QUARRY','SENTINEL','TUNDRA','COBALT','BRAMBLE'];

const POOL_XORKEY = ['shark','k3y','node','r00t','blue','ax','hex','loop'];

const TITLE_A = ['Cold','Broken','Silent','Partial','Burned','Late','Faint','Stray','Clipped','Dark',
'Third','Sealed','Hollow','Loose','Quiet','Recovered','Damaged','Unsigned','Grey','Missing'];
const TITLE_B = ['Relay','Fragment','Dispatch','Packet','Transcript','Slip','Cable','Bulletin',
'Sample','Wire','Record','Note','Trace','Capture','Message','Signal'];

/* ---------- which ciphers can reasonably be cracked without the key ---------- */
// Caesar has 25 possibilities and Rail Fence has a handful — a student can
// work through those by hand. A Vigenere keyword cannot be guessed that way,
// so its key is always supplied.
const CRACKABLE = {caesar:true, railfence:true, atbash:true, rot13:true, reverse:true};

/* ---------- pool + key selection per cipher ---------- */
function poolFor(id){
  // Bacon's historical alphabet merges I/J and U/V, so a word containing
  // J, U or V cannot round-trip exactly. Keep those out of its pool.
  if (id === 'bacon') return POOL_SHORT.filter(w => !/[JUV]/.test(w));
  if (id === 'xor') return POOL_PAYLOAD;
  if (id === 'sha') return POOL_PASSWORD;
  if (['base64','hex','binary','url'].includes(id)) return POOL_TECH;
  return POOL_PHRASE;
}

function keyFor(id, r){
  switch(id){
    case 'caesar':    return {shift: pickInt(r,1,25)};
    case 'affine':    return {a: pick(r,[3,5,7,9,11,15,17,19,21,23,25]), b: pickInt(r,0,25)};
    case 'keyword':
    case 'vigenere':  return {kw: pick(r, POOL_KEYWORD)};
    case 'railfence': return {rails: pickInt(r,2,5)};
    case 'xor':       return {kw: pick(r, POOL_XORKEY)};
    case 'sha':       return {alg:'SHA-256', salt: r() < 0.4 ? pick(r,['K7#q','s4lt','9xZ!','r0ck']) : ''};
    default:          return {};
  }
}

/* ---------- build one generated intercept ---------- */
function generate(cipherId, n, opts){
  opts = opts || {};
  const r = rngFrom(cipherId + ':' + n + ':' + (opts.salt || ''));
  const pool = poolFor(cipherId);
  const pt = pool[(Math.floor(r() * pool.length) + n * 7) % pool.length];
  const k = keyFor(cipherId, r);
  const ch = {
    id: opts.id || ('g:' + cipherId + ':' + n),
    t: pick(r, TITLE_A) + ' ' + pick(r, TITLE_B) + ' ' + String(pickInt(r,10,99)),
    c: cipherId,
    k, pt,
    generated: true,
    type: cipherId === 'sha' ? 'hash' : undefined,
    brief: cipherId === 'sha'
      ? 'A password hash from a breached table. Hashes only run one way, so the only move is to guess an input and hash it. Work the candidate list below in the Workbench.'
      : 'Recovered from the queue. No context, no sender, no timestamp.',
    hideKey: !!opts.hideKey && !!CRACKABLE[cipherId]
  };
  if (cipherId === 'sha'){
    // Give a candidate list so this is a matching exercise, not a brute force.
    const cands = new Set([pt]);
    const r2 = rngFrom('cand:' + cipherId + ':' + n);
    while (cands.size < 6) cands.add(pick(r2, POOL_PASSWORD));
    ch.candidates = [...cands].sort();
  }
  ch.pts = 100 + (opts.hideCipher ? 75 : 0) + (ch.hideKey ? 75 : 0) + (ch.type === 'hash' ? 50 : 0);
  ch.hideCipher = !!opts.hideCipher;
  return ch;
}

/* ---------- the drill list for one cipher ----------
   Authored intercepts first (they carry the best writing and the
   historical framing), then generated ones to fill out the set.
   Later positions withhold the key where that is fair. */
const DRILL_SIZE = 12;

function drillFor(cipherId){
  const authored = CHALLENGES.filter(c => c.c === cipherId).map(c =>
    Object.assign({}, c, {hideCipher:false}));
  const out = authored.slice();
  let n = 1;
  while (out.length < DRILL_SIZE){
    const pos = out.length;                       // 0-indexed position in the drill
    out.push(generate(cipherId, n++, {
      hideKey: pos >= 7,                          // last third: work the key out yourself
      hideCipher: false
    }));
  }
  // Stable sort into a clean ramp: everything that hands you the key
  // comes first, so difficulty climbs instead of zig-zagging.
  return out
    .map((c, i) => [c, i])
    .sort((a, b) => (a[0].hideKey === b[0].hideKey) ? a[1] - b[1] : (a[0].hideKey ? 1 : -1))
    .map(([c], i) => Object.assign(c, {pos:i}));
}
