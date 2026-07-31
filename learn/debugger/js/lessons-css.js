/* ============================================================
   CSS track — 5 lessons, then 5 broken stylesheets.

   Every CSS stage uses two files: a read-only page.html so the
   markup is a fixed target, and an editable style.css. That forces
   the fix to happen in CSS, which is the whole point.

   Checks read getComputedStyle() from the live iframe, so they test
   what actually rendered — not what the student typed.
   ============================================================ */

TRACKS.css = {
  id: 'css',
  name: 'CSS',
  icon: '{ }',
  accent: '#6fb8ff',
  tagline: 'style · the skin',
  desc: 'Selectors, the cascade, and the box model. CSS never throws an error — a broken rule just silently does nothing, so debugging it means learning to ask "why did this rule lose?"',
  stages: [

    /* ─────────────── LEARN ─────────────── */

    {
      id: 'c-l1',
      kind: 'teach',
      title: 'The shape of a rule',
      concept: `
        <p>A CSS rule has three parts:</p>
        <ul>
          <li>a <strong>selector</strong> — which elements to style</li>
          <li><code>{ }</code> braces around the block</li>
          <li><strong>declarations</strong> inside, each one <code>property: value;</code></li>
        </ul>
        <p>Selectors come in flavours: <code>h1</code> matches every <code>&lt;h1&gt;</code>,
        <code>.lead</code> matches anything with <code>class="lead"</code>, and <code>#intro</code>
        matches the one element with <code>id="intro"</code>.</p>
        <p>Two pieces of punctuation do all the damage: the <code>;</code> that ends a declaration and
        the <code>}</code> that ends a block. Miss either one and CSS does not complain — it just
        throws away the rule and moves on.</p>`,
      files: [
        {
          name: 'page.html', lang: 'html', editable: false,
          code: `<h1>Welcome to Cyber Club</h1>
<p class="lead">Learn to break things. Then learn to fix them.</p>
<p>We meet Tuesdays in Room 214.</p>`
        },
        {
          name: 'style.css', lang: 'css', editable: true,
          code: `body {
  font-family: system-ui, sans-serif;
  background: #f4f7f9;
  padding: 24px;
}

h1 {
  color: #145c68;
  font-size: 30px;
}

.lead {
  color: #ff5b00;
  font-size: 19px;
  font-weight: 600;
}`
        }
      ],
      runMode: 'compose',
      tryIt: [
        'Change the <code>h1</code> colour to <code>#ff5b00</code>.',
        'Add <code>letter-spacing: 2px;</code> to the <code>h1</code> rule.',
        'Change the <code>.lead</code> selector to <code>p</code>. Now <em>both</em> paragraphs get the style — that is the difference between a class and an element selector.'
      ]
    },

    {
      id: 'c-l2',
      kind: 'teach',
      title: 'The cascade decides who wins',
      concept: `
        <p>When two rules style the same element the browser has to pick one. It scores each
        selector's <strong>specificity</strong>:</p>
        <ul>
          <li><code>#id</code> — worth 100</li>
          <li><code>.class</code> — worth 10</li>
          <li><code>tag</code> — worth 1</li>
        </ul>
        <p>Higher score wins. Only when the scores <em>tie</em> does the rule written later win.</p>
        <p>This trips up everyone: you write a rule, it looks correct, and nothing changes — because
        a more specific rule somewhere else already claimed that property. Moving your rule to the
        bottom of the file will not help. You have to out-score it.</p>`,
      files: [
        {
          name: 'page.html', lang: 'html', editable: false,
          code: `<div id="panel">
  <p class="warning">Suspicious login from a new device.</p>
  <p>Everything else looks normal.</p>
</div>`
        },
        {
          name: 'style.css', lang: 'css', editable: true,
          code: `body { font-family: system-ui, sans-serif; padding: 24px; }

/* score: 1  (one tag) */
p {
  color: #555555;
}

/* score: 10  (one class) — beats the rule above */
.warning {
  color: #ff5b00;
  font-weight: 700;
}

/* score: 101  (one id + one tag) — beats both */
#panel p {
  font-size: 17px;
}`
        }
      ],
      runMode: 'compose',
      tryIt: [
        'Add <code>color: blue;</code> to the <code>#panel p</code> rule. Even the warning turns blue — 101 beats 10.',
        'Now remove it and add <code>color: green;</code> to the <code>p</code> rule instead. Nothing changes for the warning. Why?',
        'Move the whole <code>p</code> rule to the very bottom of the file. Still nothing. Order only breaks ties.'
      ]
    },

    {
      id: 'c-l3',
      kind: 'teach',
      title: 'The box model',
      concept: `
        <p>Every element is a rectangle made of four layers, working outward:</p>
        <ul>
          <li><strong>content</strong> — the text or image itself</li>
          <li><strong>padding</strong> — space inside the border</li>
          <li><strong>border</strong> — the visible edge</li>
          <li><strong>margin</strong> — space pushing other elements away</li>
        </ul>
        <p>By default, <code>width</code> sets the <em>content</em> width only — padding and border get
        added on top. Ask for <code>width: 300px</code> with <code>20px</code> padding and a
        <code>2px</code> border and you get a 344px box.</p>
        <p><code>box-sizing: border-box</code> changes the deal: width now includes padding and
        border. Most real projects set it on everything, exactly once, at the top of the file.</p>`,
      files: [
        {
          name: 'page.html', lang: 'html', editable: false,
          code: `<div class="box default">width: 300px (content-box)</div>
<div class="box fixed">width: 300px (border-box)</div>`
        },
        {
          name: 'style.css', lang: 'css', editable: true,
          code: `body { font-family: system-ui, sans-serif; padding: 24px; background: #f4f7f9; }

.box {
  width: 300px;
  padding: 20px;
  border: 4px solid #1fb6a8;
  margin-bottom: 16px;
  background: #ffffff;
  font-size: 14px;
}

.default {
  box-sizing: content-box;
}

.fixed {
  box-sizing: border-box;
}`
        }
      ],
      runMode: 'compose',
      tryIt: [
        'Both boxes ask for 300px. Measure them with your eyes — the top one is wider. Why?',
        'Raise the padding to <code>40px</code>. Watch which box grows and which one does not.',
        'Change <code>margin-bottom</code> to <code>0</code>. The gap between them disappears — margin is the outermost layer.'
      ]
    },

    {
      id: 'c-l4',
      kind: 'teach',
      title: 'Flexbox lays things out',
      concept: `
        <p><code>display: flex</code> goes on the <strong>container</strong>, and it controls how that
        container's <em>direct children</em> line up. This is the part everyone gets backwards at
        first: flex properties belong to the parent, not to the items.</p>
        <ul>
          <li><code>display: flex</code> — children go in a row</li>
          <li><code>justify-content</code> — spacing <em>along</em> the row</li>
          <li><code>align-items</code> — alignment <em>across</em> the row</li>
          <li><code>gap</code> — space between children</li>
          <li><code>flex-direction: column</code> — stack them vertically instead</li>
        </ul>
        <p>If flexbox "is not working," the first question is always: did I put those properties on the
        container, or on the things inside it?</p>`,
      files: [
        {
          name: 'page.html', lang: 'html', editable: false,
          code: `<div class="toolbar">
  <span class="tool">Scan</span>
  <span class="tool">Report</span>
  <span class="tool">Quarantine</span>
</div>`
        },
        {
          name: 'style.css', lang: 'css', editable: true,
          code: `body { font-family: system-ui, sans-serif; padding: 24px; background: #f4f7f9; }

/* the container controls the layout */
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  background: #0b2030;
  padding: 12px;
  border-radius: 10px;
}

/* the children only style themselves */
.tool {
  background: #1fb6a8;
  color: #04222a;
  padding: 8px 14px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
}`
        }
      ],
      runMode: 'compose',
      tryIt: [
        'Change <code>justify-content</code> to <code>center</code>, then <code>flex-start</code>.',
        'Add <code>flex-direction: column;</code> to <code>.toolbar</code>. Everything stacks.',
        'Move <code>display: flex</code> from <code>.toolbar</code> down into <code>.tool</code>. The layout collapses — you will see this exact failure again in a minute.'
      ]
    },

    {
      id: 'c-l5',
      kind: 'teach',
      title: 'Units, colours, inheritance',
      concept: `
        <p><strong>Units.</strong> <code>px</code> is a fixed size. <code>%</code> is relative to the
        parent. <code>rem</code> is relative to the page's base font size, which is what makes a design
        scale when someone zooms in.</p>
        <p><strong>Colours.</strong> <code>#1fb6a8</code> is hex. <code>rgb(31, 182, 168)</code> is the
        same colour. <code>rgba(31, 182, 168, 0.3)</code> adds transparency.</p>
        <p><strong>Inheritance.</strong> Some properties flow down to children automatically —
        <code>color</code>, <code>font-family</code>, <code>font-size</code>, <code>line-height</code>.
        Most do not: <code>border</code>, <code>padding</code>, and <code>background</code> stop where
        you put them.</p>
        <p>That is why setting <code>font-family</code> once on <code>body</code> styles the whole page,
        but setting <code>border</code> on <code>body</code> only draws one box.</p>`,
      files: [
        {
          name: 'page.html', lang: 'html', editable: false,
          code: `<div class="panel">
  <h3>Threat level</h3>
  <p>Two failed logins in the last hour.</p>
  <span class="chip">Low</span>
</div>`
        },
        {
          name: 'style.css', lang: 'css', editable: true,
          code: `body {
  /* both of these are inherited by everything below */
  font-family: system-ui, sans-serif;
  color: #16323d;
  background: #f4f7f9;
  padding: 24px;
}

.panel {
  width: 60%;
  padding: 1.25rem;
  background: #ffffff;
  border-left: 4px solid #1fb6a8;
  border-radius: 0 10px 10px 0;
}

.chip {
  display: inline-block;
  background: rgba(31, 182, 168, 0.18);
  color: #0f7d72;
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 700;
}`
        }
      ],
      runMode: 'compose',
      tryIt: [
        'Change <code>.panel</code> width from <code>60%</code> to <code>300px</code>, then drag the divider between the two panes. Watch which one adapts.',
        'Change <code>color</code> on <code>body</code> to <code>#ff5b00</code>. The heading and paragraph follow — the chip does not. Find the line that explains why.',
        'Change the chip background alpha from <code>0.18</code> to <code>1</code>.'
      ]
    },

    /* ─────────────── DEBUG ─────────────── */

    {
      id: 'c-d1',
      kind: 'debug',
      title: 'The badge lost its colour',
      brief: `<p>The badge should be a solid orange pill with white text. It still has its pill shape
        and its padding, but the colours never arrived.</p>
        <p>CSS does not report errors. When it cannot understand a declaration it throws that
        declaration away — and sometimes takes the next one with it.</p>`,
      goal: 'A rounded orange badge with white text, sitting next to the heading.',
      files: [
        {
          name: 'page.html', lang: 'html', editable: false,
          code: `<h2>System status <span class="badge">ALERT</span></h2>
<p>Unusual traffic detected on the guest network.</p>`
        },
        {
          name: 'style.css', lang: 'css', editable: true,
          code: `body {
  font-family: system-ui, sans-serif;
  padding: 24px;
  background: #f4f7f9;
}

.badge {
  background: #ff5b00
  color: #ffffff;
  padding: 6px 14px;
  border-radius: 999px;
  font-size: 14px;
  letter-spacing: 1px;
}`
        }
      ],
      runMode: 'compose',
      checks: [
        {
          label: 'The badge has an orange background',
          test: c => c.css('.badge', 'backgroundColor') === 'rgb(255, 91, 0)'
        },
        {
          label: 'The badge text is white',
          test: c => c.css('.badge', 'color') === 'rgb(255, 255, 255)'
        },
        {
          label: 'The badge is still a rounded pill with its padding',
          test: c => c.css('.badge', 'borderRadius').indexOf('999px') === 0 &&
            c.css('.badge', 'paddingLeft') === '14px'
        }
      ],
      hints: [
        'Two properties failed and the rest of the rule worked fine. Find the boundary between what worked and what did not — the bug sits right there.',
        'Look closely at the end of the <code>background</code> line, then at the end of every other line in that block. One of them is not like the others.',
        'Every declaration must be terminated. When the terminator is missing, the browser reads the next line as part of the same declaration, decides the whole thing is nonsense, and discards both.'
      ]
    },

    {
      id: 'c-d2',
      kind: 'debug',
      title: 'Rules that only work in one place',
      brief: `<p>The card is styled perfectly. The page heading above it should be orange, and the
        footnote below it should be small and blue-grey. Neither one is.</p>
        <p>Both of those rules are written correctly. They are simply not being applied where you
        think they are — because the browser never left the rule above them.</p>`,
      goal: 'An orange 22px heading at the top, the white teal-bordered card in the middle, and a small blue-grey footnote at the bottom.',
      files: [
        {
          name: 'page.html', lang: 'html', editable: false,
          code: `<h2>Security Notice</h2>

<div class="card">
  <h3>Incident #4471</h3>
  <p>A staff laptop connected to an unknown access point at 14:02.</p>
</div>

<p class="footnote">Reported by the student SOC team.</p>`
        },
        {
          name: 'style.css', lang: 'css', editable: true,
          code: `body {
  font-family: system-ui, sans-serif;
  background: #f4f7f9;
  padding: 24px;
}

.card {
  background: #ffffff;
  border: 2px solid #1fb6a8;
  border-radius: 12px;
  padding: 18px;

h2 {
  color: #ff5b00;
  font-size: 22px;
}

.footnote {
  color: #557799;
  font-size: 13px;
}`
        }
      ],
      runMode: 'compose',
      checks: [
        {
          label: 'The page heading is orange',
          test: c => c.css('h2', 'color') === 'rgb(255, 91, 0)'
        },
        {
          label: 'The page heading is 22px',
          test: c => c.css('h2', 'fontSize') === '22px'
        },
        {
          label: 'The footnote is blue-grey and 13px',
          test: c => c.css('.footnote', 'color') === 'rgb(85, 119, 153)' &&
            c.css('.footnote', 'fontSize') === '13px'
        },
        {
          label: 'The card still has its white background and teal border',
          test: c => c.css('.card', 'backgroundColor') === 'rgb(255, 255, 255)' &&
            c.css('.card', 'borderTopWidth') === '2px' &&
            c.css('.card', 'borderTopColor') === 'rgb(31, 182, 168)'
        },
        {
          label: 'The page still has its light grey background',
          test: c => c.css('body', 'backgroundColor') === 'rgb(244, 247, 249)'
        }
      ],
      hints: [
        'The <code>body</code> rule works and the <code>.card</code> rule works. The two after them do not. Something changes at the boundary between the rules that work and the rules that do not.',
        'Read the file the way the browser does: top to bottom, keeping track of whether you are currently <em>inside</em> a rule\'s block or outside it. After the <code>.card</code> rule, is the browser back outside?',
        'Count the opening braces in this file, then count the closing ones. A rule that is never closed keeps swallowing whatever follows it — so those last two rules end up applying only to elements <em>inside</em> the card, and both of the elements they name live outside it.'
      ]
    },

    {
      id: 'c-d3',
      kind: 'debug',
      title: 'Rules that never match',
      brief: `<p>This alert should be a cream box with a thick orange bar down its left side, and the
        heading above it should be dark teal.</p>
        <p>Both rules look perfectly well-written. Neither one does anything. The HTML is
        <strong>read-only</strong> — the fix has to happen in the stylesheet.</p>`,
      goal: 'A cream-coloured alert box with a 5px orange left border, under a dark teal heading.',
      files: [
        {
          name: 'page.html', lang: 'html', editable: false,
          code: `<h2 class="title">Security Notice</h2>

<div class="alert-box">
  <p>Your password was last changed 412 days ago.</p>
</div>`
        },
        {
          name: 'style.css', lang: 'css', editable: true,
          code: `body {
  font-family: system-ui, sans-serif;
  padding: 24px;
  background: #ffffff;
}

#title {
  color: #145c68;
  font-size: 24px;
}

.alert {
  background: #fff4e5;
  border-left: 5px solid #ff5b00;
  padding: 14px 18px;
  border-radius: 0 8px 8px 0;
}`
        }
      ],
      runMode: 'compose',
      checks: [
        {
          label: 'The heading is dark teal',
          test: c => c.css('h2', 'color') === 'rgb(20, 92, 104)'
        },
        {
          label: 'The alert box has a cream background',
          test: c => c.css('div', 'backgroundColor') === 'rgb(255, 244, 229)'
        },
        {
          label: 'The alert box has a 5px orange bar on its left',
          test: c => c.css('div', 'borderLeftWidth') === '5px' &&
            c.css('div', 'borderLeftColor') === 'rgb(255, 91, 0)'
        },
        {
          label: 'The alert box is padded, not cramped',
          test: c => c.css('div', 'paddingLeft') === '18px'
        }
      ],
      hints: [
        'A rule with a perfect body still does nothing if the selector never finds an element. Open <code>page.html</code> and read what is actually there.',
        'Compare the selector on line 7 with the heading tag in the HTML, then the selector on line 12 with the div. Neither pair matches — but they fail for two <em>different</em> reasons.',
        'One selector has the right name but the wrong symbol in front of it: <code>#</code> targets an <code>id</code>, <code>.</code> targets a <code>class</code>. The other has the right symbol but an incomplete name — class names must match exactly, hyphens included.'
      ]
    },

    {
      id: 'c-d4',
      kind: 'debug',
      title: 'The button that will not turn white',
      brief: `<p>The "Join the club" button should have <strong>white</strong> text on its teal background.
        Right now it is pale grey on teal — hard to read.</p>
        <p>The <code>.btn</code> rule clearly says <code>color: #ffffff</code>. It is being ignored.</p>
        <p><strong>Constraint:</strong> the other two nav links must stay muted grey. Deleting the nav
        rule is not a fix.</p>`,
      goal: 'The button reads in white on teal. The two ordinary nav links stay muted grey (#b0c4cc).',
      files: [
        {
          name: 'page.html', lang: 'html', editable: false,
          code: `<nav id="mainnav">
  <a href="#">Meetings</a>
  <a href="#">Resources</a>
  <a href="#" class="btn">Join the club</a>
</nav>`
        },
        {
          name: 'style.css', lang: 'css', editable: true,
          code: `body {
  font-family: system-ui, sans-serif;
  padding: 24px;
  background: #0b2030;
}

#mainnav a {
  color: #b0c4cc;
  margin-right: 18px;
  text-decoration: none;
}

.btn {
  background: #1fb6a8;
  color: #ffffff;
  padding: 9px 16px;
  border-radius: 8px;
}`
        }
      ],
      runMode: 'compose',
      checks: [
        {
          label: 'The button text is white',
          test: c => c.css('#mainnav a.btn', 'color') === 'rgb(255, 255, 255)'
        },
        {
          label: 'The button still has its teal background',
          test: c => c.css('#mainnav a.btn', 'backgroundColor') === 'rgb(31, 182, 168)'
        },
        {
          label: 'The two ordinary nav links are still muted grey',
          test: c => {
            const links = Array.from(c.doc.querySelectorAll('#mainnav a')).filter(a => !a.classList.contains('btn'));
            return links.length === 2 &&
              links.every(a => c.win.getComputedStyle(a).color === 'rgb(176, 196, 204)');
          }
        }
      ],
      hints: [
        'Nothing is misspelled and nothing is missing. Both rules load. They are simply fighting over one property, and your rule is losing.',
        'Score both selectors using the table from Lesson 2 — count the ids, classes, and tags in each. Which one scores higher?',
        'The winning rule scores higher, so moving your rule further down the file will not help — order only breaks ties. To win, your selector has to out-score the other one while still matching only the button.'
      ]
    },

    {
      id: 'c-d5',
      kind: 'debug',
      title: 'The toolbar stacked up',
      brief: `<p>The three tool buttons should sit in a single row, spread evenly across the dark
        toolbar.</p>
        <p>Instead they are stacked vertically down the page. Every property you need is already in
        the file — they are just attached to the wrong thing.</p>`,
      goal: 'Scan, Report and Quarantine in one horizontal row, spread across the full width of the dark toolbar.',
      files: [
        {
          name: 'page.html', lang: 'html', editable: false,
          code: `<div class="toolbar">
  <span class="tool">Scan</span>
  <span class="tool">Report</span>
  <span class="tool">Quarantine</span>
</div>`
        },
        {
          name: 'style.css', lang: 'css', editable: true,
          code: `body { font-family: system-ui, sans-serif; padding: 24px; background: #f4f7f9; }

.toolbar {
  background: #0b2030;
  padding: 12px;
  border-radius: 10px;
}

.tool {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #1fb6a8;
  color: #04222a;
  padding: 8px 14px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
}`
        }
      ],
      runMode: 'compose',
      checks: [
        {
          label: 'The toolbar is a flex container',
          test: c => c.css('.toolbar', 'display') === 'flex'
        },
        {
          label: 'All three tools sit on the same row',
          test: c => {
            const t = Array.from(c.doc.querySelectorAll('.tool'));
            return t.length === 3 && t[0].offsetTop === t[1].offsetTop && t[1].offsetTop === t[2].offsetTop;
          }
        },
        {
          label: 'The tools are spread out, not bunched together',
          test: c => {
            const t = Array.from(c.doc.querySelectorAll('.tool'));
            if (t.length !== 3) return false;
            const bar = c.doc.querySelector('.toolbar');
            const gapLeft = t[0].getBoundingClientRect().left - bar.getBoundingClientRect().left;
            const gapRight = bar.getBoundingClientRect().right - t[2].getBoundingClientRect().right;
            return gapLeft < 20 && gapRight < 20;
          }
        },
        {
          label: 'Each tool keeps its teal background and padding',
          test: c => c.css('.tool', 'backgroundColor') === 'rgb(31, 182, 168)' &&
            c.css('.tool', 'paddingLeft') === '14px'
        }
      ],
      hints: [
        'Read Lesson 4\'s first sentence again. Which element does <code>display: flex</code> belong to — the thing being arranged, or the thing doing the arranging?',
        'Three properties in this file are layout instructions for a group of children. They are currently sitting in a rule that matches each child individually.',
        'A flex container arranges its <em>direct children</em>. Putting <code>display: flex</code> on the children makes each one a container for its own text, which is why they behave like stacked blocks. The properties are correct — the selector they live in is not.'
      ]
    }
  ]
};
