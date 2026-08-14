/* ============================================================
   CIPHER LAB
   One file, no build step, no dependencies. Everything runs
   client-side so it works on a locked-down school network and
   nothing a student types is ever transmitted anywhere.

   TO ADD A CIPHER: add one entry to CIPHERS below. The dropdown,
   the key controls, the Field Guide, and the challenge engine all
   read from this object — you never have to touch the UI code.
   ============================================================ */

const AZ = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/* ---------- shared helpers ---------- */

// Walk a string, transforming only A-Z and leaving punctuation,
// spacing and case exactly as the student typed it. Preserving the
// original spacing matters pedagogically: word shape is one of the
// first things a codebreaker learns to read.
function mapLetters(str, fn){
  let out = '';
  for (const ch of str){
    const up = ch.toUpperCase();
    const i = AZ.indexOf(up);
    if (i < 0){ out += ch; continue; }
    const res = AZ[((fn(i) % 26) + 26) % 26];
    out += (ch === up) ? res : res.toLowerCase();
  }
  return out;
}
const onlyLetters = s => s.toUpperCase().replace(/[^A-Z]/g,'');
const clampInt = (v, lo, hi, d) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d;
};

// Modular inverse by search — 26 is small, no need for anything clever.
function modInv(a, m){ for (let x = 1; x < m; x++) if ((a * x) % m === 1) return x; return 1; }

// Build a mixed alphabet from a keyword: keyword letters first (no repeats),
// then everything left over in normal order. This is how a keyed
// substitution alphabet was built by hand in the field.
function keyedAlphabet(kw){
  const seen = new Set(); let out = '';
  for (const c of onlyLetters(kw)) if (!seen.has(c)){ seen.add(c); out += c; }
  for (const c of AZ) if (!seen.has(c)) out += c;
  return out;
}

const bytesToHex = b => Array.from(b, x => x.toString(16).padStart(2,'0')).join(' ');
const hexToBytes = h => {
  const clean = h.replace(/[^0-9a-fA-F]/g,'');
  const out = new Uint8Array(Math.floor(clean.length/2));
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.substr(i*2,2),16);
  return out;
};
const enc8 = s => new TextEncoder().encode(s);
const dec8 = b => new TextDecoder().decode(b);

const MORSE = {A:'.-',B:'-...',C:'-.-.',D:'-..',E:'.',F:'..-.',G:'--.',H:'....',I:'..',J:'.---',
K:'-.-',L:'.-..',M:'--',N:'-.',O:'---',P:'.--.',Q:'--.-',R:'.-.',S:'...',T:'-',U:'..-',V:'...-',
W:'.--',X:'-..-',Y:'-.--',Z:'--..','0':'-----','1':'.----','2':'..---','3':'...--','4':'....-',
'5':'.....','6':'-....','7':'--...','8':'---..','9':'----.','.':'.-.-.-',',':'--..--','?':'..--..',
"'":'.----.','/':'-..-.','!':'-.-.--'};
const MORSE_REV = Object.fromEntries(Object.entries(MORSE).map(([k,v]) => [v,k]));

// Bacon's original 24-letter alphabet: I/J share a code and so do U/V.
// Keeping the historical version is the point — the collision is a
// great talking point about why alphabets get "fixed" over time.
const BACON_AZ = 'ABCDEFGHIKLMNOPQRSTUWXYZ';
function baconCode(i){ return i.toString(2).padStart(5,'0').replace(/0/g,'A').replace(/1/g,'B'); }

/* ---------- the registry ---------- */

