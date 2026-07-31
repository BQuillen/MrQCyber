/* ============================================================
   JavaScript track — 5 lessons, then 5 broken scripts.

   Output is the captured console (ctx.logs). Stages that touch the
   page also get a live preview, and their checks may drive the page
   through an `interact` step before asserting.
   ============================================================ */

TRACKS.js = {
  id: 'js',
  name: 'JavaScript',
  icon: 'JS',
  accent: '#facf00',
  tagline: 'behaviour · the muscles',
  desc: 'Variables, functions, loops, and events. JavaScript will happily run a program that means something different from what you intended — which makes reading the actual output your sharpest tool.',
  stages: [

    /* ─────────────── LEARN ─────────────── */

    {
      id: 'j-l1',
      kind: 'teach',
      title: 'Variables hold values',
      concept: `
        <p>A variable is a labelled box. <code>let</code> makes one you can change later;
        <code>const</code> makes one you cannot reassign.</p>
        <p>Every value has a <strong>type</strong>. The two you will meet constantly:</p>
        <ul>
          <li><code>"18"</code> with quotes is a <strong>string</strong> — text</li>
          <li><code>18</code> without quotes is a <strong>number</strong></li>
        </ul>
        <p>They look identical when printed. They behave completely differently when you do maths on
        them. <code>typeof</code> tells you which one you actually have — reach for it the moment a
        calculation gives you something bizarre.</p>
        <p><code>console.log()</code> prints to the console panel on the right. It is the single most
        useful debugging tool in the language.</p>`,
      files: [{
        name: 'script.js', lang: 'js', editable: true,
        code: `let clubName = "Cyber Club";
let members = 18;
const room = 214;

console.log(clubName);
console.log("Members:", members);
console.log("Room:", room);

// same-looking values, different types
console.log(typeof clubName, typeof members);

// numbers add; strings glue together
console.log(members + 2);
console.log("18" + 2);`
      }],
      runMode: 'compose',
      outputMode: 'console',
      tryIt: [
        'Change <code>members</code> to <code>25</code> and run again.',
        'Look hard at the last two lines. Same-looking inputs, very different answers.',
        'Add <code>console.log(typeof "18", typeof 18);</code> at the bottom.'
      ]
    },

    {
      id: 'j-l2',
      kind: 'teach',
      title: 'Functions take in, give back',
      concept: `
        <p>A function packages up work you want to reuse. It takes <strong>parameters</strong> in and
        hands a value back with <code>return</code>.</p>
        <p>The word <code>return</code> is doing real work. Without it a function still runs every line
        inside — it just hands back <code>undefined</code> when it finishes. The calculation happened;
        the answer was thrown away.</p>
        <ul>
          <li>Calling a function: <code>double(5)</code></li>
          <li>Using what it returned: <code>let x = double(5);</code></li>
          <li><code>return</code> also stops the function immediately — nothing after it runs</li>
        </ul>`,
      files: [{
        name: 'script.js', lang: 'js', editable: true,
        code: `function double(n) {
  return n * 2;
}

function greet(name) {
  return "Welcome, " + name + "!";
}

// this one is missing its return
function triple(n) {
  n * 3;
}

console.log(double(5));
console.log(greet("Maya"));
console.log(triple(5));`
      }],
      runMode: 'compose',
      outputMode: 'console',
      tryIt: [
        'The third line of output is <code>undefined</code>. Fix <code>triple</code> so it returns a number.',
        'Add a <code>console.log("computing...");</code> line <em>after</em> the <code>return</code> in <code>double</code>. It never prints.',
        'Write your own function <code>square(n)</code> and log <code>square(7)</code>.'
      ]
    },

    {
      id: 'j-l3',
      kind: 'teach',
      title: 'Conditions and comparison',
      concept: `
        <p><code>if</code> runs a block only when its condition is true. The comparison operators:</p>
        <ul>
          <li><code>===</code> — equal, and the same type (use this one)</li>
          <li><code>!==</code> — not equal</li>
          <li><code>&gt;</code> <code>&lt;</code> <code>&gt;=</code> <code>&lt;=</code> — ordering</li>
          <li><code>&amp;&amp;</code> — and &nbsp;·&nbsp; <code>||</code> — or &nbsp;·&nbsp; <code>!</code> — not</li>
        </ul>
        <p>Two traps live here. <code>==</code> converts types before comparing, so
        <code>"5" == 5</code> is true — which hides bugs. And <code>=</code> with a single equals sign
        is <em>assignment</em>, not comparison. Put it in an <code>if</code> and you have not asked a
        question, you have changed the variable.</p>`,
      files: [{
        name: 'script.js', lang: 'js', editable: true,
        code: `let failedLogins = 4;

if (failedLogins >= 5) {
  console.log("Account locked.");
} else if (failedLogins >= 3) {
  console.log("Warning: unusual activity.");
} else {
  console.log("All normal.");
}

// === is strict, == is not
console.log(5 === 5);
console.log("5" === 5);
console.log("5" == 5);

// combining conditions
let isAdmin = false;
console.log(failedLogins > 2 && !isAdmin);`
      }],
      runMode: 'compose',
      outputMode: 'console',
      tryIt: [
        'Set <code>failedLogins</code> to <code>7</code>, then <code>1</code>. Only one branch ever runs.',
        'Swap the first two conditions so <code>&gt;= 3</code> is checked first. Set the count to 9. Order matters more than you would think.',
        'Change <code>isAdmin</code> to <code>true</code> and watch the last line flip.'
      ]
    },

    {
      id: 'j-l4',
      kind: 'teach',
      title: 'Arrays and loops',
      concept: `
        <p>An <strong>array</strong> is an ordered list: <code>[88, 92, 79]</code>. Positions are numbered
        from <strong>0</strong>, not 1. A three-item array has positions 0, 1, and 2 — and
        <code>.length</code> of 3.</p>
        <p>That gap between "length 3" and "last position 2" causes more loop bugs than anything else
        in programming. It has a name: the <strong>off-by-one error</strong>.</p>
        <p>A <code>for</code> loop has three parts: where to start, how long to keep going, and what to
        do each time round.</p>
        <p><code>for (let i = 0; i &lt; list.length; i++)</code> is the pattern. Note it is
        <code>&lt;</code>, not <code>&lt;=</code>.</p>`,
      files: [{
        name: 'script.js', lang: 'js', editable: true,
        code: `const scores = [88, 92, 79, 95];

console.log("How many:", scores.length);
console.log("First:", scores[0]);
console.log("Last:", scores[scores.length - 1]);

// one position past the end gives you undefined, not an error
console.log("Past the end:", scores[4]);

let total = 0;
for (let i = 0; i < scores.length; i++) {
  console.log("position " + i + " holds " + scores[i]);
  total = total + scores[i];
}

console.log("Total:", total);
console.log("Average:", total / scores.length);`
      }],
      runMode: 'compose',
      outputMode: 'console',
      tryIt: [
        'Change <code>i &lt; scores.length</code> to <code>i &lt;= scores.length</code>. Read the extra line carefully.',
        'Add a fifth score to the array. Nothing else needs changing — that is why we use <code>.length</code>.',
        'Change the start to <code>let i = 1</code>. Which score disappears?'
      ]
    },

    {
      id: 'j-l5',
      kind: 'teach',
      title: 'Talking to the page',
      concept: `
        <p>JavaScript reaches into the HTML through the <strong>DOM</strong>.</p>
        <ul>
          <li><code>document.querySelector("#status")</code> — find by id (note the <code>#</code>)</li>
          <li><code>document.querySelector(".card")</code> — find by class (note the <code>.</code>)</li>
          <li><code>element.textContent = "..."</code> — change its text</li>
          <li><code>element.addEventListener("click", fn)</code> — run <code>fn</code> when clicked</li>
        </ul>
        <p>If the selector matches nothing, <code>querySelector</code> returns <code>null</code> — no
        error, no warning. The crash comes one line later when you try to use that null.
        <em>"Cannot read properties of null"</em> almost always means your selector was wrong.</p>`,
      files: [
        {
          name: 'page.html', lang: 'html', editable: false,
          code: `<button id="scan-btn">Run scan</button>
<p id="status">Ready.</p>`
        },
        {
          name: 'script.js', lang: 'js', editable: true,
          code: `const button = document.querySelector("#scan-btn");
const statusLine = document.querySelector("#status");

let scans = 0;

button.addEventListener("click", function () {
  scans = scans + 1;
  statusLine.textContent = "Scan " + scans + " complete — 0 threats found.";
  console.log("scan finished, run number " + scans);
});

console.log("Ready. Click the button in the preview.");`
        }
      ],
      runMode: 'compose',
      outputMode: 'split',
      tryIt: [
        'Click the button in the preview a few times.',
        'Change <code>"#scan-btn"</code> to <code>"#scan-button"</code> and run. Read the error — you will meet it again shortly.',
        'Add <code>button.textContent = "Scanning...";</code> inside the click function.'
      ]
    },

    /* ─────────────── DEBUG ─────────────── */

    {
      id: 'j-d1',
      kind: 'debug',
      title: 'The alert that always fires',
      brief: `<p>The alert level is <code>"low"</code>, so this program should print
        <em>All clear.</em> and confirm the level is still low.</p>
        <p>It prints the evacuation message every single time — and somehow the level changed on
        its own.</p>`,
      goal: `All clear.
Level is now: low`,
      files: [{
        name: 'script.js', lang: 'js', editable: true,
        code: `let alertLevel = "low";

if (alertLevel = "critical") {
  console.log("EVACUATE THE BUILDING");
} else {
  console.log("All clear.");
}

console.log("Level is now:", alertLevel);`
      }],
      runMode: 'compose',
      outputMode: 'console',
      checks: [
        {
          label: 'The program prints "All clear."',
          test: c => c.text.includes('All clear.')
        },
        {
          label: 'The evacuation message never prints',
          test: c => !c.text.includes('EVACUATE')
        },
        {
          label: 'alertLevel is still "low" at the end',
          test: c => c.text.includes('Level is now: low')
        }
      ],
      hints: [
        'The last line proves something changed <code>alertLevel</code>. Only one line in this file could have done that. Which one?',
        'Look at the operator inside the parentheses on line 3, and compare it to the operators in Lesson 3.',
        'One equals sign <em>assigns</em> a value; it does not ask a question. The <code>if</code> then judges the value it just stored — and a non-empty string always counts as true. You need the operator that compares instead.'
      ]
    },

    {
      id: 'j-d2',
      kind: 'debug',
      title: 'One score too many',
      brief: `<p>Four scores in, four lines out. This prints five, and the last one is nonsense.</p>
        <p>Nothing crashes. JavaScript reads past the end of an array quite happily.</p>`,
      goal: `Score 1: 88
Score 2: 92
Score 3: 79
Score 4: 95`,
      files: [{
        name: 'script.js', lang: 'js', editable: true,
        code: `const scores = [88, 92, 79, 95];

for (let i = 0; i <= scores.length; i++) {
  console.log("Score " + (i + 1) + ": " + scores[i]);
}`
      }],
      runMode: 'compose',
      outputMode: 'console',
      checks: [
        {
          label: 'Exactly four lines of output',
          test: c => c.lines.filter(l => l.trim() !== '').length === 4
        },
        {
          label: 'Nothing prints as undefined',
          test: c => !c.text.includes('undefined')
        },
        {
          label: 'The first line reads "Score 1: 88"',
          test: c => c.lines[0] && c.lines[0].trim() === 'Score 1: 88'
        },
        {
          label: 'The last line reads "Score 4: 95"',
          test: c => {
            const l = c.lines.filter(x => x.trim() !== '');
            return l.length > 0 && l[l.length - 1].trim() === 'Score 4: 95';
          }
        }
      ],
      hints: [
        'Count the array: four items. Count the output: five lines. The loop ran one time too many — so look at the part of the loop that decides when to stop.',
        '<code>scores.length</code> is 4. The valid positions are 0, 1, 2, 3. Write out every value <code>i</code> takes with the current condition, and mark which ones are valid positions.',
        'The condition asks "keep going while <code>i</code> is <em>less than or equal to</em> 4," which lets <code>i</code> reach 4 — a position that does not exist. Lesson 4 shows the comparison that stops one step earlier.'
      ]
    },

    {
      id: 'j-d3',
      title: 'Quiz maths gone wrong',
      kind: 'debug',
      brief: `<p>Two quiz scores, 8 and 7. The total should be 15 and the average 7.5.</p>
        <p>The total comes out as 87 and the average as 43.5. The arithmetic is not wrong —
        JavaScript is not doing arithmetic at all.</p>`,
      goal: `Total points: 15
Average: 7.5`,
      files: [{
        name: 'script.js', lang: 'js', editable: true,
        code: `const quizA = "8";
const quizB = "7";

const total = quizA + quizB;

console.log("Total points: " + total);
console.log("Average: " + total / 2);`
      }],
      runMode: 'compose',
      outputMode: 'console',
      checks: [
        {
          label: 'The total prints as 15',
          test: c => c.text.includes('Total points: 15')
        },
        {
          label: 'The average prints as 7.5',
          test: c => c.text.includes('Average: 7.5')
        },
        {
          label: 'Only two lines of output',
          test: c => c.lines.filter(l => l.trim() !== '').length === 2
        }
      ],
      hints: [
        '87 is 8 followed by 7. That is not addition — that is two things being stuck end to end. What kind of value gets stuck together with <code>+</code>?',
        'Add <code>console.log(typeof quizA);</code> at the top and run it. Was that the type you expected?',
        'The <code>+</code> operator does two different jobs depending on what you give it: add two numbers, or join two strings. Lines 1 and 2 declare these values — look very carefully at how they are written.'
      ]
    },

    {
      id: 'j-d4',
      kind: 'debug',
      title: 'The score that never arrives',
      brief: `<p>This password checker adds up points and should report a score for each password.</p>
        <p>Both come back as <code>undefined</code>. The function is definitely running — add a
        <code>console.log</code> inside it and you will see the score being built correctly.</p>`,
      goal: `correct horse battery staple -> 3
hunter2 -> 0`,
      files: [{
        name: 'script.js', lang: 'js', editable: true,
        code: `function passwordScore(password) {
  let score = 0;

  if (password.length >= 12) {
    score = score + 2;
  }
  if (password.includes(" ")) {
    score = score + 1;
  }
  if (password.includes("!")) {
    score = score + 1;
  }

  score;
}

console.log("correct horse battery staple ->", passwordScore("correct horse battery staple"));
console.log("hunter2 ->", passwordScore("hunter2"));`
      }],
      runMode: 'compose',
      outputMode: 'console',
      checks: [
        {
          label: 'The long passphrase scores 3',
          test: c => c.text.includes('correct horse battery staple -> 3')
        },
        {
          label: 'The weak password scores 0',
          test: c => c.text.includes('hunter2 -> 0')
        },
        {
          label: 'Nothing prints as undefined',
          test: c => !c.text.includes('undefined')
        }
      ],
      hints: [
        'The word <code>undefined</code> is what you get back from a function that finished without handing anything over. So the work happened — the answer just never left the function.',
        'Look at the very last line inside the function body, on line 14. It mentions <code>score</code>. Does it <em>do</em> anything with it?',
        'A function only sends a value back to whoever called it when you say so, using the keyword from Lesson 2. Writing the variable\'s name on its own line evaluates it and throws the result away.'
      ]
    },

    {
      id: 'j-d5',
      kind: 'debug',
      title: 'The button does nothing',
      brief: `<p>Clicking <em>Run scan</em> should change the status line underneath it. Nothing happens,
        and the console is showing a crash.</p>
        <p>Read the error message before you read the code — it tells you which line broke and, if you
        think about it, which value was <code>null</code>.</p>`,
      goal: 'No errors in the console. Clicking the button changes the status text to "Scan complete — 0 threats found."',
      files: [
        {
          name: 'page.html', lang: 'html', editable: false,
          code: `<button id="scan-btn">Run scan</button>
<p id="status">Ready.</p>`
        },
        {
          name: 'script.js', lang: 'js', editable: true,
          code: `const button = document.querySelector("#scan-button");
const statusLine = document.querySelector("#status");

button.addEventListener("click", function () {
  statusLine.textContent = "Scan complete — 0 threats found.";
});

console.log("Scanner armed.");`
        }
      ],
      runMode: 'compose',
      outputMode: 'split',
      interact: c => {
        const b = c.doc.querySelector('#scan-btn');
        const s = c.doc.querySelector('#status');
        c.probe.before = s ? s.textContent.trim() : null;
        if (b) b.click();
        c.probe.after = s ? s.textContent.trim() : null;
      },
      checks: [
        {
          label: 'The script runs without errors',
          test: c => !c.errors.length
        },
        {
          label: 'Before clicking, the status still reads "Ready."',
          test: c => c.probe.before === 'Ready.'
        },
        {
          label: 'Clicking the button updates the status text',
          test: c => !!c.probe.after && c.probe.after.indexOf('Scan complete') === 0
        }
      ],
      hints: [
        'The error names a line and says something was <code>null</code>. Which variable on that line could be null, and where did it come from?',
        '<code>querySelector</code> hands back <code>null</code> when nothing on the page matches. Two selectors are used here — one works, one does not. Open <code>page.html</code> and compare both against what is actually there.',
        'Line 2 finds its element, line 1 does not. The <code>id</code> in the HTML and the <code>id</code> in the selector have to match exactly — every character, not just the general idea.'
      ]
    }
  ]
};
