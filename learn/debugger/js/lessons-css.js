/* ============================================================
   CSS track — 10 lessons, each followed by its own repair job.

   Every lesson (kind: 'teach') carries a `repairId` pointing at the
   debug stage that breaks the exact thing it just taught, and every
   repair (kind: 'debug') carries a `lessonId` pointing back. The app
   renders a "Debug this lesson" button on the lesson and a "Back to
   the lesson" link on the repair using those ids — see js/app.js.

   Every CSS stage uses two files: a read-only page.html so the
   markup is a fixed target, and an editable style.css. That forces
   the fix to happen in CSS, which is the whole point.

   Checks read getComputedStyle() from the live iframe — or, where a
   feature can't be observed that way (a CSS custom property that was
   never resolved, or a rule sitting inside an unmatched @media block),
   they read the live parsed stylesheet itself (document.styleSheets)
   rather than comparing source text. Either way they test what the
   browser actually built, not what the student typed.

   Most repair jobs chain two or three bugs: fixing the first either
   reveals the next, or the two are independent-but-related mistakes
   that both need fixing.
   ============================================================ */

TRACKS.css = {
  id: 'css',
  name: 'CSS',
  icon: '{ }',
  accent: '#6fb8ff',
  tagline: 'style · the skin',
  desc: 'Selectors, the cascade, and the box model. CSS never throws an error — a broken rule just silently does nothing, so debugging it means learning to ask "why did this rule lose?"',
  stages: [

    /* ═══════════════════ 1 · The shape of a rule ═══════════════════ */

    {
      id: 'c-l1',
      kind: 'teach',
      title: 'The shape of a rule',
      repairId: 'c-d1',
      concept: `
        <p>A CSS rule has three parts:</p>
        <ul>
          <li>a <strong>selector</strong> — which elements to style</li>
          <li><code>{ }</code> braces around the block</li>
          <li><strong>declarations</strong> inside, each one <code>property: value;</code></li>
        </ul>
        <p>Selectors come in flavours: <code>h1</code> matches every <code>&lt;h1&gt;</code>,
        <code>.lead</code> matches anything with <code>class="lead"</code>, and <code>#intro</code>
        matches the one element with <code>id="intro"</code>. Use the wrong symbol — a <code>#</code>
        where you meant a <code>.</code> — and the selector matches nothing at all.</p>
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
        'Delete the semicolon after <code>color: #ff5b00;</code> in the <code>.lead</code> rule and press Run. Watch the font-weight vanish along with the color — remember that shape of failure.',
        'Now change the <code>.lead</code> selector to <code>#lead</code>, with no matching id anywhere in the HTML, and press Run. Nothing changes color at all. You will meet both of these failures again shortly.'
      ]
    },

    {
      id: 'c-d1',
      kind: 'debug',
      title: 'The notice with no style',
      lessonId: 'c-l1',
      brief: `<p>This security notice should show a dark teal heading, a cream alert box with a thick
        orange bar down its left side, and — inside that box — a solid orange badge with white text.</p>
        <p>Right now the heading is plain black, the alert box has no styling at all, and the badge has
        lost its colour too. None of these are typos in a property <em>name</em> — look closely at what
        each selector is actually trying to match, and at how each declaration ends.</p>`,
      goal: 'A dark teal heading, a cream alert box with a 5px orange left bar, and a solid orange badge with white text inside it.',
      files: [
        {
          name: 'page.html', lang: 'html', editable: false,
          code: `<h2 class="title">Security Notice</h2>

<div class="alert-box">
  <p>Your password was last changed 412 days ago. <span class="badge">ALERT</span></p>
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
}

.badge {
  background: #ff5b00
  color: #ffffff;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  letter-spacing: 1px;
}`
        }
      ],
      runMode: 'compose',
      checks: [
        {
          label: 'The heading is dark teal',
          test: c => c.css('.title', 'color') === 'rgb(20, 92, 104)'
        },
        {
          label: 'The alert box has its cream background and orange left bar',
          test: c => c.css('.alert-box', 'backgroundColor') === 'rgb(255, 244, 229)' &&
            c.css('.alert-box', 'borderLeftWidth') === '5px' &&
            c.css('.alert-box', 'borderLeftColor') === 'rgb(255, 91, 0)'
        },
        {
          label: 'The alert box keeps its padding',
          test: c => c.css('.alert-box', 'paddingLeft') === '18px'
        },
        {
          label: 'The badge has an orange background',
          test: c => c.css('.badge', 'backgroundColor') === 'rgb(255, 91, 0)'
        },
        {
          label: 'The badge text is white',
          test: c => c.css('.badge', 'color') === 'rgb(255, 255, 255)'
        }
      ],
      hints: [
        'Two selectors on this page never match anything at all, and one declaration is missing its terminator. Start with the heading — compare its selector to the class actually written on that tag in the HTML.',
        'The <code>.alert</code> selector and the div\'s actual class are almost the same word — read them letter by letter. Then check the badge\'s <code>background</code> line against every other line in that block: which one is missing something all the others have?',
        'A <code>#</code> selector only matches an element\'s <code>id</code>, and a <code>.</code> selector only matches its <code>class</code> — the wrong symbol matches nothing, no matter how correct the name looks. A class name also has to match in full, hyphens included. And every declaration needs its closing <code>;</code> — leave it off and the browser reads the next line as part of the same broken value, then throws the whole thing away.'
      ]
    },

    /* ═══════════════════ 2 · The cascade decides who wins ═══════════════════ */

    {
      id: 'c-l2',
      kind: 'teach',
      title: 'The cascade decides who wins',
      repairId: 'c-d2',
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
        'Move the whole <code>p</code> rule to the very bottom of the file. Still nothing. Order only breaks ties.',
        'Now add a second <code>.warning</code> rule right after the first one, also setting <code>color</code>, to something different. Which one actually shows? That is the "ties go to whoever is last" rule you will need next.'
      ]
    },

    {
      id: 'c-d2',
      kind: 'debug',
      title: 'Two colours that refuse to change',
      lessonId: 'c-l2',
      brief: `<p>The "Join the club" button should read in white on its teal background, and the notice
        below the nav should read in bold orange.</p>
        <p>Both rules are written correctly and both load without error — they are simply losing, for
        two different reasons. <strong>Constraint:</strong> the two ordinary nav links must stay muted
        grey. Deleting the nav rule is not a fix.</p>`,
      goal: 'The button reads white on teal. The notice below it is bold orange. The two ordinary nav links stay muted grey (#b0c4cc).',
      files: [
        {
          name: 'page.html', lang: 'html', editable: false,
          code: `<nav id="mainnav">
  <a href="#">Meetings</a>
  <a href="#">Resources</a>
  <a href="#" class="btn">Join the club</a>
</nav>

<p class="notice">Meetings moved to Room 214B this week.</p>`
        },
        {
          name: 'style.css', lang: 'css', editable: true,
          code: `body {
  font-family: system-ui, sans-serif;
  padding: 24px;
  background: #0b2030;
  color: #e8f0f2;
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
}

.notice {
  color: #ff5b00;
  font-weight: 700;
}

/* leftover from an earlier draft of this page */
.notice {
  color: #b0c4cc;
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
        },
        {
          label: 'The notice reads in bold orange',
          test: c => c.css('.notice', 'color') === 'rgb(255, 91, 0)' && c.css('.notice', 'fontWeight') === '700'
        }
      ],
      hints: [
        'Two different rules are losing a fight, for two different reasons. Score the button\'s two competing selectors the way Lesson 2 showed you. Then look at the notice — is there really only one rule that mentions <code>.notice</code>?',
        'For the button: compare <code>#mainnav a</code> and <code>.btn</code> using the id/class/tag table. For the notice: search the file for the word "notice" — count how many rules define it, and note which one comes last.',
        'A higher-specificity selector wins no matter where it sits in the file — the only way to beat it is to out-score it. But when two selectors tie in specificity, the one written LAST simply wins, so the fix there is to make sure only the rule you actually want survives.'
      ]
    },

    /* ═══════════════════ 3 · The box model ═══════════════════ */

    {
      id: 'c-l3',
      kind: 'teach',
      title: 'The box model',
      repairId: 'c-d3',
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
        'Change <code>margin-bottom</code> to <code>0</code>. The gap between them disappears — margin is the outermost layer.',
        'Now type the margin property slightly wrong, like <code>margin-botom</code>, and press Run. The gap disappears again — but this time nothing you changed looks broken at a glance. Remember that.'
      ]
    },

    {
      id: 'c-d3',
      kind: 'debug',
      title: 'The card that will not fit',
      lessonId: 'c-l3',
      brief: `<p>Each card should sit exactly as wide as the pale wrapper around it, with a clear 16px gap
        between the two cards.</p>
        <p>Right now the cards spill past the edge of the wrapper, and they sit flush against each
        other with no gap at all. Both problems live in the box model — nothing here is a typo in a
        colour or a missing tag.</p>`,
      goal: 'Two cards, each no wider than their 320px wrapper, stacked with a 16px gap between them, each keeping its 4px teal border.',
      files: [
        {
          name: 'page.html', lang: 'html', editable: false,
          code: `<div class="wrap">
  <div class="card">Weekly badge count: 12</div>
  <div class="card">Open incidents: 3</div>
</div>`
        },
        {
          name: 'style.css', lang: 'css', editable: true,
          code: `body { font-family: system-ui, sans-serif; padding: 24px; background: #f4f7f9; }

.wrap {
  width: 320px;
  background: #e8f0f2;
  padding: 10px;
}

.card {
  width: 320px;
  padding: 20px;
  border: 4px solid #1fb6a8;
  margin-botom: 16px;
  background: #ffffff;
  font-size: 14px;
  box-sizing: content-box;
}`
        }
      ],
      runMode: 'compose',
      checks: [
        {
          label: 'Each card fits inside its 320px wrapper instead of spilling past it',
          test: c => c.css('.card', 'boxSizing') === 'border-box'
        },
        {
          label: 'There is a real gap between the two cards, not just a shared edge',
          test: c => c.css('.card', 'marginBottom') === '16px'
        },
        {
          label: 'Each card keeps its thick teal border and its padding',
          test: c => c.css('.card', 'borderTopWidth') === '4px' &&
            c.css('.card', 'borderTopColor') === 'rgb(31, 182, 168)' &&
            c.css('.card', 'paddingLeft') === '20px'
        },
        {
          label: 'The cards are still 320px wide, matching the wrapper',
          test: c => c.css('.card', 'width') === '320px'
        }
      ],
      hints: [
        'Nothing about colour or text is wrong here — everything in question is about size and spacing. Compare this file to Lesson 3\'s two boxes: which "deal" is <code>.card</code> currently using for its width, padding, and border?',
        'Lesson 3 showed two settings for <code>box-sizing</code> and two very different results for the same declared width. Which one is this card using? Separately, look at the margin property character by character — is it spelled exactly the way every other property here is?',
        '<code>box-sizing: content-box</code> (the default) adds padding and border ON TOP of the declared width, so a 320px card with 20px padding and a 4px border renders wider than its 320px wrapper — <code>border-box</code> folds them back in instead. And a misspelled property name is invisible to the browser; it is simply never applied, which is why the margin stays at its default of 0.'
      ]
    },

    /* ═══════════════════ 4 · Flexbox lays things out ═══════════════════ */

    {
      id: 'c-l4',
      kind: 'teach',
      title: 'Flexbox lays things out',
      repairId: 'c-d4',
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
        'Move <code>display: flex</code> from <code>.toolbar</code> down into <code>.tool</code>. The layout collapses — you will see this exact failure again in a minute.',
        'Now put <code>display: flex</code> back on <code>.toolbar</code>, but type <code>justify-content</code> as <code>just-content</code> by mistake, and press Run. The row comes back, but the tools bunch up on the left instead of spreading out — that combination is exactly the next repair job.'
      ]
    },

    {
      id: 'c-d4',
      kind: 'debug',
      title: 'The toolbar that stacked up',
      lessonId: 'c-l4',
      brief: `<p>The three tool buttons should sit in a single row, spread evenly across the dark
        toolbar.</p>
        <p>Right now they are stacked vertically down the page. Every property you need is already in
        the file. Fix the first thing you find, run it again, and look closely at how the row is
        spaced.</p>`,
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
  justify-conent: space-between;
  align-items: center;
  gap: 10px;
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
          label: 'The toolbar itself is the flex container',
          test: c => c.css('.toolbar', 'display') === 'flex'
        },
        {
          label: 'The tools are spread evenly across the row, not bunched to one side',
          test: c => c.css('.toolbar', 'justifyContent') === 'space-between'
        },
        {
          label: 'The tools are vertically centered in the row',
          test: c => c.css('.toolbar', 'alignItems') === 'center'
        },
        {
          label: 'Each tool still keeps its own teal background and padding',
          test: c => c.css('.tool', 'backgroundColor') === 'rgb(31, 182, 168)' &&
            c.css('.tool', 'paddingLeft') === '14px'
        }
      ],
      hints: [
        'Re-read the first line of Lesson 4: which element do flex properties belong to — the one being arranged, or the one doing the arranging? Look at where <code>display: flex</code> actually sits in this file.',
        'Once the tools sit in a row, they still are not spread out the way the lesson showed. Compare this file\'s spacing property, letter by letter, to the one Lesson 4 used — something in its name is not quite right.',
        'A flex container arranges its direct children — putting these properties on the children instead makes each one its own tiny container, which is why they stack. And a misspelled property is invisible to the browser: it does nothing, silently, which is why the row appears but never actually spreads out.'
      ]
    },

    /* ═══════════════════ 5 · Units, colours, inheritance ═══════════════════ */

    {
      id: 'c-l5',
      kind: 'teach',
      title: 'Units, colours, inheritance',
      repairId: 'c-d5',
      concept: `
        <p><strong>Units.</strong> <code>px</code> is a fixed size. <code>%</code> is relative to the
        parent. <code>rem</code> is relative to the page's base font size, which is what makes a design
        scale when someone zooms in. Every length needs one of these — a bare number like
        <code>font-size: 20;</code> means nothing to the browser and the whole declaration is thrown
        away.</p>
        <p><strong>Colours.</strong> <code>#1fb6a8</code> is hex. <code>rgb(31, 182, 168)</code> is the
        same colour. <code>rgba(31, 182, 168, 0.3)</code> adds transparency — that fourth number is an
        <em>alpha channel</em> running from <code>0</code> (invisible) to <code>1</code> (fully solid).
        Anything higher than <code>1</code> just gets clamped down to solid.</p>
        <p><strong>Inheritance.</strong> Some properties flow down to children automatically —
        <code>color</code>, <code>font-family</code>, <code>font-size</code>, <code>line-height</code>.
        Most do not: <code>border</code>, <code>padding</code>, and <code>background</code> stop where
        you put them.</p>`,
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
        'Change the chip background alpha from <code>0.18</code> to <code>1.4</code> and press Run. Colours cannot go past fully solid — the browser just clamps it, silently.',
        'Now change the heading\'s <code>font-size</code> to <code>20</code>, with no unit at all, and press Run. Nothing crashes — and nothing changes size either.'
      ]
    },

    {
      id: 'c-d5',
      kind: 'debug',
      title: 'The alert that lost its size and its shade',
      lessonId: 'c-l5',
      brief: `<p>The "Threat level" heading should be noticeably larger than the paragraph beneath it, and
        the "Low" chip should sit on a soft, translucent teal tint — see-through enough that you can
        tell it is a highlight, not a solid block.</p>
        <p>Right now the heading is the same size as ordinary text, and the chip is a solid, opaque
        block. Fix the first one, run it again, and look very closely at the chip's colour value — it
        is not quite what it looks like.</p>`,
      goal: 'A heading noticeably larger than the paragraph beneath it, and a soft translucent teal chip — not a solid block.',
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

.panel h3 {
  font-size: 1.5;
}

.chip {
  display: inline-block;
  background: rgba(31, 182, 168, 1.4);
  color: #0f7d72;
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 700;
}`
        }
      ],
      runMode: 'compose',
      checks: [
        {
          label: 'The threat-level heading is noticeably larger than the paragraph text',
          test: c => c.css('.panel h3', 'fontSize') === '1.5rem'
        },
        {
          label: 'The chip is a soft translucent tint, not a solid block',
          test: c => c.css('.chip', 'backgroundColor') === 'rgba(31, 182, 168, 0.18)'
        },
        {
          label: 'The chip text keeps its dark teal colour',
          test: c => c.css('.chip', 'color') === 'rgb(15, 125, 114)'
        },
        {
          label: 'The panel still has its teal left border',
          test: c => c.css('.panel', 'borderLeftWidth') === '4px' && c.css('.panel', 'borderLeftColor') === 'rgb(31, 182, 168)'
        }
      ],
      hints: [
        'The heading and the chip both look the way they do because a value the browser did not understand got thrown away — the same way a badge\'s colour once did. Start with the heading: what shape is every other size value on this page, that this one is missing?',
        'A length needs a unit — a number alone means nothing to the browser, so the whole declaration is discarded. Once the heading is properly sized, look very closely at the chip\'s <code>rgba(...)</code> value: three of its numbers are colour channels from 0 to 255, but the fourth follows a completely different scale.',
        'An alpha channel only runs from 0 (fully see-through) to 1 (fully solid) — anything higher just gets clamped down to 1, which is why the chip looks like a solid block instead of a soft tint. And any dimension in CSS — width, padding, font-size — needs an explicit unit (<code>px</code>, <code>rem</code>, <code>%</code>) or the browser silently ignores the whole line.'
      ]
    },

    /* ═══════════════════ 6 · Position and z-index ═══════════════════ */

    {
      id: 'c-l6',
      kind: 'teach',
      title: 'Position and z-index',
      repairId: 'c-d6',
      concept: `
        <p>By default every element is <code>position: static</code> — it sits exactly where normal
        document flow puts it, and <code>top</code> / <code>left</code> / <code>right</code> /
        <code>bottom</code> do nothing to it at all.</p>
        <ul>
          <li><code>relative</code> — shifts an element from its normal spot, but leaves its original
            space behind, and turns it into an anchor point for anything positioned inside it.</li>
          <li><code>absolute</code> — pulls an element out of the flow entirely and positions it
            against the nearest ancestor that is NOT <code>static</code>. No positioned ancestor? It
            anchors to the whole page instead.</li>
          <li><code>fixed</code> — anchors to the browser window itself, and stays put even while the
            page scrolls.</li>
        </ul>
        <p><code>z-index</code> decides which overlapping element sits on top — but it only has any
        effect on an element that is already positioned (anything other than <code>static</code>). Add
        <code>z-index: 999</code> to a <code>static</code> element and nothing happens at all, no matter
        how high the number is.</p>`,
      files: [
        {
          name: 'page.html', lang: 'html', editable: false,
          code: `<div class="card">
  <h3>Incident #118</h3>
  <p>Investigating a phishing report.</p>
  <span class="tag">In progress</span>
</div>`
        },
        {
          name: 'style.css', lang: 'css', editable: true,
          code: `body { font-family: system-ui, sans-serif; padding: 24px; background: #f4f7f9; }

.card {
  position: relative;
  background: #ffffff;
  border: 2px solid #1fb6a8;
  border-radius: 12px;
  padding: 18px;
  width: 260px;
}

.tag {
  position: absolute;
  top: 10px;
  right: 10px;
  background: #ff5b00;
  color: #ffffff;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}`
        }
      ],
      runMode: 'compose',
      tryIt: [
        'Change <code>.card</code>\'s <code>position</code> from <code>relative</code> to <code>static</code> and press Run. The tag jumps away from the corner of the card — it is now anchoring to the whole page instead.',
        'Put <code>.card</code> back to <code>relative</code>, then add <code>z-index: -1;</code> to <code>.tag</code>. It slips behind the card\'s white background.',
        'Now add <code>z-index: 999;</code> to <code>.card</code> itself, but change its <code>position</code> to <code>static</code>. Nothing moves at all, no matter how high that number goes — remember this exact trap.'
      ]
    },

    {
      id: 'c-d6',
      kind: 'debug',
      title: 'The alert that gets buried',
      lessonId: 'c-l6',
      brief: `<p>The little "In progress" tag should sit pinned to the top-right corner of its own
        card. And the maintenance banner above it should be able to stack above everything else on the
        page.</p>
        <p>Right now the tag is anchored to the wrong thing entirely, and the banner's stacking order
        does nothing at all, no matter how high its number goes.</p>`,
      goal: 'The tag stays pinned to the top-right corner of its own card, and the banner\'s stacking order actually takes effect.',
      files: [
        {
          name: 'page.html', lang: 'html', editable: false,
          code: `<div class="banner">Scheduled maintenance tonight at 9pm</div>

<div class="card">
  <h3>Incident #118</h3>
  <p>Investigating a phishing report.</p>
  <span class="tag">In progress</span>
</div>`
        },
        {
          name: 'style.css', lang: 'css', editable: true,
          code: `body { font-family: system-ui, sans-serif; padding: 24px; background: #f4f7f9; }

.banner {
  background: #145c68;
  color: #ffffff;
  padding: 10px 16px;
  z-index: 10;
}

.card {
  background: #ffffff;
  border: 2px solid #1fb6a8;
  border-radius: 12px;
  padding: 18px;
  width: 260px;
}

.tag {
  position: absolute;
  top: 10px;
  right: 10px;
  background: #ff5b00;
  color: #ffffff;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}`
        }
      ],
      runMode: 'compose',
      checks: [
        {
          label: 'The tag anchors to its own card, not the whole page',
          test: c => c.css('.card', 'position') === 'relative'
        },
        {
          label: 'The tag still sits 10px from the card\'s top-right corner',
          test: c => c.css('.tag', 'position') === 'absolute' && c.css('.tag', 'top') === '10px' && c.css('.tag', 'right') === '10px'
        },
        {
          label: 'The banner\'s stacking order can actually take effect',
          test: c => ['relative', 'absolute', 'fixed', 'sticky'].includes(c.css('.banner', 'position'))
        },
        {
          label: 'The banner keeps the high z-index it was given',
          test: c => c.css('.banner', 'zIndex') === '10'
        }
      ],
      hints: [
        'The tag is not landing in the wrong spot because of anything on <code>.tag</code> itself — that rule is unchanged from the lesson. Look at the element it is supposed to be anchored to instead.',
        'An absolutely positioned element anchors to the nearest ancestor that is NOT <code>position: static</code>. Check <code>.card</code>\'s <code>position</code> value. Separately — the banner has a <code>z-index</code>, but does it have the one thing <code>z-index</code> actually needs to do anything at all?',
        '<code>position: absolute</code> looks past any <code>static</code> ancestor and keeps going until it finds one that is not — or gives up and anchors to the whole page. And <code>z-index</code> is inert on a <code>static</code> element, no matter the number; it only takes effect once an element is <code>relative</code>, <code>absolute</code>, <code>fixed</code>, or <code>sticky</code>.'
      ]
    },

    /* ═══════════════════ 7 · Pseudo-classes and states ═══════════════════ */

    {
      id: 'c-l7',
      kind: 'teach',
      title: 'Pseudo-classes and states',
      repairId: 'c-d7',
      concept: `
        <p>A <strong>pseudo-class</strong> selects an element based on something other than its tag,
        class, or id — usually its <em>position among siblings</em>, or a temporary <em>state</em>.</p>
        <ul>
          <li><code>:hover</code> — while the mouse sits over it (try it in the live preview — code
            alone cannot show you this one)</li>
          <li><code>:first-child</code> — matches an element only if it is the very first child of its
            parent</li>
          <li><code>:last-child</code> — only the last child</li>
          <li><code>:nth-child(2)</code> — only that exact position</li>
          <li><code>:nth-child(2n)</code> or <code>:nth-child(even)</code> — every second one, forever
            — useful for striping rows</li>
        </ul>
        <p>The hyphen matters: <code>:first-child</code> is a real pseudo-class. Something like
        <code>:firstchild</code> is not — the browser does not recognize it, so the whole rule quietly
        does nothing, exactly like every other unrecognized piece of CSS you have met so far.</p>`,
      files: [
        {
          name: 'page.html', lang: 'html', editable: false,
          code: `<h2>Incident Response Steps</h2>
<ol class="steps">
  <li>Confirm the alert is real</li>
  <li>Isolate the affected device</li>
  <li>Notify the SOC lead</li>
  <li>Write the incident report</li>
</ol>`
        },
        {
          name: 'style.css', lang: 'css', editable: true,
          code: `body { font-family: system-ui, sans-serif; padding: 24px; background: #f4f7f9; }

.steps li {
  padding: 10px 14px;
  border-bottom: 1px solid #dbe4e8;
}

.steps li:first-child {
  background: #eaf7f5;
  font-weight: 700;
  color: #0f7d72;
}

.steps li:nth-child(2n) {
  background: #eef3f5;
}

.steps li:last-child {
  color: #ff5b00;
  font-weight: 700;
}`
        }
      ],
      runMode: 'compose',
      tryIt: [
        'Change <code>:nth-child(2n)</code> to <code>:nth-child(3)</code> and press Run. Only one row stripes now, instead of every other one.',
        'Change <code>.steps li:first-child</code> to <code>.steps li:firstchild</code> (no hyphen) and press Run. Nothing about the first row changes — the browser silently ignores a pseudo-class it does not recognize.',
        'Hover your mouse over a row in the live preview. Nothing happens yet — <code>:hover</code> only exists through a real mouse interaction, not in the code by itself.'
      ]
    },

    {
      id: 'c-d7',
      kind: 'debug',
      title: 'The steps that forgot their order',
      lessonId: 'c-l7',
      brief: `<p>The first step should stand out as the starting point — teal and bold. Every other row
        (the 2nd and 4th) should carry a light grey stripe. And the last step should read in bold
        orange.</p>
        <p>Right now none of the first step's styling shows up. Once you find that, notice the striping
        only ever lands on a single row instead of every other one.</p>`,
      goal: 'Step 1 highlighted teal and bold. Steps 2 and 4 lightly striped. The last step ("Write the incident report") shown in bold orange.',
      files: [
        {
          name: 'page.html', lang: 'html', editable: false,
          code: `<h2>Incident Response Steps</h2>
<ol class="steps">
  <li>Confirm the alert is real</li>
  <li>Isolate the affected device</li>
  <li>Notify the SOC lead</li>
  <li>Write the incident report</li>
</ol>`
        },
        {
          name: 'style.css', lang: 'css', editable: true,
          code: `body { font-family: system-ui, sans-serif; padding: 24px; background: #f4f7f9; }

.steps li {
  padding: 10px 14px;
  border-bottom: 1px solid #dbe4e8;
}

.steps li:firstchild {
  background: #eaf7f5;
  font-weight: 700;
  color: #0f7d72;
}

.steps li:nth-child(2) {
  background: #eef3f5;
}

.steps li:last-child {
  color: #ff5b00;
  font-weight: 700;
}`
        }
      ],
      runMode: 'compose',
      checks: [
        {
          label: 'Step 1 is highlighted teal and bold',
          test: c => {
            const li = c.doc.querySelectorAll('.steps li')[0];
            if (!li) return false;
            const s = c.win.getComputedStyle(li);
            return s.color === 'rgb(15, 125, 114)' && s.fontWeight === '700';
          }
        },
        {
          label: 'Steps 2 and 4 are both striped, not just one of them',
          test: c => {
            const items = Array.from(c.doc.querySelectorAll('.steps li'));
            if (items.length !== 4) return false;
            const bg = i => c.win.getComputedStyle(items[i]).backgroundColor;
            return bg(1) === 'rgb(238, 243, 245)' && bg(3) === 'rgb(238, 243, 245)';
          }
        },
        {
          label: 'Steps 1 and 3 are NOT striped',
          test: c => {
            const items = Array.from(c.doc.querySelectorAll('.steps li'));
            if (items.length !== 4) return false;
            const bg = i => c.win.getComputedStyle(items[i]).backgroundColor;
            return bg(0) !== 'rgb(238, 243, 245)' && bg(2) !== 'rgb(238, 243, 245)';
          }
        },
        {
          label: 'The last step reads in bold orange',
          test: c => {
            const items = Array.from(c.doc.querySelectorAll('.steps li'));
            const last = items[items.length - 1];
            if (!last) return false;
            const s = c.win.getComputedStyle(last);
            return s.color === 'rgb(255, 91, 0)' && s.fontWeight === '700';
          }
        }
      ],
      hints: [
        'The first step should look different from the rest — highlighted and bold — but it does not. And the stripe that should land on every other row only ever lands on one. Both selectors use a pseudo-class; read each one very carefully.',
        'Compare <code>:firstchild</code> here to <code>:first-child</code> from the lesson — is a piece of punctuation missing? And compare <code>:nth-child(2)</code> to the lesson\'s striping rule — one selects a single fixed position, the other repeats forever.',
        'An unrecognized pseudo-class (missing its hyphen) does not error — the whole rule is just silently ignored, exactly like an unknown property. And <code>:nth-child(2)</code> only ever matches the literal 2nd child; to repeat the pattern down the list, the argument needs to describe every Nth one, like <code>2n</code> or the keyword <code>even</code>.'
      ]
    },

    /* ═══════════════════ 8 · Custom properties (CSS variables) ═══════════════════ */

    {
      id: 'c-l8',
      kind: 'teach',
      title: 'Custom properties (CSS variables)',
      repairId: 'c-d8',
      concept: `
        <p>A <strong>custom property</strong> stores a value under a name you choose, written with two
        dashes: <code>--brand-teal: #1fb6a8;</code>. Declare it once — usually on <code>:root</code>, so
        it is available everywhere — and read it anywhere with <code>var(--brand-teal)</code>.</p>
        <ul>
          <li>The name is exact and case-sensitive, dashes included. <code>--brand-teal</code> and
            <code>--brand-teel</code> are two completely different, unrelated names to the browser.</li>
          <li><code>var(--name, fallback)</code> takes a second argument: a value to fall back to if
            that name was never defined.</li>
          <li>Reference a name that does not exist, with no fallback, and the property behaves as if it
            was never set at all — no error, just silence.</li>
        </ul>
        <p>The payoff: change one line on <code>:root</code> and every rule that reads that variable
        updates together — instead of hunting down the same hex code in ten different places.</p>`,
      files: [
        {
          name: 'page.html', lang: 'html', editable: false,
          code: `<div class="card">
  <h3>Session Alert</h3>
  <p>New sign-in from an unrecognized device.</p>
  <button class="btn">Review</button>
</div>`
        },
        {
          name: 'style.css', lang: 'css', editable: true,
          code: `:root {
  --brand-teal: #1fb6a8;
  --brand-orange: #ff5b00;
  --gap: 14px;
}

body { font-family: system-ui, sans-serif; padding: 24px; background: #f4f7f9; }

.card {
  background: #ffffff;
  border: 2px solid var(--brand-teal);
  border-radius: 12px;
  padding: var(--gap);
}

.btn {
  background: var(--brand-orange);
  color: #ffffff;
  border: none;
  padding: 10px 16px;
  border-radius: 8px;
  font-weight: 700;
}`
        }
      ],
      runMode: 'compose',
      tryIt: [
        'Change <code>--brand-teal</code> on <code>:root</code> to <code>#7a3dff</code>, and press Run. <code>.card</code>\'s border updates too, even though you never touched the <code>.card</code> rule.',
        'Now change <code>.btn</code>\'s <code>background</code> to <code>var(--brand-orang)</code> (missing the final "e") and press Run. The button loses its colour entirely — no error, no warning.',
        'Try <code>var(--brand-orang, #999999)</code> instead — a fallback value. Now it falls back gracefully instead of disappearing.'
      ]
    },

    {
      id: 'c-d8',
      kind: 'debug',
      title: 'The colours that stopped following the variable',
      lessonId: 'c-l8',
      brief: `<p>The alert card should keep its teal border, and the "Review" button should be solid
        orange.</p>
        <p>Both rules reference a custom property with <code>var(...)</code>, and neither reference is
        misspelled in an obvious, matching way — but each one is pointing at a name that does not exist
        anywhere on the page.</p>`,
      goal: 'The card keeps a teal border, and the button is solid orange — both colours pulled from the variables defined at the top of the file.',
      files: [
        {
          name: 'page.html', lang: 'html', editable: false,
          code: `<div class="card">
  <h3>Session Alert</h3>
  <p>New sign-in from an unrecognized device.</p>
  <button class="btn">Review</button>
</div>`
        },
        {
          name: 'style.css', lang: 'css', editable: true,
          code: `:root {
  --brand-teel: #1fb6a8;
  --brand-orange: #ff5b00;
  --gap: 14px;
}

body { font-family: system-ui, sans-serif; padding: 24px; background: #f4f7f9; }

.card {
  background: #ffffff;
  border: 2px solid var(--brand-teal);
  border-radius: 12px;
  padding: var(--gap);
}

.btn {
  background: var(--brand-orang);
  color: #ffffff;
  border: none;
  padding: 10px 16px;
  border-radius: 8px;
  font-weight: 700;
}`
        }
      ],
      runMode: 'compose',
      checks: [
        {
          label: 'The card\'s border colour variable actually points at something defined on :root',
          test: c => {
            const sheet = c.doc.styleSheets && c.doc.styleSheets[0];
            if (!sheet) return false;
            const rules = Array.from(sheet.cssRules);
            const root = rules.find(r => r.selectorText === ':root');
            const card = rules.find(r => r.selectorText === '.card');
            if (!root || !card) return false;
            const val = card.style.getPropertyValue('border');
            const m = val.match(/var\(\s*(--[\w-]+)/);
            return !!m && root.style.getPropertyValue(m[1]).trim() !== '';
          }
        },
        {
          label: 'The button\'s background colour variable actually points at something defined on :root',
          test: c => {
            const sheet = c.doc.styleSheets && c.doc.styleSheets[0];
            if (!sheet) return false;
            const rules = Array.from(sheet.cssRules);
            const root = rules.find(r => r.selectorText === ':root');
            const btn = rules.find(r => r.selectorText === '.btn');
            if (!root || !btn) return false;
            const val = btn.style.getPropertyValue('background');
            const m = val.match(/var\(\s*(--[\w-]+)/);
            return !!m && root.style.getPropertyValue(m[1]).trim() !== '';
          }
        },
        {
          label: 'The --gap variable used for the card\'s padding is untouched',
          test: c => {
            const sheet = c.doc.styleSheets && c.doc.styleSheets[0];
            if (!sheet) return false;
            const root = Array.from(sheet.cssRules).find(r => r.selectorText === ':root');
            return !!root && root.style.getPropertyValue('--gap').trim() === '14px';
          }
        }
      ],
      hints: [
        'The <code>.card</code> border and the <code>.btn</code> background both reference a variable with <code>var(--name)</code>. For each one, does that exact name actually get DEFINED anywhere on <code>:root</code>?',
        'Compare <code>--brand-teal</code> (used in <code>.card</code>) against every name declared on <code>:root</code>, letter by letter. Do the same for <code>--brand-orange</code>. One mismatch is in the definition; the other is in the reference — they are not both broken in the same direction.',
        'A custom property name must match exactly everywhere it appears — case, dashes, spelling, all of it. Get one character wrong on either the defining side or the reading side, and <code>var()</code> simply resolves to nothing, with no error at all.'
      ]
    },

    /* ═══════════════════ 9 · Grid layout ═══════════════════ */

    {
      id: 'c-l9',
      kind: 'teach',
      title: 'Grid layout',
      repairId: 'c-d9',
      concept: `
        <p><code>display: grid</code> turns a container into a two-dimensional layout: rows AND
        columns at once, not just one line like flexbox.</p>
        <ul>
          <li><code>grid-template-columns</code> — how many column tracks, and how wide each one is.
            <code>1fr 1fr 1fr</code> means three equal, flexible columns.</li>
          <li><code>gap</code> — space between both rows and columns, in one property.</li>
          <li>Children are placed into the grid automatically, left to right, wrapping to a new row
            when a track runs out — unless you place one explicitly with <code>grid-column</code>
            (which columns it spans) or <code>grid-row</code>.</li>
          <li><code>grid-column: 1 / 3</code> — start at column line 1, end at column line 3 (spanning
            two tracks). <code>grid-column: span 2</code> means the same thing, phrased as a count
            instead of line numbers.</li>
        </ul>
        <p>Track lists are separated by <strong>spaces</strong>, not commas — a stray comma makes the
        whole declaration invalid, and the browser throws it away rather than guessing what you
        meant.</p>`,
      files: [
        {
          name: 'page.html', lang: 'html', editable: false,
          code: `<h2>Weekly Stats</h2>
<div class="stats">
  <div class="stat">Logins checked<br>142</div>
  <div class="stat">Phishing reports<br>9</div>
  <div class="stat">Devices scanned<br>58</div>
  <div class="stat">Open incidents<br>2</div>
  <div class="stat summary">All systems normal</div>
</div>`
        },
        {
          name: 'style.css', lang: 'css', editable: true,
          code: `body { font-family: system-ui, sans-serif; padding: 24px; background: #f4f7f9; }

.stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.stat {
  background: #ffffff;
  border: 2px solid #1fb6a8;
  border-radius: 10px;
  padding: 16px;
  text-align: center;
  font-weight: 600;
}

.summary {
  grid-column: span 2;
  background: #0b2030;
  color: #ffffff;
}`
        }
      ],
      runMode: 'compose',
      tryIt: [
        'Change <code>grid-template-columns: 1fr 1fr</code> to <code>1fr, 1fr</code> (with a comma) and press Run. Every tile drops into a single column instead of two.',
        'Change <code>.summary</code>\'s <code>grid-column: span 2</code> to <code>grid-columns: span 2</code> (with an extra "s") and press Run. Nothing about its width changes at all.',
        'Change <code>gap</code> to <code>20px</code> and watch the space between every tile grow at once — rows and columns together.'
      ]
    },

    {
      id: 'c-d9',
      kind: 'debug',
      title: 'The stats grid that fell into one column',
      lessonId: 'c-l9',
      brief: `<p>The four stat tiles should sit in a neat 2-column grid, and the summary tile underneath
        should stretch across both columns.</p>
        <p>Right now every tile is stacked in a single column. Once that is fixed, the summary tile is
        still only as wide as one of them.</p>`,
      goal: 'Four stat tiles arranged 2-by-2 with a gap between them, and a wide summary tile spanning both columns underneath.',
      files: [
        {
          name: 'page.html', lang: 'html', editable: false,
          code: `<h2>Weekly Stats</h2>
<div class="stats">
  <div class="stat">Logins checked<br>142</div>
  <div class="stat">Phishing reports<br>9</div>
  <div class="stat">Devices scanned<br>58</div>
  <div class="stat">Open incidents<br>2</div>
  <div class="stat summary">All systems normal</div>
</div>`
        },
        {
          name: 'style.css', lang: 'css', editable: true,
          code: `body { font-family: system-ui, sans-serif; padding: 24px; background: #f4f7f9; }

.stats {
  display: grid;
  grid-template-columns: 1fr, 1fr;
  gap: 12px;
}

.stat {
  background: #ffffff;
  border: 2px solid #1fb6a8;
  border-radius: 10px;
  padding: 16px;
  text-align: center;
  font-weight: 600;
}

.summary {
  grid-columns: span 2;
  background: #0b2030;
  color: #ffffff;
}`
        }
      ],
      runMode: 'compose',
      checks: [
        {
          label: 'The stats are arranged in two columns, not stacked into one',
          test: c => {
            const v = c.css('.stats', 'gridTemplateColumns');
            if (!v || v === 'none') return false;
            return v.trim().split(/\s+/).length === 2;
          }
        },
        {
          label: 'The gap between tiles is unchanged at 12px',
          test: c => c.css('.stats', 'gap') === '12px'
        },
        {
          label: 'The summary tile spans both columns',
          test: c => {
            const v = c.css('.summary', 'gridColumn');
            return /span\s*2/.test(v) || /1\s*\/\s*3/.test(v);
          }
        },
        {
          label: 'The summary tile keeps its dark background',
          test: c => c.css('.summary', 'backgroundColor') === 'rgb(11, 32, 48)'
        }
      ],
      hints: [
        'Every tile is falling into a single column — the track list controlling that has more than one piece of punctuation going on. And separately, the summary tile is still only one column wide — check the exact property name responsible for that.',
        'A <code>grid-template-columns</code> track list is separated the same way a <code>gap</code> shorthand\'s two numbers are — by a space. And compare <code>grid-columns</code> here to the property Lesson 9 actually used for spanning.',
        'A comma inside <code>grid-template-columns</code> makes the whole value invalid, so the grid falls back to a single default column — spaces are what actually separate one track from the next. And a property name that does not exist (like the plural <code>grid-columns</code>) is simply invisible to the browser, so <code>grid-column</code> — singular — is what really controls how many tracks an item spans.'
      ]
    },

    /* ═══════════════════ 10 · Media queries — responsive basics ═══════════════════ */

    {
      id: 'c-l10',
      kind: 'teach',
      title: 'Media queries — responsive basics',
      repairId: 'c-d10',
      concept: `
        <p>A <strong>media query</strong> wraps ordinary rules in a condition based on the browser
        window: <code>@media (min-width: 700px) { ... }</code> only applies those rules once the
        viewport is at least 700px wide. <code>max-width</code> works the other direction — up to that
        width.</p>
        <ul>
          <li>A common pattern is "mobile-first": write simple, stacked styles as the default, then use
            a <code>min-width</code> breakpoint to add a fancier layout as the screen grows.</li>
          <li>Everything you have learned still applies one level deeper inside a media block — the
            same braces, the same cascade, the same specificity. A rule inside <code>@media</code> still
            has to out-score a competing rule to win.</li>
          <li>Mixing up <code>min-width</code> and <code>max-width</code> is one of the most common
            breakpoint bugs — it makes a layout apply exactly backwards from what you intended.</li>
        </ul>`,
      files: [
        {
          name: 'page.html', lang: 'html', editable: false,
          code: `<nav id="site-nav" class="nav">
  <a href="#" class="active">Dashboard</a>
  <a href="#">Reports</a>
  <a href="#">Settings</a>
</nav>`
        },
        {
          name: 'style.css', lang: 'css', editable: true,
          code: `body { font-family: system-ui, sans-serif; padding: 24px; background: #f4f7f9; }

.nav {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

#site-nav a {
  color: #557799;
  text-decoration: none;
  padding: 6px 10px;
}

@media (min-width: 700px) {
  .nav {
    flex-direction: row;
  }
}`
        }
      ],
      runMode: 'compose',
      tryIt: [
        'Resize your actual browser window narrower and wider while viewing a page like this one elsewhere — a real media query responds live, the moment the window crosses the breakpoint.',
        'Change <code>min-width: 700px</code> to <code>max-width: 700px</code> and picture a wide monitor: the layout would now do the opposite of what you want.',
        'Add a second rule inside the same <code>@media</code> block for <code>.active</code> with a bigger <code>font-size</code> — nested rules follow the exact same cascade rules as everything outside the block.'
      ]
    },

    {
      id: 'c-d10',
      kind: 'debug',
      title: 'Everything, all at once',
      lessonId: 'c-l10',
      brief: `<p>The current-page link ("Dashboard") should read in bold orange. The nav should stack
        vertically by default and switch to a horizontal row once the screen is wide enough. And the
        maintenance banner should keep its cream background with an orange bar.</p>
        <p>Right now the current-page link is still the same muted grey as the others, and the layout
        only becomes a row on NARROW screens — backwards from how it should work. Fix each thing you
        find and check the page again; several small mistakes are stacked on top of each other here.</p>`,
      goal: 'The "Dashboard" link is bold orange. The nav stacks vertically by default and becomes a horizontal row only once the screen is wide (not narrow). The banner keeps its cream background and orange bar.',
      files: [
        {
          name: 'page.html', lang: 'html', editable: false,
          code: `<nav id="site-nav" class="nav">
  <a href="#" class="active">Dashboard</a>
  <a href="#">Reports</a>
  <a href="#">Settings</a>
</nav>

<div class="banner">New device alert — review sign-ins from unfamiliar locations.</div>`
        },
        {
          name: 'style.css', lang: 'css', editable: true,
          code: `body { font-family: system-ui, sans-serif; padding: 24px; background: #f4f7f9; }

.nav {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

#site-nav a {
  color: #557799;
  text-decoration: none;
  padding: 6px 10px;
}

.active {
  color: #ff5b00
  font-weight: 700;
}

.banner {
  background: #fff4e5;
  border-left: 4px solid #ff5b00;
  padding: 12px 16px;
  margin-top: 16px;
}

@media (max-width: 700px) {
  .nav {
    flex-direction: row;
    flex-wrap: wrap;
  }
}`
        }
      ],
      runMode: 'compose',
      checks: [
        {
          label: 'The nav stacks vertically by default',
          test: c => c.css('.nav', 'flexDirection') === 'column'
        },
        {
          label: 'The current page link ("Dashboard") is bold',
          test: c => c.css('.active', 'fontWeight') === '700'
        },
        {
          label: 'The current page link is orange, not the default muted grey',
          test: c => c.css('.active', 'color') === 'rgb(255, 91, 0)'
        },
        {
          label: 'The nav becomes a row once the screen is wide enough — not once it gets narrow',
          test: c => {
            const sheet = c.doc.styleSheets && c.doc.styleSheets[0];
            if (!sheet) return false;
            const mediaRule = Array.from(sheet.cssRules).find(r => r.media);
            if (!mediaRule) return false;
            const m = mediaRule.media.mediaText.match(/min-width\s*:\s*(\d+)px/);
            if (!m) return false;
            const px = +m[1];
            if (px < 500 || px > 900) return false;
            const navRule = Array.from(mediaRule.cssRules).find(r => r.selectorText && r.selectorText.trim() === '.nav');
            return !!navRule && navRule.style.getPropertyValue('flex-direction').trim() === 'row';
          }
        },
        {
          label: 'The banner keeps its cream background and orange left bar',
          test: c => c.css('.banner', 'backgroundColor') === 'rgb(255, 244, 229)' &&
            c.css('.banner', 'borderLeftWidth') === '4px' &&
            c.css('.banner', 'borderLeftColor') === 'rgb(255, 91, 0)'
        }
      ],
      hints: [
        'Three separate things are each a little bit wrong here, and none of them throw an error. Start with the "Dashboard" link — read its rule\'s declarations very carefully, the same way you would for a semicolon problem.',
        'Once the punctuation is fixed, "Dashboard" still might not be orange — score its selector against the other rule that also sets <code>color</code> on nav links, the way Lesson 2 taught you. Separately, compare the two words <code>min-width</code> and <code>max-width</code> in the <code>@media</code> line to what Lesson 10 said about "mobile-first."',
        'A missing <code>;</code> merges two declarations into one invalid one, discarding both. Equal or lower specificity always loses, no matter how the file is ordered — the fix has to out-score the competing selector. And <code>min-width</code> describes screens AT LEAST that wide; <code>max-width</code> describes screens UP TO that wide — swapping them flips a responsive layout exactly backwards.'
      ]
    }
  ]
};
