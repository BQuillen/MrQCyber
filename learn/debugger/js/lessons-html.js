/* ============================================================
   HTML track — 5 lessons, then 5 broken pages to repair.

   Debug checks read the LIVE parsed document (ctx.doc), so they test
   what the browser actually built — not the text the student typed.
   Labels describe the GOAL, never the fix.
   ============================================================ */

TRACKS.html = {
  id: 'html',
  name: 'HTML',
  icon: '</>',
  accent: '#ff7a3d',
  tagline: 'structure · the skeleton',
  desc: 'Tags, nesting, and attributes — the bones every web page is built from. Most HTML bugs are a tag that never got closed, and the damage always starts at that exact spot.',
  stages: [

    /* ─────────────── LEARN ─────────────── */

    {
      id: 'h-l1',
      kind: 'teach',
      title: 'Tags come in pairs',
      concept: `
        <p>HTML marks up text by wrapping it in <strong>tags</strong>. Almost every tag comes as a
        pair: an <em>opening tag</em> like <code>&lt;h1&gt;</code> and a <em>closing tag</em> like
        <code>&lt;/h1&gt;</code> — same word, with a slash.</p>
        <p>Whatever sits between them gets that treatment. <code>&lt;h1&gt;</code> means
        "this is the most important heading on the page," so the browser makes it big and bold.
        <code>&lt;p&gt;</code> means "this is a paragraph."</p>
        <ul>
          <li>The closing tag tells the browser <strong>where to stop</strong>.</li>
          <li>Forget it, and the browser keeps applying that tag to everything below.</li>
          <li>That is the single most common HTML bug you will ever hunt.</li>
        </ul>`,
      files: [{
        name: 'index.html', lang: 'html', editable: true,
        code: `<!DOCTYPE html>
<html>
<head>
  <title>Cyber Club</title>
</head>
<body>

  <h1>Cyber Club</h1>

  <p>We meet every Tuesday in Room 214.</p>
  <p>Bring a laptop if you have one.</p>

</body>
</html>`
      }],
      runMode: 'raw',
      tryIt: [
        'Change <code>&lt;h1&gt;</code> to <code>&lt;h2&gt;</code> on both the opening and the closing tag. What happens to the size?',
        'Add a third <code>&lt;p&gt;</code> with your own sentence.',
        'Now delete just the <code>&lt;/h1&gt;</code> and press Run. Remember what you see — you will meet this bug again.'
      ]
    },

    {
      id: 'h-l2',
      kind: 'teach',
      title: 'Nesting builds a tree',
      concept: `
        <p>Tags go <strong>inside</strong> other tags. A <code>&lt;li&gt;</code> (list item) lives inside a
        <code>&lt;ul&gt;</code> (unordered list), which might live inside a <code>&lt;div&gt;</code>.
        The browser turns all of that into a tree of boxes inside boxes.</p>
        <p>The rule that matters: tags must close in the <em>reverse order</em> they opened —
        like nesting cups. <code>&lt;p&gt;&lt;strong&gt;…&lt;/strong&gt;&lt;/p&gt;</code> is correct.
        <code>&lt;p&gt;&lt;strong&gt;…&lt;/p&gt;&lt;/strong&gt;</code> is <strong>crossed</strong>, and the
        browser will guess what you meant — usually wrong.</p>
        <ul>
          <li>Indent nested tags. Bugs become visible when the shape is visible.</li>
          <li>If two tags cross, the browser silently repairs it. No error appears.</li>
        </ul>`,
      files: [{
        name: 'index.html', lang: 'html', editable: true,
        code: `<!DOCTYPE html>
<html>
<body>

  <div>
    <h2>Meeting Notes</h2>
    <ul>
      <li>Password strength</li>
      <li>Phishing red flags</li>
      <li><strong>Homework:</strong> pick a passphrase</li>
    </ul>
  </div>

</body>
</html>`
      }],
      runMode: 'raw',
      tryIt: [
        'Add a fourth <code>&lt;li&gt;</code> to the list.',
        'Wrap the whole <code>&lt;ul&gt;</code> in a second <code>&lt;div&gt;</code>. Nothing changes visually — but the tree got deeper.',
        'Change <code>&lt;ul&gt;</code> to <code>&lt;ol&gt;</code> on both tags to get numbers instead of bullets.'
      ]
    },

    {
      id: 'h-l3',
      kind: 'teach',
      title: 'Attributes carry the details',
      concept: `
        <p>An opening tag can hold extra information called <strong>attributes</strong>, written as
        <code>name="value"</code>. A link needs to know where it goes; an image needs to know which
        file to load.</p>
        <ul>
          <li><code>href</code> — the address a <code>&lt;a&gt;</code> link points to</li>
          <li><code>src</code> — the file an <code>&lt;img&gt;</code> loads</li>
          <li><code>alt</code> — text describing an image for screen readers</li>
          <li><code>class</code> / <code>id</code> — labels that CSS and JavaScript use to find the element</li>
        </ul>
        <p>The <em>quotes matter enormously</em>. An opening quote runs until the browser finds the
        next quote — even if that quote is fifty lines away. A single missing <code>"</code> can
        swallow half your page.</p>`,
      files: [{
        name: 'index.html', lang: 'html', editable: true,
        code: `<!DOCTYPE html>
<html>
<body>

  <h2>Security Links</h2>

  <p>
    <a href="https://www.cisa.gov" target="_blank">CISA</a> —
    the government's cybersecurity agency.
  </p>

  <p class="note">
    Always check where a link goes <em>before</em> you click it.
  </p>

</body>
</html>`
      }],
      runMode: 'raw',
      tryIt: [
        'Hover over the link. Your browser shows the <code>href</code> at the bottom of the window.',
        'Add <code>title="Opens in a new tab"</code> to the link, then hover again.',
        'Delete the closing quote after <code>cisa.gov</code> and press Run. Watch text disappear.'
      ]
    },

    {
      id: 'h-l4',
      kind: 'teach',
      title: 'Some tags stand alone',
      concept: `
        <p>A few tags have nothing to wrap, so they never get a closing tag. They are called
        <strong>void elements</strong>:</p>
        <ul>
          <li><code>&lt;img&gt;</code> — an image</li>
          <li><code>&lt;br&gt;</code> — a line break</li>
          <li><code>&lt;hr&gt;</code> — a horizontal divider</li>
          <li><code>&lt;input&gt;</code> — a form field</li>
          <li><code>&lt;meta&gt;</code> and <code>&lt;link&gt;</code> — page settings in the head</li>
        </ul>
        <p>Writing <code>&lt;/img&gt;</code> is not an error the browser reports — it just quietly
        ignores it. Knowing which tags are void keeps you from hunting for a closing tag that was
        never supposed to exist.</p>`,
      files: [{
        name: 'index.html', lang: 'html', editable: true,
        code: `<!DOCTYPE html>
<html>
<body>

  <h2>Club Badge</h2>

  <img src="data:image/svg+xml;utf8,
    <svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'>
      <rect width='120' height='120' rx='14' fill='%23145c68'/>
      <text x='60' y='72' font-size='42' fill='%231fb6a8'
            text-anchor='middle' font-family='monospace'>CQ</text>
    </svg>" alt="Cyber Club badge" width="120">

  <hr>

  <p>
    Room 214<br>
    Tuesdays, 3:15 pm
  </p>

</body>
</html>`
      }],
      runMode: 'raw',
      tryIt: [
        'Remove the <code>&lt;br&gt;</code>. The two lines join into one — that is what it was doing.',
        'Change the badge <code>width</code> to <code>60</code>.',
        'Blank out the <code>src</code> value. The <code>alt</code> text appears instead — that is why <code>alt</code> matters.'
      ]
    },

    {
      id: 'h-l5',
      kind: 'teach',
      title: 'Structure with meaning',
      concept: `
        <p>You could build an entire page out of <code>&lt;div&gt;</code>. You should not.
        <strong>Semantic tags</strong> say what a section <em>is</em>, which helps screen readers,
        search engines, and — most usefully for you — other humans reading your code.</p>
        <ul>
          <li><code>&lt;header&gt;</code> — the top of the page or a section</li>
          <li><code>&lt;nav&gt;</code> — a group of navigation links</li>
          <li><code>&lt;main&gt;</code> — the primary content (only one per page)</li>
          <li><code>&lt;section&gt;</code> / <code>&lt;article&gt;</code> — chunks of related content</li>
          <li><code>&lt;footer&gt;</code> — the bottom of the page or a section</li>
        </ul>
        <p>When a page is built from meaningful tags, a misplaced closing tag jumps out at you.
        When it is 40 nested <code>&lt;div&gt;</code>s, it does not.</p>`,
      files: [{
        name: 'index.html', lang: 'html', editable: true,
        code: `<!DOCTYPE html>
<html>
<head>
<style>
  body { font-family: system-ui, sans-serif; margin: 0; color: #16323d; }
  header { background: #145c68; color: #e8f4f8; padding: 20px 24px; }
  nav a { color: #a0daef; margin-right: 16px; }
  main { padding: 24px; }
  section { border-left: 3px solid #1fb6a8; padding-left: 14px; margin-bottom: 20px; }
  footer { background: #f1f5f7; padding: 14px 24px; font-size: 14px; color: #557; }
</style>
</head>
<body>

  <header>
    <h1>Cyber Club</h1>
    <nav>
      <a href="#meet">Meetings</a>
      <a href="#learn">What we learn</a>
    </nav>
  </header>

  <main>
    <section id="meet">
      <h2>Meetings</h2>
      <p>Tuesdays at 3:15 pm in Room 214.</p>
    </section>

    <section id="learn">
      <h2>What we learn</h2>
      <p>Networking, threat hunting, and how to break your own code on purpose.</p>
    </section>
  </main>

  <footer>Fayette County Public Schools</footer>

</body>
</html>`
      }],
      runMode: 'raw',
      tryIt: [
        'Add a third <code>&lt;section&gt;</code> inside <code>&lt;main&gt;</code>.',
        'Move the <code>&lt;nav&gt;</code> out of the <code>&lt;header&gt;</code>. The teal background stops covering it.',
        'Change the <code>border-left</code> colour on <code>section</code> to <code>#ff5b00</code>.'
      ]
    },

    /* ─────────────── DEBUG ─────────────── */

    {
      id: 'h-d1',
      kind: 'debug',
      title: 'Everything is gigantic',
      brief: `<p>This club announcement should show <strong>one large heading</strong> followed by two
        normal-sized paragraphs.</p>
        <p>Instead the entire page is heading-sized. Something opened and never closed —
        find the exact line where the damage starts.</p>`,
      goal: 'One big heading that reads "Cyber Club Weekly", then two paragraphs in ordinary body text.',
      files: [{
        name: 'index.html', lang: 'html', editable: true,
        code: `<!DOCTYPE html>
<html>
<body>

  <h1>Cyber Club Weekly

  <p>This week we are learning how to spot a phishing email.</p>

  <p>Meet in Room 214 at 3:15. Bring your questions.</p>

</body>
</html>`
      }],
      runMode: 'raw',
      checks: [
        {
          label: 'The page has exactly one heading',
          test: c => c.doc.querySelectorAll('h1').length === 1
        },
        {
          label: 'The heading holds only the title — no paragraphs trapped inside it',
          test: c => {
            const h = c.doc.querySelector('h1');
            return !!h && h.querySelectorAll('p').length === 0;
          }
        },
        {
          label: 'Both paragraphs are outside the heading, at normal text size',
          test: c => {
            const ps = Array.from(c.doc.querySelectorAll('p'));
            return ps.length === 2 && ps.every(p => !p.closest('h1'));
          }
        },
        {
          label: 'The heading still reads "Cyber Club Weekly"',
          test: c => {
            const h = c.doc.querySelector('h1');
            return !!h && h.textContent.trim() === 'Cyber Club Weekly';
          }
        }
      ],
      hints: [
        'Read the page from the top and find the first thing that looks wrong. Everything <em>above</em> that point is fine — the bug is at the boundary.',
        'Look at line 5. Compare it to how every other pair of tags on this page is written. What does line 5 have that the paragraphs have too, and what is it missing?',
        'A browser applies a tag to everything it reads until it finds that tag\'s closing partner. If it never finds one, it keeps going to the end of the document. Which tag on this page never gets its partner?'
      ]
    },

    {
      id: 'h-d2',
      kind: 'debug',
      title: 'A link ate the page',
      brief: `<p>This resource list should show <strong>two</strong> links, then a closing note.</p>
        <p>Right now one link has vanished completely and the other one points somewhere strange.
        Hover over the link that is left and look at the address your browser reports.</p>`,
      goal: 'A list with two working links — "CISA" pointing at https://www.cisa.gov, and "Have I Been Pwned" — followed by the note underneath.',
      files: [{
        name: 'index.html', lang: 'html', editable: true,
        code: `<!DOCTYPE html>
<html>
<body>

  <h2>Security Links</h2>

  <ul>
    <li><a href="https://www.cisa.gov>CISA</a></li>
    <li><a href="https://haveibeenpwned.com">Have I Been Pwned</a></li>
  </ul>

  <p class="note">Ask an adult before clicking a link you did not expect.</p>

</body>
</html>`
      }],
      runMode: 'raw',
      checks: [
        {
          label: 'The list shows two items',
          test: c => c.doc.querySelectorAll('li').length === 2
        },
        {
          label: 'Both link texts are visible on the page',
          test: c => {
            const t = c.doc.body.textContent;
            return t.includes('CISA') && t.includes('Have I Been Pwned');
          }
        },
        {
          label: 'The first link points exactly at https://www.cisa.gov',
          test: c => {
            const a = c.doc.querySelector('li a');
            return !!a && a.getAttribute('href') === 'https://www.cisa.gov';
          }
        },
        {
          label: 'The closing note is still on the page',
          test: c => {
            const p = c.doc.querySelector('p.note');
            return !!p && p.textContent.includes('did not expect');
          }
        }
      ],
      hints: [
        'The second link is written correctly. Put the two <code>&lt;li&gt;</code> lines side by side and compare them character by character.',
        'Count the double-quote marks on line 8. Then count them on line 9. Attribute values need a matching pair — one to open, one to close.',
        'When the browser opens a quoted attribute value, it reads forward until it finds the <em>next</em> quote anywhere in the file — even one that belongs to a different tag on a different line. Everything in between becomes part of that value.'
      ]
    },

    {
      id: 'h-d3',
      kind: 'debug',
      title: 'Bold that will not stop',
      brief: `<p>Only the <strong>first</strong> sentence should be bold. The second paragraph should be
        ordinary text.</p>
        <p>Both are bold. Nothing is misspelled and no tag is missing — but two tags are in the
        wrong order.</p>`,
      goal: 'Paragraph one bold, paragraph two normal weight.',
      files: [{
        name: 'index.html', lang: 'html', editable: true,
        code: `<!DOCTYPE html>
<html>
<body>

  <h2>Password Rules</h2>

  <p><strong>Never reuse a password across accounts.</p>

  <p>Use a long passphrase instead — four random words beats a short password.</strong></p>

</body>
</html>`
      }],
      runMode: 'raw',
      checks: [
        {
          label: 'There are exactly two paragraphs',
          test: c => c.doc.querySelectorAll('p').length === 2
        },
        {
          label: 'The first sentence is still bold',
          test: c => {
            const p = c.doc.querySelectorAll('p')[0];
            return !!p && !!p.querySelector('strong') &&
              p.querySelector('strong').textContent.includes('Never reuse');
          }
        },
        {
          label: 'The second paragraph is NOT bold',
          test: c => {
            const p = c.doc.querySelectorAll('p')[1];
            if (!p) return false;
            if (p.querySelector('strong') || p.querySelector('b')) return false;
            return !p.closest('strong') && !p.closest('b');
          }
        },
        {
          label: 'Both sentences are still on the page',
          test: c => {
            const t = c.doc.body.textContent;
            return t.includes('Never reuse a password') && t.includes('four random words');
          }
        }
      ],
      hints: [
        'Nothing here is missing. Every tag that opens does eventually close. The problem is <em>where</em> they close.',
        'Write out the order the tags open, then the order they close. Opening: <code>p</code>, <code>strong</code>. Closing: does it match?',
        'Tags must close in the reverse order they opened, like nesting cups — the last one you opened is the first one you close. Two tags here are crossed over each other, so the bold never closes inside the paragraph that started it.'
      ]
    },

    {
      id: 'h-d4',
      kind: 'debug',
      title: 'The footer is stuck in the box',
      brief: `<p>The teal-bordered card should hold the officer list <em>only</em>. The footer belongs
        underneath it, outside the card, in plain grey text.</p>
        <p>Instead the footer has been swallowed into the card. Nothing is misspelled.</p>`,
      goal: 'One card containing the heading and both officers, with the footer sitting below the card — not inside its border.',
      files: [{
        name: 'index.html', lang: 'html', editable: true,
        code: `<!DOCTYPE html>
<html>
<head>
<style>
  body { font-family: system-ui, sans-serif; background: #f4f7f9; padding: 22px; }
  .card {
    background: #fff;
    border: 2px solid #1fb6a8;
    border-radius: 12px;
    padding: 16px 18px;
    margin-bottom: 18px;
  }
  footer { color: #667; font-size: 14px; text-align: center; }
</style>
</head>
<body>

  <div class="card">
    <h3>Club Officers</h3>
    <p>President: Maya</p>
    <p>Vice President: Dev</p>

  <footer>Cyber Club &middot; Room 214</footer>

</body>
</html>`
      }],
      runMode: 'raw',
      checks: [
        {
          label: 'There is exactly one card on the page',
          test: c => c.doc.querySelectorAll('.card').length === 1
        },
        {
          label: 'The footer is NOT inside the card',
          test: c => {
            const f = c.doc.querySelector('footer');
            return !!f && !f.closest('.card');
          }
        },
        {
          label: 'Both officers are still inside the card',
          test: c => {
            const card = c.doc.querySelector('.card');
            if (!card) return false;
            const t = card.textContent;
            return t.includes('Maya') && t.includes('Dev');
          }
        },
        {
          label: 'The heading is still inside the card',
          test: c => {
            const h = c.doc.querySelector('h3');
            return !!h && !!h.closest('.card');
          }
        }
      ],
      hints: [
        'The card has a visible border, so you can see exactly how far it reaches. It reaches further than it should. Where <em>should</em> it stop?',
        'Count the <code>&lt;div&gt;</code> tags in the body, then count the <code>&lt;/div&gt;</code> tags. They should match.',
        'A container keeps collecting children until it is closed. This one never closes, so it collects everything after it — right up to the end of the body.'
      ]
    },

    {
      id: 'h-d5',
      kind: 'debug',
      title: 'Half the page vanished',
      brief: `<p>This checklist should show a heading, <strong>three</strong> bullet points, and a closing
        line. Only the heading survives.</p>
        <p>The note the author left for themselves must stay in the file — and must stay
        invisible to visitors.</p>`,
      goal: 'Heading, three checklist bullets, and the closing line all visible. The author\'s TODO note stays in the file but never appears on screen.',
      files: [{
        name: 'index.html', lang: 'html', editable: true,
        code: `<!DOCTYPE html>
<html>
<body>

  <h2>Phishing Checklist</h2>

  <!-- TODO: add an example screenshot before Tuesday

  <ul>
    <li>Does the sender's address actually match the company?</li>
    <li>Is the message urgent, threatening, or too good to be true?</li>
    <li>Are there unexpected links or attachments?</li>
  </ul>

  <p>When in doubt, report it. Never reply.</p>

</body>
</html>`
      }],
      runMode: 'raw',
      checks: [
        {
          label: 'The checklist shows three bullet points',
          test: c => c.doc.querySelectorAll('li').length === 3
        },
        {
          label: 'The closing line is visible',
          test: c => c.doc.body.textContent.includes('When in doubt')
        },
        {
          label: 'The author\'s TODO note is still in the file',
          test: c => /<!--[\s\S]*TODO[\s\S]*?-->/.test(c.doc.documentElement.innerHTML)
        },
        {
          label: 'The TODO note does not show up on the page',
          test: c => !c.doc.body.textContent.includes('TODO')
        }
      ],
      hints: [
        'The heading renders and everything after it does not. Whatever went wrong happened on the line right after the heading.',
        'That line is a comment — a note for humans that the browser skips. Comments have an opening marker and a closing marker. Find both.',
        'A comment starts at <code>&lt;!--</code> and the browser hides everything until it reaches the matching closing marker. If that marker never appears, "everything" means the rest of the file. Look up how an HTML comment ends.'
      ]
    }
  ]
};
