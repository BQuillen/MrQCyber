/* ============================================================
   JavaScript track — 10 lessons, each followed by its own repair job.

   Every lesson (kind: 'teach') carries a `repairId` pointing at the
   debug stage that breaks the exact thing it just taught, and every
   repair (kind: 'debug') carries a `lessonId` pointing back. The app
   renders a "Debug this lesson" button on the lesson and a "Back to
   the lesson" link on the repair using those ids — see js/app.js.

   Output is the captured console (ctx.logs) and, for stages that touch
   the page, the live DOM after a simulated click via an `interact`
   hook that fills in ctx.probe before checks run. Most repair jobs
   chain two or three bugs: fixing the first one reveals the next, or
   two related mistakes both have to be found.
   ============================================================ */

TRACKS.js = {
  id: 'js',
  name: 'JavaScript',
  icon: 'JS',
  accent: '#facf00',
  tagline: 'behaviour · the muscles',
  desc: 'Variables, functions, objects, loops, and events. JavaScript will happily run a program that means something different from what you intended — which makes reading the actual output your sharpest tool.',
  stages: [

    /* ═══════════════════ 1 · Variables hold values ═══════════════════ */

    {
      id: 'j-l1',
      kind: 'teach',
      title: 'Variables hold values',
      repairId: 'j-d1',
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
        'Add a third variable written with quotes around a number, like <code>const dues = "20";</code>, and log <code>dues + 5</code>. Keep that surprise in mind.'
      ]
    },

    {
      id: 'j-d1',
      kind: 'debug',
      title: 'Quiz maths gone wrong',
      lessonId: 'j-l1',
      brief: `<p>Three quiz scores — 8, 7, and 9 — should add up to a total of 24 and an average of 8.</p>
        <p>The total comes out as <code>879</code> and the average as <code>293</code>. The arithmetic
        is not wrong — JavaScript is not doing arithmetic on every one of these at all. Fix the first
        value that is not what it looks like, run it again, and check whether it is really the only one.</p>`,
      goal: `Total points: 24
Average: 8`,
      files: [{
        name: 'script.js', lang: 'js', editable: true,
        code: `const quizA = "8";
const quizB = 7;
const quizC = "9";

const total = quizA + quizB + quizC;

console.log("Total points: " + total);
console.log("Average: " + total / 3);`
      }],
      runMode: 'compose',
      outputMode: 'console',
      checks: [
        {
          label: 'The total prints as 24',
          test: c => c.text.includes('Total points: 24')
        },
        {
          label: 'The average prints as 8',
          test: c => c.text.includes('Average: 8')
        },
        {
          label: 'Only two lines of output',
          test: c => c.lines.filter(l => l.trim() !== '').length === 2
        }
      ],
      hints: [
        '879 is not obviously two or three things stuck end to end the way "87" would be — but it is the same shape of problem. Which of these three values are typed as text instead of numbers?',
        'Add <code>console.log(typeof quizA, typeof quizB, typeof quizC);</code> at the top and run it. Are all three the type you expected?',
        'The <code>+</code> operator only adds when every value involved is a number — the moment one value is a string, everything gets glued together as text instead, reading left to right. Fixing just one of these will change the wrong output into a different wrong output.'
      ]
    },

    /* ═══════════════════ 2 · Functions take in, give back ═══════════════════ */

    {
      id: 'j-l2',
      kind: 'teach',
      title: 'Functions take in, give back',
      repairId: 'j-d2',
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
          <li>A function that <em>calls another function</em> only gets back what that function actually
            returned — if the inner one forgets <code>return</code>, the outer one is stuck working with
            <code>undefined</code> too, no matter what it does with it.</li>
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
        'Write a function <code>square(n)</code> that calls <code>double</code> inside itself (<code>double(n) * n / 2</code> is one way) and log <code>square(6)</code>. If <code>double</code> ever lost its <code>return</code>, this would break too — one broken link is enough.'
      ]
    },

    {
      id: 'j-d2',
      kind: 'debug',
      title: 'The score that never arrives',
      lessonId: 'j-l2',
      brief: `<p>This password checker should report a score built from two smaller pieces: a length bonus,
        and a "bonus points" score for spaces and symbols.</p>
        <p>Right now both passwords report the same broken value. Fix the function that is missing its
        <code>return</code>, run it again, and read the new broken value carefully — it is not the same
        kind of broken as before, which means there is still one more <code>return</code> missing.</p>`,
      goal: `correct horse battery staple -> 3
hunter2 -> 0`,
      files: [{
        name: 'script.js', lang: 'js', editable: true,
        code: `function bonusPoints(password) {
  let bonus = 0;
  if (password.includes(" ")) bonus = bonus + 1;
  if (password.includes("!")) bonus = bonus + 1;
  bonus;
}

function passwordScore(password) {
  let score = 0;
  if (password.length >= 12) {
    score = score + 2;
  }
  score = score + bonusPoints(password);
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
          label: 'Nothing prints as undefined or NaN',
          test: c => !c.text.includes('undefined') && !c.text.includes('NaN')
        }
      ],
      hints: [
        'The word <code>undefined</code> is what a function hands back when it finishes without saying what to send. Two different functions here compute a value and never send it back — start with the one <code>passwordScore</code> calls directly.',
        'Fix the missing <code>return</code> in <code>passwordScore</code> and run it again. The <code>undefined</code>s turn into <code>NaN</code> instead — that means real arithmetic ran, but one of the pieces it added together was not actually a number. Which function\'s result gets added straight into <code>score</code>?',
        'A function only sends a value back to whoever called it when you use the <code>return</code> keyword — otherwise the value is thrown away and <code>undefined</code> comes back instead, and adding <code>undefined</code> to a number always gives you <code>NaN</code>. That is true even when the missing <code>return</code> is buried inside a smaller helper function that a bigger one depends on.'
      ]
    },

    /* ═══════════════════ 3 · Conditions and comparison ═══════════════════ */

    {
      id: 'j-l3',
      kind: 'teach',
      title: 'Conditions and comparison',
      repairId: 'j-d3',
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
        question, you have changed the variable — and a non-empty string always counts as true, so the
        branch runs no matter what you meant to check.</p>`,
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
        'Change the first <code>if</code> to <code>if (failedLogins = 5)</code> — one equals sign — and run it with any starting count. Read what happens, and what <code>failedLogins</code> becomes afterward.'
      ]
    },

    {
      id: 'j-d3',
      kind: 'debug',
      title: 'The alert that always fires',
      lessonId: 'j-l3',
      brief: `<p>The alert level is <code>"low"</code>, so this program should print
        <em>All clear.</em> and confirm the level is still low afterward.</p>
        <p>It prints the evacuation message every single time, and the level somehow reads as something
        else entirely by the last line. Two different lines are responsible.</p>`,
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

alertLevel = "unknown";
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
        'The last line proves something changed <code>alertLevel</code> more than once. Look at every single line that assigns something to <code>alertLevel</code>, not just the one inside the <code>if</code>.',
        'Compare the operator inside the <code>if</code>\'s parentheses to the comparison operators from this lesson. Then, separately, check whether <code>alertLevel</code> gets reassigned anywhere between the <code>if</code> block and the final <code>console.log</code>.',
        'A single <code>=</code> assigns a value and does not ask a question — the <code>if</code> then judges whatever it just stored, and a non-empty string always counts as true. And a variable that already holds the right value has no reason to be reassigned again right before you print it — find the line that does that and ask whether it belongs there at all.'
      ]
    },

    /* ═══════════════════ 4 · Arrays and loops ═══════════════════ */

    {
      id: 'j-l4',
      kind: 'teach',
      title: 'Arrays and loops',
      repairId: 'j-d4',
      concept: `
        <p>An <strong>array</strong> is an ordered list: <code>[88, 92, 79]</code>. Positions are numbered
        from <strong>0</strong>, not 1. A three-item array has positions 0, 1, and 2 — and
        <code>.length</code> of 3.</p>
        <p>That gap between "length 3" and "last position 2" causes more loop bugs than anything else
        in programming. It has a name: the <strong>off-by-one error</strong>.</p>
        <p>A <code>for</code> loop has three parts: where to start, how long to keep going, and what to
        do each time round.</p>
        <p><code>for (let i = 0; i &lt; list.length; i++)</code> is the pattern. Note it is
        <code>&lt;</code>, not <code>&lt;=</code>. The same off-by-one habit that breaks a loop's stopping
        point can just as easily sneak into anything you divide a running total by afterward.</p>`,
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
        'Change <code>i &lt; scores.length</code> to <code>i &lt;= scores.length</code>. Read the extra line, and watch what happens to <code>Total</code> right after it.',
        'Add a fifth score to the array. Nothing else needs changing — that is why we use <code>.length</code>.',
        'Change the average line to divide by <code>scores.length + 1</code> instead of <code>scores.length</code> and run it. The total is still right, but the average now is not — keep that shape in mind.'
      ]
    },

    {
      id: 'j-d4',
      kind: 'debug',
      title: 'One score too many',
      lessonId: 'j-l4',
      brief: `<p>Four scores in, this should print four lines, a total of 354, and an average of 88.5.</p>
        <p>Right now it prints five lines and the total comes out as <code>NaN</code>. Nothing crashes —
        JavaScript reads past the end of an array quite happily and lets the damage spread. Fix the loop
        first, run it again, and check whether the average is <em>also</em> back to normal.</p>`,
      goal: `Score 1: 88
Score 2: 92
Score 3: 79
Score 4: 95
Total: 354
Average: 88.5`,
      files: [{
        name: 'script.js', lang: 'js', editable: true,
        code: `const scores = [88, 92, 79, 95];

let total = 0;
for (let i = 0; i <= scores.length; i++) {
  console.log("Score " + (i + 1) + ": " + scores[i]);
  total = total + scores[i];
}

console.log("Total:", total);
console.log("Average:", total / (scores.length + 1));`
      }],
      runMode: 'compose',
      outputMode: 'console',
      checks: [
        {
          label: 'Exactly four "Score" lines',
          test: c => c.lines.filter(l => /^Score \d/.test(l.trim())).length === 4
        },
        {
          label: 'Nothing prints as undefined or NaN',
          test: c => !c.text.includes('undefined') && !c.text.includes('NaN')
        },
        {
          label: 'The total is 354',
          test: c => c.text.includes('Total: 354')
        },
        {
          label: 'The average is 88.5',
          test: c => c.text.includes('Average: 88.5')
        }
      ],
      hints: [
        'Count only the lines that start with "Score": there should be four, one per item, but a fifth one is showing up — and the Total and Average at the bottom are not real numbers at all. Which one of those problems has to be true before the other can even be checked?',
        'Fix the loop\'s stopping condition first (compare it to the pattern from this lesson) and run it again. The Score lines are correct now and Total is a real number — but Average is still wrong. What is it being divided by?',
        '<code>scores.length</code> is 4, so the valid positions are 0 through 3 — a loop that keeps going through position 4 reads past the end, and adding <code>undefined</code> to a running total poisons it into <code>NaN</code>. Separately, once a loop is bounded correctly, whatever you divide a total by has to match the actual count of items — not one more than it.'
      ]
    },

    /* ═══════════════════ 5 · Talking to the page ═══════════════════ */

    {
      id: 'j-l5',
      kind: 'teach',
      title: 'Talking to the page',
      repairId: 'j-d5',
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
        <em>"Cannot read properties of null"</em> almost always means your selector was wrong.</p>
        <p>Anything you want to happen <em>every time</em> someone clicks belongs <strong>inside</strong>
        the listener function. Code that sits outside it, even right next to it, only ever runs once —
        when the page first loads.</p>`,
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
        'Move the line <code>scans = scans + 1;</code> to sit just above <code>button.addEventListener(...)</code>, outside the function, and run it. Click the button several times — the count no longer moves. Keep that in mind.'
      ]
    },

    {
      id: 'j-d5',
      kind: 'debug',
      title: 'The scanner that only half works',
      lessonId: 'j-l5',
      brief: `<p>Clicking <em>Run scan</em> should update the status line, and the count in it should go up by
        one on every click — "Scan 1 complete", then "Scan 2 complete", and so on.</p>
        <p>Right now clicking does nothing at all, and the console shows a crash. Read the error before
        you read the code. Once the button responds, click it twice — the number is not moving the way
        it should.</p>`,
      goal: 'No errors in the console. The first click sets the status to "Scan 1 complete — 0 threats found.", and the second click updates it to "Scan 2 complete — 0 threats found."',
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

let scans = 0;
scans = scans + 1;

button.addEventListener("click", function () {
  statusLine.textContent = "Scan " + scans + " complete — 0 threats found.";
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
        c.probe.afterFirst = s ? s.textContent.trim() : null;
        if (b) b.click();
        c.probe.afterSecond = s ? s.textContent.trim() : null;
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
          label: 'The first click reports "Scan 1 complete"',
          test: c => c.probe.afterFirst === 'Scan 1 complete — 0 threats found.'
        },
        {
          label: 'The second click updates it to "Scan 2 complete"',
          test: c => c.probe.afterSecond === 'Scan 2 complete — 0 threats found.'
        }
      ],
      hints: [
        'The error names a line and says something was <code>null</code>. Which variable on that line could be null, and where did it come from?',
        '<code>querySelector</code> hands back <code>null</code> when nothing on the page matches. Compare the selector on that line against the real <code>id</code> in <code>page.html</code> — the same mismatch from Lesson 5.',
        'Once the button responds, click it twice in a row and watch the number. It stays the same both times — so find the line that increases <code>scans</code>, and check whether it is actually inside the function that runs on every click, or just sitting near it, outside, where it only ever runs once.'
      ]
    },

    /* ═══════════════════ 6 · Objects and properties ═══════════════════ */

    {
      id: 'j-l6',
      kind: 'teach',
      title: 'Objects and properties',
      repairId: 'j-d6',
      concept: `
        <p>An <strong>object</strong> groups related values together under names, instead of numbered
        positions like an array. <code>{ name: "Maya", grade: 10 }</code> is an object literal —
        <code>name</code> and <code>grade</code> are its <strong>properties</strong>.</p>
        <ul>
          <li>Read a property with dot notation: <code>student.name</code></li>
          <li>Change one the exact same way: <code>student.grade = 11;</code></li>
          <li>Add a brand-new one just by assigning it: <code>student.email = "...";</code></li>
        </ul>
        <p>Reading a property that does not exist gives you <code>undefined</code> — quietly, no error —
        exactly like reading past the end of an array. And property names are
        <strong>case-sensitive</strong>: <code>student.name</code> and <code>student.Name</code> are two
        completely different properties as far as JavaScript is concerned.</p>`,
      files: [{
        name: 'script.js', lang: 'js', editable: true,
        code: `const student = {
  name: "Maya",
  grade: 10,
  clubs: ["Cyber Club"]
};

console.log(student.name);
console.log(student.grade);
console.log(student.clubs);

// dot notation reads AND writes
student.grade = 11;
console.log("Promoted to grade:", student.grade);

// a property that does not exist is undefined, not an error
console.log(student.email);

// adding a brand new property
student.email = "maya@example.com";
console.log(student.email);`
      }],
      runMode: 'compose',
      outputMode: 'console',
      tryIt: [
        'Change <code>student.grade</code> directly in the object literal to <code>9</code> and run it again.',
        'Add a brand-new property, <code>student.role = "President";</code>, and log it.',
        'Log <code>student.Name</code> (capital N) instead of <code>student.name</code>. Nothing warns you the moment a property name does not match exactly — you just silently get <code>undefined</code>.'
      ]
    },

    {
      id: 'j-d6',
      kind: 'debug',
      title: 'The membership card will not update',
      lessonId: 'j-l6',
      brief: `<p>Marking a member's dues as paid should show <em>paid: true</em> and a balance of
        <em>0</em> afterward.</p>
        <p>Right now the paid status prints as <code>undefined</code>, and the balance never actually
        changes. Neither line is missing anything — both are reading or writing the wrong name.</p>`,
      goal: `Priya paid: true
Balance owed: 0`,
      files: [{
        name: 'script.js', lang: 'js', editable: true,
        code: `const member = {
  name: "Priya",
  duesPaid: false,
  balance: 20
};

function markPaid(person) {
  person.duesPaid = true;
  balance = 0;
}

markPaid(member);

console.log(member.name, "paid:", member.duespaid);
console.log("Balance owed:", member.balance);`
      }],
      runMode: 'compose',
      outputMode: 'console',
      checks: [
        {
          label: 'The paid status reads true',
          test: c => c.text.includes('paid: true')
        },
        {
          label: 'The balance is updated to 0',
          test: c => c.text.includes('Balance owed: 0')
        },
        {
          label: 'Nothing prints as undefined',
          test: c => !c.text.includes('undefined')
        },
        {
          label: 'The member is still named Priya',
          test: c => c.text.includes('Priya')
        }
      ],
      hints: [
        'One of these two console.log lines prints exactly what you would expect; the other prints <code>undefined</code> or a value that never changed. Read every property name involved, letter by letter, against how the object was defined.',
        'Property names are case-sensitive — <code>duesPaid</code> and <code>duespaid</code> are two completely different names as far as the object is concerned. Once that line is fixed, look at the line that sets balance to 0 — does it actually mention the object it is supposed to change?',
        'Dot notation is how you both read AND write a property — <code>person.balance = 0</code> changes the object. A bare <code>balance = 0</code>, with no dot and no object name in front of it, just creates a brand-new, unrelated variable and leaves the object completely untouched.'
      ]
    },

    /* ═══════════════════ 7 · Array methods ═══════════════════ */

    {
      id: 'j-l7',
      kind: 'teach',
      title: 'Array methods beyond a loop',
      repairId: 'j-d7',
      concept: `
        <p>A <code>for</code> loop can do anything — but three array methods say exactly what you mean
        for the most common jobs, without you managing an index by hand:</p>
        <ul>
          <li><code>.forEach(fn)</code> — runs <code>fn</code> once per item, for side effects like
            logging</li>
          <li><code>.map(fn)</code> — builds a <strong>new array</strong> from whatever <code>fn</code>
            returns for each item; the original array is untouched</li>
          <li><code>.filter(fn)</code> — builds a <strong>new array</strong> containing only the items
            where <code>fn</code> returns something truthy</li>
        </ul>
        <p>Both <code>.map()</code> and <code>.filter()</code> depend completely on what their callback
        <em>returns</em>. Forget <code>return</code> inside <code>.map()</code> and every item becomes
        <code>undefined</code>. And <code>.filter()</code> needs a true-or-false <em>test</em> — returning
        the value itself instead of a comparison happens to "work" for some inputs and silently breaks
        for others, because JavaScript treats any nonzero number as true.</p>`,
      files: [{
        name: 'script.js', lang: 'js', editable: true,
        code: `const scores = [88, 92, 55, 79, 95, 40];

scores.forEach(function (score) {
  console.log("Score:", score);
});

const bonused = scores.map(function (score) {
  return score + 5;
});
console.log("With bonus:", bonused.join(", "));

const passing = scores.filter(function (score) {
  return score >= 60;
});
console.log("Passing:", passing.join(", "));

console.log("Original untouched:", scores.join(", "));`
      }],
      runMode: 'compose',
      outputMode: 'console',
      tryIt: [
        'Change map\'s callback to <code>return score * 2;</code> and see how the bonused list changes.',
        'Change filter\'s condition to <code>score >= 90</code> and see how many pass.',
        'Delete the <code>return</code> from inside map\'s callback and run it — every entry silently becomes <code>undefined</code>. Keep that shape in mind.'
      ]
    },

    {
      id: 'j-d7',
      kind: 'debug',
      title: 'The curve did not curve',
      lessonId: 'j-l7',
      brief: `<p>Every score should get a 5-point curve, and only scores of 60 or higher should count as
        passing.</p>
        <p>Right now the curved list is not a list of numbers at all, and the passing list includes every
        score — even the ones nowhere near 60. Neither <code>.map()</code> nor <code>.filter()</code> is
        doing the job its callback claims to do.</p>`,
      goal: `Curved: 93, 50, 97, 60, 65, 35
Passing: 88, 92, 60`,
      files: [{
        name: 'script.js', lang: 'js', editable: true,
        code: `const scores = [88, 45, 92, 55, 60, 30];

const curved = scores.map(function (score) {
  score + 5;
});

const passing = scores.filter(function (score) {
  return score;
});

console.log("Curved:", curved.join(", "));
console.log("Passing:", passing.join(", "));`
      }],
      runMode: 'compose',
      outputMode: 'console',
      checks: [
        {
          label: 'Curved reads the boosted scores',
          test: c => c.text.includes('Curved: 93, 50, 97, 60, 65, 35')
        },
        {
          label: 'Passing keeps only scores 60 and up',
          test: c => c.text.includes('Passing: 88, 92, 60')
        },
        {
          label: 'Passing does not just include every original score',
          test: c => !c.text.includes('Passing: 88, 45, 92, 55, 60, 30')
        },
        {
          label: 'Nothing prints as undefined',
          test: c => !c.text.includes('undefined')
        }
      ],
      hints: [
        'Two things should have changed here: the curved scores and which ones count as passing. Right now one of them is not printing real numbers at all, and the other is printing every single score, low ones included.',
        'Add a <code>console.log</code> inside map\'s callback to see what it computes — is it actually handing that value back to <code>.map()</code> for each item? Separately, look at what filter\'s callback returns — is it a value, or a yes-or-no test?',
        '<code>.map()</code> builds its new array from whatever each call to the callback <em>returns</em> — forget <code>return</code> and you get an array of <code>undefined</code>, no matter what the callback calculated inside itself. <code>.filter()</code> keeps an item only when its callback returns <code>true</code> or <code>false</code> — returning the number itself happens to keep everything nonzero, which is exactly why nothing gets filtered out here.'
      ]
    },

    /* ═══════════════════ 8 · Template literals and strings ═══════════════════ */

    {
      id: 'j-l8',
      kind: 'teach',
      title: 'Template literals and string basics',
      repairId: 'j-d8',
      concept: `
        <p>A <strong>template literal</strong> uses backticks instead of quotes, and lets you drop a
        variable — or any expression — straight into the string with <code>\${ }</code>.</p>
        <p><code>\`Hello, \${name}!\`</code> is usually easier to read than
        <code>"Hello, " + name + "!"</code>, and the gap only grows once you have more than one value to
        insert.</p>
        <ul>
          <li>The dollar sign matters. <code>{name}</code> without it, inside regular quotes, is just
            literal text — nothing gets substituted.</li>
          <li>Only backticks understand <code>\${ }</code>. Regular single or double quotes print it
            character-for-character, exactly as typed.</li>
        </ul>
        <p>Strings also come with built-in methods — <code>.trim()</code> removes whitespace from both
        ends, <code>.toUpperCase()</code> and <code>.toLowerCase()</code> change case. None of them change
        the original string; strings cannot be changed in place. Each method <strong>returns a brand-new
        string</strong>, so you have to store or use what it gives back.</p>`,
      files: [{
        name: 'script.js', lang: 'js', editable: true,
        code: `const name = "cyber club";
const day = "Tuesday";
const time = "3:15 pm";

// template literals: backticks, and \${ } drop a value into the string
const announcement = \`Meet the \${name} on \${day} at \${time}.\`;
console.log(announcement);

// concatenation does the same job -- template literals just read easier
console.log("Meet the " + name + " on " + day + " at " + time + ".");

// string methods
const messy = "   Bring A Laptop   ";
console.log("[" + messy + "]");
console.log("[" + messy.trim() + "]");
console.log(messy.trim().toUpperCase());
console.log(name.toUpperCase());`
      }],
      runMode: 'compose',
      outputMode: 'console',
      tryIt: [
        'Add a fourth <code>\${ }</code> for the room number into the announcement.',
        'Remove the "$" from one of the <code>\${ }</code> spots in the announcement, leaving just <code>{day}</code>, and run it. Notice the literal braces print instead of interpolating.',
        'Write <code>messy.trim();</code> on its own line (not stored anywhere), then log <code>messy</code> right after it. It is still surrounded by spaces — keep that in mind.'
      ]
    },

    {
      id: 'j-d8',
      kind: 'debug',
      title: 'The welcome banner reads wrong',
      lessonId: 'j-l8',
      brief: `<p>This should greet a student by their trimmed, properly-spaced name, and separately print
        the club name in full capitals.</p>
        <p>Right now the greeting shows literal <code>\${ }</code> braces instead of a real name, and the
        line below it never even runs. Work through the greeting first, then see what is left.</p>`,
      goal: 'The greeting reads "Welcome, maya! You have joined the cyber club." with no stray whitespace, and a separate line prints the club name as "CYBER CLUB" with no errors in the console.',
      files: [{
        name: 'script.js', lang: 'js', editable: true,
        code: `let firstName = "   maya   ";
let club = "cyber club";

firstName.trim();

const greeting = "Welcome, \${firstName}! You have joined the \${club}.";
console.log(greeting);

const loud = club.toUppercase();
console.log("In caps:", loud);`
      }],
      runMode: 'compose',
      outputMode: 'console',
      checks: [
        {
          label: 'The greeting interpolates the real name and club, not literal braces',
          test: c => c.text.includes('Welcome, maya! You have joined the cyber club.')
        },
        {
          label: 'The greeted name has no leftover whitespace baked in',
          test: c => !c.text.includes('   maya') && !c.text.includes('maya   ')
        },
        {
          label: 'The script runs with no errors',
          test: c => !c.errors.length
        },
        {
          label: 'The club name prints fully capitalized',
          test: c => c.text.includes('In caps: CYBER CLUB')
        }
      ],
      hints: [
        'Run this once before touching anything. One line prints the braces themselves instead of a name, one below it never even gets a chance to run — and once you can actually see the name, look hard at the spacing around it.',
        'Backticks and regular quotes look almost identical in this editor, but only one of them understands <code>\${ }</code>. Once the greeting interpolates correctly, check whether the name it shows matches what <code>.trim()</code> was supposed to produce a few lines earlier — a method that returns a new string only helps if something is done with what it returns. And compare the last method call\'s name, letter by letter, to the one from this lesson.',
        'Regular quotes never look inside <code>\${ }</code> — that only happens between backticks. Strings are also immutable: <code>.trim()</code> hands back a brand-new, trimmed string and leaves the original completely alone, so calling it on its own line changes nothing unless the result is stored. And JavaScript method names are case-sensitive, just like the object properties from Lesson 6 — <code>toUppercase</code> and <code>toUpperCase</code> are two different things, and only one of them exists.'
      ]
    },

    /* ═══════════════════ 9 · Events and the event object ═══════════════════ */

    {
      id: 'j-l9',
      kind: 'teach',
      title: 'Events and the event object',
      repairId: 'j-d9',
      concept: `
        <p>A listener's callback receives an <strong>event object</strong> — usually named
        <code>event</code> or <code>e</code> — describing what just happened.</p>
        <ul>
          <li><code>event.target</code> — the exact element that triggered the event. Handy when one
            listener covers several elements, since it tells you which one without any extra bookkeeping.</li>
          <li><code>event.preventDefault()</code> — cancels the browser's default behavior, like a link
            navigating away or a form submitting and reloading the page.</li>
        </ul>
        <p><code>addEventListener("click", fn)</code> can be called more than once on the same element —
        every listener you add still runs. Setting <code>element.onclick = fn</code> instead only allows
        <strong>one</strong> handler at a time: assign it a second time and the first one is silently
        gone, no error, nothing.</p>`,
      files: [
        {
          name: 'page.html', lang: 'html', editable: false,
          code: `<button id="one">One</button>
<button id="two">Two</button>
<p id="status">Clicked: nothing yet</p>
<a id="site-link" href="https://example.com">Visit site</a>`
        },
        {
          name: 'script.js', lang: 'js', editable: true,
          code: `const status = document.querySelector("#status");

document.querySelectorAll("button").forEach(function (btn) {
  btn.addEventListener("click", function (event) {
    status.textContent = "Clicked: " + event.target.textContent;
  });
});

const link = document.querySelector("#site-link");
link.addEventListener("click", function (event) {
  event.preventDefault();
  console.log("Navigation blocked for this demo.");
});

// addEventListener stacks -- both of these run on every click of "One"
document.querySelector("#one").addEventListener("click", function () {
  console.log("also logging every click on button one");
});

// onclick does NOT stack -- assigning it twice throws the first one away
const two = document.querySelector("#two");
two.onclick = function () { console.log("first onclick handler"); };
two.onclick = function () { console.log("second onclick handler -- the first one is gone"); };`
        }
      ],
      runMode: 'compose',
      outputMode: 'split',
      tryIt: [
        'Click "One" and "Two" in the preview. The status line always names whichever one you actually clicked, thanks to <code>event.target</code>.',
        'Click the link. Nothing navigates — the console explains why.',
        'Click "Two" and read the console. Only the second <code>onclick</code> handler ever ran — assigning <code>onclick</code> a second time throws the first one away, unlike <code>addEventListener</code>.'
      ]
    },

    {
      id: 'j-d9',
      kind: 'debug',
      title: 'The notification panel crashes on dismiss',
      lessonId: 'j-l9',
      brief: `<p>This notification panel should let a visitor dismiss cards one at a time, with the count
        above the panel staying accurate, and a "Dismiss all" button that clears every remaining card.</p>
        <p>Right now clicking any dismiss button crashes instead of removing a card. Once that is fixed,
        the count above the panel still will not add up, and "Dismiss all" turns out to only dismiss
        one.</p>`,
      goal: 'Clicking a card\'s own dismiss button removes only that card and updates the notification count with no errors. "Dismiss all" removes every card still remaining.',
      files: [
        {
          name: 'page.html', lang: 'html', editable: false,
          code: `<div id="panel">
  <div class="card"><span>Password expiring in 3 days</span><button class="dismiss">Dismiss</button></div>
  <div class="card"><span>New device login detected</span><button class="dismiss">Dismiss</button></div>
  <div class="card"><span>Backup complete</span><button class="dismiss">Dismiss</button></div>
</div>
<p id="count">3 notifications</p>
<button id="dismiss-all">Dismiss all</button>`
        },
        {
          name: 'script.js', lang: 'js', editable: true,
          code: `const cards = document.querySelectorAll(".card");
const countLine = document.querySelector("#count");
const dismissAllBtn = document.querySelector("#dismiss-all");

for (var i = 0; i < cards.length; i++) {
  const dismissBtn = cards[i].querySelector(".dismiss");
  dismissBtn.addEventListener("click", function () {
    cards[i].remove();
    countLine.textContent = cards.length + " notifications";
  });
}

dismissAllBtn.addEventListener("click", function () {
  document.querySelector(".card").remove();
  countLine.textContent = "0 notifications";
});`
        }
      ],
      runMode: 'compose',
      outputMode: 'split',
      interact: c => {
        const firstDismiss = c.doc.querySelector('.card .dismiss');
        if (firstDismiss) firstDismiss.click();
        const countEl = c.doc.querySelector('#count');
        c.probe.afterOne = {
          cardsLeft: c.doc.querySelectorAll('.card').length,
          countText: countEl ? countEl.textContent.trim() : null
        };
        const dismissAll = c.doc.querySelector('#dismiss-all');
        if (dismissAll) dismissAll.click();
        c.probe.afterAll = {
          cardsLeft: c.doc.querySelectorAll('.card').length
        };
      },
      checks: [
        {
          label: 'The script does not crash when a dismiss button is clicked',
          test: c => !c.errors.length
        },
        {
          label: "Clicking a card's dismiss button removes only that card",
          test: c => !!c.probe.afterOne && c.probe.afterOne.cardsLeft === 2
        },
        {
          label: 'The notification count updates after a dismissal',
          test: c => !!c.probe.afterOne && c.probe.afterOne.countText === '2 notifications'
        },
        {
          label: '"Dismiss all" removes every remaining card',
          test: c => !!c.probe.afterAll && c.probe.afterAll.cardsLeft === 0
        }
      ],
      hints: [
        'Click a dismiss button in the preview. The console shows a crash, not a removed card — read the error, and think about what <code>i</code> actually equals by the time a person finally clicks something, versus what it equaled while the loop was still running.',
        '<code>var</code> does not create a fresh copy of <code>i</code> for each pass through the loop the way <code>let</code> does — every click handler shares the exact same <code>i</code>, and by the time anyone clicks anything the loop has long since finished. The event object handed to every listener already knows exactly which element was clicked, without needing to track an index at all.',
        'Once clicking removes the right card, notice the count text still does not add up — <code>cards.length</code> was captured once, before anything was removed, and a list from <code>querySelectorAll</code> does not update itself afterward the way a live count would. And check the "Dismiss all" button separately: does it dismiss all of them, or just the one <code>querySelector</code> (singular) happens to find first?'
      ]
    },

    /* ═══════════════════ 10 · try/catch and error handling ═══════════════════ */

    {
      id: 'j-l10',
      kind: 'teach',
      title: 'try/catch and basic error handling',
      repairId: 'j-d10',
      concept: `
        <p>Some operations can fail in ways you cannot always prevent ahead of time — bad user input, text
        that is not actually valid JSON. <code>try</code> / <code>catch</code> lets you attempt something
        risky and recover instead of letting the whole script crash.</p>
        <pre><code>try {
  const value = JSON.parse(text);
} catch (error) {
  console.log("Could not read that:", error.message);
}</code></pre>
        <ul>
          <li><code>JSON.parse()</code> throws a <code>SyntaxError</code> on text that is not valid
            JSON — a textbook case where <code>try</code>/<code>catch</code> is genuinely appropriate.</li>
          <li><code>error.message</code> describes what went wrong, inside the <code>catch</code> block.</li>
          <li>Wrap only the specific risky line, not everything around it — a <code>try</code>/<code>catch</code>
            is not a substitute for actually fixing a real mistake elsewhere in your code; it is for
            things you genuinely cannot control in advance.</li>
        </ul>`,
      files: [{
        name: 'script.js', lang: 'js', editable: true,
        code: `function parseScore(text) {
  try {
    const value = JSON.parse(text);
    return value;
  } catch (error) {
    console.log("Could not read score:", error.message);
    return null;
  }
}

console.log(parseScore("42"));
console.log(parseScore("not a number"));

// try/catch recovers -- it does not fix an actual mistake elsewhere.
function riskyDivide(a, b) {
  if (b === 0) {
    console.log("Cannot divide by zero.");
    return null;
  }
  return a / b;
}

console.log(riskyDivide(10, 2));
console.log(riskyDivide(10, 0));`
      }],
      runMode: 'compose',
      outputMode: 'console',
      tryIt: [
        'Change <code>"not a number"</code> to a valid number string like <code>"17"</code> and run it — the <code>catch</code> block never runs, because nothing threw.',
        'Delete the <code>catch</code> block, leaving a lone <code>try</code>, and run it. Read what the browser says about a <code>try</code> needing a matching partner.',
        'Inside the <code>catch</code> block, add <code>console.log(typeof error, error.message);</code> and run the broken JSON case again.'
      ]
    },

    {
      id: 'j-d10',
      kind: 'debug',
      title: 'The scan report tool crashes on bad input',
      lessonId: 'j-l10',
      brief: `<p>This tool should read a pasted scan report, show a friendly message if the text is not
        valid, and count only the reports that actually parse.</p>
        <p>Right now the page reports an error before it even finishes loading. Fix that, run it again,
        and clicking the button still does nothing. Fix that too — and you will find the sample report
        in the box is not valid JSON, which is exactly the kind of thing this lesson's tool is for.</p>`,
      goal: 'Clicking "Parse report" on the sample text shows a friendly message instead of crashing, and pasting in valid JSON afterward still parses correctly and counts as report #1.',
      files: [
        {
          name: 'page.html', lang: 'html', editable: false,
          code: `<textarea id="scan-input" rows="2" style="width:100%;">{"host": "10.0.0.5", "threats": 2</textarea>
<button id="scan-btn">Parse report</button>
<p id="result">No report parsed yet.</p>`
        },
        {
          name: 'script.js', lang: 'js', editable: true,
          code: `let reportCount = 0;

function summarize(report) {
  reportCount = reportCount + 1;
  return "Report #" + reportCount + " -- host " + report.host + ", " + report.threats + " threat(s)";
}

console.log("Reports so far:", totalReports);

const scanButton = document.querySelector("#scan-button");
const input = document.querySelector("#scan-input");
const result = document.querySelector("#result");

scanButton.addEventListener("click", function () {
  const report = JSON.parse(input.value);
  result.textContent = summarize(report);
});`
        }
      ],
      runMode: 'compose',
      outputMode: 'split',
      interact: c => {
        const btn = c.doc.querySelector('#scan-btn');
        const input = c.doc.querySelector('#scan-input');
        const result = c.doc.querySelector('#result');
        if (btn) btn.click();
        c.probe.afterBad = result ? result.textContent.trim() : null;
        if (input) input.value = '{"host": "10.0.0.5", "threats": 2}';
        if (btn) btn.click();
        c.probe.afterGood = result ? result.textContent.trim() : null;
      },
      checks: [
        {
          label: 'The script runs with no uncaught errors, from page load through both clicks',
          test: c => !c.errors.length
        },
        {
          label: 'An invalid report does not crash the page -- it shows a friendly message',
          test: c => c.probe.afterBad === 'Could not read that report.'
        },
        {
          label: 'A valid report afterward still parses correctly',
          test: c => !!c.probe.afterGood && c.probe.afterGood.indexOf('Report #') === 0 && c.probe.afterGood.includes('10.0.0.5')
        },
        {
          label: 'The report counter only increments for a report that actually parsed',
          test: c => c.probe.afterGood === 'Report #1 -- host 10.0.0.5, 2 threat(s)'
        },
        {
          label: 'The page reports zero reports so far before anything is clicked',
          test: c => c.text.includes('Reports so far: 0')
        }
      ],
      hints: [
        'Open the console before touching anything. The very first line should report how many scans have been logged so far, but it is complaining about a name that was never actually declared — find the exact word being logged and compare it against every variable this file actually declares.',
        'Once the console stops complaining about page load, click "Parse report." If nothing happens at all, the button was never really wired up — check the id the script is searching for against the id on the real element in <code>page.html</code>, the same mismatch from Lesson 5.',
        'With the button responding, click it using the sample text already in the box — it is not valid JSON. <code>JSON.parse</code> throws on exactly this kind of malformed input, and nothing here is catching that throw. This is precisely the situation this lesson describes: wrap only the risky call in <code>try</code>, and use <code>catch</code> to show something reasonable instead of letting the whole handler die.'
      ]
    }
  ]
};