const CIPHERS = {

caesar:{
  name:'Caesar Shift', cat:'Substitution', visual:'wheel',
  blurb:'Every letter slides the same number of places down the alphabet.',
  keys:[{id:'shift',label:'Shift',type:'number',min:0,max:25,def:3,narrow:true}],
  enc:(t,k)=>mapLetters(t,i=>i+clampInt(k.shift,0,25,3)),
  dec:(t,k)=>mapLetters(t,i=>i-clampInt(k.shift,0,25,3)),
  history:{
    origin:'Rome, roughly 58–50 BCE.',
    story:'Suetonius records that Julius Caesar protected his military correspondence by replacing each letter with the one three places further along. His nephew Augustus used a shift of one. It is the oldest substitution cipher we can name a user for, and for centuries it was genuinely secure — not because the maths was hard, but because most people who intercepted a message could not read at all.',
    usedFor:'Field orders between a commander and officers who already knew the shift. Today it survives as a puzzle, a warm-up, and the standard example for teaching what a "key" is.',
    tell:'Word lengths and spacing look completely normal — one-letter words, three-letter words, doubled letters — but nothing is readable. A single-letter word is almost always a shifted A or I, which hands you the key.'
  }
},

rot13:{
  name:'ROT13', cat:'Substitution', visual:'wheel', fixedShift:13,
  blurb:'A Caesar shift locked at 13. Running it twice gives you back what you started with.',
  keys:[],
  enc:t=>mapLetters(t,i=>i+13), dec:t=>mapLetters(t,i=>i+13),
  history:{
    origin:'Usenet newsgroups, late 1970s–1980s.',
    story:'Because the alphabet has 26 letters, shifting by 13 is its own undo. Early internet users adopted it not to hide anything but to blur it: punchlines, spoilers and offensive jokes were posted in ROT13 so you had to choose to read them. Every newsreader shipped with a "decode" button.',
    usedFor:'Spoiler tags and mild obfuscation. Never security — it has no key to guess.',
    tell:'Same look as a Caesar, but if you spot ROT13 in the wild it is usually online and usually deliberate. Try 13 first on anything internet-flavoured.'
  }
},

atbash:{
  name:'Atbash', cat:'Substitution', visual:'mirror',
  blurb:'The alphabet folded in half: A becomes Z, B becomes Y, and so on.',
  keys:[],
  enc:t=>mapLetters(t,i=>25-i), dec:t=>mapLetters(t,i=>25-i),
  history:{
    origin:'Ancient Israel, roughly 600 BCE.',
    story:'Atbash is named for its own rule: aleph–tav, beth–shin, the first Hebrew letter paired with the last, the second with the second-last. It appears inside the Book of Jeremiah, where "Sheshach" is Atbash for Babel — Babylon. It is probably the oldest cipher still in common use as a puzzle.',
    usedFor:'Scribal concealment of politically dangerous names. Now a staple of escape rooms and crossword-style puzzles.',
    tell:'Has no key at all, so there is nothing to guess. If a message resists every Caesar shift, try mirroring next — and look for a lone "Z", which is a mirrored A.'
  }
},

affine:{
  name:'Affine', cat:'Substitution', visual:'table',
  blurb:'Multiply the letter position, then add. Caesar with a second dial.',
  keys:[
    {id:'a',label:'Multiplier (a)',type:'select',options:[1,3,5,7,9,11,15,17,19,21,23,25],def:5,narrow:true},
    {id:'b',label:'Shift (b)',type:'number',min:0,max:25,def:8,narrow:true}
  ],
  enc:(t,k)=>mapLetters(t,i=>parseInt(k.a,10)*i + clampInt(k.b,0,25,0)),
  dec:(t,k)=>{const inv=modInv(parseInt(k.a,10),26); return mapLetters(t,i=>inv*(i-clampInt(k.b,0,25,0)));},
  history:{
    origin:'A modern generalisation of very old ideas; formalised as classical cryptography was written down mathematically in the 19th and 20th centuries.',
    story:'Affine is the first cipher on this list that is genuinely arithmetic. Each letter gets a number, is multiplied by a, has b added, and is wrapped back into the alphabet. The multiplier cannot share a factor with 26 or two different letters collide — which is exactly why only certain values are offered in the dropdown.',
    usedFor:'Teaching modular arithmetic more than protecting secrets. It is the bridge between "shift the alphabet" and "do maths on the alphabet".',
    tell:'Looks like a Caesar that refuses to crack. Letter frequency is still preserved, so the most common letter is probably E — but the gaps between letters are stretched unevenly.'
  }
},

keyword:{
  name:'Keyword Substitution', cat:'Substitution', visual:'table',
  blurb:'A scrambled alphabet built from a memorable word.',
  keys:[{id:'kw',label:'Keyword',type:'text',def:'LEXINGTON'}],
  enc:(t,k)=>{const a=keyedAlphabet(k.kw||'A'); return mapLetters(t,i=>AZ.indexOf(a[i]));},
  dec:(t,k)=>{const a=keyedAlphabet(k.kw||'A'); return mapLetters(t,i=>a.indexOf(AZ[i]));},
  history:{
    origin:'Widespread across Europe from the Renaissance onward.',
    story:'A fully scrambled alphabet has around 4 × 10²⁶ possible arrangements, far too many to try one by one. The problem was never strength — it was memory. Keying the alphabet to a word meant an agent could rebuild the whole table from a single phrase held in their head, with nothing incriminating written down.',
    usedFor:'Diplomatic correspondence and espionage for centuries, until frequency analysis made it unreliable against a patient opponent.',
    tell:'Every letter maps consistently to one other letter, so doubled letters stay doubled and word shapes survive. Count your letters: the most frequent one is almost certainly E, and "THE" is usually sitting there in plain sight once you find it.'
  }
},

vigenere:{
  name:'Vigenère', cat:'Substitution', visual:'tabula',
  blurb:'A different Caesar shift for every letter, cycling through a keyword.',
  keys:[{id:'kw',label:'Keyword',type:'text',def:'FALCON'}],
  enc:(t,k)=>vig(t,k.kw,1), dec:(t,k)=>vig(t,k.kw,-1),
  history:{
    origin:'Described by Giovan Battista Bellaso in 1553; later misattributed to Blaise de Vigenère.',
    story:'For roughly three hundred years this was called le chiffre indéchiffrable — the unbreakable cipher. Because the shift changes with every letter, simple frequency counting collapses. Charles Babbage broke it in the 1850s and Friedrich Kasiski published a method in 1863: find repeated chunks of ciphertext, measure the distance between them, and the keyword length falls out.',
    usedFor:'Confederate field ciphers in the American Civil War, and commercial telegraph codes into the 20th century.',
    tell:'Frequency analysis produces a flat, featureless count — no letter dominates. That flatness is itself the signature. Repeated fragments in the ciphertext hint at the keyword length.'
  }
},

pigpen:{
  name:'Pigpen', cat:'Substitution', visual:'pigpen',
  blurb:'Letters drawn as the fragment of grid they sit in.',
  keys:[],
  enc:t=>t.toUpperCase().replace(/[^A-Z ]/g,''),
  dec:t=>t.toUpperCase(),
  history:{
    origin:'Freemason lodges, 18th century — with roots in earlier Hebrew and Templar-attributed notations.',
    story:'Also called the Masonic or tic-tac-toe cipher. Letters are laid into two grids and two X shapes; each letter is written as the walls surrounding its cell, with a dot added for the second set. Union prisoners used it to pass notes in Confederate camps, and it is carved into Masonic gravestones in cemeteries you can visit today.',
    usedFor:'Lodge records, gravestone inscriptions, and prisoner-of-war messages. Its real advantage was that it does not look like writing at all.',
    tell:'You do not read this one — you see it. Angular shapes with occasional dots, no letters anywhere. If a message is made of corners, it is Pigpen.'
  }
},

bacon:{
  name:"Bacon's Cipher", cat:'Substitution', visual:'chart',
  blurb:'Each letter becomes five A/B symbols — a message you can hide inside another message.',
  keys:[],
  enc:t=>onlyLetters(t).split('').map(c=>{
    const i=BACON_AZ.indexOf(c==='J'?'I':c==='V'?'U':c); return i<0?'':baconCode(i);
  }).filter(Boolean).join(' '),
  dec:t=>(t.toUpperCase().replace(/[^AB]/g,'').match(/.{1,5}/g)||[])
    .map(g=>g.length===5?BACON_AZ[parseInt(g.replace(/A/g,'0').replace(/B/g,'1'),2)]||'':'').join(''),
  history:{
    origin:'Francis Bacon, published 1605.',
    story:'Bacon called it a "biliteral" cipher and he was three centuries early: it is binary. Five symbols of two kinds encode 32 possibilities, more than enough for an alphabet. Crucially, the A and B did not have to be letters — they could be two subtly different typefaces in an innocent printed page, so the secret message hid inside a harmless one. Bacon had invented steganography married to encoding.',
    usedFor:'Concealed messages inside ordinary text, and a favourite of people who believe Bacon hid confessions inside Shakespeare.',
    tell:'Only two symbols repeating, in groups of five. Any message built from exactly two characters is a binary encoding of something.'
  }
},

a1z26:{
  name:'A1Z26', cat:'Substitution', visual:'chart',
  blurb:'The simplest idea in cryptography: A is 1, Z is 26.',
  keys:[],
  enc:t=>t.toUpperCase().split(/\s+/).filter(Boolean)
    .map(w=>w.split('').map(c=>AZ.indexOf(c)+1).filter(n=>n>0).join('-')).join(' / '),
  dec:t=>t.split('/').map(w=>w.split(/[^0-9]+/).filter(Boolean)
    .map(n=>AZ[parseInt(n,10)-1]||'').join('')).join(' ').trim(),
  history:{
    origin:'No single inventor — it is the obvious first idea, reinvented constantly.',
    story:'Children invent A1Z26 independently in every generation. It carries no security whatsoever, but it does something important: it is usually a person\'s first encounter with the idea that letters and numbers are interchangeable. Every modern character encoding, from ASCII to Unicode, is the same move performed rigorously.',
    usedFor:'Notes passed in class, puzzle hunts, and the first rung of the ladder toward understanding encoding.',
    tell:'Numbers, none above 26, usually separated by dashes or slashes. Unmistakable.'
  }
},

railfence:{
  name:'Rail Fence', cat:'Transposition', visual:'rails',
  blurb:'Write the message zigzag across rails, then read straight along each rail.',
  keys:[{id:'rails',label:'Rails',type:'number',min:2,max:8,def:3,narrow:true}],
  enc:(t,k)=>{
    const s=onlyLetters(t), n=clampInt(k.rails,2,8,3), rows=Array.from({length:n},()=>'');
    let r=0,d=1;
    for(const c of s){ rows[r]+=c; if(r===0)d=1; else if(r===n-1)d=-1; r+=d; }
    return rows.join('');
  },
  dec:(t,k)=>{
    const s=onlyLetters(t), n=clampInt(k.rails,2,8,3), pat=[];
    let r=0,d=1;
    for(let i=0;i<s.length;i++){ pat.push(r); if(r===0)d=1; else if(r===n-1)d=-1; r+=d; }
    const counts=Array.from({length:n},(_,i)=>pat.filter(x=>x===i).length);
    const rows=[]; let p=0;
    for(let i=0;i<n;i++){ rows.push(s.slice(p,p+counts[i])); p+=counts[i]; }
    const idx=Array(n).fill(0);
    return pat.map(row=>rows[row][idx[row]++]).join('');
  },
  history:{
    origin:'Ancient in principle; named and widely drilled in the 19th century.',
    story:'Rail Fence is a transposition cipher — it does not disguise the letters at all, it just rearranges them. That makes it fundamentally different from everything above it on this list. The ancestor is the Spartan scytale, a rod of a specific diameter with a leather strip wound around it: the message only lined up when wrapped on a rod of matching width.',
    usedFor:'Quick field encryption where speed mattered more than strength, and as the standard classroom introduction to transposition.',
    tell:'Count the letters. If the frequency profile looks exactly like ordinary English — lots of E, T, A — but the text is unreadable, the letters were not swapped, they were shuffled. That is a transposition, and it is a completely different attack.'
  }
},

reverse:{
  name:'Reversal', cat:'Transposition', visual:'none',
  blurb:'The whole message written backwards.',
  keys:[],
  enc:t=>[...t].reverse().join(''), dec:t=>[...t].reverse().join(''),
  history:{
    origin:'As old as writing itself.',
    story:'Leonardo da Vinci wrote his notebooks in mirror script — right to left, letters reversed — for thousands of pages. Historians still argue about why: left-handedness, avoiding smudged ink, or genuine secrecy. It is the minimum viable transposition, and worth including precisely because it shows how little rearrangement it takes to make text unreadable at a glance.',
    usedFor:'Personal notebooks, quick concealment, and the second half of many layered puzzles.',
    tell:'Read the last word first. If the ending suddenly looks like a beginning, you have it.'
  }
},

morse:{
  name:'Morse Code', cat:'Encoding', visual:'chart',
  blurb:'Letters as dots and dashes. Not a cipher — a way of sending letters over a wire.',
  keys:[],
  enc:t=>t.toUpperCase().split(' ').map(w=>w.split('').map(c=>MORSE[c]||'').filter(Boolean).join(' ')).join(' / '),
  dec:t=>t.trim().split(/\s*\/\s*|\s{2,}/).map(w=>w.trim().split(/\s+/).map(s=>MORSE_REV[s]||'').join('')).join(' '),
  history:{
    origin:'Samuel Morse and Alfred Vail, 1830s–1840s.',
    story:'Vail reportedly walked into a printer\'s shop and counted the type in each letter\'s bin to find out which letters English uses most. The most common letters got the shortest codes — E is a single dot, T a single dash. That is why Morse is fast: it is optimised for the language, an idea that reappears a century later in data compression.',
    usedFor:'Telegraph, maritime distress signalling, and aviation navigation beacons. Still legally recognised for emergencies, and still tapped out by hand when nothing else works.',
    tell:'Dots, dashes, spaces. Nothing else looks like it. Remember it hides nothing — anyone with the chart can read it, which makes it an encoding rather than a cipher.'
  }
},

base64:{
  name:'Base64', cat:'Encoding', visual:'none',
  blurb:'Raw bytes rewritten using 64 safe characters. Reversible by anyone.',
  keys:[],
  enc:t=>{let b='';for(const x of enc8(t))b+=String.fromCharCode(x);return btoa(b);},
  dec:t=>{try{return dec8(Uint8Array.from(atob(t.trim().replace(/\s+/g,'')),c=>c.charCodeAt(0)));}
    catch(e){return '⚠ That is not valid Base64. Check for missing characters or stray spaces.';}},
  history:{
    origin:'Standardised for internet mail in the late 1980s and 1990s (MIME).',
    story:'Early email could only carry plain text. To send an image or an attachment, the bytes had to be rewritten using characters no mail server would mangle — 64 of them, hence the name. Padding "=" signs appear at the end when the data does not divide evenly into three-byte groups.',
    usedFor:'Email attachments, data URLs, API tokens, and configuration files everywhere. It is also the single most common thing beginners mistake for encryption.',
    tell:'Mixed upper and lower case letters, digits, and often one or two "=" at the very end. Length is usually a multiple of four. If you see "=" padding, stop guessing and decode it.'
  }
},

hex:{
  name:'Hexadecimal', cat:'Encoding', visual:'none',
  blurb:'Each byte written as two base-16 digits.',
  keys:[],
  enc:t=>bytesToHex(enc8(t)),
  dec:t=>{try{return dec8(hexToBytes(t));}catch(e){return '⚠ Could not read that as hex.';}},
  history:{
    origin:'Standard practice in computing from the 1960s onward.',
    story:'A byte holds a number from 0 to 255, which is clumsy in decimal and enormous in binary. Base 16 fits a byte in exactly two digits, so hexadecimal became the default way to write raw data by hand. Every colour code on a website and every MAC address on a network is hex.',
    usedFor:'Memory dumps, malware analysis, file signatures, network captures, colour values. If you go on to do forensics, you will read hex daily.',
    tell:'Only 0–9 and A–F, usually in pairs. Watch for file signatures at the start of a dump — 4D 5A is a Windows executable, 89 50 4E 47 is a PNG.'
  }
},

binary:{
  name:'Binary', cat:'Encoding', visual:'none',
  blurb:'Each character as eight ones and zeros.',
  keys:[],
  enc:t=>Array.from(enc8(t),b=>b.toString(2).padStart(8,'0')).join(' '),
  dec:t=>{const g=t.replace(/[^01]/g,'').match(/.{1,8}/g)||[];
    try{return dec8(Uint8Array.from(g.map(x=>parseInt(x,2))));}catch(e){return '⚠ Could not read that as binary.';}},
  history:{
    origin:'Gottfried Leibniz described binary arithmetic in 1703; Claude Shannon connected it to circuits in 1937.',
    story:'Leibniz worked out that any number can be written with only two digits, and thought it had theological beauty. Shannon\'s master\'s thesis showed that those two digits map perfectly onto switches that are open or closed — and that is the entire foundation of every computer since.',
    usedFor:'Everything. Every other item in this list eventually becomes binary somewhere below the surface.',
    tell:'Ones and zeros in groups of eight. Groups starting 010 are usually uppercase letters; 011 are usually lowercase.'
  }
},

url:{
  name:'URL Encoding', cat:'Encoding', visual:'none',
  blurb:'Percent-signs replacing characters that would break a web address.',
  keys:[],
  enc:t=>encodeURIComponent(t),
  dec:t=>{try{return decodeURIComponent(t.trim());}catch(e){return '⚠ Invalid percent-encoding.';}},
  history:{
    origin:'Defined alongside the first web URL specifications, early 1990s.',
    story:'A web address cannot contain a space or a question mark in the middle of a value without confusing the server, so those characters are rewritten as a percent sign plus their hex code. A space becomes %20. It is a plumbing detail that became security-relevant fast: attackers encode payloads to slip them past filters that only check for the plain version.',
    usedFor:'Query strings, form submissions, and — on the other side of the fence — evasion attempts that a defender has to decode before analysing.',
    tell:'Percent signs followed by two hex digits. %20 for a space is the giveaway.'
  }
},

xor:{
  name:'XOR', cat:'Modern', visual:'none',
  blurb:'Every byte combined with a repeating key. Output shown as hex.',
  keys:[{id:'kw',label:'Key',type:'text',def:'k3y'}],
  enc:(t,k)=>{const key=enc8(k.kw||'k'),d=enc8(t);
    return bytesToHex(d.map((b,i)=>b^key[i%key.length]));},
  dec:(t,k)=>{const key=enc8(k.kw||'k'),d=hexToBytes(t);
    return dec8(d.map((b,i)=>b^key[i%key.length]));},
  history:{
    origin:'Exclusive-or as a cipher primitive dates to Gilbert Vernam, 1917.',
    story:'Vernam\'s teleprinter cipher combined the message with a key tape using XOR. With a truly random key as long as the message, used exactly once, the result is a one-time pad — the only cipher ever proven mathematically unbreakable. Repeat the key, as this tool does, and it collapses into a Vigenère cipher on bytes. That gap between "unbreakable" and "trivial" is entirely about key reuse.',
    usedFor:'Vernam\'s original teleprinters, Cold War one-time pads, and — far less honourably — the laziest possible obfuscation layer in real malware, which is why analysts learn to spot it fast.',
    tell:'Output is hex that decodes to nothing readable. If a suspicious file is full of high-entropy bytes with a repeating rhythm, try XOR with a short key. XOR-ing ciphertext against a guessed word is a standard analyst move.'
  }
},

sha:{
  name:'SHA Hash (+ salt)', cat:'Hashing', visual:'none', oneWay:true,
  blurb:'A one-way fingerprint. There is no decrypt button — that is the point.',
  keys:[
    {id:'alg',label:'Algorithm',type:'select',options:['SHA-256','SHA-1','SHA-512'],def:'SHA-256'},
    {id:'salt',label:'Salt (optional)',type:'text',def:''}
  ],
  enc:async(t,k)=>{
    const alg=k.alg||'SHA-256';
    const buf=await crypto.subtle.digest(alg,enc8((k.salt||'')+t));
    return Array.from(new Uint8Array(buf),b=>b.toString(16).padStart(2,'0')).join('');
  },
  dec:()=>'⚠ Hashes cannot be reversed. There is no key that undoes this.\n\nThe only attack is to guess an input, hash it, and compare. That is exactly what password cracking is — and it is why a salt matters: it forces the attacker to redo the work for every single account instead of once for everybody.',
  history:{
    origin:'MD5 in 1992, SHA-1 in 1995, the SHA-2 family in 2001 (NSA / NIST).',
    story:'A hash takes any input and produces a fixed-length fingerprint. Change one character and the whole output changes. Crucially it only runs one way. Systems store the hash of your password, not the password, so a stolen database does not immediately hand over accounts — unless the passwords were common enough to guess. A salt is a unique random value added before hashing so that two people with the same password get different hashes, which destroys precomputed lookup tables.',
    usedFor:'Password storage, file integrity checks, digital signatures, and malware identification — analysts trade file hashes as shorthand for "this exact file". SHA-1 is now considered broken for security use.',
    tell:'A long string of hex with no spaces and no padding. 32 characters is MD5, 40 is SHA-1, 64 is SHA-256, 128 is SHA-512. Count the characters and you have named the algorithm.'
  }
}

};

function vig(t, kw, dir){
  const key = onlyLetters(kw) || 'A';
  let j = 0;
  return mapLetters(t, i => {
    const s = AZ.indexOf(key[j % key.length]); j++;
    return i + dir * s;
  });
}

const CIPHER_IDS = Object.keys(CIPHERS);
