/* ============================================================
   CHALLENGE BANK
   Order matters. The engine counts how many times each cipher has
   already appeared ABOVE a challenge in this list:
     appearance 1 and 2 -> the cipher is named, and its tell is shown
     appearance 3+      -> nothing is named; the student must identify
                           the cipher themselves before answering
   So to make a cipher stay "taught" for longer, just move its later
   entries further down. To add a challenge, add an object here —
   the ciphertext is generated automatically from pt + k.

   Fields:
     t        title shown on the card
     c        cipher id (must match a key in CIPHERS)
     k        key object passed to the cipher
     pt       the plaintext (this is the answer)
     brief    flavour / framing text
     hideKey  true = do not reveal the key even while teaching
     mode     'decode' (default) or 'encode'
     type     'hash' for hash-cracking challenges
   ============================================================ */

const CHALLENGES = [
{t:'The Gallic Dispatch', c:'caesar', k:{shift:3}, pt:'BRING THE THIRD LEGION AT DAWN',
 brief:'A rider carries wax tablets out of a camp in Gaul. The general is known to shift his letters by three.'},

{t:'Distress at Sea', c:'morse', k:{}, pt:'ENGINE ROOM FLOODING SEND HELP',
 brief:'A wireless operator on a merchant ship taps out a message as the deck lists beneath him.'},

{t:'Orders from Augustus', c:'caesar', k:{shift:1}, pt:'THE SENATE MEETS AT NOON TOMORROW',
 brief:'Caesar\'s successor preferred a gentler shift than his uncle. Only one place.'},

{t:'Jeremiah 25', c:'atbash', k:{}, pt:'THE KING OF SHESHACH SHALL FALL',
 brief:'A scribe hides a dangerous city name inside scripture by folding the alphabet in half.'},

{t:'Attachment Stripped', c:'base64', k:{}, pt:'invoice_final_v2.pdf.exe',
 brief:'An email gateway logged the encoded filename of a blocked attachment. Decode it and decide whether the block was correct.'},

{t:'Spoiler Warning', c:'rot13', k:{}, pt:'THE BUTLER DID IT',
 brief:'Posted to a message board in 1987 so that nobody would read it by accident. The alphabet is shifted by exactly half.'},

{t:'Lighthouse Relay', c:'morse', k:{}, pt:'FOG BANK CLOSING VISIBILITY ZERO',
 brief:'A shore station flashes a lamp toward a vessel that has stopped answering the radio.'},

{t:'Notebook, Backwards', c:'reverse', k:{}, pt:'THE FLYING MACHINE NEEDS A LIGHTER FRAME',
 brief:'A page from an inventor\'s workshop, written so it can only be read in a mirror.'},

{t:'Intercept 07', c:'caesar', k:{shift:11}, pt:'MEET THE COURIER BEHIND THE MILL',
 brief:'Nobody is going to tell you what this is. Look at the shape of the words.'},

{t:'The Lodge Record', c:'pigpen', k:{}, pt:'THE VAULT KEY LIES UNDER THE THIRD STONE',
 brief:'Recovered from a Masonic ledger. There is not a single letter on the page.'},

{t:'Mirror in Babylon', c:'atbash', k:{}, pt:'SEND GRAIN BEFORE THE RIVER RISES',
 brief:'Another folded alphabet. No key to guess — there never was one.'},

{t:'Note Passed in Class', c:'a1z26', k:{}, pt:'MEET ME AT THE FLAGPOLE',
 brief:'Confiscated during fourth period. Numbers, nothing above twenty six.'},

{t:'Web Log Entry', c:'url', k:{}, pt:'search?q=admin login&page=2',
 brief:'A line pulled from a web server log. Percent signs where the awkward characters used to be.'},

{t:'Config Leak', c:'base64', k:{}, pt:'user=admin;pass=Summer2024!',
 brief:'Found in a plain-text config file, encoded rather than protected. Decode it, then explain to the developer why this was never security.'},

{t:'The Zigzag Order', c:'railfence', k:{rails:3}, pt:'ARTILLERY MOVES AT MIDNIGHT',
 brief:'The letters are all correct. Their order is not. Written across three rails.'},

{t:'Unlabelled, Unkeyed', c:'caesar', k:{shift:19}, hideKey:true, pt:'THE SAFE HOUSE IS COMPROMISED',
 brief:'No cipher named. No key given. You have twenty six possibilities and a one-letter word to work with.'},

{t:'The Indecipherable', c:'vigenere', k:{kw:'FALCON'}, pt:'SUPPLY LINES HOLD UNTIL SPRING',
 brief:'Three centuries of cryptographers called this unbreakable. The keyword is FALCON.'},

{t:'Prison Camp Note', c:'pigpen', k:{}, pt:'TUNNEL REACHES THE FENCE LINE',
 brief:'Scratched onto the inside of a tin cup and passed along the row.'},

{t:'First Principles', c:'binary', k:{}, pt:'Shannon was right',
 brief:'Eight symbols at a time, and only two of them exist.'},

{t:'Rot Your Own', c:'rot13', k:{}, pt:'ENCODING IS NOT ENCRYPTION',
 brief:'Second sighting. Encode this one yourself and notice something odd: the button you press does not matter.'},

{t:'Four Rails', c:'railfence', k:{rails:4}, pt:'THE BRIDGE IS MINED DO NOT CROSS',
 brief:'Same idea as before, one more rail. Count your letters before you assume it is a substitution.'},

{t:'Ransom Slip', c:'a1z26', k:{}, pt:'LEAVE THE BAG AT PLATFORM NINE',
 brief:'Numbers again. You should recognise this one on sight now.'},

{t:'Rebel Field Cipher', c:'vigenere', k:{kw:'MANCHESTER'}, pt:'GENERAL RETREATS TO THE RIDGE',
 brief:'A Civil War field message. The keyword this time is MANCHESTER.'},

{t:'The Merchant\'s Alphabet', c:'keyword', k:{kw:'LEXINGTON'}, pt:'THE SHIPMENT ARRIVES ON FRIDAY',
 brief:'A scrambled alphabet built from a single memorised word: LEXINGTON.'},

{t:'Memory Dump', c:'hex', k:{}, pt:'Access granted',
 brief:'Pulled from a memory capture. Pairs of characters, nothing past F.'},

{t:'Filter Evasion', c:'url', k:{}, pt:'<img src=x onerror=alert(1)>',
 brief:'An attacker encoded a payload so it would slip past a filter that only checked for the plain version. Decode it, then explain why the filter failed.'},

{t:'Fragment 22', c:'atbash', k:{}, pt:'BURN THIS AFTER READING',
 brief:'Unlabelled. You have seen this pattern twice already.'},

{t:'The Biliteral Page', c:'bacon', k:{}, pt:'HIDDEN',
 brief:'Francis Bacon\'s own method. Only two symbols exist, grouped in fives.'},

{t:'Boot Sector', c:'binary', k:{}, pt:'system halted',
 brief:'Ones and zeros, eight to a group. You have done this before.'},

{t:'The Second Word', c:'keyword', k:{kw:'BLUEGRASS'}, pt:'ROTATE THE GUARD AT ELEVEN',
 brief:'Another keyed alphabet. The word is BLUEGRASS.'},

{t:'Cracked in Seconds', c:'sha', type:'hash', k:{alg:'SHA-256',salt:''},
 pt:'password123',
 brief:'A password hash lifted from a breached database. There is no decrypt button — you have to guess the input and hash it yourself. It was one of the ten most common passwords of the decade. (Try candidates in the Workbench under SHA Hash.)'},

{t:'Shuffled, Not Swapped', c:'railfence', k:{rails:3}, hideKey:true, pt:'HOLD THE LINE UNTIL RELIEF ARRIVES',
 brief:'Frequency analysis will tell you the letters are ordinary English. So why can you not read it?'},

{t:'Multiply Then Add', c:'affine', k:{a:5,b:8}, pt:'MATHEMATICS IS THE LOCK',
 brief:'Caesar with a second dial. Multiplier five, shift eight.'},

{t:'Hidden in the Typeface', c:'bacon', k:{}, pt:'SEEK',
 brief:'Two symbols, five at a time. In the original method these were two barely different fonts on an innocent page.'},

{t:'File Signature', c:'hex', k:{}, pt:'MZ this is an executable',
 brief:'The first bytes of a suspicious file. Analysts read this format on sight.'},

{t:'Obfuscated Payload', c:'xor', k:{kw:'shark'}, pt:'connect to the beacon',
 brief:'Malware authors reach for this constantly because it is fast and lazy. Key: shark.'},

{t:'Second Dial', c:'affine', k:{a:7,b:12}, pt:'ARITHMETIC HIDES THE MESSAGE',
 brief:'Multiplier seven, shift twelve. Remember the multiplier cannot share a factor with twenty six.'},

{t:'Flat Frequencies', c:'vigenere', k:{kw:'RIVER'}, hideKey:false, pt:'NOTHING IN THE COUNT LOOKS UNUSUAL',
 brief:'Unlabelled. Your letter counts come out suspiciously even — and that flatness is the clue. Keyword: RIVER.'},

{t:'Salted and Slower', c:'sha', type:'hash', k:{alg:'SHA-256',salt:'K7#q'},
 pt:'letmein',
 brief:'Same idea, but this database salted every password with K7#q before hashing. Set the salt in the Workbench, then guess. Notice how the salt does not stop you — it just means your work on this account is worthless for every other account.'},

{t:'Corners and Dots', c:'pigpen', k:{}, pt:'THE ARCHIVE IS BENEATH THE CHAPEL',
 brief:'Unlabelled. But you do not read this one — you look at it.'},

{t:'Mirror Script', c:'reverse', k:{}, pt:'READ ME IN A LOOKING GLASS',
 brief:'Unlabelled. Try the last word first.'},

{t:'Key Reuse', c:'xor', k:{kw:'ab'}, hideKey:true, pt:'a short key is a weak key',
 brief:'Unlabelled, unkeyed, and the key is only two characters long. Look for the rhythm in the bytes.'},

{t:'Last Intercept', c:'caesar', k:{shift:22}, hideKey:true, pt:'YOU HAVE LEARNED TO SEE THE PATTERN',
 brief:'No cipher. No key. No hints from anyone. Finish it.'}
];

/* Points: a taught challenge is worth less than one you had to identify yourself. */
const RANKS = [
  [0,'Recruit'],[400,'Cadet'],[900,'Analyst'],[1600,'Cryptographer'],
  [2600,'Codebreaker'],[3800,'Cipher Master']
];
