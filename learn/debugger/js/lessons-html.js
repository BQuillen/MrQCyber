/* ============================================================
   HTML track — 10 lessons, each followed by its own repair job.

   Every lesson (kind: 'teach') carries a `repairId` pointing at the
   debug stage that breaks the exact thing it just taught, and every
   repair (kind: 'debug') carries a `lessonId` pointing back. The app
   renders a "Debug this lesson" button on the lesson and a "Back to
   the lesson" link on the repair using those ids — see js/app.js.

   Debug checks read the LIVE parsed document (ctx.doc), so they test
   what the browser actually built — not the text the student typed.
   Labels describe the GOAL, never the fix. Most repair jobs chain two
   or three bugs: fixing the first one reveals the next.
   ============================================================ */

TRACKS.html = {
  id: 'html',
  name: 'HTML',
  icon: '</>',
  accent: '#ff7a3d',
  tagline: 'structure · the skeleton',
  desc: 'Tags, nesting, attributes, and the handful of parsing rules that explain almost every markup bug you will ever meet.',
  stages: [

    /* ═══════════════════ 1 · Tags come in pairs ═══════════════════ */

    {
      id: 'h-l1',
      kind: 'teach',
      title: 'Tags come in pairs',
      repairId: 'h-d1',
      concept: `
        <p>HTML marks up text by wrapping it in <strong>tags</strong>. Almost every tag comes as a
        pair: an <em>opening tag</em> like <code>&lt;h1&gt;</code> and a <em>closing tag</em> like
        <code>&lt;/h1&gt;</code> — same word, with a slash.</p>
        <p>Whatever sits between them gets that treatment. <code>&lt;h1&gt;</code> means
        "this is the most important heading on the page," so the browser makes it big and bold.
        <code>&lt;p&gt;</code> means "this is a paragraph."</p>
        <ul>
          <li>The closing tag tells the browser <strong>where to stop</strong>.</li>
          <li>Forget it, and the browser keeps applying that tag to everything below —
            until it finds a good reason to stop on its own.</li>
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
        'Now delete just the <code>&lt;/h1&gt;</code> and press Run. Remember what you see — you will meet this bug again in a moment.'
      ]
    },

    {
      id: 'h-d1',
      kind: 'debug',
      title: 'Everything is gigantic',
      lessonId: 'h-l1',
      brief: `<p>This announcement should show <strong>two</strong> normal-sized headings — "Cyber Club Weekly"
        and, further down, "Announcements" — each followed by its own ordinary paragraph.</p>
        <p>Instead the whole page is heading-sized. Something opened and never closed. Fix the first
        thing that looks wrong, run it again, and read the page from the top once more —
        the same kind of damage is still happening lower down.</p>`,
      goal: 'Two normal-sized headings, "Cyber Club Weekly" and "Announcements", each followed by its own paragraph in ordinary body text.',
      files: [{
        name: 'index.html', lang: 'html', editable: true,
        code: `<!DOCTYPE html>
<html>
<body>

  <h1>Cyber Club Weekly

  <p>This week we are learning how to spot a phishing email.</p>

  <h2>Announcements

  <p>Meet in Room 214 at 3:15. Bring your questions.</p>

</body>
</html>`
      }],
      runMode: 'raw',
      checks: [
        {
          label: 'There is exactly one h1 and one h2 on the page',
          test: c => c.doc.querySelectorAll('h1').length === 1 && c.doc.querySelectorAll('h2').length === 1
        },
        {
          label: 'Neither heading has a paragraph trapped inside it',
          test: c => Array.from(c.doc.querySelectorAll('p')).every(p => !p.closest('h1') && !p.closest('h2'))
        },
        {
          label: 'Both paragraphs are still visible, in order',
          test: c => {
            const t = c.doc.body.textContent;
            const a = t.indexOf('spot a phishing email');
            const b = t.indexOf('Room 214 at 3:15');
            return a !== -1 && b !== -1 && a < b;
          }
        },
        {
          label: 'Both headings still read exactly as they did',
          test: c => {
            const h1 = c.doc.querySelector('h1'), h2 = c.doc.querySelector('h2');
            return !!h1 && !!h2 && h1.textContent.trim() === 'Cyber Club Weekly' && h2.textContent.trim() === 'Announcements';
          }
        }
      ],
      hints: [
        'Look at where the huge text finally stops. That is where one tag closes — or should. Once you fix that, read the rest of the page again for the same shape of problem.',
        'Compare this heading to how <code>&lt;h1&gt;</code> and <code>&lt;p&gt;</code> were paired up back in the lesson. Then do the exact same comparison for the second heading, further down.',
        'A browser applies a tag to everything it reads until it finds that tag\'s matching closing partner. If a second heading tag shows up before the first one\'s partner does, the browser assumes you meant to end the first heading right there — but nothing does that trick for the very last heading on the page.'
      ]
    },

    /* ═══════════════════ 2 · Nesting builds a tree ═══════════════════ */

    {
      id: 'h-l2',
      kind: 'teach',
      title: 'Nesting builds a tree',
      repairId: 'h-d2',
      concept: `
        <p>Tags go <strong>inside</strong> other tags. A <code>&lt;li&gt;</code> (list item) lives inside a
        <code>&lt;ul&gt;</code> (unordered list), which might live inside a <code>&lt;div&gt;</code>.
        The browser turns all of that into a tree of boxes inside boxes.</p>
        <p>The rule that matters: tags must close in the <em>reverse order</em> they opened —
        like nesting cups. <code>&lt;p&gt;&lt;strong&gt;…&lt;/strong&gt;&lt;/p&gt;</code> is correct.
        <code>&lt;p&gt;&lt;strong&gt;…&lt;/p&gt;&lt;/strong&gt;</code> is <strong>crossed</strong>, and the
        browser will guess what you meant — usually not what you wanted.</p>
        <ul>
          <li>Indent nested tags. Bugs become visible when the shape is visible.</li>
          <li>If two tags cross, the browser silently repairs it. No error appears — the bold or
            italic just keeps going somewhere you did not expect.</li>
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
        'Take the last <code>&lt;li&gt;</code> and swap its two closing tags, so <code>&lt;/strong&gt;</code> comes after <code>&lt;/li&gt;</code> instead of before it. Run it and watch the next item.'
      ]
    },

    {
      id: 'h-d2',
      kind: 'debug',
      title: 'Bold that will not stop',
      lessonId: 'h-l2',
      brief: `<p>Only the first sentence should be bold, and only the second list item should be
        italic. Everything below each of those should be ordinary text.</p>
        <p>Right now the bold and the italic both keep going far past where they should. Nothing is
        misspelled and no tag is missing — pairs of tags are just closing in the wrong order.</p>`,
      goal: 'Sentence one bold and nothing else bold. Item two italic and nothing else italic.',
      files: [{
        name: 'index.html', lang: 'html', editable: true,
        code: `<!DOCTYPE html>
<html>
<body>

  <h2>Password Rules</h2>

  <p><strong>Never reuse a password across accounts.</p>

  <p>Use a long passphrase instead — four random words beats a short password.</strong></p>

  <ul>
    <li>Write your passphrase down anywhere you can lose it</li>
    <li><em>Never share a password over text or email</li>
    <li>Turn on multi-factor authentication everywhere you can</em></li>
  </ul>

</body>
</html>`
      }],
      runMode: 'raw',
      checks: [
        {
          label: 'The first sentence is still bold',
          test: c => {
            const p = c.doc.querySelectorAll('p')[0];
            return !!p && !!p.querySelector('strong') && p.querySelector('strong').textContent.includes('Never reuse');
          }
        },
        {
          label: 'The second paragraph is NOT bold',
          test: c => {
            const p = c.doc.querySelectorAll('p')[1];
            return !!p && !p.querySelector('strong') && !p.closest('strong');
          }
        },
        {
          label: 'Only the second list item is italic',
          test: c => {
            const items = Array.from(c.doc.querySelectorAll('li'));
            if (items.length !== 3) return false;
            const italic = el => !!(el.querySelector('em') || el.querySelector('i') || el.closest('em') || el.closest('i'));
            return !italic(items[0]) && italic(items[1]) && !italic(items[2]);
          }
        },
        {
          label: 'All three list items still read correctly',
          test: c => {
            const t = c.doc.body.textContent;
            return t.includes('lose it') && t.includes('text or email') && t.includes('everywhere you can');
          }
        }
      ],
      hints: [
        'Nothing here is missing — every tag that opens does eventually close somewhere. The problem is the ORDER two tags close in, in two separate spots.',
        'Write out the opening order and the closing order for the bold sentence: opens <code>p</code>, <code>strong</code>. Now write the order they close in. Do the same for the italic list item and the tags around it.',
        'Tags must close in the reverse order they opened, like nesting cups — the last one you opened is the first one you close. Two different pairs on this page are crossed over each other, so the bold and the italic never close where the author meant them to.'
      ]
    },

    /* ═══════════════════ 3 · Attributes carry the details ═══════════════════ */

    {
      id: 'h-l3',
      kind: 'teach',
      title: 'Attributes carry the details',
      repairId: 'h-d3',
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
        next quote — even if that quote is fifty lines away and belongs to a completely different
        tag. A single missing <code>"</code> can swallow half your page.</p>`,
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
        'Delete the closing quote after <code>cisa.gov</code> and press Run. Watch text disappear further down the page.'
      ]
    },

    {
      id: 'h-d3',
      kind: 'debug',
      title: 'A link ate the page',
      lessonId: 'h-l3',
      brief: `<p>This page should show <strong>two</strong> working links, a note about clicking safely,
        and a footer credit.</p>
        <p>Right now one link points somewhere strange and everything under it looks wrong too.
        Hover over the link that still shows up and look at the address your browser reports.</p>`,
      goal: 'Two working links — "CISA" pointing at https://www.cisa.gov, and "Have I Been Pwned" — followed by the safety note (with its "note" styling) and the footer credit.',
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

  <p class="note>Ask an adult before clicking a link you did not expect.</p>

  <footer>Cyber Club &middot; Room 214</footer>

</body>
</html>`
      }],
      runMode: 'raw',
      checks: [
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
          label: 'The safety note is its own paragraph, marked with class "note"',
          test: c => {
            const p = c.doc.querySelector('p.note');
            return !!p && p.textContent.includes('did not expect');
          }
        },
        {
          label: 'The footer credit is visible, outside the note',
          test: c => {
            const f = c.doc.querySelector('footer');
            return !!f && f.textContent.includes('Room 214') && !f.closest('p');
          }
        }
      ],
      hints: [
        'The second link in the list is written correctly. Put the two <code>&lt;li&gt;</code> lines side by side and compare them character by character.',
        'Count the double-quote marks on the first link\'s line. Then count them on the second link\'s line. An attribute value needs a matching pair — one to open, one to close. Once that is fixed, check whether any OTHER attribute on the page has the same problem.',
        'When the browser opens a quoted attribute value, it reads forward until it finds the very next quote in the file — even one that belongs to a different tag on a different line. Everything in between becomes part of that value, tags and all.'
      ]
    },

    /* ═══════════════════ 4 · Some tags stand alone ═══════════════════ */

    {
      id: 'h-l4',
      kind: 'teach',
      title: 'Some tags stand alone',
      repairId: 'h-d4',
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
        ignores it, and anything you typed <em>after</em> it does not end up "inside" the image, no
        matter how the code is indented. If you want text to sit alongside something, it needs its
        own real container tag — a void element can never hold it.</p>`,
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
        'After the badge, type <code>&lt;/img&gt;Est. 2024</code> on its own line and run it. Where does "Est. 2024" end up?'
      ]
    },

    {
      id: 'h-d4',
      kind: 'debug',
      title: 'The caption that floats free',
      lessonId: 'h-l4',
      brief: `<p>The badge should have a caption underneath it that reads "Est. 2024" — sitting in its
        own line, clearly separate from the schedule paragraph below.</p>
        <p>Right now "Est. 2024" is not really attached to anything, and the schedule paragraph has
        an extra blank line in it that should not be there.</p>`,
      goal: 'A caption reading "Est. 2024" directly under the badge, then a schedule paragraph with exactly one line break between "Room 214" and "Tuesdays, 3:15 pm".',
      files: [{
        name: 'index.html', lang: 'html', editable: true,
        code: `<!DOCTYPE html>
<html>
<body>

  <h2>Club Badge</h2>

  <img src="badge.png" alt="Cyber Club badge" width="120">
  Est. 2024
  </img>

  <hr>

  <p>
    Room 214<br>
    <br>
    Tuesdays, 3:15 pm
  </p>

</body>
</html>`
      }],
      runMode: 'raw',
      checks: [
        {
          label: 'The "Est. 2024" caption sits in its own element, not just loose text',
          test: c => {
            const nodes = Array.from(c.doc.querySelectorAll('body *'));
            return nodes.some(n => n.textContent.trim() === 'Est. 2024' && n.tagName !== 'IMG');
          }
        },
        {
          label: 'The badge image is still on the page with its alt text intact',
          test: c => {
            const img = c.doc.querySelector('img');
            return !!img && img.getAttribute('alt') === 'Cyber Club badge';
          }
        },
        {
          label: 'The schedule paragraph has exactly one line break in it',
          test: c => {
            const p = Array.from(c.doc.querySelectorAll('p')).find(p => p.textContent.includes('Room 214'));
            return !!p && p.querySelectorAll('br').length === 1;
          }
        },
        {
          label: 'Both lines of the schedule are still there',
          test: c => {
            const t = c.doc.body.textContent;
            return t.includes('Room 214') && t.includes('Tuesdays, 3:15 pm');
          }
        }
      ],
      hints: [
        'The image itself displays fine — the badge is not the problem. Look at what happens to the two lines of text that sit right after it.',
        '<code>&lt;img&gt;</code> cannot hold anything between an opening and closing tag, because it never really has one — so "Est. 2024" is not inside anything right now. What kind of tag actually wraps text? And, separately, count the <code>&lt;br&gt;</code> tags in the schedule paragraph — how many line breaks does it actually need?',
        'A void element like <code>&lt;img&gt;</code> or <code>&lt;br&gt;</code> is a complete, self-contained tag the moment it appears — it cannot have children, and writing <code>&lt;/img&gt;</code> afterward does nothing at all. Text that needs its own home belongs inside a real container tag, like <code>&lt;p&gt;</code>.'
      ]
    },

    /* ═══════════════════ 5 · What lives in the head ═══════════════════ */

    {
      id: 'h-l5',
      kind: 'teach',
      title: 'What lives in the head',
      repairId: 'h-d5',
      concept: `
        <p>Every page has two parts: <code>&lt;head&gt;</code>, which holds information <em>about</em>
        the page, and <code>&lt;body&gt;</code>, which holds what visitors actually see. Nothing
        inside <code>&lt;head&gt;</code> is rendered on the page itself.</p>
        <ul>
          <li><code>&lt;title&gt;</code> — the text shown in the browser tab. A page should have
            exactly one.</li>
          <li><code>&lt;meta charset="utf-8"&gt;</code> — tells the browser how to read the file's
            text.</li>
          <li><code>&lt;style&gt;</code> — CSS rules for the whole page.</li>
          <li><code>&lt;link&gt;</code> — connects an external file, like a stylesheet.</li>
        </ul>
        <p><code>&lt;title&gt;</code> and <code>&lt;style&gt;</code> both work like
        <code>&lt;textarea&gt;</code>: the browser treats <em>everything</em> after the opening tag as
        plain text, ignoring any tags inside it, until it finds that exact closing tag. Get the
        closing tag wrong and the browser keeps reading as text — straight through the rest of the
        <code>&lt;head&gt;</code> and into the body.</p>`,
      files: [{
        name: 'index.html', lang: 'html', editable: true,
        code: `<!DOCTYPE html>
<html>
<head>
  <title>Cyber Club</title>
  <meta charset="utf-8">
  <style>
    h1 { color: #ff5b00; }
  </style>
</head>
<body>

  <h1>Cyber Club</h1>
  <p>Meetings every Tuesday in Room 214.</p>

</body>
</html>`
      }],
      runMode: 'raw',
      tryIt: [
        'Change the text inside <code>&lt;title&gt;</code>. Nothing on the page changes — only the browser tab does.',
        'Change the color in the <code>&lt;style&gt;</code> block to <code>#1fb6a8</code>.',
        'Change the closing <code>&lt;/style&gt;</code> to <code>&lt;/script&gt;</code> and run it. Watch the whole page disappear.'
      ]
    },

    {
      id: 'h-d5',
      kind: 'debug',
      title: 'A page with nothing on it',
      lessonId: 'h-l5',
      brief: `<p>This page should show an orange "Cyber Club" heading and a paragraph underneath it —
        and the browser tab should read exactly "Cyber Club".</p>
        <p>Right now the page shows absolutely nothing. Once you get something back on screen,
        check the browser tab too — there is a second problem hiding up in the head.</p>`,
      goal: 'An orange "Cyber Club" heading, a paragraph below it, and a browser tab that reads "Cyber Club".',
      files: [{
        name: 'index.html', lang: 'html', editable: true,
        code: `<!DOCTYPE html>
<html>
<head>
  <title>Cyber Club</title>
  <title>Home</title>
  <meta charset="utf-8">
  <style>
    h1 { color: #ff5b00; }
  </script>
</head>
<body>

  <h1>Cyber Club</h1>
  <p>Meetings every Tuesday in Room 214.</p>

</body>
</html>`
      }],
      runMode: 'raw',
      checks: [
        {
          label: 'The heading and paragraph actually render',
          test: c => {
            const h1 = c.doc.querySelector('h1');
            return !!h1 && h1.textContent.trim() === 'Cyber Club' && c.doc.body.textContent.includes('Room 214');
          }
        },
        {
          label: 'The heading has its intended orange color',
          test: c => c.css('h1', 'color') === 'rgb(255, 91, 0)'
        },
        {
          label: 'There is exactly one title in the document',
          test: c => c.doc.querySelectorAll('title').length === 1
        },
        {
          label: 'The browser tab reads exactly "Cyber Club"',
          test: c => c.doc.title.trim() === 'Cyber Club'
        }
      ],
      hints: [
        'Right now the page shows nothing at all — not even the heading. Whatever is swallowing the whole page is hiding somewhere in the <code>&lt;head&gt;</code>, before any visible content even starts.',
        'One tag in the <code>&lt;head&gt;</code> opens with one name and gets closed, further down, with a completely different name. A block like that reads everything after it as plain text until it finds its OWN closing tag by that exact name.',
        'Fix that mismatched pair first, then look at how many times <code>&lt;title&gt;</code> was opened in this file. A document should only ever have one — the browser tab shows whichever one came first, but the extra one still should not be there.'
      ]
    },

    /* ═══════════════════ 6 · Formatting text ═══════════════════ */

    {
      id: 'h-l6',
      kind: 'teach',
      title: 'Formatting text',
      repairId: 'h-d6',
      concept: `
        <p>A handful of inline tags change how text reads without starting a new paragraph:</p>
        <ul>
          <li><code>&lt;strong&gt;</code> — important, shown bold</li>
          <li><code>&lt;em&gt;</code> — emphasized, shown italic</li>
          <li><code>&lt;small&gt;</code> — fine print</li>
          <li><code>&lt;blockquote&gt;</code> — a quoted block, usually indented</li>
        </ul>
        <p><code>&lt;blockquote&gt;</code> is a <em>block</em>, not inline — it is meant to wrap one or
        more whole paragraphs of quoted text. Whatever sits inside it keeps getting treated as "part
        of the quote" until its closing tag shows up, exactly like every other pair of tags you have
        met so far.</p>
        <ul>
          <li>Inline tags like <code>&lt;strong&gt;</code> and <code>&lt;em&gt;</code> can sit inside a
            paragraph; <code>&lt;blockquote&gt;</code> sits around whole paragraphs instead.</li>
          <li>Forget the closing tag on any of them, and the effect leaks into whatever comes next.</li>
        </ul>`,
      files: [{
        name: 'index.html', lang: 'html', editable: true,
        code: `<!DOCTYPE html>
<html>
<body>

  <h2>Password Tips</h2>

  <blockquote>
    <p>A password manager remembers so you do not have to.</p>
  </blockquote>

  <p>Use one if your school allows it.</p>
  <p><em>A strong passphrase</em> beats a short password any day.</p>

</body>
</html>`
      }],
      runMode: 'raw',
      tryIt: [
        'Add a second <code>&lt;p&gt;</code> inside the <code>&lt;blockquote&gt;</code>.',
        'Wrap "beats a short password" in <code>&lt;strong&gt;</code> as well as the existing <code>&lt;em&gt;</code>.',
        'Delete the closing <code>&lt;/blockquote&gt;</code> and press Run. Watch the indentation spread to paragraphs that are not supposed to be quoted.'
      ]
    },

    {
      id: 'h-d6',
      kind: 'debug',
      title: 'The quote that would not end',
      lessonId: 'h-l6',
      brief: `<p>Only the first sentence — "A password manager remembers…" — should be inside the
        quote block. The two tip paragraphs after it should be ordinary text, sitting outside it.</p>
        <p>Right now all three sentences are trapped inside the quote. Fix that, then look closely at
        the last sentence — something is emphasized that should not be.</p>`,
      goal: 'One quoted sentence inside the blockquote, then two ordinary paragraphs outside it. Only "a strong passphrase" is italic — the credit line at the end is plain text.',
      files: [{
        name: 'index.html', lang: 'html', editable: true,
        code: `<!DOCTYPE html>
<html>
<body>

  <h2>Password Tips</h2>

  <blockquote>
    A password manager remembers so you do not have to.

  <p>Use one if your school allows it.</p>

  <p><em>A strong passphrase</em> beats a short, complicated password any day.

  <p>Written for Cyber Club — not for redistribution.</p>

</body>
</html>`
      }],
      runMode: 'raw',
      checks: [
        {
          label: 'The blockquote holds only the quoted sentence, not the tip paragraphs',
          test: c => {
            const bq = c.doc.querySelector('blockquote');
            return !!bq && bq.textContent.includes('remembers') && bq.querySelectorAll('p').length === 0;
          }
        },
        {
          label: 'There are three paragraphs, all outside the blockquote',
          test: c => {
            const ps = Array.from(c.doc.querySelectorAll('p'));
            return ps.length === 3 && ps.every(p => !p.closest('blockquote'));
          }
        },
        {
          label: '"A strong passphrase" is still emphasized',
          test: c => {
            const em = c.doc.querySelector('em');
            return !!em && em.textContent.trim() === 'A strong passphrase';
          }
        },
        {
          label: 'The credit line at the end is NOT emphasized',
          test: c => {
            const ps = Array.from(c.doc.querySelectorAll('p'));
            const credit = ps.find(p => p.textContent.includes('not for redistribution'));
            return !!credit && !credit.querySelector('em') && !credit.closest('em');
          }
        }
      ],
      hints: [
        'The quote block reaches much further down the page than it should — you can tell because everything inside it keeps its indentation. Find where the quote should actually stop.',
        'Once the quote only wraps its one sentence, check the paragraph right after the emphasized tip — does the italic effect stop where it looks like it should?',
        'A missing closing tag does not just affect the tag it belonged to — it can affect a formatting tag INSIDE it too. When a browser force-closes an unclosed <code>&lt;p&gt;</code> because a new one started, any inline tag still open inside it, like <code>&lt;em&gt;</code>, gets carried over into the next paragraph rather than actually ending.'
      ]
    },

    /* ═══════════════════ 7 · Lists ═══════════════════ */

    {
      id: 'h-l7',
      kind: 'teach',
      title: 'Building a list',
      repairId: 'h-d7',
      concept: `
        <p>Lists have three parts working together: <code>&lt;ul&gt;</code> (bullets) or
        <code>&lt;ol&gt;</code> (numbers) is the <em>container</em>, and <code>&lt;li&gt;</code> is each
        <em>item</em> inside it.</p>
        <ul>
          <li>A <code>&lt;li&gt;</code> only makes sense inside a <code>&lt;ul&gt;</code> or
            <code>&lt;ol&gt;</code>. Written on its own, it still shows a bullet — but it is not part
            of any list, which breaks anything that expects a real list structure.</li>
          <li>An end tag has to match the container it is closing. A <code>&lt;ul&gt;</code> is closed
            by <code>&lt;/ul&gt;</code> — not <code>&lt;/ol&gt;</code>. A closing tag that does not
            match anything currently open is simply ignored, which means the container it was
            supposed to close just stays open.</li>
        </ul>`,
      files: [{
        name: 'index.html', lang: 'html', editable: true,
        code: `<!DOCTYPE html>
<html>
<body>

  <h2>Meeting Agenda</h2>

  <ul>
    <li>Password strength review</li>
    <li>Phishing red flags</li>
  </ul>

  <p>See you Tuesday.</p>

</body>
</html>`
      }],
      runMode: 'raw',
      tryIt: [
        'Add a third <code>&lt;li&gt;</code> to the agenda.',
        'Change <code>&lt;ul&gt;</code> to <code>&lt;ol&gt;</code> on the opening tag only, leaving <code>&lt;/ul&gt;</code> as the closing tag, and run it. Notice nothing looks obviously wrong — that is the trap.',
        'Move the closing <code>&lt;/ul&gt;</code> down below the <code>&lt;p&gt;</code> and run it. Watch the paragraph gain a bullet.'
      ]
    },

    {
      id: 'h-d7',
      kind: 'debug',
      title: 'The list that swallowed the page',
      lessonId: 'h-l7',
      brief: `<p>The agenda should show <strong>three</strong> bulleted items, and the closing line
        ("See you Tuesday") should sit underneath the list — not inside it.</p>
        <p>There is a guest-speaker line too. It should be a fourth bullet in the very same list,
        not a bullet floating on its own.</p>`,
      goal: 'One bulleted list with four items — the three agenda items plus the guest speaker — followed by "See you Tuesday" as an ordinary paragraph underneath it.',
      files: [{
        name: 'index.html', lang: 'html', editable: true,
        code: `<!DOCTYPE html>
<html>
<body>

  <h2>Meeting Agenda</h2>

  <ul>
    <li>Password strength review</li>
    <li>Phishing red flags</li>
    <li>Homework check</li>
  </ol>

  <li>Guest speaker: Ms. Alvarez from IT</li>

  <p>See you Tuesday.</p>

</body>
</html>`
      }],
      runMode: 'raw',
      checks: [
        {
          label: 'There is exactly one list on the page',
          test: c => c.doc.querySelectorAll('ul, ol').length === 1
        },
        {
          label: 'The list has all four items, including the guest speaker',
          test: c => {
            const list = c.doc.querySelector('ul, ol');
            if (!list) return false;
            const items = Array.from(list.querySelectorAll('li'));
            return items.length === 4 && items.some(li => li.textContent.includes('Guest speaker'));
          }
        },
        {
          label: '"See you Tuesday" is NOT inside the list',
          test: c => {
            const p = Array.from(c.doc.querySelectorAll('p')).find(p => p.textContent.includes('See you Tuesday'));
            return !!p && !p.closest('ul') && !p.closest('ol');
          }
        },
        {
          label: 'All three original agenda items are still there, in order',
          test: c => {
            const t = c.doc.body.textContent;
            const a = t.indexOf('strength review'), b = t.indexOf('red flags'), d = t.indexOf('Homework check');
            return a !== -1 && b !== -1 && d !== -1 && a < b && b < d;
          }
        }
      ],
      hints: [
        'The closing line at the bottom has picked up a bullet it should not have. And the guest-speaker line looks like it is part of the agenda — but is it actually connected to the same list?',
        'Look at how the list opens versus how it closes — do those two tag names actually match each other? A closing tag that does not match anything currently open gets ignored, not applied to the nearest open tag.',
        'Once the list closes where it is supposed to, an <code>&lt;li&gt;</code> sitting outside any <code>&lt;ul&gt;</code> or <code>&lt;ol&gt;</code> still renders with a bullet — it just is not really part of a list. It needs to move inside the one that is already there.'
      ]
    },

    /* ═══════════════════ 8 · Tables ═══════════════════ */

    {
      id: 'h-l8',
      kind: 'teach',
      title: 'Rows and columns',
      repairId: 'h-d8',
      concept: `
        <p>A table is built from three nested pieces: <code>&lt;table&gt;</code> holds everything,
        <code>&lt;tr&gt;</code> makes one row, and each cell in that row is either
        <code>&lt;th&gt;</code> (a header cell) or <code>&lt;td&gt;</code> (a regular data cell).</p>
        <ul>
          <li><code>&lt;thead&gt;</code> groups the header row; <code>&lt;tbody&gt;</code> groups the
            data rows.</li>
          <li><code>&lt;th&gt;</code> is not just "a bold <code>&lt;td&gt;</code>" — it tells the
            browser (and screen readers) that this cell labels the column, which is why header rows
            should use it instead of <code>&lt;td&gt;</code>.</li>
          <li>Every row needs the same number of cells as the header, in the same order — a row with
            a cell missing quietly shifts every cell after it into the wrong column.</li>
        </ul>`,
      files: [{
        name: 'index.html', lang: 'html', editable: true,
        code: `<!DOCTYPE html>
<html>
<body>

  <h2>Meeting Schedule</h2>

  <table>
    <thead>
      <tr>
        <th>Day</th>
        <th>Topic</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Tuesday</td>
        <td>Phishing</td>
      </tr>
    </tbody>
  </table>

</body>
</html>`
      }],
      runMode: 'raw',
      tryIt: [
        'Add a "Room" column to the header, and a matching cell to the Tuesday row.',
        'Add a second row for "Thursday" / "Passwords" / "214".',
        'Delete just one <code>&lt;td&gt;</code> from the Thursday row and run it. Watch which column its last value lands in.'
      ]
    },

    {
      id: 'h-d8',
      kind: 'debug',
      title: 'The schedule is off by a column',
      lessonId: 'h-l8',
      brief: `<p>This schedule should have a proper header row (Day / Topic / Room) and two data rows,
        each with all three values lined up under the right column.</p>
        <p>Right now the header row does not read as a real header, and the Thursday row is missing a
        value — everything after the gap has shifted into the wrong column.</p>`,
      goal: 'A header row of real header cells (Day, Topic, Room), then Tuesday / Phishing / 214 and Thursday / Password recap / 214, each value under the correct column.',
      files: [{
        name: 'index.html', lang: 'html', editable: true,
        code: `<!DOCTYPE html>
<html>
<body>

  <h2>Meeting Schedule</h2>

  <table>
    <thead>
      <tr>
        <td>Day</td>
        <td>Topic</td>
        <td>Room</td>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Tuesday</td>
        <td>Phishing</td>
        <td>214</td>
      </tr>
      <tr>
        <td>Thursday</td>
        <td>214</td>
      </tr>
    </tbody>
  </table>

</body>
</html>`
      }],
      runMode: 'raw',
      checks: [
        {
          label: 'The header row is made of real header cells',
          test: c => {
            const row = c.doc.querySelector('thead tr');
            if (!row) return false;
            const cells = Array.from(row.children);
            return cells.length === 3 && cells.every(cell => cell.tagName === 'TH');
          }
        },
        {
          label: 'There are two data rows',
          test: c => c.doc.querySelectorAll('tbody tr').length === 2
        },
        {
          label: 'The Thursday row has all three values, in the right columns',
          test: c => {
            const rows = c.doc.querySelectorAll('tbody tr');
            const thu = Array.from(rows).find(r => r.textContent.includes('Thursday'));
            if (!thu) return false;
            const cells = Array.from(thu.children).map(c => c.textContent.trim());
            return cells.length === 3 && cells[0] === 'Thursday' && cells[2] === '214';
          }
        },
        {
          label: 'The Tuesday row is unaffected',
          test: c => {
            const rows = c.doc.querySelectorAll('tbody tr');
            const tue = Array.from(rows).find(r => r.textContent.includes('Tuesday'));
            if (!tue) return false;
            const cells = Array.from(tue.children).map(c => c.textContent.trim());
            return cells.join('|') === 'Tuesday|Phishing|214';
          }
        }
      ],
      hints: [
        'Compare the header row to a normal header cell from the lesson — is it using the tag that actually means "this labels a column"? Separately, count the cells in each body row — do they match the header count?',
        'A header cell and a data cell look similar in the file but mean different things to the browser. And in the Thursday row, count how many <code>&lt;td&gt;</code> the row has versus how many columns the header defines.',
        'Every row needs one cell per column, in order — if a row is short one <code>&lt;td&gt;</code>, everything after the gap slides left into the wrong column. And a header row should be built entirely from <code>&lt;th&gt;</code>, not <code>&lt;td&gt;</code>.'
      ]
    },

    /* ═══════════════════ 9 · Forms ═══════════════════ */

    {
      id: 'h-l9',
      kind: 'teach',
      title: 'Talking to a form',
      repairId: 'h-d9',
      concept: `
        <p>A <code>&lt;form&gt;</code> collects input from a visitor. Two attributes make it actually
        work:</p>
        <ul>
          <li><code>&lt;label for="x"&gt;</code> connects a label to <code>&lt;input id="x"&gt;</code> —
            the <code>for</code> value must exactly match the input's <code>id</code>. Get that right
            and clicking the label focuses the field; get it wrong and clicking does nothing.</li>
          <li><code>name</code> is what actually gets sent when the form is submitted. An input with
            no <code>name</code> is invisible to whatever receives the form — even though it looks
            completely normal on the page.</li>
        </ul>
        <p><code>id</code> and <code>name</code> look alike and are easy to mix up, but they do
        different jobs: <code>id</code> is how <em>other tags</em> (like a label) find this element;
        <code>name</code> is how the <em>submitted data</em> identifies it.</p>`,
      files: [{
        name: 'index.html', lang: 'html', editable: true,
        code: `<!DOCTYPE html>
<html>
<body>

  <h2>Sign Up</h2>

  <form>
    <label for="student-name">Name</label>
    <input type="text" id="student-name" name="name">

    <button>Submit</button>
  </form>

</body>
</html>`
      }],
      runMode: 'raw',
      tryIt: [
        'Click directly on the word "Name" — the text field should light up.',
        'Change the input\'s <code>id</code> to <code>student-full-name</code> without updating the label, then click "Name" again.',
        'Delete just the <code>name="name"</code> attribute. Nothing looks different on the page — but that field would now vanish from anything the form submits.'
      ]
    },

    {
      id: 'h-d9',
      kind: 'debug',
      title: 'The label that goes nowhere',
      lessonId: 'h-l9',
      brief: `<p>Clicking the word "Name" should move the cursor into the name field, and that field
        should actually be included when the form is submitted.</p>
        <p>Right now clicking the label does nothing. Once that is connected, look at the field
        itself — it has a second, quieter problem.</p>`,
      goal: 'Clicking "Name" focuses the text field, and that field is submitted along with the form under a sensible field name.',
      files: [{
        name: 'index.html', lang: 'html', editable: true,
        code: `<!DOCTYPE html>
<html>
<body>

  <h2>Sign Up</h2>

  <form>
    <label for="student-name">Name</label>
    <input type="text" id="student-nm">

    <label for="grade">Grade</label>
    <select id="grade" name="grade">
      <option value="9">9th</option>
      <option value="10" selected>10th</option>
    </select>

    <button>Submit</button>
  </form>

</body>
</html>`
      }],
      runMode: 'raw',
      checks: [
        {
          label: 'The "Name" label is connected to a real text field',
          test: c => {
            const label = c.doc.querySelector('label[for]');
            if (!label) return false;
            const input = c.doc.getElementById(label.getAttribute('for'));
            return !!input && input.tagName === 'INPUT' && input.type === 'text';
          }
        },
        {
          label: 'That text field will actually be submitted with the form',
          test: c => {
            const label = c.doc.querySelector('label[for]');
            const input = label && c.doc.getElementById(label.getAttribute('for'));
            return !!input && !!input.getAttribute('name');
          }
        },
        {
          label: 'The grade dropdown still defaults to 10th',
          test: c => {
            const sel = c.doc.querySelector('select');
            return !!sel && sel.value === '10';
          }
        },
        {
          label: 'The submit button is still inside the form',
          test: c => {
            const form = c.doc.querySelector('form');
            return !!form && !!form.querySelector('button');
          }
        }
      ],
      hints: [
        'Click the word "Name" in the preview. Does the cursor jump into the box next to it? If not, the label and the field are not actually talking to each other.',
        'A <code>&lt;label for="…"&gt;</code> has to match an <code>id</code> somewhere on the page, character for character. Find the input it is supposed to point at and compare the two values closely.',
        'Once the label is connected, check the input itself for a <code>name</code> attribute. <code>id</code> is how a label finds a field; <code>name</code> is how the submitted data identifies it — a field can have one without the other, and both are needed.'
      ]
    },

    /* ═══════════════════ 10 · Structure with meaning ═══════════════════ */

    {
      id: 'h-l10',
      kind: 'teach',
      title: 'Structure with meaning',
      repairId: 'h-d10',
      concept: `
        <p>You could build an entire page out of <code>&lt;div&gt;</code>. You should not.
        <strong>Semantic tags</strong> say what a section <em>is</em>, which helps screen readers,
        search engines, and — most usefully for you — other humans reading your code.</p>
        <ul>
          <li><code>&lt;header&gt;</code> — the top of the page or a section</li>
          <li><code>&lt;nav&gt;</code> — a group of navigation links</li>
          <li><code>&lt;main&gt;</code> — the primary content — <strong>only one per page</strong></li>
          <li><code>&lt;section&gt;</code> / <code>&lt;article&gt;</code> — chunks of related content</li>
          <li><code>&lt;footer&gt;</code> — the bottom of the page or a section</li>
        </ul>
        <p>When a page is built from meaningful tags, a misplaced closing tag — or a second
        <code>&lt;main&gt;</code> that should not exist — jumps out at you. When it is 40 nested
        <code>&lt;div&gt;</code>s, it does not.</p>`,
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
        'Delete the closing <code>&lt;/header&gt;</code> and run it. Watch how far down the teal background now reaches.'
      ]
    },

    {
      id: 'h-d10',
      kind: 'debug',
      title: 'The page with two mains',
      lessonId: 'h-l10',
      brief: `<p>This page should have a header with its nav, one <code>&lt;main&gt;</code> containing
        the meetings section and the officer card, and one footer sitting below everything —
        outside the card, outside <code>&lt;main&gt;</code>.</p>
        <p>Right now the teal header background reaches much too far down the page, the footer is
        trapped inside the officer card, and — once you can finally see the bottom of the page —
        there is a second <code>&lt;main&gt;</code> that should not exist.</p>`,
      goal: 'One header (with its nav), one main containing the meetings section and the officer card, the footer sitting below the card, and only one main on the whole page.',
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
  .card { background: #fff; border: 2px solid #1fb6a8; border-radius: 12px; padding: 16px 18px; }
  footer { background: #f1f5f7; padding: 14px 24px; font-size: 14px; color: #557; }
</style>
</head>
<body>

  <header>
    <h1>Cyber Club</h1>
    <nav>
      <a href="#meet">Meetings</a>
      <a href="#learn">Officers</a>
    </nav>

  <main>
    <section id="meet">
      <h2>Meetings</h2>
      <p>Tuesdays at 3:15 pm in Room 214.</p>
    </section>

    <div class="card">
      <h2>Officers</h2>
      <p>President: Maya</p>
      <p>Vice President: Dev</p>

    <footer>Fayette County Public Schools</footer>

  </main>

  <main>
    <p>Extra content that ended up in a second main by mistake.</p>
  </main>

</body>
</html>`
      }],
      runMode: 'raw',
      checks: [
        {
          label: 'The header does not stretch down to cover the main content',
          test: c => {
            const header = c.doc.querySelector('header');
            const main = c.doc.querySelector('main');
            return !!header && !!main && !header.contains(main);
          }
        },
        {
          label: 'There is exactly one main on the page',
          test: c => c.doc.querySelectorAll('main').length === 1
        },
        {
          label: 'The footer is NOT inside the officer card',
          test: c => {
            const f = c.doc.querySelector('footer');
            return !!f && !f.closest('.card');
          }
        },
        {
          label: 'Both officers and the meetings section are still inside the one main',
          test: c => {
            const main = c.doc.querySelector('main');
            if (!main) return false;
            const t = main.textContent;
            return t.includes('Maya') && t.includes('Dev') && t.includes('Room 214');
          }
        },
        {
          label: 'The extra stray content is still on the page somewhere',
          test: c => c.doc.body.textContent.includes('Extra content')
        }
      ],
      hints: [
        'The teal header background reaches much further down the page than the lesson\'s version did. Something that should have closed right after the nav never did.',
        'Once the header closes where it should, look at the officer card the same way you looked at it back in the semantic-structure lesson — how far does its border actually reach, and what ends up trapped inside it?',
        'After both of those are fixed, scroll to the very bottom. A page should only ever have one <code>&lt;main&gt;</code> — if a second one shows up, its contents belong inside the first one instead.'
      ]
    }
  ]
};
