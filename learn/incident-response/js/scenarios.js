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
  title: 'Case #HILL-01 — The Grade Portal Email',
  caseNumber: 'HILL-01',

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
}

];
