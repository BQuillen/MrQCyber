/* ============================================================
   Python track — 10 lessons, each followed by its own repair job.

   Runs on the built-in interpreter in minipy.js — a real (if partial)
   tree-walking interpreter, not a text diff. Output is stdout, plus a
   Python-style traceback when something raises.

   Every lesson (kind: 'teach') carries a `repairId` pointing at the
   debug stage that breaks the exact thing it just taught, and every
   repair (kind: 'debug') carries a `lessonId` pointing back — see
   js/app.js for the "Debug this lesson" / "Back to the lesson" UI.

   Debug checks read real captured stdout (ctx.lines / ctx.text) and
   the raised error (ctx.error), never the source text. Labels describe
   the GOAL, never the fix. Most repair jobs chain two or three bugs:
   fixing the first one reveals — or simply sits alongside — the next.
   ============================================================ */

TRACKS.python = {
  id: 'python',
  name: 'Python',
  icon: 'Py',
  accent: '#4fe0a0',
  tagline: 'logic · the brain',
  desc: 'Variables, types, indentation, loops, dictionaries, strings, tuples, booleans, and nested data. Python tells you exactly which line broke and why — learning to read a traceback is half of learning to debug.',
  stages: [

    /* ═══════════════════ 1 · print and variables ═══════════════════ */

    {
      id: 'p-l1',
      kind: 'teach',
      title: 'print and variables',
      repairId: 'p-d1',
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
      id: 'p-d1',
      kind: 'debug',
      title: 'Read the traceback',
      lessonId: 'p-l1',
      brief: `<p>This scoreboard should print three lines. Right now it crashes before it even reaches
        the last one.</p>
        <p>Start with the traceback on the right: it gives you the <strong>line number</strong> and
        the <strong>error type</strong>. Fix that, run it again, and read the new problem just as
        carefully — it is a different kind of mistake.</p>`,
      goal: `Player: Maya
Score: 47
Bonus: 5`,
      files: [{
        name: 'main.py', lang: 'python', editable: true,
        code: `name = "Maya"
score = 47
bonus = 5

print("Player: " + name)
print("Score: " + score)
print(f"Bonus: {bonu}")`
      }],
      runMode: 'python',
      checks: [
        { label: 'The program runs all the way through with no error', test: c => !c.error },
        { label: 'It prints "Player: Maya"', test: c => c.lines[0] === 'Player: Maya' },
        { label: 'It prints "Score: 47"', test: c => c.lines[1] === 'Score: 47' },
        { label: 'It prints "Bonus: 5"', test: c => c.lines[2] === 'Bonus: 5' },
        { label: 'Exactly three lines of output', test: c => c.lines.filter(l => l !== '').length === 3 }
      ],
      hints: [
        'The program stops before it ever reaches the last line. Get everything printing first — line 5 and line 6 look almost identical, and that difference is the first bug.',
        'Once all three lines print, look very closely at the name inside the last f-string\'s braces. Compare it, letter by letter, to the variable defined at the top.',
        'Python matches names exactly — <code>bonus</code> and <code>bonu</code> are two completely different names as far as it\'s concerned. A <code>NameError</code> never means a value is wrong; it means that name was never created. Check for a typo, not a missing definition.'
      ]
    },

    /* ═══════════════════ 2 · Types, and why they matter ═══════════════════ */

    {
      id: 'p-l2',
      kind: 'teach',
      title: 'Types, and why they matter',
      repairId: 'p-d2',
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
      id: 'p-d2',
      kind: 'debug',
      title: 'The subtotal is way too big',
      lessonId: 'p-l2',
      brief: `<p>This receipt should show the item name and a subtotal of <strong>36</strong>. Instead the
        subtotal comes out as an enormous number, with no error to point you at the line.</p>
        <p>Fix that, run it again, and a second problem shows up — one that <em>does</em> raise an
        error this time.</p>`,
      goal: `Item: USB drive
Subtotal: 36`,
      files: [{
        name: 'main.py', lang: 'python', editable: true,
        code: `name = "USB drive"
price = "12"
qty = 3

print("Item:", name)

subtotal = price * qty
print("Subtotal: " + subtotal)`
      }],
      runMode: 'python',
      checks: [
        { label: 'The program runs with no error', test: c => !c.error },
        { label: 'It prints "Item: USB drive"', test: c => c.lines[0] === 'Item: USB drive' },
        { label: 'It prints "Subtotal: 36"', test: c => c.lines[1] === 'Subtotal: 36' },
        { label: 'Exactly two lines of output', test: c => c.lines.filter(l => l !== '').length === 2 },
        { label: 'The subtotal still comes from multiplying price by qty', test: c => /qty/.test(c.code) && /\*/.test(c.code) }
      ],
      hints: [
        '121212 is not a rounding error or an off-by-one — it is not even in the neighborhood of the right answer. That is a strong sign <code>*</code> did something other than multiply. What kind of value is <code>price</code> right before that line runs?',
        'Add <code>print(type(price))</code> right after <code>price</code> is assigned and run it. Once you convert <code>price</code> into the type you actually want and run again, look very closely at the very next line — the type of <code>subtotal</code> just changed too.',
        '<code>"12" * 3</code> does not mean "multiply the number this text represents" — multiplying a string repeats it. And once a variable is genuinely a number, the same rule from this lesson still applies: Python will not glue text and a number together with <code>+</code>. Fix the conversion, then fix how the message is built.'
      ]
    },

    /* ═══════════════════ 3 · Indentation is the syntax ═══════════════════ */

    {
      id: 'p-l3',
      kind: 'teach',
      title: 'Indentation is the syntax',
      repairId: 'p-d3',
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
      id: 'p-d3',
      kind: 'debug',
      title: 'Everyone gets a D',
      lessonId: 'p-l3',
      brief: `<p>Five scores should each get their own letter grade, printed once, followed by a single
        "Done grading." line underneath. Right now every passing score reports back the same low
        grade — and "Done grading." shows up far more than once.</p>
        <p>There is no error message anywhere. Every line here is valid Python; both problems are
        about order and indentation, not typos.</p>`,
      goal: `95 -> A
83 -> B
72 -> C
64 -> D
41 -> F
Done grading.`,
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
    print(s, "->", grade(s))
    print("Done grading.")`
      }],
      runMode: 'python',
      checks: [
        { label: 'The program runs with no error', test: c => !c.error },
        { label: '95 gets an A', test: c => c.text.includes('95 -> A') },
        { label: '83 gets a B', test: c => c.text.includes('83 -> B') },
        { label: '72 gets a C', test: c => c.text.includes('72 -> C') },
        { label: '64 gets a D', test: c => c.text.includes('64 -> D') },
        { label: '41 gets an F', test: c => c.text.includes('41 -> F') },
        { label: '"Done grading." appears exactly once', test: c => c.lines.filter(l => l === 'Done grading.').length === 1 },
        { label: '"Done grading." is the very last line', test: c => c.lines.filter(l => l !== '').pop() === 'Done grading.' }
      ],
      hints: [
        'Two separate problems here. First: walk a score of 95 through <code>grade()</code> by hand, one condition at a time — which branch does it actually land in? Second, and separately: how many times does "Done grading." show up, and how many times should it?',
        'A chain of <code>if</code>/<code>elif</code> stops at the very first condition that\'s true, so they need to be arranged with the most demanding one asked first. And for "Done grading.", compare its indentation to the <code>print(s, "->", grade(s))</code> line right above it — are they really both meant to be inside the loop?',
        'Conditions in an <code>elif</code> chain are checked top to bottom, and the first true one wins — a broad condition placed early can block every stricter one below it from ever being reached. Indentation is exactly what decides whether a line belongs to the loop above it — a line meant to run once, after the loop finishes, cannot be indented to match lines that run every time round.'
      ]
    },

    /* ═══════════════════ 4 · Loops ═══════════════════ */

    {
      id: 'p-l4',
      kind: 'teach',
      title: 'Loops',
      repairId: 'p-d4',
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
      id: 'p-d4',
      kind: 'debug',
      title: 'The loop that never ends',
      lessonId: 'p-l4',
      brief: `<p>This should report the team's running total and average <strong>once</strong>, after all
        four scores are counted, then walk through three login attempts before locking out — six
        lines total.</p>
        <p>Right now the total and average print after every single score, and the login attempts
        never stop coming. Two unrelated loop problems, one after the other.</p>`,
      goal: `Total points: 34
Average: 8.5
Attempt 0
Attempt 1
Attempt 2
Locked out.`,
      files: [{
        name: 'main.py', lang: 'python', editable: true,
        code: `scores = [8, 9, 7, 10]
total = 0

for s in scores:
    total = total + s
    average = total / len(scores)
    print("Total points:", total)
    print("Average:", average)

attempts = 0
while attempts < 3:
    print("Attempt", attempts)

print("Locked out.")`
      }],
      runMode: 'python',
      checks: [
        { label: 'The program finishes on its own', test: c => !c.error },
        { label: 'Exactly six lines of output', test: c => c.lines.filter(l => l !== '').length === 6 },
        { label: 'The total is reported once, correctly', test: c => c.lines.filter(l => l.startsWith('Total points:')).length === 1 && c.text.includes('Total points: 34') },
        { label: 'The average is reported once, correctly', test: c => c.lines.filter(l => l.startsWith('Average:')).length === 1 && c.text.includes('Average: 8.5') },
        { label: 'It counts attempts 0, 1, then 2 and stops', test: c => c.text.includes('Attempt 0') && c.text.includes('Attempt 1') && c.text.includes('Attempt 2') && !c.text.includes('Attempt 3') },
        { label: 'It ends with "Locked out."', test: c => c.lines.filter(l => l !== '').pop() === 'Locked out.' },
        { label: 'Still built from a for loop and a while loop', test: c => /for\s+\w+\s+in/.test(c.code) && /while\s/.test(c.code) }
      ],
      hints: [
        'Two unrelated problems, one after the other. First: the total and average print four times instead of once — which lines truly belong inside the <code>for</code> loop, and which should only run after it finishes? Second: the login attempts never stop coming, no matter how long you wait.',
        'Compare the indentation of the two <code>print</code> lines to the <code>total = total + s</code> line right above them — are all three really meant to run every time round? Separately, write down the <code>while</code> loop\'s condition and search its body for any line that changes the variable it depends on.',
        'A line\'s indentation decides whether it is inside a loop or not — something meant to happen once, at the end, cannot be indented like something that happens every time round. And a <code>while</code> loop needs some line in its body that moves its condition toward becoming false, or it never will.'
      ]
    },

    /* ═══════════════════ 5 · Lists and functions ═══════════════════ */

    {
      id: 'p-l5',
      kind: 'teach',
      title: 'Lists and functions',
      repairId: 'p-d5',
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

    {
      id: 'p-d5',
      kind: 'debug',
      title: 'Off the end of the list',
      lessonId: 'p-l5',
      brief: `<p>Three names should print as a numbered list, 1 through 3, followed by a line naming the
        last person on the list.</p>
        <p>Right now it crashes partway through the numbering. Fix that, run it again, and the closing
        line crashes the exact same way.</p>`,
      goal: `1. Maya
2. Dev
3. Sam
Last on the list: Sam`,
      files: [{
        name: 'main.py', lang: 'python', editable: true,
        code: `names = ["Maya", "Dev", "Sam"]

for i in range(1, len(names) + 1):
    print(str(i) + ". " + names[i])

print("Last on the list:", names[len(names)])`
      }],
      runMode: 'python',
      checks: [
        { label: 'The program runs with no error', test: c => !c.error },
        { label: 'It reads "1. Maya"', test: c => c.lines[0] === '1. Maya' },
        { label: 'It reads "2. Dev"', test: c => c.lines[1] === '2. Dev' },
        { label: 'It reads "3. Sam"', test: c => c.lines[2] === '3. Sam' },
        { label: 'It ends with "Last on the list: Sam"', test: c => c.lines.filter(l => l !== '').pop() === 'Last on the list: Sam' },
        { label: 'All names still come from the list, not typed out by hand', test: c => !/print\("1\./.test(c.code) && /names/.test(c.code) }
      ],
      hints: [
        'Two names printed before it crashed — and they were the second and third names, not the first. That is a clue about where the indexing started. Fix that, run it again, and the program reaches a new final line — which crashes the exact same way.',
        'Add <code>print(i)</code> as the first line inside the loop. List the values <code>i</code> takes, then list the valid positions in a three-item list, and compare them. Once the loop is right, look at how the final line tries to find "the last position" in the very same way.',
        'List positions run from 0 to <code>len(list) - 1</code> — never from 1 to <code>len(list)</code>. The label you print for a person and the position you use to look them up don\'t have to be the same number, and "the last item" is always at <code>len(list) - 1</code>, not at <code>len(list)</code>.'
      ]
    },

    /* ═══════════════════ 6 · Dictionaries ═══════════════════ */

    {
      id: 'p-l6',
      kind: 'teach',
      title: 'Dictionaries',
      repairId: 'p-d6',
      concept: `
        <p>A <strong>dictionary</strong> stores values under keys you choose, not positions:
        <code>{"Maya": "teal", "Dev": "orange"}</code>. Look something up with
        <code>colors["Maya"]</code> — fast, direct, and exact.</p>
        <p>Two safer ways to handle a key that might not exist:</p>
        <ul>
          <li><code>colors.get(key)</code> — gives back <code>None</code> instead of crashing if the
            key is missing</li>
          <li><code>colors.get(key, default)</code> — gives back <code>default</code> instead, which
            is almost always what you actually want</li>
          <li><code>"Dev" in colors</code> — checks membership before you even look anything up</li>
        </ul>
        <p>Direct indexing — <code>colors["Riley"]</code> — raises a <strong>KeyError</strong> the
        instant the key is not there, naming the missing key. And exactly like variable names,
        dictionary keys are matched <em>exactly</em>: <code>"Dev"</code> and <code>"dev"</code> are two
        completely different keys.</p>
        <p>Loop over <code>.items()</code> to get both the key and the value at once:
        <code>for name, color in colors.items():</code>.</p>`,
      files: [{
        name: 'main.py', lang: 'python', editable: true,
        code: `colors = {"Maya": "teal", "Dev": "orange", "Sam": "purple"}

print(colors["Maya"])
print(colors.get("Sam"))
print(colors.get("Riley", "unknown"))

if "Dev" in colors:
    print("Dev is in the roster")

for name, color in colors.items():
    print(f"{name} likes {color}")`
      }],
      runMode: 'python',
      tryIt: [
        'Add a new pair — <code>colors["Jordan"] = "red"</code> — then print <code>colors</code> and see it show up.',
        'Change <code>colors.get("Riley", "unknown")</code> to plain <code>colors["Riley"]</code> and run it. Read the error.',
        'Change <code>"Dev" in colors</code> to check a name that is not there, like <code>"Riley"</code>, and watch that branch stop running.'
      ]
    },

    {
      id: 'p-d6',
      kind: 'debug',
      title: 'The roster that will not answer',
      lessonId: 'p-l6',
      brief: `<p>Every line here should report a real favorite color, and anyone missing from the roster
        should get a friendly fallback instead of a crash.</p>
        <p>Right now the second line crashes outright. Fix that, run it again, and the third line
        quietly prints something that is not really an answer at all.</p>`,
      goal: `Maya likes teal
Dev likes orange
Riley likes not on file`,
      files: [{
        name: 'main.py', lang: 'python', editable: true,
        code: `colors = {"Maya": "teal", "Dev": "orange", "Sam": "purple"}

print(f"Maya likes {colors['Maya']}")
print(f"Dev likes {colors['dev']}")
print(f"Riley likes {colors.get('Riley')}")`
      }],
      runMode: 'python',
      checks: [
        { label: 'The program runs with no error', test: c => !c.error },
        { label: 'It reads "Maya likes teal"', test: c => c.lines[0] === 'Maya likes teal' },
        { label: 'It reads "Dev likes orange"', test: c => c.lines[1] === 'Dev likes orange' },
        { label: 'Riley gets a real fallback, not "None"', test: c => !!c.lines[2] && c.lines[2] !== 'Riley likes None' && c.lines[2].startsWith('Riley likes ') && c.lines[2] !== 'Riley likes ' },
        { label: 'The lookup still uses .get with a fallback', test: c => /\.get\(/.test(c.code) }
      ],
      hints: [
        'The crash happens on the very first line that doesn\'t already work. Compare that dictionary key to how it was spelled where the dictionary was built — dictionary keys, exactly like variable names, have to match precisely.',
        'Once every line runs without crashing, look hard at the very last one. It doesn\'t crash — but does it actually say anything useful about Riley?',
        'A dictionary key is case-sensitive, character for character — <code>"Dev"</code> and <code>"dev"</code> are two unrelated keys as far as Python is concerned. And <code>.get()</code> only helps once you actually give it a fallback value; called with nothing, a missing key quietly becomes <code>None</code> instead of raising something you\'d notice.'
      ]
    },

    /* ═══════════════════ 7 · String methods and f-strings ═══════════════════ */

    {
      id: 'p-l7',
      kind: 'teach',
      title: 'String methods and f-strings',
      repairId: 'p-d7',
      concept: `
        <p>Strings come with built-in <strong>methods</strong> for cleaning and reshaping text —
        always called with parentheses, even when there is nothing to put inside them:</p>
        <ul>
          <li><code>.strip()</code> — removes leading and trailing whitespace</li>
          <li><code>.upper()</code> / <code>.lower()</code> — changes case</li>
          <li><code>.split(",")</code> — breaks a string into a list wherever that character appears</li>
          <li><code>.replace(old, new)</code> — swaps every occurrence of one piece of text for another</li>
        </ul>
        <p>None of these change the original string — strings can't be changed in place. Each one
        <em>returns a brand-new string</em>, which is why you have to store or print the result:
        <code>clean = raw.strip()</code>, not just <code>raw.strip()</code> on its own.</p>
        <p>f-strings can do more than drop in a bare variable. A format spec after a colon controls how
        a value is shown: <code>f"{price:.2f}"</code> rounds to exactly two decimal places — exactly
        what money should look like.</p>`,
      files: [{
        name: 'main.py', lang: 'python', editable: true,
        code: `raw_name = "  maya  "
name = raw_name.strip().title()
print(f"Welcome, {name}!")

shout = "cyber club rocks"
print(shout.upper())

csv_line = "Maya,15,cyber club"
parts = csv_line.split(",")
print(parts)
print(parts[0], "is", parts[1], "years old")

message = "See you at 3:00"
print(message.replace("3:00", "3:15"))

price = 19.5
print(f"Total: \${price:.2f}")`
      }],
      runMode: 'python',
      tryIt: [
        'Change <code>raw_name</code> to different spacing and capitalization and rerun — <code>.strip().title()</code> cleans it up the same way every time.',
        'Change <code>csv_line</code> to add a fourth field, then print <code>parts[3]</code>.',
        'Change <code>price</code> to <code>19.567</code> and see <code>:.2f</code> round it, instead of just chopping off digits.'
      ]
    },

    {
      id: 'p-d7',
      kind: 'debug',
      title: 'The method that never ran',
      lessonId: 'p-l7',
      brief: `<p>This should print a cleaned-up username, the second safety phrase from a comma-separated
        line, and an updated reminder — three lines.</p>
        <p>Right now it crashes before printing anything at all.</p>`,
      goal: `Username: maya
before
See you Thursday at 3:00`,
      files: [{
        name: 'main.py', lang: 'python', editable: true,
        code: `raw = "  MAYA  "
clean = raw.strip.lower()
print(f"Username: {clean}")

quote = "always,verify,before,you,click"
words = quote.split()
print(words[2])

reminder = "See you Tuesday at 3:00"
print(reminder.replace("Tuesday", "Thursday"))`
      }],
      runMode: 'python',
      checks: [
        { label: 'The program runs with no error', test: c => !c.error },
        { label: 'It prints "Username: maya"', test: c => c.lines[0] === 'Username: maya' },
        { label: 'It prints "before"', test: c => c.lines[1] === 'before' },
        { label: 'It prints "See you Thursday at 3:00"', test: c => c.lines[2] === 'See you Thursday at 3:00' },
        { label: 'Exactly three lines of output', test: c => c.lines.filter(l => l !== '').length === 3 }
      ],
      hints: [
        'It crashes immediately, on the very first line that does any real work — before a single character has printed. A method call always needs its parentheses, even when it takes no arguments.',
        'Once that runs, a second problem is waiting a few lines down: the comma-separated line does not split into the pieces you would expect. Try printing the whole <code>words</code> list right after you split it, and count how many pieces you actually got.',
        '<code>.strip</code> without <code>()</code> is the method itself, not the result of running it — you have to call it to get the cleaned-up text back. And <code>.split()</code> with nothing inside its parentheses splits on whitespace, not commas; to split on a specific character, you have to tell it which one.'
      ]
    },

    /* ═══════════════════ 8 · Tuples and multiple assignment ═══════════════════ */

    {
      id: 'p-l8',
      kind: 'teach',
      title: 'Tuples and multiple assignment',
      repairId: 'p-d8',
      concept: `
        <p>A <strong>tuple</strong> is an ordered group of values, written with parentheses:
        <code>(3, 4)</code>. Unlike a list, once built it cannot be changed — perfect for values that
        belong together and shouldn't drift apart, like a coordinate or a pair of scores.</p>
        <p>Python lets you assign several variables from one line: <code>x, y = point</code> pulls the
        two values out of the tuple, in order, into <code>x</code> and <code>y</code>. The number of
        variables on the left has to match the number of values on the right, exactly.</p>
        <p>That same trick swaps two variables without a temporary one: <code>a, b = b, a</code> builds
        the new pair <em>before</em> assigning anything, so neither value gets overwritten before the
        other one needs it.</p>
        <p>A function can hand back more than one value at once just by returning them separated by
        commas — Python packs them into a tuple automatically, ready to unpack on the other end.</p>`,
      files: [{
        name: 'main.py', lang: 'python', editable: true,
        code: `point = (3, 4)
x, y = point
print(f"x={x}, y={y}")

a, b = 1, 2
print("before:", a, b)
a, b = b, a
print("after:", a, b)

def minmax(numbers):
    return min(numbers), max(numbers)

lo, hi = minmax([4, 9, 2, 7])
print(f"lowest {lo}, highest {hi}")`
      }],
      runMode: 'python',
      tryIt: [
        'Change <code>point</code> to a different pair of numbers and rerun.',
        'Change <code>a, b = b, a</code> to <code>a, b = a, b</code> instead, and see nothing actually swap.',
        'Change <code>minmax</code> to also return <code>sum(numbers)</code>, without changing the line that unpacks it, and run it. Read the error.'
      ]
    },

    {
      id: 'p-d8',
      kind: 'debug',
      title: 'The swap that does not swap',
      lessonId: 'p-l8',
      brief: `<p>This scoreboard should swap <code>home</code> and <code>away</code> correctly, then print
        all three names from a ranking.</p>
        <p>Right now the "swap" does not actually swap anything. Fix that, run it again, and the
        ranking line crashes.</p>`,
      goal: `home: 21 away: 14
1st: Maya, 2nd: Dev, 3rd: Sam`,
      files: [{
        name: 'main.py', lang: 'python', editable: true,
        code: `def swap_scores(a, b):
    a = b
    b = a
    return a, b

home, away = 14, 21
home, away = swap_scores(home, away)
print("home:", home, "away:", away)

def get_ranking():
    return "Maya", "Dev", "Sam"

first, second = get_ranking()
print(f"1st: {first}, 2nd: {second}")`
      }],
      runMode: 'python',
      checks: [
        { label: 'The program runs with no error', test: c => !c.error },
        { label: 'The scores actually swap', test: c => c.text.includes('home: 21 away: 14') },
        { label: 'All three names are printed, in order', test: c => c.text.includes('1st: Maya, 2nd: Dev, 3rd: Sam') }
      ],
      hints: [
        'Walk <code>swap_scores</code> by hand with <code>a = 14</code> and <code>b = 21</code>. After the line <code>a = b</code> runs, what is <code>a</code> now — and has the ORIGINAL value of <code>a</code> been saved anywhere for <code>b</code> to use next?',
        'Once the swap gives back the right two values, a new problem shows up further down: <code>get_ranking()</code> hands back more values than the line under it is ready to catch. Count how many names it actually returns, and count how many names you are unpacking into.',
        'The swap trick from the lesson works because <code>a, b = b, a</code> builds the new pair before assigning anything — doing it one line at a time loses the original value partway through. And unpacking always needs exactly one variable per value coming back, not fewer and not more.'
      ]
    },

    /* ═══════════════════ 9 · Boolean logic ═══════════════════ */

    {
      id: 'p-l9',
      kind: 'teach',
      title: 'Boolean logic',
      repairId: 'p-d9',
      concept: `
        <p><code>and</code>, <code>or</code>, and <code>not</code> combine true/false values.
        <code>and</code> is true only if both sides are; <code>or</code> is true if either side is;
        <code>not</code> flips a value.</p>
        <p>Python's <code>and</code> / <code>or</code> don't just produce <code>True</code> or
        <code>False</code> — they <strong>short-circuit</strong>: <code>or</code> hands back the first
        side that is truthy without even looking at the other side, and <code>and</code> hands back the
        first side that is falsy. That is what makes <code>nickname or "Guest"</code> work as a
        default value.</p>
        <p>That same shortcut is also where a classic mistake comes from. <code>grade == 9 or 10</code>
        does <em>not</em> mean "grade is 9 or 10" — it means <code>(grade == 9) or (10)</code>, and
        <code>10</code> is truthy all by itself, so the whole thing is <code>True</code> no matter what
        <code>grade</code> is. Every comparison in a chain like this has to be written out in full:
        <code>grade == 9 or grade == 10</code>.</p>`,
      files: [{
        name: 'main.py', lang: 'python', editable: true,
        code: `is_admin = False
is_owner = True

# and / or return actual values, not just True/False
access = is_admin or is_owner
print(access)

# short-circuiting: "or" stops at the first truthy value
nickname = ""
display_name = nickname or "Guest"
print(display_name)

# not flips a boolean
print(not is_admin)

grade = 9
# a classic trap — this does NOT check three separate things:
# if grade == 9 or 10 or 11:
if grade == 9 or grade == 10 or grade == 11:
    print("Middle grades")
else:
    print("Other")`
      }],
      runMode: 'python',
      tryIt: [
        'Change <code>grade</code> to <code>14</code> and rerun — it correctly reports "Other".',
        'Comment out the correct <code>if</code> line and uncomment the WRONG one instead, keep <code>grade</code> at <code>14</code>, and run it. Read what happens.',
        'Change <code>nickname</code> to an actual name, like <code>"Sam"</code>, and watch <code>display_name</code> pick it up instead of "Guest".'
      ]
    },

    {
      id: 'p-d9',
      kind: 'debug',
      title: 'Everyone gets in — or no one does',
      lessonId: 'p-l9',
      brief: `<p>A person should be let into the lab if they are staff or old enough — and never if they
        are banned. Checked against three people, the right answers are <code>True</code>,
        <code>False</code>, <code>False</code>.</p>
        <p>Right now nobody gets in at all, no matter who is checked.</p>`,
      goal: `True
False
False`,
      files: [{
        name: 'main.py', lang: 'python', editable: true,
        code: `def can_enter(role, age, name):
    is_staff = role == "teacher" or "admin"
    is_old_enough = age >= 13
    is_banned = name == "Riley" or "Casey"
    return (is_staff or is_old_enough) and not is_banned

print(can_enter("student", 15, "Maya"))
print(can_enter("student", 10, "Riley"))
print(can_enter("guest", 8, "Sam"))`
      }],
      runMode: 'python',
      checks: [
        { label: 'The program runs with no error', test: c => !c.error },
        { label: 'Maya (student, 15, not banned) gets in', test: c => c.lines[0] === 'True' },
        { label: 'Riley (student, 10, banned) does not', test: c => c.lines[1] === 'False' },
        { label: 'Sam (guest, 8) does not', test: c => c.lines[2] === 'False' }
      ],
      hints: [
        'Try printing <code>is_staff</code> and <code>is_banned</code> separately, right before the <code>return</code> line, for each of the three calls. One of them is <code>True</code> far more often than it should be.',
        'Look at the line that builds <code>is_staff</code> — and separately, the line that builds <code>is_banned</code>. Each one only fully compares against the FIRST name or role. What does Python do with a bare word like <code>"admin"</code> or <code>"Casey"</code> sitting after an <code>or</code>?',
        '<code>x == a or b</code> does not mean "x equals a or b" — it means <code>(x == a) or (b)</code>, and a non-empty string like <code>"admin"</code> is always truthy on its own, so the whole expression is always <code>True</code> no matter what <code>x</code> is. Every comparison in a chain like this needs writing out in full, on both sides of every <code>or</code>.'
      ]
    },

    /* ═══════════════════ 10 · Nested data ═══════════════════ */

    {
      id: 'p-l10',
      kind: 'teach',
      title: 'Nested data',
      repairId: 'p-d10',
      concept: `
        <p>Real data is rarely flat. A <strong>list of dictionaries</strong> is a common shape — one
        dictionary per record, all the same shape, stored in a list:
        <code>[{"name": "Maya", "role": "president"}, ...]</code>. Loop over the list and pull
        whatever field you need out of each one.</p>
        <p>A <strong>dictionary of lists</strong> flips that around — one key per group, each holding
        a list of items: <code>{"Tuesday": ["Phishing", "Passwords"]}</code>. Loop over
        <code>.items()</code> for the outer dictionary, then loop again over each inner list.</p>
        <p>Nested data means nested bugs, layered on top of each other — but they are still the exact
        same rules you have already met: a typo'd key only shows up the moment that exact key gets
        looked up, a loop that forgets to move its counter still runs forever no matter how deep it is
        nested, and a list still only has valid positions from <code>0</code> to
        <code>len(list) - 1</code>.</p>`,
      files: [{
        name: 'main.py', lang: 'python', editable: true,
        code: `members = [
    {"name": "Maya", "role": "president"},
    {"name": "Dev", "role": "officer"},
    {"name": "Sam", "role": "member"},
]

for m in members:
    print(f"{m['name']} - {m['role']}")

schedule = {
    "Tuesday": ["Phishing", "Passwords"],
    "Thursday": ["Networking"],
}
for day, topics in schedule.items():
    for topic in topics:
        print(f"{day}: {topic}")`
      }],
      runMode: 'python',
      tryIt: [
        'Add a fourth dictionary to <code>members</code> and watch it show up in the loop automatically.',
        'Add a <code>"Friday"</code> key to <code>schedule</code> with its own list of topics.',
        'Change <code>for day, topics in schedule.items():</code> to just <code>for day in schedule:</code> and print <code>day</code> — see what looping over a dictionary alone actually gives you.'
      ]
    },

    {
      id: 'p-d10',
      kind: 'debug',
      title: 'The roster that never finishes',
      lessonId: 'p-l10',
      brief: `<p>This roster should print each member's score, then the team total underneath — four
        lines in total.</p>
        <p>Right now it crashes before printing anything at all. Whatever you fix first, run it again
        and read the new problem carefully — there are three separate bugs stacked on top of each
        other here, pulling together almost everything this track has covered.</p>`,
      goal: `Maya: 92
Dev: 81
Sam: 75
Team total: 248`,
      files: [{
        name: 'main.py', lang: 'python', editable: true,
        code: `members = [
    {"name": "Maya", "score": 92},
    {"name": "Dev", "score": 81},
    {"name": "Sam", "score": 75},
]

i = 0
total = 0
while i <= len(members):
    member = members[i]
    total = total + member["scroe"]
    print(f"{member['name']}: {member['score']}")

print(f"Team total: {total}")`
      }],
      runMode: 'python',
      checks: [
        { label: 'The program runs with no error', test: c => !c.error },
        { label: 'Exactly four lines of output', test: c => c.lines.filter(l => l !== '').length === 4 },
        { label: 'It reads "Maya: 92"', test: c => c.lines[0] === 'Maya: 92' },
        { label: 'It reads "Dev: 81"', test: c => c.lines[1] === 'Dev: 81' },
        { label: 'It reads "Sam: 75"', test: c => c.lines[2] === 'Sam: 75' },
        { label: 'It ends with "Team total: 248"', test: c => c.lines.filter(l => l !== '').pop() === 'Team total: 248' },
        { label: 'Still walks the list with a while loop, not hardcoded values', test: c => /while\s/.test(c.code) && /members\[/.test(c.code) }
      ],
      hints: [
        'It crashes immediately, before printing anything — on a dictionary lookup. Compare that key to how the dictionaries were actually built above. Once that is fixed and you run it again, notice how the very same line just keeps repeating, forever.',
        'The loop\'s variable is used to reach into the list, but scan the whole <code>while</code> block for any line that actually changes it — there isn\'t one. Add that, run it again, and a third problem appears right as the last member should print.',
        'Three separate rules, each from earlier in this track: a dictionary key has to match exactly how it was written; a <code>while</code> loop needs something in its body that moves its condition toward becoming false; and a three-item list\'s valid positions are only 0, 1, and 2 — so a loop condition that allows one position beyond that will always run one step too far.'
      ]
    }
  ]
};
