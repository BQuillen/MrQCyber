/* ============================================================
   minipy.js — a tiny Python interpreter that runs in the browser.

   Why not Pyodide? The rest of this site runs offline with zero
   dependencies (the PowerShell range is a simulated shell, KQ Who?
   is a simulated KQL engine). This keeps the Debugger working on a
   locked-down school network with no CDN access.

   Supports the teaching subset: variables, numbers/strings/bools/None,
   lists, dicts, tuples, f-strings, if/elif/else, for, while, def,
   return/break/continue, indexing + slicing, common builtins and
   str/list/dict methods — and Python-accurate error messages with
   line numbers, which is the whole point for a debugging tool.

   Entry point:  MiniPy.run(source, { inputs: [...] })
                 -> { output: "…", lines: [...], error: {type,msg,line}|null }
   ============================================================ */

const MiniPy = (() => {

  /* ---------- value model ----------
     Python int  -> JS number
     Python float-> PyFloat wrapper (so 10/2 prints "5.0", not "5")
     str -> JS string   bool -> JS boolean   None -> null
     list -> JS Array   tuple -> PyTuple     dict -> JS Map          */

  class PyFloat { constructor(v) { this.v = v; } }
  class PyTuple { constructor(items) { this.items = items; } }
  class PyFunc {
    constructor(name, params, defaults, body, env) {
      this.name = name; this.params = params; this.defaults = defaults;
      this.body = body; this.env = env;
    }
  }
  class PyType { constructor(name) { this.name = name; } }
  class PyBuiltin { constructor(name, fn) { this.name = name; this.fn = fn; } }

  class PyError extends Error {
    constructor(type, msg, line) {
      super(type + ': ' + msg);
      this.pyType = type; this.pyMsg = msg; this.line = line;
    }
  }
  const err = (type, msg, line) => { throw new PyError(type, msg, line); };

  const isFloat = v => v instanceof PyFloat;
  const nv = v => (v instanceof PyFloat ? v.v : v);          // numeric value
  const mkf = v => new PyFloat(v);
  const isNum = v => typeof v === 'number' || v instanceof PyFloat;
  const isInt = v => typeof v === 'number';

  /* ---------- type names & display ---------- */

  function typeName(v) {
    if (v === null) return 'NoneType';
    if (typeof v === 'boolean') return 'bool';
    if (typeof v === 'number') return 'int';
    if (v instanceof PyFloat) return 'float';
    if (typeof v === 'string') return 'str';
    if (Array.isArray(v)) return 'list';
    if (v instanceof PyTuple) return 'tuple';
    if (v instanceof Map) return 'dict';
    if (v instanceof PyFunc || v instanceof PyBuiltin) return 'function';
    if (v instanceof PyType) return 'type';
    return 'object';
  }

  function fmtFloat(n) {
    if (!isFinite(n)) return n > 0 ? 'inf' : (n < 0 ? '-inf' : 'nan');
    if (Number.isInteger(n) && Math.abs(n) < 1e16) return n.toFixed(1);
    // Python prints the shortest repr that round-trips; JS already does this.
    let s = String(n);
    if (s.includes('e')) s = s.replace('e', 'e+').replace('e+-', 'e-').replace('e++', 'e+');
    return s;
  }

  function pyStr(v) {
    if (v === null) return 'None';
    if (typeof v === 'boolean') return v ? 'True' : 'False';
    if (typeof v === 'number') return String(v);
    if (v instanceof PyFloat) return fmtFloat(v.v);
    if (typeof v === 'string') return v;
    if (Array.isArray(v)) return '[' + v.map(pyRepr).join(', ') + ']';
    if (v instanceof PyTuple) {
      if (v.items.length === 1) return '(' + pyRepr(v.items[0]) + ',)';
      return '(' + v.items.map(pyRepr).join(', ') + ')';
    }
    if (v instanceof Map) {
      const parts = [];
      v.forEach((val, k) => parts.push(pyRepr(k) + ': ' + pyRepr(val)));
      return '{' + parts.join(', ') + '}';
    }
    if (v instanceof PyFunc) return '<function ' + v.name + '>';
    if (v instanceof PyBuiltin) return '<built-in function ' + v.name + '>';
    if (v instanceof PyType) return "<class '" + v.name + "'>";
    return String(v);
  }

  function pyRepr(v) {
    if (typeof v === 'string') {
      const q = v.includes("'") && !v.includes('"') ? '"' : "'";
      let out = v.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/\t/g, '\\t');
      if (q === "'") out = out.replace(/'/g, "\\'");
      return q + out + q;
    }
    return pyStr(v);
  }

  function truthy(v) {
    if (v === null || v === undefined || v === false) return false;
    if (v === true) return true;
    if (typeof v === 'number') return v !== 0;
    if (v instanceof PyFloat) return v.v !== 0;
    if (typeof v === 'string') return v.length > 0;
    if (Array.isArray(v)) return v.length > 0;
    if (v instanceof PyTuple) return v.items.length > 0;
    if (v instanceof Map) return v.size > 0;
    return true;
  }

  /* ============================================================
     TOKENIZER
     ============================================================ */

  const KEYWORDS = new Set([
    'if', 'elif', 'else', 'for', 'while', 'def', 'return', 'break', 'continue',
    'pass', 'in', 'not', 'and', 'or', 'True', 'False', 'None', 'import', 'from',
    'as', 'global', 'del', 'lambda', 'try', 'except', 'finally', 'raise',
    'class', 'with', 'is', 'assert', 'yield', 'nonlocal'
  ]);

  const OPS = [
    '**=', '//=', '>>=', '<<=',
    '**', '//', '==', '!=', '<=', '>=', '+=', '-=', '*=', '/=', '%=', '->',
    '+', '-', '*', '/', '%', '=', '<', '>', '(', ')', '[', ']', '{', '}',
    ',', ':', '.', ';'
  ];

  function tokenize(src) {
    const lines = src.replace(/\r\n?/g, '\n').split('\n');
    const toks = [];
    const indents = [0];
    let depth = 0;              // bracket nesting — newlines inside brackets don't count
    let continuing = false;     // previous physical line ended with a backslash

    const push = (type, value, line, col) => toks.push({ type, value, line, col });

    for (let ln = 0; ln < lines.length; ln++) {
      const raw = lines[ln];
      const lineNo = ln + 1;
      let i = 0;

      if (depth === 0 && !continuing) {
        // measure indentation
        let ind = 0;
        while (i < raw.length && (raw[i] === ' ' || raw[i] === '\t')) {
          ind += raw[i] === '\t' ? 4 : 1;
          i++;
        }
        const rest = raw.slice(i);
        if (rest.trim() === '' || rest.trimStart().startsWith('#')) continue; // blank / comment line

        if (ind > indents[indents.length - 1]) {
          indents.push(ind);
          push('INDENT', ind, lineNo, i);
        } else {
          while (ind < indents[indents.length - 1]) {
            indents.pop();
            push('DEDENT', ind, lineNo, i);
          }
          if (ind !== indents[indents.length - 1]) {
            err('IndentationError', 'unindent does not match any outer indentation level', lineNo);
          }
        }
      }
      continuing = false;

      // ---- tokens on this physical line ----
      while (i < raw.length) {
        const c = raw[i];

        if (c === ' ' || c === '\t') { i++; continue; }
        if (c === '#') break;
        if (c === '\\' && i === raw.length - 1) { continuing = true; i++; break; }

        // string literal (with optional f / r prefix)
        const pfxMatch = /^([fFrRbB]{0,2})('''|"""|'|")/.exec(raw.slice(i));
        if (pfxMatch && (pfxMatch[1] !== '' || c === '"' || c === "'")) {
          const pfx = pfxMatch[1].toLowerCase();
          const quote = pfxMatch[2];
          const startCol = i;
          i += pfxMatch[0].length;
          let val = '';
          let closed = false;
          while (i < raw.length) {
            if (raw.startsWith(quote, i)) { i += quote.length; closed = true; break; }
            if (raw[i] === '\\' && !pfx.includes('r')) {
              const n = raw[i + 1];
              const map = { n: '\n', t: '\t', '\\': '\\', "'": "'", '"': '"', r: '\r', '0': '\0' };
              if (n in map) { val += map[n]; i += 2; continue; }
              val += '\\'; i++; continue;
            }
            val += raw[i]; i++;
          }
          if (!closed) {
            err('SyntaxError', 'unterminated string literal (detected at line ' + lineNo + ')', lineNo);
          }
          push(pfx.includes('f') ? 'FSTRING' : 'STRING', val, lineNo, startCol);
          continue;
        }

        // number
        if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(raw[i + 1] || ''))) {
          const m = /^[0-9_]*\.?[0-9_]*([eE][-+]?[0-9]+)?/.exec(raw.slice(i));
          const text = m[0].replace(/_/g, '');
          i += m[0].length;
          const isF = text.includes('.') || /[eE]/.test(text);
          push('NUMBER', isF ? mkf(parseFloat(text)) : parseInt(text, 10), lineNo, i);
          continue;
        }

        // name / keyword
        if (/[A-Za-z_]/.test(c)) {
          const m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(raw.slice(i));
          i += m[0].length;
          push(KEYWORDS.has(m[0]) ? 'KEY' : 'NAME', m[0], lineNo, i);
          continue;
        }

        // operator
        const op = OPS.find(o => raw.startsWith(o, i));
        if (op) {
          if ('([{'.includes(op)) depth++;
          if (')]}'.includes(op)) depth = Math.max(0, depth - 1);
          i += op.length;
          push('OP', op, lineNo, i);
          continue;
        }

        err('SyntaxError', 'invalid character ' + JSON.stringify(c), lineNo);
      }

      if (depth === 0 && !continuing) push('NEWLINE', '\n', lineNo, i);
    }

    const last = lines.length;
    while (indents.length > 1) { indents.pop(); push('DEDENT', 0, last, 0); }
    push('EOF', null, last, 0);
    return toks;
  }

  /* ============================================================
     PARSER  — builds a plain-object AST
     ============================================================ */

  function parse(toks) {
    let p = 0;
    const peek = (k = 0) => toks[Math.min(p + k, toks.length - 1)];
    const at = (type, value) => {
      const t = peek();
      return t.type === type && (value === undefined || t.value === value);
    };
    const atOp = v => at('OP', v);
    const atKey = v => at('KEY', v);
    const next = () => toks[p++];
    const line = () => peek().line;

    function expect(type, value) {
      if (!at(type, value)) {
        const t = peek();
        const got = t.type === 'NEWLINE' ? 'end of line'
          : t.type === 'EOF' ? 'end of file'
            : t.type === 'INDENT' ? 'an indented block'
              : t.type === 'DEDENT' ? 'a dedent'
                : JSON.stringify(String(t.value));
        err('SyntaxError', 'expected ' + (value ? JSON.stringify(value) : type.toLowerCase()) + ' but found ' + got, t.line);
      }
      return next();
    }

    function skipNewlines() { while (at('NEWLINE')) next(); }

    /* ---- statements ---- */

    function parseProgram() {
      const body = [];
      skipNewlines();
      while (!at('EOF')) { body.push(parseStatement()); skipNewlines(); }
      return { type: 'Module', body };
    }

    function parseBlock() {
      expect('OP', ':');
      if (at('NEWLINE')) {
        next();
        if (!at('INDENT')) {
          err('IndentationError', 'expected an indented block', peek().line);
        }
        next();
        const body = [];
        skipNewlines();
        while (!at('DEDENT') && !at('EOF')) { body.push(parseStatement()); skipNewlines(); }
        if (at('DEDENT')) next();
        return body;
      }
      // one-liner:  if x: print(1)
      return [parseSimpleStatement()];
    }

    function parseStatement() {
      if (atKey('if')) return parseIf();
      if (atKey('while')) return parseWhile();
      if (atKey('for')) return parseFor();
      if (atKey('def')) return parseDef();
      return parseSimpleStatement();
    }

    function parseIf() {
      const ln = line();
      next();
      const test = parseExpr();
      const body = parseBlock();
      let orelse = [];
      skipNewlines();
      if (atKey('elif')) orelse = [parseIf()];
      else if (atKey('else')) { next(); orelse = parseBlock(); }
      return { type: 'If', test, body, orelse, line: ln };
    }

    function parseWhile() {
      const ln = line();
      next();
      const test = parseExpr();
      const body = parseBlock();
      let orelse = [];
      skipNewlines();
      if (atKey('else')) { next(); orelse = parseBlock(); }
      return { type: 'While', test, body, orelse, line: ln };
    }

    function parseFor() {
      const ln = line();
      next();
      const target = parseTarget();
      if (!atKey('in')) err('SyntaxError', "expected 'in' after the loop variable", line());
      next();
      const iter = parseExpr();
      const body = parseBlock();
      let orelse = [];
      skipNewlines();
      if (atKey('else')) { next(); orelse = parseBlock(); }
      return { type: 'For', target, iter, body, orelse, line: ln };
    }

    function parseTarget() {
      const names = [parsePrimary()];
      while (atOp(',')) { next(); if (atKey('in')) break; names.push(parsePrimary()); }
      return names.length === 1 ? names[0] : { type: 'TupleTarget', elts: names };
    }

    function parseDef() {
      const ln = line();
      next();
      const name = expect('NAME').value;
      expect('OP', '(');
      const params = [], defaults = {};
      while (!atOp(')')) {
        if (atOp('*') || atOp('**')) next();       // tolerated, not fully supported
        const pn = expect('NAME').value;
        params.push(pn);
        if (atOp('=')) { next(); defaults[pn] = parseExpr(); }
        if (atOp(',')) next(); else break;
      }
      expect('OP', ')');
      if (atOp('->')) { next(); parseExpr(); }      // return annotation, ignored
      const body = parseBlock();
      return { type: 'FunctionDef', name, params, defaults, body, line: ln };
    }

    function parseSimpleStatement() {
      const ln = line();

      if (atKey('return')) {
        next();
        const value = (at('NEWLINE') || at('EOF') || at('DEDENT')) ? null : parseExprList();
        endStatement();
        return { type: 'Return', value, line: ln };
      }
      if (atKey('break')) { next(); endStatement(); return { type: 'Break', line: ln }; }
      if (atKey('continue')) { next(); endStatement(); return { type: 'Continue', line: ln }; }
      if (atKey('pass')) { next(); endStatement(); return { type: 'Pass', line: ln }; }
      if (atKey('import') || atKey('from')) {
        while (!at('NEWLINE') && !at('EOF')) next();
        endStatement();
        return { type: 'Pass', line: ln };
      }
      if (atKey('global')) {
        next();
        const names = [expect('NAME').value];
        while (atOp(',')) { next(); names.push(expect('NAME').value); }
        endStatement();
        return { type: 'Global', names, line: ln };
      }

      // expression / assignment
      const first = parseExprList();

      if (atOp('=')) {
        const targets = [first];
        let value = null;
        while (atOp('=')) { next(); value = parseExprList(); targets.push(value); }
        const val = targets.pop();
        endStatement();
        return { type: 'Assign', targets, value: val, line: ln };
      }

      const aug = ['+=', '-=', '*=', '/=', '%=', '**=', '//='].find(o => atOp(o));
      if (aug) {
        next();
        const value = parseExprList();
        endStatement();
        return { type: 'AugAssign', target: first, op: aug.slice(0, -1), value, line: ln };
      }

      endStatement();
      return { type: 'ExprStatement', value: first, line: ln };
    }

    function endStatement() {
      if (atOp(';')) { next(); return; }
      if (at('NEWLINE')) { next(); return; }
      if (at('EOF') || at('DEDENT')) return;
      const t = peek();
      err('SyntaxError', 'invalid syntax — unexpected ' + JSON.stringify(String(t.value)), t.line);
    }

    /* ---- expressions ---- */

    // Bare comma-separated list -> tuple (used by assignment / return)
    function parseExprList() {
      const first = parseExpr();
      if (!atOp(',')) return first;
      const elts = [first];
      while (atOp(',')) {
        next();
        if (at('NEWLINE') || at('EOF') || atOp('=')) break;
        elts.push(parseExpr());
      }
      return { type: 'Tuple', elts, line: first.line };
    }

    function parseExpr() { return parseTernary(); }

    function parseTernary() {
      const body = parseOr();
      if (atKey('if')) {
        const ln = line();
        next();
        const test = parseOr();
        if (!atKey('else')) err('SyntaxError', "expected 'else' in conditional expression", line());
        next();
        const orelse = parseTernary();
        return { type: 'IfExp', test, body, orelse, line: ln };
      }
      return body;
    }

    function parseOr() {
      let left = parseAnd();
      while (atKey('or')) { const ln = line(); next(); left = { type: 'BoolOp', op: 'or', left, right: parseAnd(), line: ln }; }
      return left;
    }
    function parseAnd() {
      let left = parseNot();
      while (atKey('and')) { const ln = line(); next(); left = { type: 'BoolOp', op: 'and', left, right: parseNot(), line: ln }; }
      return left;
    }
    function parseNot() {
      if (atKey('not')) { const ln = line(); next(); return { type: 'Unary', op: 'not', operand: parseNot(), line: ln }; }
      return parseComparison();
    }

    const CMP = ['==', '!=', '<=', '>=', '<', '>'];
    function parseComparison() {
      let left = parseArith();
      for (; ;) {
        const ln = line();
        const op = CMP.find(o => atOp(o));
        if (op) { next(); left = { type: 'Compare', op, left, right: parseArith(), line: ln }; continue; }
        if (atKey('in')) { next(); left = { type: 'Compare', op: 'in', left, right: parseArith(), line: ln }; continue; }
        if (atKey('not') && peek(1).type === 'KEY' && peek(1).value === 'in') {
          next(); next();
          left = { type: 'Compare', op: 'not in', left, right: parseArith(), line: ln };
          continue;
        }
        if (atKey('is')) {
          next();
          let op2 = 'is';
          if (atKey('not')) { next(); op2 = 'is not'; }
          left = { type: 'Compare', op: op2, left, right: parseArith(), line: ln };
          continue;
        }
        return left;
      }
    }

    function parseArith() {
      let left = parseTerm();
      while (atOp('+') || atOp('-')) {
        const ln = line(); const op = next().value;
        left = { type: 'BinOp', op, left, right: parseTerm(), line: ln };
      }
      return left;
    }
    function parseTerm() {
      let left = parseUnary();
      while (atOp('*') || atOp('/') || atOp('//') || atOp('%')) {
        const ln = line(); const op = next().value;
        left = { type: 'BinOp', op, left, right: parseUnary(), line: ln };
      }
      return left;
    }
    function parseUnary() {
      if (atOp('-') || atOp('+')) {
        const ln = line(); const op = next().value;
        return { type: 'Unary', op, operand: parseUnary(), line: ln };
      }
      return parsePower();
    }
    function parsePower() {
      const base = parsePrimary();
      if (atOp('**')) {
        const ln = line(); next();
        return { type: 'BinOp', op: '**', left: base, right: parseUnary(), line: ln };
      }
      return base;
    }

    function parsePrimary() {
      let node = parseAtom();
      for (; ;) {
        if (atOp('(')) {
          const ln = line(); next();
          const args = [], kwargs = {};
          while (!atOp(')')) {
            if (at('NAME') && peek(1).type === 'OP' && peek(1).value === '=') {
              const kw = next().value; next();
              kwargs[kw] = parseExpr();
            } else args.push(parseExpr());
            if (atOp(',')) next(); else break;
          }
          expect('OP', ')');
          node = { type: 'Call', func: node, args, kwargs, line: ln };
        } else if (atOp('[')) {
          const ln = line(); next();
          let lower = null, upper = null, step = null, isSlice = false;
          if (!atOp(':')) lower = parseExpr();
          if (atOp(':')) {
            isSlice = true; next();
            if (!atOp(']') && !atOp(':')) upper = parseExpr();
            if (atOp(':')) { next(); if (!atOp(']')) step = parseExpr(); }
          }
          expect('OP', ']');
          node = isSlice
            ? { type: 'Slice', value: node, lower, upper, step, line: ln }
            : { type: 'Index', value: node, index: lower, line: ln };
        } else if (atOp('.')) {
          const ln = line(); next();
          const attr = expect('NAME').value;
          node = { type: 'Attribute', value: node, attr, line: ln };
        } else return node;
      }
    }

    function parseAtom() {
      const t = peek();
      const ln = t.line;

      if (t.type === 'NUMBER') { next(); return { type: 'Const', value: t.value, line: ln }; }
      if (t.type === 'STRING') {
        next();
        let s = t.value;
        while (at('STRING')) s += next().value;      // implicit concatenation
        return { type: 'Const', value: s, line: ln };
      }
      if (t.type === 'FSTRING') { next(); return parseFString(t.value, ln); }
      if (t.type === 'NAME') { next(); return { type: 'Name', id: t.value, line: ln }; }

      if (t.type === 'KEY') {
        if (t.value === 'True') { next(); return { type: 'Const', value: true, line: ln }; }
        if (t.value === 'False') { next(); return { type: 'Const', value: false, line: ln }; }
        if (t.value === 'None') { next(); return { type: 'Const', value: null, line: ln }; }
        if (t.value === 'not') return parseNot();
      }

      if (atOp('(')) {
        next();
        if (atOp(')')) { next(); return { type: 'Tuple', elts: [], line: ln }; }
        const first = parseExpr();
        if (atOp(',')) {
          const elts = [first];
          while (atOp(',')) { next(); if (atOp(')')) break; elts.push(parseExpr()); }
          expect('OP', ')');
          return { type: 'Tuple', elts, line: ln };
        }
        expect('OP', ')');
        return first;
      }

      if (atOp('[')) {
        next();
        const elts = [];
        while (!atOp(']')) { elts.push(parseExpr()); if (atOp(',')) next(); else break; }
        expect('OP', ']');
        return { type: 'List', elts, line: ln };
      }

      if (atOp('{')) {
        next();
        const keys = [], values = [];
        while (!atOp('}')) {
          keys.push(parseExpr());
          expect('OP', ':');
          values.push(parseExpr());
          if (atOp(',')) next(); else break;
        }
        expect('OP', '}');
        return { type: 'Dict', keys, values, line: ln };
      }

      const what = t.type === 'NEWLINE' ? 'end of line'
        : t.type === 'EOF' ? 'end of file'
          : JSON.stringify(String(t.value));
      err('SyntaxError', 'invalid syntax — did not expect ' + what, ln);
    }

    // f"Hello {name}!"  ->  a Join node over string parts and expressions
    function parseFString(raw, ln) {
      const parts = [];
      let buf = '';
      for (let i = 0; i < raw.length; i++) {
        const c = raw[i];
        if (c === '{' && raw[i + 1] === '{') { buf += '{'; i++; continue; }
        if (c === '}' && raw[i + 1] === '}') { buf += '}'; i++; continue; }
        if (c === '{') {
          if (buf) { parts.push({ type: 'Const', value: buf, line: ln }); buf = ''; }
          let d = 1, j = i + 1, inner = '';
          while (j < raw.length && d > 0) {
            if (raw[j] === '{') d++;
            else if (raw[j] === '}') { d--; if (d === 0) break; }
            inner += raw[j]; j++;
          }
          if (d !== 0) err('SyntaxError', "f-string: expecting '}'", ln);
          i = j;
          let spec = null;
          const colon = findSpecColon(inner);
          if (colon >= 0) { spec = inner.slice(colon + 1); inner = inner.slice(0, colon); }
          if (inner.trim() === '') err('SyntaxError', 'f-string: valid expression required before \'}\'', ln);
          const sub = parse(tokenize(inner.trim()));
          const expr = sub.body[0] && sub.body[0].value;
          if (!expr) err('SyntaxError', 'f-string: invalid expression', ln);
          parts.push({ type: 'Format', value: expr, spec, line: ln });
          continue;
        }
        buf += c;
      }
      if (buf) parts.push({ type: 'Const', value: buf, line: ln });
      return { type: 'Join', parts, line: ln };
    }

    // A ':' only starts a format spec when it's outside brackets/quotes.
    function findSpecColon(s) {
      let d = 0, q = null;
      for (let i = 0; i < s.length; i++) {
        const c = s[i];
        if (q) { if (c === q) q = null; continue; }
        if (c === '"' || c === "'") { q = c; continue; }
        if ('([{'.includes(c)) d++;
        else if (')]}'.includes(c)) d--;
        else if (c === ':' && d === 0) return i;
      }
      return -1;
    }

    return parseProgram();
  }

  /* ============================================================
     INTERPRETER
     ============================================================ */

  const BREAK = { signal: 'break' };
  const CONTINUE = { signal: 'continue' };

  class Env {
    constructor(parent, globalEnv) {
      this.vars = new Map();
      this.parent = parent || null;
      this.globalEnv = globalEnv || this;
      this.globalNames = new Set();
    }
    get(name) {
      if (this.globalNames.has(name)) return this.globalEnv.vars.get(name);
      let e = this;
      while (e) { if (e.vars.has(name)) return e.vars.get(name); e = e.parent; }
      return undefined;
    }
    has(name) {
      if (this.globalNames.has(name)) return this.globalEnv.vars.has(name);
      let e = this;
      while (e) { if (e.vars.has(name)) return true; e = e.parent; }
      return false;
    }
    set(name, value) {
      if (this.globalNames.has(name)) this.globalEnv.vars.set(name, value);
      else this.vars.set(name, value);
    }
  }

  function run(source, opts) {
    opts = opts || {};
    const out = [];               // completed output lines
    let pending = '';             // current partial line (print(end='') etc.)
    const inputs = (opts.inputs || []).slice();
    const MAX_STEPS = opts.maxSteps || 400000;
    const MAX_LINES = opts.maxLines || 3000;
    let steps = 0;
    let depth = 0;

    const write = text => {
      const chunks = String(text).split('\n');
      pending += chunks[0];
      for (let i = 1; i < chunks.length; i++) {
        out.push(pending);
        pending = chunks[i];
        if (out.length > MAX_LINES) {
          err('OutputError', 'your program printed more than ' + MAX_LINES +
            ' lines — is a loop running away?', 0);
        }
      }
    };

    const tick = line => {
      if (++steps > MAX_STEPS) {
        err('TimeoutError',
          'your program is still running after ' + MAX_STEPS.toLocaleString() +
          ' steps. Check for a loop whose condition never becomes False.', line);
      }
    };

    /* ---------- builtins ---------- */

    const arity = (name, args, lo, hi, line) => {
      if (args.length < lo || args.length > hi) {
        err('TypeError', name + '() takes ' + (lo === hi ? lo : lo + ' to ' + hi) +
          ' argument' + (hi === 1 ? '' : 's') + ' but ' + args.length + ' were given', line);
      }
    };

    function toNumber(v, fnName, line) {
      if (isNum(v)) return nv(v);
      if (typeof v === 'boolean') return v ? 1 : 0;
      err('TypeError', fnName + "() argument must be a number, not '" + typeName(v) + "'", line);
    }

    function iterate(v, line) {
      if (typeof v === 'string') return v.split('');
      if (Array.isArray(v)) return v;
      if (v instanceof PyTuple) return v.items;
      if (v instanceof Map) return Array.from(v.keys());
      err('TypeError', "'" + typeName(v) + "' object is not iterable", line);
    }

    const builtins = new Map();
    const def = (name, fn) => builtins.set(name, new PyBuiltin(name, fn));

    def('print', (args, kw, line) => {
      const sep = kw.sep !== undefined ? pyStr(kw.sep) : ' ';
      const end = kw.end !== undefined ? pyStr(kw.end) : '\n';
      write(args.map(pyStr).join(sep) + end);
      return null;
    });

    def('len', (args, kw, line) => {
      arity('len', args, 1, 1, line);
      const v = args[0];
      if (typeof v === 'string') return v.length;
      if (Array.isArray(v)) return v.length;
      if (v instanceof PyTuple) return v.items.length;
      if (v instanceof Map) return v.size;
      err('TypeError', "object of type '" + typeName(v) + "' has no len()", line);
    });

    def('str', (args, kw, line) => (args.length ? pyStr(args[0]) : ''));
    def('repr', (args, kw, line) => pyRepr(args[0]));

    def('int', (args, kw, line) => {
      if (!args.length) return 0;
      const v = args[0];
      if (typeof v === 'boolean') return v ? 1 : 0;
      if (typeof v === 'number') return v;
      if (v instanceof PyFloat) return Math.trunc(v.v);
      if (typeof v === 'string') {
        const t = v.trim();
        if (!/^[-+]?[0-9]+$/.test(t)) {
          err('ValueError', "invalid literal for int() with base 10: " + pyRepr(v), line);
        }
        return parseInt(t, 10);
      }
      err('TypeError', "int() argument must be a string or a number, not '" + typeName(v) + "'", line);
    });

    def('float', (args, kw, line) => {
      if (!args.length) return mkf(0);
      const v = args[0];
      if (typeof v === 'boolean') return mkf(v ? 1 : 0);
      if (isNum(v)) return mkf(nv(v));
      if (typeof v === 'string') {
        const t = v.trim();
        if (!/^[-+]?([0-9]*\.?[0-9]+)([eE][-+]?[0-9]+)?$/.test(t)) {
          err('ValueError', 'could not convert string to float: ' + pyRepr(v), line);
        }
        return mkf(parseFloat(t));
      }
      err('TypeError', "float() argument must be a string or a number, not '" + typeName(v) + "'", line);
    });

    def('bool', (args) => (args.length ? truthy(args[0]) : false));

    def('list', (args, kw, line) => (args.length ? iterate(args[0], line).slice() : []));
    def('tuple', (args, kw, line) => new PyTuple(args.length ? iterate(args[0], line).slice() : []));

    def('range', (args, kw, line) => {
      arity('range', args, 1, 3, line);
      const a = args.map(x => {
        if (!isInt(x)) err('TypeError', "'" + typeName(x) + "' object cannot be interpreted as an integer", line);
        return x;
      });
      let start = 0, stop, step = 1;
      if (a.length === 1) stop = a[0];
      else { start = a[0]; stop = a[1]; if (a.length === 3) step = a[2]; }
      if (step === 0) err('ValueError', 'range() arg 3 must not be zero', line);
      const outArr = [];
      const count = Math.max(0, Math.ceil((stop - start) / step));
      if (count > 200000) err('MemoryError', 'range() is too large to build (' + count + ' items)', line);
      for (let i = 0; i < count; i++) outArr.push(start + i * step);
      return outArr;
    });

    def('sum', (args, kw, line) => {
      const items = iterate(args[0], line);
      let total = args[1] !== undefined ? args[1] : 0;
      for (const it of items) total = binop('+', total, it, line);
      return total;
    });

    def('min', (args, kw, line) => reduceCmp(args, line, '<'));
    def('max', (args, kw, line) => reduceCmp(args, line, '>'));
    function reduceCmp(args, line, op) {
      const items = args.length === 1 ? iterate(args[0], line) : args;
      if (!items.length) err('ValueError', (op === '<' ? 'min' : 'max') + '() arg is an empty sequence', line);
      let best = items[0];
      for (const it of items.slice(1)) if (compare(op, it, best, line)) best = it;
      return best;
    }

    def('abs', (args, kw, line) => {
      const v = args[0];
      if (isFloat(v)) return mkf(Math.abs(v.v));
      return Math.abs(toNumber(v, 'abs', line));
    });

    def('round', (args, kw, line) => {
      const n = toNumber(args[0], 'round', line);
      if (args.length > 1) {
        const f = Math.pow(10, args[1]);
        return mkf(Math.round(n * f + (n >= 0 ? Number.EPSILON : -Number.EPSILON)) / f);
      }
      // Python rounds .5 to the nearest even number, not always up.
      const fl = Math.floor(n);
      if (Math.abs(n - fl - 0.5) < 1e-9) return fl % 2 === 0 ? fl : fl + 1;
      return Math.round(n);
    });

    def('sorted', (args, kw, line) => {
      const items = iterate(args[0], line).slice();
      const rev = truthy(kw.reverse);
      items.sort((a, b) => (compare('<', a, b, line) ? -1 : compare('<', b, a, line) ? 1 : 0));
      if (rev) items.reverse();
      return items;
    });

    def('reversed', (args, kw, line) => iterate(args[0], line).slice().reverse());

    def('enumerate', (args, kw, line) => {
      const items = iterate(args[0], line);
      const start = args.length > 1 ? args[1] : (kw.start !== undefined ? kw.start : 0);
      return items.map((v, i) => new PyTuple([start + i, v]));
    });

    def('zip', (args, kw, line) => {
      const lists = args.map(a => iterate(a, line));
      const n = Math.min.apply(null, lists.map(l => l.length));
      const res = [];
      for (let i = 0; i < n; i++) res.push(new PyTuple(lists.map(l => l[i])));
      return res;
    });

    def('type', (args, kw, line) => new PyType(typeName(args[0])));
    def('ord', (args, kw, line) => String(args[0]).charCodeAt(0));
    def('chr', (args, kw, line) => String.fromCharCode(toNumber(args[0], 'chr', line)));

    def('input', (args, kw, line) => {
      if (args.length) write(pyStr(args[0]));
      if (!inputs.length) {
        err('EOFError', 'input() was called but this lesson has no more test input queued up', line);
      }
      const v = String(inputs.shift());
      write(v + '\n');
      return v;
    });

    /* ---------- operators ---------- */

    function binop(op, a, b, line) {
      // string / sequence behaviour first, so type errors read like Python's
      if (op === '+') {
        if (typeof a === 'string' || typeof b === 'string') {
          if (typeof a === 'string' && typeof b === 'string') return a + b;
          if (typeof a === 'string') {
            err('TypeError', 'can only concatenate str (not "' + typeName(b) + '") to str', line);
          }
          err('TypeError', 'unsupported operand type(s) for +: \'' + typeName(a) + "' and 'str'", line);
        }
        if (Array.isArray(a) && Array.isArray(b)) return a.concat(b);
        if (a instanceof PyTuple && b instanceof PyTuple) return new PyTuple(a.items.concat(b.items));
      }
      if (op === '*') {
        if (typeof a === 'string' && isInt(b)) return b > 0 ? a.repeat(b) : '';
        if (isInt(a) && typeof b === 'string') return a > 0 ? b.repeat(a) : '';
        if (Array.isArray(a) && isInt(b)) { const r = []; for (let i = 0; i < b; i++) r.push(...a); return r; }
        if (isInt(a) && Array.isArray(b)) { const r = []; for (let i = 0; i < a; i++) r.push(...b); return r; }
      }
      if (op === '%' && typeof a === 'string') {
        // old-style formatting; rare in lessons but harmless to support loosely
        const vals = (b instanceof PyTuple) ? b.items : [b];
        let i = 0;
        return a.replace(/%[sdif]/g, () => pyStr(vals[i++]));
      }

      const bothNum = (isNum(a) || typeof a === 'boolean') && (isNum(b) || typeof b === 'boolean');
      if (!bothNum) {
        err('TypeError', "unsupported operand type(s) for " + op + ": '" +
          typeName(a) + "' and '" + typeName(b) + "'", line);
      }

      const x = typeof a === 'boolean' ? (a ? 1 : 0) : nv(a);
      const y = typeof b === 'boolean' ? (b ? 1 : 0) : nv(b);
      const anyFloat = isFloat(a) || isFloat(b);
      const wrap = r => (anyFloat ? mkf(r) : r);

      switch (op) {
        case '+': return wrap(x + y);
        case '-': return wrap(x - y);
        case '*': return wrap(x * y);
        case '/':
          if (y === 0) err('ZeroDivisionError', 'division by zero', line);
          return mkf(x / y);                       // true division is always float
        case '//':
          if (y === 0) err('ZeroDivisionError', 'integer division or modulo by zero', line);
          return wrap(Math.floor(x / y));
        case '%':
          if (y === 0) err('ZeroDivisionError', 'integer division or modulo by zero', line);
          return wrap(((x % y) + y) % y);          // Python's sign-of-divisor modulo
        case '**': {
          const r = Math.pow(x, y);
          return (anyFloat || y < 0) ? mkf(r) : r;
        }
      }
      err('SyntaxError', 'unknown operator ' + op, line);
    }

    function eq(a, b) {
      if (a === null || b === null) return a === b;
      if (isNum(a) && isNum(b)) return nv(a) === nv(b);
      if (typeof a === 'boolean' && isNum(b)) return (a ? 1 : 0) === nv(b);
      if (isNum(a) && typeof b === 'boolean') return nv(a) === (b ? 1 : 0);
      if (typeof a !== typeof b && !(Array.isArray(a) && Array.isArray(b))) {
        if (typeName(a) !== typeName(b)) return false;
      }
      if (typeof a === 'string' || typeof a === 'boolean') return a === b;
      if (Array.isArray(a) && Array.isArray(b)) {
        return a.length === b.length && a.every((x, i) => eq(x, b[i]));
      }
      if (a instanceof PyTuple && b instanceof PyTuple) {
        return a.items.length === b.items.length && a.items.every((x, i) => eq(x, b.items[i]));
      }
      if (a instanceof Map && b instanceof Map) {
        if (a.size !== b.size) return false;
        for (const [k, v] of a) { if (!b.has(k) || !eq(v, b.get(k))) return false; }
        return true;
      }
      return a === b;
    }

    function compare(op, a, b, line) {
      if (op === '==') return eq(a, b);
      if (op === '!=') return !eq(a, b);
      if (op === 'is') return a === b || (a === null && b === null);
      if (op === 'is not') return !(a === b || (a === null && b === null));
      if (op === 'in' || op === 'not in') {
        let found;
        if (typeof b === 'string') {
          if (typeof a !== 'string') {
            err('TypeError', "'in <string>' requires string as left operand, not " + typeName(a), line);
          }
          found = b.includes(a);
        } else if (Array.isArray(b)) found = b.some(x => eq(x, a));
        else if (b instanceof PyTuple) found = b.items.some(x => eq(x, a));
        else if (b instanceof Map) { found = false; for (const k of b.keys()) if (eq(k, a)) { found = true; break; } }
        else err('TypeError', "argument of type '" + typeName(b) + "' is not iterable", line);
        return op === 'in' ? found : !found;
      }

      const numeric = (isNum(a) || typeof a === 'boolean') && (isNum(b) || typeof b === 'boolean');
      let x, y;
      if (numeric) {
        x = typeof a === 'boolean' ? (a ? 1 : 0) : nv(a);
        y = typeof b === 'boolean' ? (b ? 1 : 0) : nv(b);
      } else if (typeof a === 'string' && typeof b === 'string') { x = a; y = b; }
      else if (Array.isArray(a) && Array.isArray(b)) {
        for (let i = 0; i < Math.min(a.length, b.length); i++) {
          if (!eq(a[i], b[i])) return compare(op, a[i], b[i], line);
        }
        x = a.length; y = b.length;
      } else {
        err('TypeError', "'" + op + "' not supported between instances of '" +
          typeName(a) + "' and '" + typeName(b) + "'", line);
      }
      switch (op) {
        case '<': return x < y;
        case '>': return x > y;
        case '<=': return x <= y;
        case '>=': return x >= y;
      }
      return false;
    }

    /* ---------- indexing ---------- */

    function normIndex(i, len, line, what) {
      if (typeof i === 'boolean') i = i ? 1 : 0;
      if (!isInt(i)) {
        err('TypeError', what + ' indices must be integers, not ' + typeName(i), line);
      }
      const idx = i < 0 ? len + i : i;
      if (idx < 0 || idx >= len) err('IndexError', what + ' index out of range', line);
      return idx;
    }

    function getIndex(obj, idx, line) {
      if (typeof obj === 'string') return obj[normIndex(idx, obj.length, line, 'string')];
      if (Array.isArray(obj)) return obj[normIndex(idx, obj.length, line, 'list')];
      if (obj instanceof PyTuple) return obj.items[normIndex(idx, obj.items.length, line, 'tuple')];
      if (obj instanceof Map) {
        for (const [k, v] of obj) if (eq(k, idx)) return v;
        err('KeyError', pyRepr(idx), line);
      }
      err('TypeError', "'" + typeName(obj) + "' object is not subscriptable", line);
    }

    function setIndex(obj, idx, value, line) {
      if (Array.isArray(obj)) { obj[normIndex(idx, obj.length, line, 'list')] = value; return; }
      if (obj instanceof Map) {
        for (const k of obj.keys()) if (eq(k, idx)) { obj.set(k, value); return; }
        obj.set(idx, value); return;
      }
      if (typeof obj === 'string') {
        err('TypeError', "'str' object does not support item assignment", line);
      }
      err('TypeError', "'" + typeName(obj) + "' object does not support item assignment", line);
    }

    function getSlice(obj, lo, hi, st, line) {
      const seq = typeof obj === 'string' ? obj
        : Array.isArray(obj) ? obj
          : obj instanceof PyTuple ? obj.items
            : err('TypeError', "'" + typeName(obj) + "' object is not subscriptable", line);
      const len = seq.length;
      let step = st === null || st === undefined ? 1 : st;
      if (!isInt(step) || step === 0) {
        if (step === 0) err('ValueError', 'slice step cannot be zero', line);
        err('TypeError', 'slice indices must be integers', line);
      }
      const clamp = (v, d) => {
        if (v === null || v === undefined) return d;
        if (!isInt(v)) err('TypeError', 'slice indices must be integers', line);
        let x = v < 0 ? len + v : v;
        return Math.max(0, Math.min(len, x));
      };
      let start, stop, res = [];
      if (step > 0) {
        start = clamp(lo, 0); stop = clamp(hi, len);
        for (let i = start; i < stop; i += step) res.push(seq[i]);
      } else {
        start = lo === null || lo === undefined ? len - 1 : (lo < 0 ? len + lo : Math.min(lo, len - 1));
        stop = hi === null || hi === undefined ? -1 : (hi < 0 ? len + hi : hi);
        for (let i = start; i > stop; i += step) if (i >= 0 && i < len) res.push(seq[i]);
      }
      if (typeof obj === 'string') return res.join('');
      if (obj instanceof PyTuple) return new PyTuple(res);
      return res;
    }

    /* ---------- methods ---------- */

    function getAttr(obj, attr, line) {
      const bound = (name, fn) => new PyBuiltin(name, fn);

      if (typeof obj === 'string') {
        const S = {
          upper: a => obj.toUpperCase(),
          lower: a => obj.toLowerCase(),
          title: a => obj.replace(/\w\S*/g, t => t[0].toUpperCase() + t.slice(1).toLowerCase()),
          capitalize: a => obj.charAt(0).toUpperCase() + obj.slice(1).toLowerCase(),
          strip: a => (a.length ? trimChars(obj, pyStr(a[0]), true, true) : obj.trim()),
          lstrip: a => (a.length ? trimChars(obj, pyStr(a[0]), true, false) : obj.replace(/^\s+/, '')),
          rstrip: a => (a.length ? trimChars(obj, pyStr(a[0]), false, true) : obj.replace(/\s+$/, '')),
          split: a => (a.length && a[0] !== null
            ? obj.split(pyStr(a[0]))
            : obj.trim() === '' ? [] : obj.trim().split(/\s+/)),
          join: a => iterate(a[0], line).map(x => {
            if (typeof x !== 'string') {
              err('TypeError', 'sequence item: expected str instance, ' + typeName(x) + ' found', line);
            }
            return x;
          }).join(obj),
          replace: a => obj.split(pyStr(a[0])).join(pyStr(a[1])),
          startswith: a => obj.startsWith(pyStr(a[0])),
          endswith: a => obj.endsWith(pyStr(a[0])),
          find: a => obj.indexOf(pyStr(a[0])),
          count: a => (pyStr(a[0]) === '' ? obj.length + 1 : obj.split(pyStr(a[0])).length - 1),
          index: a => {
            const i = obj.indexOf(pyStr(a[0]));
            if (i < 0) err('ValueError', 'substring not found', line);
            return i;
          },
          isdigit: a => obj.length > 0 && /^[0-9]+$/.test(obj),
          isalpha: a => obj.length > 0 && /^[A-Za-z]+$/.test(obj),
          isalnum: a => obj.length > 0 && /^[A-Za-z0-9]+$/.test(obj),
          isupper: a => /[A-Za-z]/.test(obj) && obj === obj.toUpperCase(),
          islower: a => /[A-Za-z]/.test(obj) && obj === obj.toLowerCase(),
          format: a => {
            let i = 0;
            return obj.replace(/\{[^{}]*\}/g, () => pyStr(a[i++]));
          }
        };
        if (S[attr]) return bound(attr, args => S[attr](args));
        err('AttributeError', "'str' object has no attribute '" + attr + "'", line);
      }

      if (Array.isArray(obj)) {
        const L = {
          append: a => { arity('append', a, 1, 1, line); obj.push(a[0]); return null; },
          extend: a => { obj.push(...iterate(a[0], line)); return null; },
          insert: a => { obj.splice(a[0] < 0 ? Math.max(0, obj.length + a[0]) : Math.min(a[0], obj.length), 0, a[1]); return null; },
          pop: a => {
            if (!obj.length) err('IndexError', 'pop from empty list', line);
            const i = a.length ? normIndex(a[0], obj.length, line, 'list') : obj.length - 1;
            return obj.splice(i, 1)[0];
          },
          remove: a => {
            const i = obj.findIndex(x => eq(x, a[0]));
            if (i < 0) err('ValueError', 'list.remove(x): x not in list', line);
            obj.splice(i, 1); return null;
          },
          clear: a => { obj.length = 0; return null; },
          sort: (a, kw) => {
            obj.sort((x, y) => (compare('<', x, y, line) ? -1 : compare('<', y, x, line) ? 1 : 0));
            if (kw && truthy(kw.reverse)) obj.reverse();
            return null;
          },
          reverse: a => { obj.reverse(); return null; },
          count: a => obj.filter(x => eq(x, a[0])).length,
          index: a => {
            const i = obj.findIndex(x => eq(x, a[0]));
            if (i < 0) err('ValueError', pyRepr(a[0]) + ' is not in list', line);
            return i;
          },
          copy: a => obj.slice()
        };
        if (L[attr]) return bound(attr, (args, kw) => L[attr](args, kw));
        err('AttributeError', "'list' object has no attribute '" + attr + "'", line);
      }

      if (obj instanceof Map) {
        const D = {
          keys: a => Array.from(obj.keys()),
          values: a => Array.from(obj.values()),
          items: a => Array.from(obj.entries()).map(([k, v]) => new PyTuple([k, v])),
          get: a => {
            for (const [k, v] of obj) if (eq(k, a[0])) return v;
            return a.length > 1 ? a[1] : null;
          },
          pop: a => {
            for (const [k, v] of obj) if (eq(k, a[0])) { obj.delete(k); return v; }
            if (a.length > 1) return a[1];
            err('KeyError', pyRepr(a[0]), line);
          },
          update: a => { for (const [k, v] of a[0]) obj.set(k, v); return null; },
          clear: a => { obj.clear(); return null; },
          copy: a => new Map(obj)
        };
        if (D[attr]) return bound(attr, args => D[attr](args));
        err('AttributeError', "'dict' object has no attribute '" + attr + "'", line);
      }

      err('AttributeError', "'" + typeName(obj) + "' object has no attribute '" + attr + "'", line);
    }

    function trimChars(s, chars, left, right) {
      let a = 0, b = s.length;
      if (left) while (a < b && chars.includes(s[a])) a++;
      if (right) while (b > a && chars.includes(s[b - 1])) b--;
      return s.slice(a, b);
    }

    /* ---------- eval ---------- */

    function evalNode(node, env) {
      tick(node.line);
      switch (node.type) {
        case 'Const': return node.value;
        case 'Name': {
          if (env.has(node.id)) return env.get(node.id);
          if (builtins.has(node.id)) return builtins.get(node.id);
          err('NameError', "name '" + node.id + "' is not defined", node.line);
          break;
        }
        case 'List': return node.elts.map(e => evalNode(e, env));
        case 'Tuple': return new PyTuple(node.elts.map(e => evalNode(e, env)));
        case 'Dict': {
          const m = new Map();
          node.keys.forEach((k, i) => m.set(evalNode(k, env), evalNode(node.values[i], env)));
          return m;
        }
        case 'Join': return node.parts.map(pt => pyStr(evalNode(pt, env))).join('');
        case 'Format': {
          const v = evalNode(node.value, env);
          if (!node.spec) return pyStr(v);
          const m = /^\.(\d+)f$/.exec(node.spec);
          if (m) return nv(v).toFixed(parseInt(m[1], 10));
          const w = /^(\d+)$/.exec(node.spec);
          if (w) return pyStr(v).padStart(parseInt(w[1], 10));
          const c = /^([<>^])(\d+)$/.exec(node.spec);
          if (c) {
            const s = pyStr(v), width = parseInt(c[2], 10);
            if (c[1] === '<') return s.padEnd(width);
            if (c[1] === '>') return s.padStart(width);
            const total = Math.max(0, width - s.length), l = Math.floor(total / 2);
            return ' '.repeat(l) + s + ' '.repeat(total - l);
          }
          if (node.spec === ',') return nv(v).toLocaleString('en-US');
          return pyStr(v);
        }
        case 'BinOp': return binop(node.op, evalNode(node.left, env), evalNode(node.right, env), node.line);
        case 'Compare': return compare(node.op, evalNode(node.left, env), evalNode(node.right, env), node.line);
        case 'BoolOp': {
          const l = evalNode(node.left, env);
          if (node.op === 'and') return truthy(l) ? evalNode(node.right, env) : l;
          return truthy(l) ? l : evalNode(node.right, env);
        }
        case 'Unary': {
          const v = evalNode(node.operand, env);
          if (node.op === 'not') return !truthy(v);
          if (node.op === '+') return v;
          if (isFloat(v)) return mkf(-v.v);
          if (typeof v === 'boolean') return v ? -1 : 0;
          if (typeof v === 'number') return -v;
          err('TypeError', "bad operand type for unary -: '" + typeName(v) + "'", node.line);
          break;
        }
        case 'IfExp': return truthy(evalNode(node.test, env)) ? evalNode(node.body, env) : evalNode(node.orelse, env);
        case 'Index': return getIndex(evalNode(node.value, env), evalNode(node.index, env), node.line);
        case 'Slice': return getSlice(
          evalNode(node.value, env),
          node.lower ? evalNode(node.lower, env) : null,
          node.upper ? evalNode(node.upper, env) : null,
          node.step ? evalNode(node.step, env) : null,
          node.line
        );
        case 'Attribute': return getAttr(evalNode(node.value, env), node.attr, node.line);
        case 'Call': {
          const fn = evalNode(node.func, env);
          const args = node.args.map(a => evalNode(a, env));
          const kw = {};
          for (const k in node.kwargs) kw[k] = evalNode(node.kwargs[k], env);
          return callFunction(fn, args, kw, node.line, node.func);
        }
      }
      err('SyntaxError', 'cannot evaluate ' + node.type, node.line);
    }

    function callFunction(fn, args, kw, line, funcNode) {
      if (fn instanceof PyBuiltin) return fn.fn(args, kw, line);

      if (fn instanceof PyFunc) {
        if (++depth > 120) {
          depth--;
          err('RecursionError', 'maximum recursion depth exceeded — does ' + fn.name +
            '() ever stop calling itself?', line);
        }
        const local = new Env(fn.env, fn.env.globalEnv);
        if (args.length > fn.params.length) {
          depth--;
          err('TypeError', fn.name + '() takes ' + fn.params.length + ' positional argument' +
            (fn.params.length === 1 ? '' : 's') + ' but ' + args.length + ' were given', line);
        }
        fn.params.forEach((pn, i) => {
          if (i < args.length) local.vars.set(pn, args[i]);
          else if (kw[pn] !== undefined) local.vars.set(pn, kw[pn]);
          else if (fn.defaults[pn]) local.vars.set(pn, evalNode(fn.defaults[pn], fn.env));
          else {
            depth--;
            err('TypeError', fn.name + "() missing required positional argument: '" + pn + "'", line);
          }
        });
        let result = null;
        try {
          const sig = execBlock(fn.body, local);
          if (sig && sig.signal === 'return') result = sig.value;
        } finally { depth--; }
        return result;
      }

      const name = funcNode && funcNode.type === 'Name' ? funcNode.id
        : funcNode && funcNode.type === 'Attribute' ? funcNode.attr : null;
      err('TypeError', "'" + typeName(fn) + "' object is not callable" +
        (name ? ' — ' + name + ' is a ' + typeName(fn) + ', not a function' : ''), line);
    }

    /* ---------- assignment ---------- */

    function assign(target, value, env) {
      if (target.type === 'Name') { env.set(target.id, value); return; }
      if (target.type === 'Index') {
        setIndex(evalNode(target.value, env), evalNode(target.index, env), value, target.line);
        return;
      }
      if (target.type === 'Tuple' || target.type === 'TupleTarget') {
        const elts = target.elts;
        const vals = value instanceof PyTuple ? value.items
          : Array.isArray(value) ? value
            : typeof value === 'string' ? value.split('')
              : err('TypeError', "cannot unpack non-sequence " + typeName(value), target.line);
        if (vals.length !== elts.length) {
          err('ValueError', vals.length < elts.length
            ? 'not enough values to unpack (expected ' + elts.length + ', got ' + vals.length + ')'
            : 'too many values to unpack (expected ' + elts.length + ')', target.line);
        }
        elts.forEach((t, i) => assign(t, vals[i], env));
        return;
      }
      err('SyntaxError', 'cannot assign to this expression', target.line);
    }

    /* ---------- exec ---------- */

    function execBlock(body, env) {
      for (const stmt of body) {
        const sig = execStatement(stmt, env);
        if (sig) return sig;
      }
      return null;
    }

    function execStatement(node, env) {
      tick(node.line);
      switch (node.type) {
        case 'ExprStatement': evalNode(node.value, env); return null;
        case 'Assign': {
          const value = evalNode(node.value, env);
          node.targets.forEach(t => assign(t, value, env));
          return null;
        }
        case 'AugAssign': {
          const cur = evalNode(node.target, env);
          assign(node.target, binop(node.op, cur, evalNode(node.value, env), node.line), env);
          return null;
        }
        case 'Global': node.names.forEach(n => env.globalNames.add(n)); return null;
        case 'Pass': return null;
        case 'Break': return BREAK;
        case 'Continue': return CONTINUE;
        case 'Return': return { signal: 'return', value: node.value ? evalNode(node.value, env) : null };
        case 'If':
          return truthy(evalNode(node.test, env)) ? execBlock(node.body, env) : execBlock(node.orelse, env);
        case 'While': {
          while (truthy(evalNode(node.test, env))) {
            tick(node.line);
            const sig = execBlock(node.body, env);
            if (sig === BREAK) return null;
            if (sig === CONTINUE) continue;
            if (sig) return sig;
          }
          return execBlock(node.orelse, env);
        }
        case 'For': {
          const items = iterate(evalNode(node.iter, env), node.line);
          for (const item of items.slice()) {
            tick(node.line);
            assign(node.target, item, env);
            const sig = execBlock(node.body, env);
            if (sig === BREAK) return null;
            if (sig === CONTINUE) continue;
            if (sig) return sig;
          }
          return execBlock(node.orelse, env);
        }
        case 'FunctionDef':
          env.set(node.name, new PyFunc(node.name, node.params, node.defaults, node.body, env));
          return null;
      }
      err('SyntaxError', 'cannot execute ' + node.type, node.line);
    }

    /* ---------- go ---------- */

    let error = null;
    try {
      const ast = parse(tokenize(source));
      const global = new Env(null, null);
      global.globalEnv = global;
      execBlock(ast.body, global);
    } catch (e) {
      if (e instanceof PyError) {
        error = { type: e.pyType, msg: e.pyMsg, line: e.line || 0 };
      } else {
        error = { type: 'InternalError', msg: e.message || String(e), line: 0 };
      }
    }

    if (pending !== '') { out.push(pending); pending = ''; }

    return {
      lines: out,
      output: out.join('\n'),
      error,
      // A traceback that looks like the real thing — students should learn to read it.
      traceback: error
        ? (error.line
          ? 'Traceback (most recent call last):\n  File "main.py", line ' + error.line +
          '\n' + error.type + ': ' + error.msg
          : error.type + ': ' + error.msg)
        : ''
    };
  }

  return { run, pyStr, pyRepr };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = MiniPy;
