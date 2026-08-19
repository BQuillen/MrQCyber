/* runner.js — runs Python in the browser with Pyodide.
   Strategy: a Web Worker so a runaway loop can be terminated with Stop.
   If a Worker cannot be created (e.g. the page was opened directly from
   disk with file://), fall back to running on the main thread — everything
   still works except Stop. */
(function () {
  'use strict';

  var PYODIDE_VER = '0.26.4';
  var BASE = 'https://cdn.jsdelivr.net/pyodide/v' + PYODIDE_VER + '/full/';

  /* The harness runs the student's code inside exec() with a replacement
     input() that reads from the Program input box and echoes what it read,
     so the output pane looks like a real console session. Compiling with the
     filename "your code" keeps traceback line numbers matching the editor. */
  var HARNESS = [
    'import sys, traceback',
    '_lines = _STDIN.split("\\n") if _STDIN else []',
    'if _lines and _lines[-1] == "": _lines.pop()',
    '_i = 0',
    'def _input(prompt=""):',
    '    global _i',
    '    sys.stdout.write(str(prompt))',
    '    if _i >= len(_lines):',
    '        sys.stdout.write("\\n")',
    '        raise EOFError("This program asked for input, but the Program input box has no more lines. Open it and add one line for each input().")',
    '    _v = _lines[_i]; _i += 1',
    '    sys.stdout.write(_v + "\\n")',
    '    return _v',
    '_g = {"__name__": "__main__", "input": _input}',
    'try:',
    '    exec(compile(_SRC, "your code", "exec"), _g)',
    'except SystemExit:',
    '    pass',
    'except BaseException:',
    '    _parts = traceback.format_exception(*sys.exc_info())',
    '    _keep = [_parts[0]] + [p for p in _parts[1:-1] if "your code" in p] + [_parts[-1]]',
    '    sys.stderr.write("".join(_keep))',
    ''
  ].join('\n');

  var WORKER_SRC = [
    'var BASE = "' + BASE + '";',
    'importScripts(BASE + "pyodide.js");',
    'var HARNESS = ' + JSON.stringify(HARNESS) + ';',
    'var ready = null;',
    'function boot(){',
    '  if(!ready){ ready = loadPyodide({indexURL: BASE}); }',
    '  return ready;',
    '}',
    'self.onmessage = async function(e){',
    '  var d = e.data;',
    '  if(d.cmd === "warm"){ try{ await boot(); postMessage({type:"ready"}); }catch(err){ postMessage({type:"err", text:"Could not start Python: " + err}); } return; }',
    '  if(d.cmd !== "run") return;',
    '  var py;',
    '  try{',
    '    postMessage({type:"status", text:"boot"});',
    '    py = await boot();',
    '  }catch(err){ postMessage({type:"err", text:"Could not start Python: " + err}); postMessage({type:"done"}); return; }',
    '  postMessage({type:"status", text:"run"});',
    '  try{',
    '    py.setStdout({ batched: function(s){ postMessage({type:"out", text:s + "\\n"}); } });',
    '    py.setStderr({ batched: function(s){ postMessage({type:"err", text:s + "\\n"}); } });',
    '    py.globals.set("_SRC", d.code);',
    '    py.globals.set("_STDIN", d.stdin || "");',
    '    await py.runPythonAsync(HARNESS);',
    '  }catch(err){',
    '    postMessage({type:"err", text:String((err && err.message) || err)});',
    '  }',
    '  postMessage({type:"done"});',
    '};'
  ].join('\n');

  function Runner(handlers) {
    this.h = handlers;          // {onOut, onErr, onStatus, onDone}
    this.worker = null;
    this.mainPy = null;
    this.mode = null;           // 'worker' | 'main'
    this.busy = false;
  }

  Runner.prototype._spawn = function () {
    var self = this;
    try {
      var blob = new Blob([WORKER_SRC], { type: 'text/javascript' });
      var w = new Worker(URL.createObjectURL(blob));
      w.onmessage = function (e) {
        var m = e.data;
        if (m.type === 'out') self.h.onOut(m.text);
        else if (m.type === 'err') self.h.onErr(m.text);
        else if (m.type === 'status') self.h.onStatus(m.text);
        else if (m.type === 'ready') self.h.onStatus('ready');
        else if (m.type === 'done') { self.busy = false; self.h.onDone(); }
      };
      w.onerror = function () {
        /* Worker failed after creation — drop to the main thread. */
        try { w.terminate(); } catch (e) {}
        self.worker = null;
        self.mode = 'main';
        self.busy = false;
        self.h.onDone();
      };
      this.worker = w;
      this.mode = 'worker';
      return true;
    } catch (e) {
      this.mode = 'main';
      return false;
    }
  };

  Runner.prototype.warm = function () {
    if (this.mode === null) this._spawn();
    if (this.mode === 'worker' && this.worker) this.worker.postMessage({ cmd: 'warm' });
  };

  Runner.prototype.supportsStop = function () { return this.mode === 'worker'; };

  Runner.prototype.run = function (code, stdin) {
    var self = this;
    if (this.busy) return;
    this.busy = true;
    if (this.mode === null) this._spawn();

    if (this.mode === 'worker' && this.worker) {
      this.worker.postMessage({ cmd: 'run', code: code, stdin: stdin || '' });
      return;
    }

    /* ---- main-thread fallback ---- */
    this.h.onStatus('boot');
    this._mainRun(code, stdin || '');
  };

  Runner.prototype._loadScript = function (src) {
    return new Promise(function (res, rej) {
      var s = document.createElement('script');
      s.src = src;
      s.onload = res;
      s.onerror = function () { rej(new Error('Could not load ' + src)); };
      document.head.appendChild(s);
    });
  };

  Runner.prototype._mainRun = function (code, stdin) {
    var self = this;
    var start = Promise.resolve();
    if (!this.mainPy) {
      start = (typeof loadPyodide === 'undefined'
        ? this._loadScript(BASE + 'pyodide.js')
        : Promise.resolve())
        .then(function () { return loadPyodide({ indexURL: BASE }); })
        .then(function (py) { self.mainPy = py; });
    }
    start.then(function () {
      self.h.onStatus('run');
      var py = self.mainPy;
      py.setStdout({ batched: function (s) { self.h.onOut(s + '\n'); } });
      py.setStderr({ batched: function (s) { self.h.onErr(s + '\n'); } });
      py.globals.set('_SRC', code);
      py.globals.set('_STDIN', stdin);
      return py.runPythonAsync(HARNESS);
    }).catch(function (err) {
      self.h.onErr(String((err && err.message) || err));
    }).then(function () {
      self.busy = false;
      self.h.onDone();
    });
  };

  Runner.prototype.stop = function () {
    if (this.mode === 'worker' && this.worker) {
      try { this.worker.terminate(); } catch (e) {}
      this.worker = null;
      this.mode = null;
      this.busy = false;
      this._spawn();
      this.h.onErr('\n■ Stopped. Python has been restarted.\n');
      this.h.onDone();
      return true;
    }
    return false;
  };

  window.PyRunner = Runner;
})();
