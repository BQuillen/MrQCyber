/* ════════════════════════════════════════════════════════════════════
   INCIDENT RESPONSE — scenario data
   Each entry is a fully self-contained case. The engine (engine.js)
   knows nothing case-specific — everything it renders and checks comes
   from here, so adding a new case later means adding a new entry to
   this array and nothing else.

   Shape of one scenario:
   {
     id, title, caseNumber,
     briefing: {heading, lines:[...], mission:[...]},
     evidence: [{id, cat, title, time|null, ...display fields}],
     timeline: [evidence ids in the true chronological order — red
                herrings and non-sequence evidence are simply absent],
     factCheck: {prompt, items:[{id -> evidence id, relevant:bool}]},
     whatHappened: {prompt, options:[{text, correct, rationale}]},
     strongestEvidence: {prompt, pick:N, options:[{id -> evidence id, good:bool}], rationale:{good, bad}},
     protectHill: {prompt, pick:N, options:[{text, good:bool, rationale}]},
     reflect: {reveal:[...], questions:[...]}
   }
   ════════════════════════════════════════════════════════════════════ */

const SCENARIOS = [

/* ══════════════════════════════════════════════════════════════════
   CASE #HILL-01 — The Grade Portal Email
   ══════════════════════════════════════════════════════════════════ */
{
  id: 'hill01',
  seq: 1,
  title: 'The Grade Portal Email',
  caseNumber: 'HILL-01',
  orgName: 'The HILL',

  briefing: {
    heading: '8:10 a.m. — Tuesday morning at The HILL',
    lines: [
      'First period has barely begun when Ms. Wilson receives three nearly identical messages:'
    ],
    messages: [
      '"Did Mr. Uncman mean to send this?"',
      '"The grade portal link looks strange."',
      '"I clicked it — what do I do?"'
    ],
    linesAfter: [
      'A message has gone out to students from the school email account of Mr. Uncman, The HILL’s broadcasting and communications instructor. It says their media-project grades have been updated and urges them to sign in right away.',
      'But there is a problem: Mr. Uncman says he never sent it.',
      'Ms. Wilson has asked your team to serve as The HILL’s first incident-response team. You are not expected to know everything yet. Your job is to use the evidence you have, separate facts from guesses, and help protect the community.'
    ],
    mission: [
      'What most likely happened to Mr. Uncman’s account?',
      'Which evidence best supports your conclusion?',
      'What should The HILL do immediately to protect students and staff?'
    ]
  },

  /* ---------------- EVIDENCE LOCKER ---------------- */
  evidence: [
    { id:'email', cat:'inbox', title:'The email students received', time:'7:45 a.m.',
      email:{ from:'Mr. Uncman <uncman.broadcasting.help@gmail.com>',
              subject:'URGENT – revised media-project grade sheet',
              body:'Please open this immediately and sign in to view your grade.',
              linkText:'The HILL Grade Portal',
              linkHref:'http://thehill-grades-check.example/login' } },

    { id:'report-link', cat:'statements', title:'A student describes the email arriving', time:'7:46 a.m.',
      text:'"At 7:46 a.m., I got an email from Mr. Uncman saying: ‘URGENT: Open the revised media-project grade sheet before first period.’ It had a link."' },

    { id:'report-url', cat:'statements', title:'A student describes the login page', time:null,
      text:'"The page in the email looked like The HILL login page, but the address bar did not say thehill.edu."' },

    { id:'statement-1', cat:'statements', title:'Mr. Uncman’s statement', who:'Mr. Uncman', time:'7:35 a.m.',
      text:'"I did not send that message. Around 7:35 this morning, I was trying to access my school email from home."' },

    { id:'statement-2', cat:'statements', title:'Mr. Uncman’s statement, continued', who:'Mr. Uncman', time:null,
      text:'"My phone showed a prompt asking whether I was trying to sign in. I was confused because email wasn’t loading, so I tapped Approve."' },

    { id:'reset', cat:'logs', title:'Password-reset activity', time:'6:58 a.m.',
      lines:['6:58 a.m. — Password-reset request started for uncman@thehill.edu.', '7:02 a.m. — Request canceled.'] },

    { id:'login-bad', cat:'logs', title:'Login alert', time:'7:36 a.m.',
      lines:['7:36 a.m. — New sign-in to uncman@thehill.edu', 'Device: unrecognized', 'Location: out of state', 'Browser: Chrome on Windows'] },

    { id:'login-good', cat:'logs', title:'Login alert', time:'7:38 a.m.',
      lines:['7:38 a.m. — Successful sign-in to uncman@thehill.edu', 'Device: Mr. Uncman’s usual school laptop'] },

    { id:'forward', cat:'logs', title:'Email activity log', time:'7:42 a.m.',
      lines:['7:42 a.m. — New forwarding rule created', 'Forward messages containing “grade” to grades.review.archive@example.com'] },

    { id:'massmail', cat:'logs', title:'Email activity log', time:'7:45 a.m.',
      lines:['7:45 a.m. — 184 emails sent from uncman@thehill.edu'] },

    { id:'note', cat:'board', title:'Staff-room note', time:null,
      text:'Reminder: Never approve a sign-in prompt you did not initiate.' },

    { id:'policy', cat:'board', title:'The HILL policy excerpt', time:null,
      text:'All staff accounts must use multi-factor authentication. Passwords must not be shared.' },

    { id:'printer', cat:'board', title:'Print lab account locked', time:'7:20 a.m.',
      text:'The library’s shared print-lab account was locked at 7:20 a.m. after too many failed login attempts.' },

    { id:'usb', cat:'board', title:'Unlabeled USB drive found', time:null,
      text:'A USB drive labeled “PAYROLL — CONFIDENTIAL” was found near the cafeteria on Monday afternoon. No one has claimed it.' }
  ],

  /* ---------------- TIMELINE ----------------
     True sequence only. Slot 7 is the email itself, not 'report-link'
     (the student's account of receiving it) — the student statement
     is only useful for pinning the time, the email is the actual
     event. 'report-link' stays in the evidence pool as a same-moment
     duplicate/decoy. 'statement-2', 'report-url', and 'email' itself
     carry no explicit time in their displayed text, so there's
     nothing to memorize and reuse here — they have to be reasoned
     into place from what they describe, same as in a real
     investigation. */
  timeline: ['reset', 'statement-2', 'login-bad', 'login-good', 'forward', 'massmail', 'email', 'report-url'],

  /* ---------------- FACT-CHECK ----------------
     Scoped to the four "board" items on purpose — nobody seriously
     doubts a login alert belongs in this investigation, but these four
     are genuine judgment calls, which is the actual point. */
  factCheck: {
    prompt: 'Not everything on the table belongs in this investigation. Sort these four.',
    items: [
      { id:'note', relevant:true,
        why:'This is exactly the mistake in Mr. Uncman’s own statement — a sign-in prompt he didn’t start, approved anyway. It’s context that explains how the access happened.' },
      { id:'policy', relevant:true,
        why:'This matters for what The HILL should do next — it’s the standard the account should have been (and should now be) held to.' },
      { id:'printer', relevant:false,
        why:'It sounds like it could be related — a lockout from failed sign-ins is exactly the kind of thing this case is about. But it’s a different account entirely (the shared print-lab kiosk, not Mr. Uncman’s), and nothing in any log connects the two. A similar-sounding event isn’t the same event.' },
      { id:'usb', relevant:false,
        why:'A tempting find, and a real social-engineering tactic worth knowing about — but nothing ties it to Mr. Uncman’s account, this email, or even this week. Interesting on its own; not evidence in this case.' }
    ]
  },

  /* ---------------- WHAT HAPPENED ---------------- */
  whatHappened: {
    prompt: 'Based on the evidence, what most likely happened to Mr. Uncman’s account?',
    options: [
      { text:'An attacker guessed or cracked Mr. Uncman’s password to get into his account directly.',
        correct:false,
        rationale:'There’s no evidence pointing at the password itself — the one reset attempt that morning was actually canceled, and the real access came through an approved sign-in prompt, not a cracked password.' },
      { text:'Mr. Uncman approved a fraudulent sign-in prompt, giving an attacker access to his real account.',
        correct:true,
        rationale:'This is the sequence the timeline actually supports: the approved prompt lines up right before the unrecognized-device login, and everything after it — the forwarding rule, the mass email — flows from that access.' },
      { text:'A malware-infected USB drive gave an attacker remote access to the school’s network.',
        correct:false,
        rationale:'The USB drive turned up in a different place on a different day, with nothing in the logs connecting it to this account. It’s a loose thread, not a lead.' },
      { text:'He shared his login with a colleague, who accidentally sent the email.',
        correct:false,
        rationale:'Nothing in any statement or log suggests a second person had his credentials — and it doesn’t explain the out-of-state, unrecognized-device login at 7:36.' }
    ]
  },

  /* ---------------- STRONGEST EVIDENCE ---------------- */
  strongestEvidence: {
    prompt: 'Pick the two pieces of evidence that most strongly support that conclusion.',
    pick: 2,
    options: [
      { id:'statement-2', good:true,
        blurb:'Mr. Uncman describes tapping “Approve” on a sign-in prompt he didn’t start.' },
      { id:'login-bad', good:true,
        blurb:'A sign-in from an unrecognized, out-of-state device happens right after that.' },
      { id:'forward', good:true,
        blurb:'A new rule appears, redirecting any mail mentioning “grade” to an outside address.' },
      { id:'report-link', good:false,
        blurb:'A student describes receiving the urgent grade-sheet email with a link in it.' },
      { id:'reset', good:false,
        blurb:'A password-reset request was started, then canceled two minutes later.' },
      { id:'printer', good:false,
        blurb:'A different account — the library’s print-lab kiosk — got locked out.' }
    ],
    rationaleGood: 'Strong picks. Mr. Uncman’s own account of approving a prompt he didn’t start, paired with the login from an unrecognized out-of-state device minutes later, is the closest thing here to a direct cause-and-effect. The forwarding rule is a close third — it’s solid evidence of what the attacker did once inside, just one step removed from how they got in.',
    rationaleBad: 'Those are real pieces of the case, but not the strongest support for *how the account was compromised* specifically. A student receiving the email or the canceled reset attempt are downstream effects or loose ends, not the moment access was actually gained — and the printer clue was already ruled out as unconnected.'
  },

  /* ---------------- PROTECT THE HILL NOW ---------------- */
  protectHill: {
    prompt: 'Choose the three immediate actions you’d recommend to Ms. Wilson right now.',
    pick: 3,
    options: [
      { text:'Remove the forwarding rule from the account.', good:true,
        rationale:'The forwarding rule is still quietly redirecting mail as long as it exists — this stops the ongoing part of the incident, not just the part that already happened.' },
      { text:'Hold onto the USB drive found near the cafeteria for further analysis.', good:false,
        rationale:'Preserving evidence is generally good instinct — just not evidence from a different day and location with no tie to this account. It doesn’t move this response forward.' },
      { text:'Wait for Mr. Uncman to personally review and approve every step before IT does anything, since it’s his account.', good:false,
        rationale:'It sounds respectful of his ownership of the account, but incident response runs on speed — every extra minute is more time the forwarding rule and any lingering access stay live.' },
      { text:'Force a password reset and sign the account out of every active session.', good:true,
        rationale:'This directly cuts off whatever access the attacker still has, right now, rather than hoping the door happens to close on its own.' },
      { text:'Send a follow-up message telling students and staff not to click the link, and asking anyone who already did to report it.', good:true,
        rationale:'184 emails already went out. Containing the account doesn’t un-send them — the community still needs to know.' },
      { text:'Reset the password, but leave the sign-in approval settings as they are — Mr. Uncman just needs to be more careful next time.', good:false,
        rationale:'A password reset alone doesn’t address what actually happened here: a fraudulent prompt got approved. Telling one person to “be more careful” isn’t a safeguard, it’s a hope.' }
    ]
  },

  /* ---------------- REFLECT ---------------- */
  reflect: {
    reveal: [
      'Someone triggered an unexpected sign-in prompt. Mr. Uncman approved it while trying to access email, which let an attacker into his account. The attacker created a forwarding rule and sent a convincing phishing email from his real school account.',
      'This is the best-supported explanation — not a certainty. The printer and USB clues were never connected to it. Real incident responders have to resist treating every coincidence in the building as evidence.'
    ],
    questions: [
      'What was your process for deciding whether something belonged in the investigation versus just seemed related?',
      'How did building the timeline change your understanding of how this incident actually unfolded?',
      'What could have reduced the harm in this situation?',
      'How can investigating one incident like this help The HILL strengthen its defenses against future ones?'
    ]
  }
},

/* ══════════════════════════════════════════════════════════════════
   CASE #QBIT-01 — The GlacierForge Beta Key
   Adds two new mechanics on top of the base game: files that get
   encrypted after a click, and a Base64-encoded note the team has to
   decrypt themselves before they can reason about what it means.
   ══════════════════════════════════════════════════════════════════ */
{
  id: 'qbit01',
  seq: 2,
  title: 'The GlacierForge Beta Key',
  caseNumber: 'QBIT-01',
  orgName: 'Q-Bit Games',

  briefing: {
    heading: '9:10 a.m. — Monday at Q-Bit Games',
    lines: [
      'Barry Shmelly, a systems programmer on the GlacierForge team, calls the help desk sounding rattled.'
    ],
    messages: [
      '"None of my files will open — they all have some weird new extension."',
      '"There\'s a text file on my desktop that\'s just random letters and numbers."',
      '"I think it might be from an email about a beta key?"'
    ],
    linesAfter: [
      'Barry is well known around the office — and online — for being vocal about the games he loves, especially the studio\'s upcoming release, GlacierForge. He streams a few nights a week and isn\'t shy about sharing details of his life with his audience.',
      'IT has asked your team to figure out what happened, and what Q-Bit Games should do right now to contain it.'
    ],
    mission: [
      'What most likely happened to Barry\'s account and files?',
      'What does the note left on his computer tell us?',
      'What should Q-Bit Games do immediately to contain this and protect other employees?'
    ]
  },

  /* ---------------- EVIDENCE LOCKER ---------------- */
  evidence: [
    { id:'email', cat:'inbox', title:'The email Barry received', time:'9:14 a.m.',
      email:{ from:'GlacierForge Beta Team <beta-access@glacierforge-keys.example>',
              subject:'🎮 You\'re Invited: GlacierForge Beta Key Inside!',
              body:'Hey Barry! Loved your stream last week where you said you\'d give anything for early access to GlacierForge. Here\'s your exclusive beta key — just sign in with your Q-Bit email to claim it before spots run out!',
              linkText:'Claim My Beta Key',
              linkHref:'http://glacierforge-betakeys.example/claim' } },

    { id:'statement-click', cat:'statements', title:'Barry describes clicking the link', who:'Barry Shmelly', time:null,
      text:'"I saw an email about a beta key for GlacierForge — I\'ve literally been begging for access on stream for weeks, so I didn\'t think twice. I clicked the link and signed in with my work email like it asked."' },

    { id:'installer', cat:'logs', title:'Download activity log', time:'9:15 a.m.',
      lines:['9:15 a.m. — beta_key_installer.exe downloaded and executed from Downloads folder'] },

    { id:'outbound', cat:'logs', title:'Endpoint protection log', time:'9:17 a.m.',
      lines:['9:17 a.m. — Outbound connection attempt to 185.44.12.9 blocked by endpoint protection'] },

    { id:'encrypt-log', cat:'logs', title:'File activity log', time:'9:19 a.m.',
      lines:['9:19 a.m. — 1,240 files renamed with extension .qlockedq across Barry\'s local drive'] },

    { id:'statement-notice', cat:'statements', title:'Barry describes his files breaking', who:'Barry Shmelly', time:null,
      text:'"A few minutes later my file explorer started acting weird — icons changed, and then I couldn\'t open anything. Everything had this new extension on it."' },

    { id:'note', cat:'board', title:'An encoded text file on Barry\'s desktop', time:null,
      code:'VGhhbmtzIGZvciB0aGUgYmV0YSBrZXkgdGlwLCBCYXJyeS4gU2F5IGhpIHRvIFBpeGVsIGZvciBtZS4gLSBTaGFkb3dLZXk=' },

    { id:'report', cat:'statements', title:'Barry\'s help-desk ticket', who:'Barry Shmelly', time:'9:25 a.m.',
      text:'"None of my files will open and there\'s a weird text file on my desktop. I think it happened right after I clicked a link in an email."' },

    { id:'bio', cat:'board', title:'Pinned message in the team Discord', time:null,
      text:'Barry, pinned in #general: "Streaming GlacierForge every Tues/Thurs after work — come hang out! Ask me anything, or say hi to my dog Pixel 🐕"' },

    { id:'policy', cat:'board', title:'Q-Bit Games security policy', time:null,
      text:'Never enter your company credentials on a site opened from an email link. Report unexpected "exclusive access" or beta-key offers to IT before clicking anything.' },

    { id:'reminder', cat:'board', title:'Reminder posted in the break room', time:null,
      text:'If an offer feels exclusive or too good to pass up, verify it directly through the official source first — not through the link in the email.' },

    { id:'monitor', cat:'board', title:'IT ticket from last Friday', time:null,
      text:'Barry\'s monitor has been flickering intermittently. Replacement requested.' },

    { id:'usb-layoffs', cat:'board', title:'Unlabeled USB drive found', time:null,
      text:'A USB drive labeled "CONFIDENTIAL — LAYOFFS LIST" was found in the break room. No one has claimed it.' }
  ],

  /* ---------------- TIMELINE ----------------
     8 true events. 'statement-click', 'statement-notice', and 'note'
     carry no explicit time in their displayed text — one more untimed
     item than HILL-01, since this case is meant to run a little harder. */
  timeline: ['email', 'statement-click', 'installer', 'outbound', 'encrypt-log', 'statement-notice', 'note', 'report'],

  /* ---------------- DECRYPT THE NOTE ----------------
     A new mechanic: the note evidence card shows raw Base64 gibberish.
     Here they actually decode it, then have to reason about what the
     decoded text implies rather than just being told. */
  decrypt: {
    heading: 'A note, but not in plain text',
    intro: 'Tucked inside a file called READ_ME_NOW.txt on Barry\'s desktop is a block of text that isn\'t readable as-is. It looks encoded rather than encrypted — decode it below to find out what it says.',
    encoded: 'VGhhbmtzIGZvciB0aGUgYmV0YSBrZXkgdGlwLCBCYXJyeS4gU2F5IGhpIHRvIFBpeGVsIGZvciBtZS4gLSBTaGFkb3dLZXk=',
    question: {
      prompt: 'Now that you can read it, what does this note suggest about how the attacker knew what Barry wanted?',
      options: [
        { text:'The attacker gained access to Q-Bit\'s internal employee database and looked up Barry\'s interests.',
          correct:false,
          rationale:'There\'s no evidence of a database breach anywhere in the logs — everything the note references was already sitting in public view.' },
        { text:'The attacker used information Barry had already shared publicly, like his dog\'s name, to sound convincing.',
          correct:true,
          rationale:'Barry\'s own pinned Discord message mentions his dog Pixel — the exact detail the note references. The attacker didn\'t need to hack anything; they just read what Barry already posted.' },
        { text:'Someone at Q-Bit who knows Barry personally leaked his information to the attacker.',
          correct:false,
          rationale:'Nothing in the evidence points to an insider — every detail in the note lines up with things Barry posted publicly himself.' },
        { text:'The attacker randomly guessed details about Barry and got lucky with the dog\'s name.',
          correct:false,
          rationale:'A random guess landing on the exact name of Barry\'s dog, in a note that also references his beta-key interest, isn\'t a coincidence — it\'s research.' }
      ]
    }
  },

  /* ---------------- FACT-CHECK ---------------- */
  factCheck: {
    prompt: 'Not everything on the table belongs in this investigation. Sort these four.',
    items: [
      { id:'policy', relevant:true,
        why:'This matters for what Q-Bit should reinforce going forward — it\'s the standard Barry\'s click didn\'t follow.' },
      { id:'reminder', relevant:true,
        why:'This is exactly the instinct that would have stopped this — verify an "exclusive" offer before acting on it, which is precisely what didn\'t happen here.' },
      { id:'monitor', relevant:false,
        why:'A real ticket, but it\'s a hardware issue logged days earlier with nothing tying it to Barry\'s account or this email.' },
      { id:'usb-layoffs', relevant:false,
        why:'A tempting find, and a real social-engineering tactic worth knowing about — but nothing ties it to Barry\'s account or this incident.' }
    ]
  },

  /* ---------------- WHAT HAPPENED ---------------- */
  whatHappened: {
    prompt: 'Based on the evidence, what most likely happened to Barry\'s account and files?',
    options: [
      { text:'Barry\'s computer had outdated antivirus software, which let the malicious file run undetected.',
        correct:false,
        rationale:'There\'s no evidence of an antivirus gap in the logs — the file ran because Barry executed it himself after clicking the link, not because a scanner missed it.' },
      { text:'Barry clicked a phishing link personalized with details he\'d shared publicly, launching malicious software.',
        correct:true,
        rationale:'The timeline and the decoded note both point here: the email was crafted using Barry\'s own public posts, he clicked it, and the malicious file executed right after.' },
      { text:'An attacker on the same office network intercepted Barry\'s files as they were being saved.',
        correct:false,
        rationale:'Nothing in the logs shows activity from another device — the outbound connection and file encryption both trace back to Barry\'s own machine after he ran the file.' },
      { text:'A coworker plugged in an infected USB drive that spread malware to Barry\'s computer.',
        correct:false,
        rationale:'The USB drive that turned up was never connected to Barry\'s account or machine in any log — it\'s a separate, unconnected item.' }
    ]
  },

  /* ---------------- STRONGEST EVIDENCE ---------------- */
  strongestEvidence: {
    prompt: 'Pick the two pieces of evidence that most strongly support that conclusion.',
    pick: 2,
    options: [
      { id:'email', good:true,
        blurb:'A "beta key" offer arrives referencing a game Barry had talked about publicly.' },
      { id:'installer', good:true,
        blurb:'A program downloaded from that link runs on Barry\'s machine minutes later.' },
      { id:'note', good:true,
        blurb:'A note left behind decodes to a message referencing details from Barry\'s own posts.' },
      { id:'outbound', good:false,
        blurb:'A blocked connection attempt is logged shortly after the file was run.' },
      { id:'monitor', good:false,
        blurb:'Barry\'s monitor had been flickering — logged as a separate ticket days earlier.' },
      { id:'usb-layoffs', good:false,
        blurb:'An unclaimed USB drive turns up in the break room, labeled to grab attention.' }
    ],
    rationaleGood: 'Strong picks. The email shows exactly how the attacker got Barry to click, and the decoded note is direct proof the attacker had researched him rather than guessed — together they explain both how and why this worked. The installer log is a close third, marking the exact moment the compromise began.',
    rationaleBad: 'Those are real details from the case, but they don\'t explain how the attack succeeded. The blocked connection is a downstream effect, the monitor ticket is an unrelated hardware issue, and the USB drive was never tied to Barry\'s account at all.'
  },

  /* ---------------- PROTECT Q-BIT GAMES NOW ---------------- */
  protectHill: {
    prompt: 'Choose the three immediate actions you\'d recommend right now.',
    pick: 3,
    options: [
      { text:'Isolate Barry\'s machine from the network immediately to stop the encryption from spreading.', good:true,
        rationale:'This directly stops the encryption process from reaching more files or shared drives — contain first, investigate after.' },
      { text:'Pay whatever the note is asking for so Barry can get his files back faster.', good:false,
        rationale:'There\'s no guarantee paying gets anything back, and it directly funds the attacker to do this again — to Barry or someone else.' },
      { text:'Have Barry try to fix the encrypted files himself before looping in IT.', good:false,
        rationale:'Untrained attempts to "fix" encrypted files can destroy evidence IT needs, and waste time while the account could still be exposed.' },
      { text:'Force a password reset and revoke Barry\'s active sessions.', good:true,
        rationale:'Barry\'s credentials were entered on a fake page — resetting the password and killing active sessions closes that specific door.' },
      { text:'Send a warning to other employees about the fake GlacierForge beta-key email.', good:true,
        rationale:'Other employees are just as likely to want early access to GlacierForge — they need to know this exact lure is circulating.' },
      { text:'Quietly restore Barry\'s files from backup and consider the incident closed.', good:false,
        rationale:'Restoring files doesn\'t answer how the attacker knew what they knew, or whether Barry\'s credentials are still exposed somewhere else.' }
    ]
  },

  /* ---------------- REFLECT ---------------- */
  reflect: {
    reveal: [
      'Barry received a phishing email personalized around something he had publicly said he wanted — early access to a game he was excited about. He clicked the link and signed in with his work credentials, which let an attacker run a program that began encrypting his files. The note left behind referenced his dog by name — the same detail from a message Barry had pinned in the team Discord — confirming the attacker built this message using information Barry had already shared publicly.',
      'This is the best-supported explanation — not a certainty. The flickering monitor and the "layoffs list" USB drive were never connected to it. Nothing about this attack required breaking into Q-Bit\'s systems — it worked because it was personal.'
    ],
    questions: [
      'What made this email more convincing than a generic phishing attempt?',
      'How did Barry\'s own public posts end up helping the attacker?',
      'Before clicking, what could Barry have done to verify this email was really from who it claimed to be?',
      'Why does recognizing phishing matter, even for someone who doesn\'t think of themselves as an easy target?'
    ]
  }
}

];
