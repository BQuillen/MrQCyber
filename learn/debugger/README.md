# Debugger — Find It. Fix It.

A self-contained web app for teaching HTML, CSS, JavaScript and Python through
**debugging**. Each track is a run of short lessons that show working code
beside its live output, each immediately followed by its own repair job — a
program that's broken in exactly the way that lesson just taught, subtly, and
has to be fixed. HTML and CSS are ten lessons each (twenty stages); JavaScript
and Python are twenty each (forty stages), with room to keep growing —
past the concepts that get their own new lesson, later stages sometimes just
add another repair scenario against a concept already taught.

No build step, no frameworks, no CDN dependencies at runtime (only Google Fonts,
which degrade gracefully). Drop the folder on any static host.

---

## How it works for students

**Lessons.** Working code in the editor, the real result in the right-hand
pane. Every lesson ends with a few "try it yourself" prompts that ask the
student to deliberately break the code and watch what happens — including the
exact bug they're about to meet in the repair job — and a **Debug this
lesson →** button that jumps straight there.

**Repair jobs.** A broken program, a description of what it *should* do, and a
checklist of conditions that must hold before it counts as fixed. Students
edit, run, and press **Check my fix**. A link back to the lesson sits at the
bottom of the rail. Most repair jobs chain two or three bugs rather than one —
fixing the first reveals the second, the same way real debugging goes. The
step rail lists lessons and repairs in the order the student meets them:
lesson 1, repair 1, lesson 2, repair 2, … lesson 10, repair 10.

**Hints, not answers.** Three tiers per repair job:

1. Where to look — what the symptom tells you about the shape of the problem.
2. Narrowing — which lines to compare, what to add a `print`/`console.log` to.
3. The underlying rule — names the concept and points back at the lesson that
   covers it, but never states the edit.

No tier ever contains the fix. The third hint is deliberately written as a rule
the student must then apply themselves.

## How grading works

Nothing is compared against a "correct" source file — most of these bugs have
more than one legitimate fix. Every check runs the student's code for real and
tests the **result**:

| Track | What the checks inspect |
|---|---|
| HTML | the live DOM the browser actually built, via `ctx.doc` |
| CSS | `getComputedStyle()` on the rendered page |
| JavaScript | captured `console` output, plus the DOM after a simulated click |
| Python | stdout and the raised exception |

Check labels are phrased as goals ("the footer is not inside the card"), never
as instructions ("add a closing `</div>`").

Several jobs include a constraint check that rules out the cheap non-fix — for
example the CSS specificity job verifies the *other* nav links are still muted,
so deleting the competing rule does not pass.

## Files

```
index.html              app shell + markup
css/style.css           all styling
js/minipy.js            the Python interpreter (see below)
js/lessons-html.js      \
js/lessons-css.js        |  lesson + challenge data, one file per track
js/lessons-js.js         |  (each assigns into the global TRACKS object)
js/lessons-python.js    /
js/app.js               engine: rendering, running, grading, progress
```

Progress and in-progress edits are saved to `localStorage` under
`mrq-debugger-v1`. Students can close the tab and pick up where they left off;
**Reset file** restores a single file to its original state.

Deep links work: `index.html#python/p-d3` opens that repair job directly, which
is handy for assigning specific ones.

## Why Python runs on a custom interpreter

`js/minipy.js` is a small tree-walking Python interpreter (tokenizer → parser →
evaluator, ~1200 lines). Pyodide would be more complete, but it is a ~10 MB CDN
download — this keeps the tool working on a locked-down school network, matching
the rest of the site (the PowerShell range and KQ Who? are simulated engines too).

It covers the teaching subset: variables, `int`/`float`/`str`/`bool`/`None`,
lists, dicts, tuples, f-strings, `if`/`elif`/`else`, `for`, `while`, `def`,
`return`/`break`/`continue`, indexing and slicing, the common builtins, and
`str`/`list`/`dict` methods.

