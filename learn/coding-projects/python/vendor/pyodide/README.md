# Vendored Pyodide (v0.26.4, core build)

These five files are the Pyodide *core* runtime — the WebAssembly build of
CPython plus its standard library — copied from the `pyodide` npm package
so the in-browser Python runner works with no outbound internet access
(school networks often block CDNs like `cdn.jsdelivr.net`).

| File                 | What it is                                  |
|----------------------|----------------------------------------------|
| `pyodide.js`          | Loader — defines `loadPyodide()`             |
| `pyodide.asm.js`      | Emscripten glue code                         |
| `pyodide.asm.wasm`    | CPython compiled to WebAssembly (the big one)|
| `pyodide-lock.json`   | Package manifest Pyodide reads on boot       |
| `python_stdlib.zip`   | The Python standard library                  |

This is the *core* build only — no numpy/pandas/etc. That's intentional:
the notes and exercises here only use the standard library (`random`,
`math`, `string`, and so on all work fine), and the core build is ~14MB
instead of the 200+MB "full" distribution. If a future lesson needs a
third-party package, that package would still need to be fetched from
PyPI/CDN at runtime via `micropip` — vendoring it ahead of time would mean
downloading its `.whl` into this folder and adding it to
`pyodide-lock.json`.

## Updating the version

1. Pick a new version, e.g. `0.27.0`.
2. Download the five files above from
   `https://cdn.jsdelivr.net/npm/pyodide@<version>/<file>`.
3. Replace the files in this folder — same five names, no other changes
   needed. `runner.js` resolves this folder relative to its own location,
   so nothing else in the app needs to change.
