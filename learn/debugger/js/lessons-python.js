/* ============================================================
   Python track — 5 lessons, then 5 broken programs.

   Runs on the built-in interpreter in minipy.js. Output is stdout,
   plus a Python-style traceback when something raises.
   ============================================================ */

TRACKS.python = {
  id: 'python',
  name: 'Python',
  icon: 'Py',
  accent: '#4fe0a0',
  tagline: 'logic · the brain',
  desc: 'Variables, types, indentation, loops, and functions. Python tells you exactly which line broke and why — learning to read a traceback is half of learning to debug.',
  stages: [

    /* ─────────────── LEARN ─────────────── */

    {
      id: 'p-l1',
      kind: 'teach',
      title: 'print and variables',
      concept: `
        <p><code>print()</code> puts text on the screen. A <strong>variable</strong> stores a value
        under a name so you can use it later — no <code>let</code>, no <code>const</code>, just
        <code>name = value</code>.</p>
        <p>Two ways to combine text and values:</p>
        <ul>
          <li>commas — <code>print("Score:", score)</code> — puts a space between them automatically</li>
          <li>f-strings — <code>print(f"Score: {score}")</code> — drops the value right where you want it</li>
        </ul>
        <p>A <code>#</code> starts a comment. Python ignores the rest of that line.</p>
        <p>Prefer f-strings. The third option — gluing with <code>+</code> — works only when both sides
        are already text, and that limitation is behind an enormous number of beginner bugs.</p>`,
      files: [{
        name: 'main.py', lang: 'python', editable: true,
        code: `# a club roster
club = "Cyber Club"
room = 214
members = 18

print(club)
print("Room:", room)
print(f"We have {members} members.")

# f-strings can do maths inside the braces
print(f"Next year: {members + 5}")`
      }],
      runMode: 'python',
      tryIt: [
        'Change <code>members</code> to your own number and run again.',
        'Add a variable <code>advisor = "Mr. Q"</code> and print it with an f-string.',
        'Put a <code>#</code> in front of one of the print lines. It stops running.'
      ]
    },

    {
      id: 'p-l2',
      kind: 'teach',
      title: 'Types, and why they matter',
      concept: `
        <p>Every value has a type. The three you will use constantly:</p>
        <ul>
          <li><code>int</code> — a whole number, like <code>18</code></li>
          <li><code>float</code> — a decimal, like <code>8.5</code></li>
          <li><code>str</code> — text, always in quotes: <code>"18"</code></li>
        </ul>
        <p><code>"18"</code> and <code>18</code> print identically and are completely different things.
        <code>type(x)</code> tells you which you have — use it the moment something surprises you.</p>
        <p>Unlike JavaScript, Python refuses to guess. <code>"Score: " + 47</code> does not quietly
        produce <code>"Score: 47"</code>; it raises a <strong>TypeError</strong> and stops. That is
        Python doing you a favour — a loud failure is far easier to find than a silent wrong answer.</p>
        <p>Convert on purpose: <code>str(47)</code>, <code>int("47")</code>, <code>float("8.5")</code>.</p>`,
      files: [{
        name: 'main.py', lang: 'python', editable: true,
        code: `score = 47
label = "47"

print(type(score))
print(type(label))

# maths on a number
print(score + 3)

# + on two strings just glues them
print(label + "3")

# to mix them, convert on purpose
print("Score: " + str(score))

# or skip the whole problem with an f-string
print(f"Score: {score}")

# division always gives a float
print(10 / 2)
print(10 // 3)`
      }],
      runMode: 'python',
      tryIt: [
        'Add <code>print("Score: " + score)</code> at the bottom. Read the error carefully — you will see it again.',
        'Change <code>int("47")</code>… try <code>print(int("forty"))</code>. A different error, equally clear.',
        'Compare <code>10 / 2</code> and <code>10 // 3</code>. One keeps the decimal, one throws it away.'
      ]
    },

    {
      id: 'p-l3',
      kind: 'teach',
      title: 'Indentation is the syntax',
      concept: `
        <p>Most languages use braces to group lines. Python uses <strong>indentation</strong> —
        four spaces. The indented lines under an <code>if</code> are what runs when it is true.</p>
        <p>This means whitespace is not decoration in Python. Moving a line four spaces left or right
        changes what your program does.</p>
        <ul>
          <li><code>if</code> — run this when the condition is true</li>
          <li><code>elif</code> — otherwise, try this condition</li>
          <li><code>else</code> — otherwise, do this</li>
          <li>Comparisons: <code>==</code> <code>!=</code> <code>&gt;</code> <code>&lt;</code>
              <code>&gt;=</code> <code>&lt;=</code></li>
        </ul>
        <p>Python checks conditions strictly top to bottom and stops at the <em>first</em> one that is
        true. If an early condition is too broad, the later ones can never be reached.</p>`,
      files: [{
        name: 'main.py', lang: 'python', editable: true,
        code: `failed_logins = 4

if failed_logins >= 5:
    print("Account locked.")
    print("Contact an administrator.")
elif failed_logins >= 3:
    print("Warning: unusual activity.")
else:
    print("All normal.")

# this line is NOT indented, so it always runs
print("Check complete.")`
      }],
      runMode: 'python',
      tryIt: [
        'Set <code>failed_logins</code> to <code>7</code>, then <code>1</code>. Only one branch ever runs.',
        'Indent the last line by four spaces. Now it only prints in the <code>else</code> case.',
        'Move the <code>elif failed_logins &gt;= 3</code> block <em>above</em> the <code>if</code>… you cannot. But swap their conditions and set the count to 9. Watch what happens.'
      ]
    },

    {
      id: 'p-l4',
      kind: 'teach',
      title: 'Loops',
      concept: `
        <p>A <code>for</code> loop walks through a collection, one item at a time.
        <code>range(5)</code> produces 0, 1, 2, 3, 4 — it starts at 0 and <strong>stops before</strong>
        the number you give it.</p>
        <ul>
          <li><code>range(5)</code> → 0 1 2 3 4</li>
          <li><code>range(1, 6)</code> → 1 2 3 4 5</li>
          <li><code>range(0, 10, 2)</code> → 0 2 4 6 8</li>
        </ul>
        <p>A <code>while</code> loop repeats as long as its condition stays true. Which means
        <em>something inside the loop must eventually make that condition false</em>. Forget that step
        and your program never stops.</p>
        <p>Watch the indentation. A line inside the loop runs every time round; the same line
        un-indented runs once, at the end.</p>`,
      files: [{
        name: 'main.py', lang: 'python', editable: true,
        code: `# for: walk through a range
for i in range(3):
    print("attempt", i)

# for: walk through a list
alerts = ["phishing", "malware", "port scan"]
for alert in alerts:
    print(f"- {alert}")

# adding things up
total = 0
for n in [8, 9, 7, 10]:
    total = total + n
print("Total:", total)

# while: repeat until the condition goes false
countdown = 3
while countdown > 0:
    print(countdown)
    countdown = countdown - 1
print("Go.")`
      }],
      runMode: 'python',
      tryIt: [
        'Indent the <code>print("Total:", total)</code> line by four spaces. Now you get four lines instead of one.',
        'Change <code>range(3)</code> to <code>range(1, 4)</code>.',
        'Delete the <code>countdown = countdown - 1</code> line and run. Read the message you get.'
      ]
    },

    {
      id: 'p-l5',
      kind: 'teach',
      title: 'Lists and functions',
      concept: `
        <p>A <strong>list</strong> holds several values in order: <code>[88, 92, 79]</code>. Positions
        count from <strong>0</strong>. A three-item list has positions 0, 1 and 2, and
        <code>len()</code> of 3 — so the last valid position is always <code>len(list) - 1</code>.</p>
        <p>Ask for a position that does not exist and Python raises an <strong>IndexError</strong>
        and names the line.</p>
        <p>A <strong>function</strong> is reusable work. <code>def</code> defines it,
        <code>return</code> hands a value back. A function without <code>return</code> still runs every
        line — it just gives back <code>None</code>.</p>`,
      files: [{
        name: 'main.py', lang: 'python', editable: true,
        code: `scores = [88, 92, 79, 95]

print("How many:", len(scores))
print("First:", scores[0])
print("Last:", scores[len(scores) - 1])
print("From the end:", scores[-1])

def average(numbers):
    return sum(numbers) / len(numbers)

def grade(score):
    if score >= 90:
        return "A"
    elif score >= 80:
        return "B"
    else:
        return "C or below"

print("Average:", average(scores))

for s in scores:
    print(s, "->", grade(s))`
      }],
      runMode: 'python',
      tryIt: [
        'Add <code>print(scores[4])</code> at the bottom. Read the error type and the line number.',
        'Add <code>scores.append(100)</code> before the loop and run again.',
        'Delete the word <code>return</code> from <code>average</code>. What does it print now?'
      ]
    },

    /* ─────────────── DEBUG ─────────────── */

    {
      id: 'p-d1',
      kind: 'debug',
      title: 'Read the traceback',
      brief: `<p>This scoreboard should print two lines. It prints one, then crashes.</p>
        <p>Start with the traceback on the right: it gives you the <strong>line number</strong> and the
        <strong>error type</strong>. Both matter.</p>`,
      goal: `Player: Maya
Score: 47`,
      files: [{
        name: 'main.py', lang: 'python', editable: true,
        code: `name = "Maya"
score = 47

print("Player: " + name)
print("Score: " + score)`
      }],
      runMode: 'python',
      checks: [
        { label: 'The program runs all the way through with no error', test: c => !c.error },
        { label: 'It prints "Player: Maya"', test: c => c.lines[0] === 'Player: Maya' },
        { label: 'It prints "Score: 47"', test: c => c.lines[1] === 'Score: 47' },
        { label: 'Exactly two lines of output', test: c => c.lines.filter(l => l !== '').length === 2 }
      ],
      hints: [
        'Line 4 works and line 5 crashes. The two lines look almost identical — so the difference between them <em>is</em> the bug.',
        '<code>TypeError</code> means Python was handed two things it cannot combine. Add <code>print(type(name), type(score))</code> at the top and run it.',
        'Python will not glue text and a number together with <code>+</code>. Lesson 2 shows two separate ways to fix this — one converts the number, the other avoids <code>+</code> entirely. Either works.'
      ]
    },

    {
      id: 'p-d2',
      kind: 'debug',
      title: 'Four answers, one question',
      brief: `<p>This should print the class total and the average — two lines, once, at the end.</p>
        <p>Instead it reports after every single score. Python raises no error here: the program is
        doing exactly what it was told.</p>`,
      goal: `Total points: 34
Average: 8.5`,
      files: [{
        name: 'main.py', lang: 'python', editable: true,
        code: `scores = [8, 9, 7, 10]
total = 0

for s in scores:
    total = total + s
    average = total / len(scores)
    print("Total points:", total)
    print("Average:", average)`
      }],
      runMode: 'python',
      checks: [
        { label: 'The program runs with no error', test: c => !c.error },
        { label: 'Exactly two lines of output', test: c => c.lines.filter(l => l !== '').length === 2 },
        { label: 'The total is 34', test: c => c.text.includes('Total points: 34') },
        { label: 'The average is 8.5', test: c => c.text.includes('Average: 8.5') },
        { label: 'Every score is still counted (the total is built in a loop)', test: c => /for\s+\w+\s+in/.test(c.code) }
      ],
      hints: [
        'You got four copies of the report — one per score. So the reporting lines are running once per trip round the loop. Which lines does the loop actually contain?',
        'In Python the loop body is defined purely by indentation. Look at how far each line is indented, and ask which of them genuinely need to happen on every score.',
        'Adding up has to happen every time round. Reporting the finished answer should happen once, after the loop has finished. Un-indenting a line moves it out of the loop.'
      ]
    },

    {
      id: 'p-d3',
      kind: 'debug',
      title: 'Everyone gets a D',
      brief: `<p>A 95 should be an A. A 41 should be an F. Every passing score is coming back as
        <code>"D"</code>.</p>
        <p>There is no error message and no typo. Every single line here is valid Python. The bug is
        in the <em>order</em> the questions get asked.</p>`,
      goal: `95 -> A
83 -> B
72 -> C
64 -> D
41 -> F`,
      files: [{
        name: 'main.py', lang: 'python', editable: true,
        code: `def grade(score):
    if score >= 60:
        return "D"
    elif score >= 70:
        return "C"
    elif score >= 80:
        return "B"
    elif score >= 90:
        return "A"
    else:
        return "F"

for s in [95, 83, 72, 64, 41]:
    print(s, "->", grade(s))`
      }],
      runMode: 'python',
      checks: [
        { label: 'The program runs with no error', test: c => !c.error },
        { label: '95 gets an A', test: c => c.text.includes('95 -> A') },
        { label: '83 gets a B', test: c => c.text.includes('83 -> B') },
        { label: '72 gets a C', test: c => c.text.includes('72 -> C') },
        { label: '64 gets a D', test: c => c.text.includes('64 -> D') },
        { label: '41 gets an F', test: c => c.text.includes('41 -> F') }
      ],
      hints: [
        'Take a score of 95 and walk through the function by hand, one line at a time. Which condition is the first one it satisfies? What happens the instant a <code>return</code> runs?',
        'A chain of <code>if</code> / <code>elif</code> stops at the <em>first</em> condition that is true — the rest are never even looked at. So a 95 never reaches the line about 90.',
        'The condition <code>score >= 60</code> is true for 95, 83 and 72 as well. For a chain like this to work, the conditions have to be arranged so the most demanding one gets asked first. Right now they are in exactly the wrong order.'
      ]
    },

    {
      id: 'p-d4',
      kind: 'debug',
      title: 'The loop that never ends',
      brief: `<p>Three attempts, then a lockout message. Four lines total.</p>
        <p>Instead the program runs forever until the interpreter stops it. Read what the error says —
        it is telling you the shape of the problem, not the location.</p>`,
      goal: `Attempt 0 -> guess0
Attempt 1 -> guess1
Attempt 2 -> guess2
Locked out.`,
      files: [{
        name: 'main.py', lang: 'python', editable: true,
        code: `attempts = 0

while attempts < 3:
    password = "guess" + str(attempts)
    print("Attempt", attempts, "->", password)

print("Locked out.")`
      }],
      runMode: 'python',
      checks: [
        { label: 'The program finishes on its own', test: c => !c.error },
        { label: 'Exactly four lines of output', test: c => c.lines.filter(l => l !== '').length === 4 },
        { label: 'It counts 0, 1, then 2', test: c => c.text.includes('Attempt 0 -> guess0') && c.text.includes('Attempt 1 -> guess1') && c.text.includes('Attempt 2 -> guess2') },
        { label: 'It never reaches a fourth attempt', test: c => !c.text.includes('Attempt 3') },
        { label: 'It ends with "Locked out."', test: c => c.lines.filter(l => l !== '').pop() === 'Locked out.' },
        { label: 'It still uses a while loop', test: c => /while\s/.test(c.code) }
      ],
      hints: [
        'A <code>while</code> loop keeps going for exactly as long as its condition is true. Write down the condition on line 3, then ask: what would have to change for it to become false?',
        'Only <code>attempts</code> appears in that condition. Search the loop body for any line that changes <code>attempts</code>.',
        'Nothing inside the loop touches <code>attempts</code>, so it is 0 on every pass and the condition can never turn false. Every <code>while</code> loop needs a line in its body that moves it toward stopping. Lesson 4\'s countdown shows the pattern.'
      ]
    },

    {
      id: 'p-d5',
      kind: 'debug',
      title: 'Off the end of the list',
      brief: `<p>Three names should print as a numbered list, 1 through 3.</p>
        <p>The first two print, then it crashes. The traceback names the line and the error type —
        and the error type here is a strong clue about which number went wrong.</p>`,
      goal: `1. Maya
2. Dev
3. Sam`,
      files: [{
        name: 'main.py', lang: 'python', editable: true,
        code: `names = ["Maya", "Dev", "Sam"]

for i in range(1, len(names) + 1):
    print(str(i) + ". " + names[i])`
      }],
      runMode: 'python',
      checks: [
        { label: 'The program runs with no error', test: c => !c.error },
        { label: 'Three lines of output', test: c => c.lines.filter(l => l !== '').length === 3 },
        { label: 'It reads "1. Maya"', test: c => c.lines[0] === '1. Maya' },
        { label: 'It reads "2. Dev"', test: c => c.lines[1] === '2. Dev' },
        { label: 'It reads "3. Sam"', test: c => c.lines[2] === '3. Sam' },
        { label: 'All three names come from the list, not typed out by hand', test: c => !/print\("1\./.test(c.code) && /names/.test(c.code) }
      ],
      hints: [
        'Two names printed before it crashed — and the two it printed were the <em>second</em> and <em>third</em> names, not the first. That is a clue about where the loop started.',
        'Add <code>print(i)</code> as the first line inside the loop and run it. List the values <code>i</code> takes, then list the valid positions in a three-item list. Compare the two.',
        'List positions run from 0 to <code>len(names) - 1</code>, so valid positions here are 0, 1, 2 — but the loop hands over 1, 2, 3. The label you print and the position you look up do not have to be the same number.'
      ]
    }
  ]
};