What matters most for a debugging tool is that it fails *the way Python fails*:

- `"Score: " + 47` → `TypeError: can only concatenate str (not "int") to str`
- true division returns a float, so `10 / 2` prints `5.0`
- tracebacks carry real line numbers and are rendered like the real thing
- runaway loops are caught with a message that describes the problem
  (`TimeoutError` after 400,000 steps, or a cap on printed lines)

It is not a complete Python. Classes, generators, comprehensions, exception
handling, imports and multi-line strings are out of scope. Lesson code stays
inside the supported subset — if you add your own, run it before assigning it.

## Adding a lesson or a repair job

Each track's `stages` array is interleaved: a `kind: 'teach'` stage immediately
followed by the `kind: 'debug'` stage that breaks what it just taught, over and
over. The two halves of a pair are linked by id so the app can render
the "Debug this lesson →" button and the "← Back to the lesson" link:

```js
{
  id: 'c-l6',
  kind: 'teach',
  title: 'Positioning',
  repairId: 'c-d6',           // the debug stage this lesson links to
  concept: '<p>...</p>',
  files: [{ name: 'style.css', lang: 'css', editable: true, code: '...' }],
  runMode: 'compose',
  tryIt: ['...']
},
{
  id: 'c-d6',                 // must be unique — it is the progress key and the deep link
  kind: 'debug',
  lessonId: 'c-l6',           // the teach stage this repair links back to
  title: 'Short symptom, not the cause',
  brief: '<p>What should happen, and what happens instead.</p>',
  goal: 'One line of prose, or multi-line text to show as literal target output.',
  files: [
    { name: 'page.html',  lang: 'html', editable: false, code: '...' },
    { name: 'style.css',  lang: 'css',  editable: true,  code: '...broken...' }
  ],
  runMode: 'compose',         // 'raw' (student owns the whole document) | 'compose' | 'python'
  outputMode: 'preview',      // 'preview' | 'console' | 'split'   (web tracks only)
  checks: [
    { label: 'Goal-shaped, not fix-shaped', test: c => c.css('.x', 'color') === 'rgb(0, 0, 0)' }
  ],
  hints: ['where to look', 'narrow it down', 'the rule — still not the fix']
}
```

Most repair jobs should chain two or three bugs rather than one: fixing the
first should reveal (or simply require noticing) the second. Keep early
repairs in a track to two bugs and let the later ones grow to three as the
student's skill builds.

The context object passed to `test`:

| Field | Available in | What it is |
|---|---|---|
| `doc`, `win` | web | the live iframe document and window |
| `css(sel, prop)` | web | `getComputedStyle` shorthand; `''` if the selector matches nothing |
| `logs`, `errors`, `lines`, `text` | web | captured console output |
| `probe` | web | scratch object an optional `interact(ctx)` hook fills in before checks run |
| `lines`, `text`, `error` | python | stdout, and the raised error (`null` if none) |
| `code` | both | the current source of the first editable file |

A `test` that throws counts as failed, so checks can dereference freely.

Add a `goal` with newlines to get a literal "target output" panel; a single-line
`goal` renders as prose instead.

## Verifying changes

The challenges were validated in a real browser: every repair job was checked to
**fail** on its shipped broken code and **pass** on a known-good fix, and every
lesson was checked to render and run without errors. If you add stages, do the
same — a challenge whose checks pass while broken teaches nothing.

One finding worth recording: modern browsers support **CSS nesting**, so a
missing closing brace no longer discards the rules that follow it — it silently
scopes them inside the unclosed rule instead. The `c-d2` job is built around
that newer failure mode, and still fails correctly on older browsers.

## Browser notes

The preview runs in a same-origin `srcdoc` iframe, because grading has to read
the rendered DOM and computed styles. Serve the site over HTTP — opening
`index.html` straight off disk (`file://`) makes browsers treat the iframe as a
separate origin, and the app will say so rather than failing silently.
