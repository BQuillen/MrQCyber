'use strict';

// A bounded classroom KQL subset. It parses query text; it never executes code.
// Source rows come only from the loaded public-case.json, including supplied exhibits.
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.CampaignQuery = api;
})(typeof window === 'object' ? window : null, function () {
  const LIMITS = Object.freeze({ queryLength: 12000, operators: 25, tokens: 2400, predicates: 100, nesting: 32, rows: 50000 });
  const NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;
  const TERM = /^[\p{L}\p{N}]+$/u;
  const SPECS = Object.freeze({
    EventRevisions: { artifactId: 'EVENT-02', special: { timestamp: 'datetime' } },
    EventRegistrations: { artifactId: 'GUESTS-01', special: { check_in_utc: 'datetime' } },
    NetworkConnections: { artifactId: 'NETWORK-01', special: { timestamp: 'datetime' } },
    ApprovalEvents: { artifactId: 'APPROVALS-01', special: { timestamp: 'datetime', version: 'long' } },
    AccountPermissions: { artifactId: 'ACCESS-01', special: {} },
    PublishingEvents: { artifactId: 'PUBLISH-01', special: { timestamp: 'datetime', source_version: 'long' } },
    SessionObservations: { artifactId: 'SESSION-01', special: { timestamp: 'datetime' } },
    DocumentEvents: { artifactId: 'DOCLOG-01', special: { timestamp: 'datetime', version_from: 'long', version_to: 'long' } }
  });

  class QueryError extends Error {
    constructor(message, code = 'SYNTAX', position) {
      super(message + (Number.isInteger(position) ? ` (character ${position + 1})` : ''));
      this.name = 'CampaignQueryError'; this.code = code;
      if (Number.isInteger(position)) this.position = position;
    }
  }
  const fail = (message, code, token) => { throw new QueryError(message, code, token?.position); };
  const owns = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

  function datetimeValue(value, token) {
    if (typeof value !== 'string') fail('Datetime values must use an ISO date or an ISO timestamp with Z or an explicit offset.', 'TYPE', token);
    const match = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(Z|[+-]\d{2}:\d{2}))?$/.exec(value);
    if (!match) fail('Use datetime(2026-10-25) or datetime(2026-10-25T08:10:00Z). Full timestamps need seconds and a timezone; this subset supports at most millisecond precision.', 'TYPE', token);
    const year = Number(match[1]), month = Number(match[2]), day = Number(match[3]);
    const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if (year < 1 || month < 1 || month > 12 || day < 1 || day > days[month - 1] || Number(match[4] || 0) > 23 || Number(match[5] || 0) > 59 || Number(match[6] || 0) > 59) fail(`Invalid calendar date or time: ${value}.`, 'TYPE', token);
    if (match[8] && match[8] !== 'Z') {
      const [hours, minutes] = match[8].slice(1).split(':').map(Number);
      if (hours > 23 || minutes > 59) fail('Invalid datetime timezone offset.', 'TYPE', token);
    }
    const instant = Date.parse(value);
    if (!Number.isFinite(instant)) fail(`Invalid datetime: ${value}.`, 'TYPE', token);
    return instant;
  }

  function longValue(value, label = 'Number', token) {
    if ((typeof value !== 'number' && typeof value !== 'string') || !/^-?\d+$/.test(String(value)) || !Number.isSafeInteger(Number(value))) fail(`${label} must be a whole number between -9007199254740991 and 9007199254740991 in this practice subset.`, 'TYPE', token);
    return Number(value);
  }

  function cloneTable(table, tableName) {
    if (!table || !Array.isArray(table.columns) || !Array.isArray(table.rows) || !table.types || typeof table.types !== 'object') fail(`Table ${tableName} has an invalid schema.`, 'SCHEMA');
    if (!table.columns.length || new Set(table.columns).size !== table.columns.length || table.columns.some(column => typeof column !== 'string' || !NAME.test(column))) fail(`Table ${tableName} needs unique, simple column names.`, 'SCHEMA');
    if (table.rows.length > LIMITS.rows) fail(`Table ${tableName} exceeds this practice tool’s ${LIMITS.rows}-row limit.`, 'LIMIT');
    const types = Object.create(null);
    for (const column of table.columns) {
      const type = owns(table.types, column) && table.types[column];
      if (!['string', 'datetime', 'long'].includes(type)) fail(`Column ${column} needs an explicit string, datetime, or long type.`, 'SCHEMA');
      types[column] = type;
    }
    const rows = table.rows.map((row, rowIndex) => {
      if (!Array.isArray(row) || row.length !== table.columns.length) fail(`Row ${rowIndex + 1} in ${tableName} does not match its columns.`, 'SCHEMA');
      return row.map((value, index) => {
        const column = table.columns[index], type = types[column];
        if (value === null || value === undefined) fail(`Null values are outside this practice subset (${tableName}.${column}, row ${rowIndex + 1}).`, 'TYPE');
        if (type === 'long') return longValue(value, `${tableName}.${column}`);
        if (typeof value !== 'string') fail(`${tableName}.${column} expects ${type} text.`, 'TYPE');
        if (type === 'datetime') datetimeValue(value);
        return value;
      });
    });
    return { columns: [...table.columns], rows, types };
  }

  function getTables(caseData) {
    if (!caseData || !Array.isArray(caseData.artifacts)) fail('Load a case with an artifacts array before opening query practice.', 'SCHEMA');
    const byId = new Map(caseData.artifacts.map(artifact => [artifact.id, artifact]));
    const tables = Object.create(null);
    for (const [tableName, spec] of Object.entries(SPECS)) {
      const artifact = byId.get(spec.artifactId);
      if (!artifact) continue;
      if (!Array.isArray(artifact.columns) || !Array.isArray(artifact.rows)) fail(`${spec.artifactId} is missing its source table.`, 'SCHEMA');
      const types = Object.create(null);
      for (const column of artifact.columns) types[column] = owns(spec.special, column) ? spec.special[column] : 'string';
      const table = cloneTable({ columns: artifact.columns, rows: artifact.rows, types }, tableName);
      tables[tableName] = { ...table, artifactId: spec.artifactId, description: (artifact.body || []).filter(value => typeof value === 'string').join('\n\n') };
    }
    if (caseData.queryTables !== undefined) {
      if (!caseData.queryTables || typeof caseData.queryTables !== 'object' || Array.isArray(caseData.queryTables) || Object.keys(caseData.queryTables).length > 64) fail('queryTables must be an object containing at most 64 explicit table schemas.', 'SCHEMA');
      for (const [tableName, spec] of Object.entries(caseData.queryTables)) {
        if (!NAME.test(tableName) || ['__proto__', 'prototype', 'constructor'].includes(tableName)) fail('Query table names must be simple, non-reserved identifiers.', 'SCHEMA');
        if (owns(SPECS, tableName)) fail(`The built-in table ${tableName} cannot be overridden by a case declaration.`, 'SCHEMA');
        if (!spec || typeof spec !== 'object' || typeof spec.artifactId !== 'string' || !spec.types || typeof spec.types !== 'object' || Array.isArray(spec.types)) fail(`Table ${tableName} needs artifactId and an explicit types object.`, 'SCHEMA');
        const artifact = byId.get(spec.artifactId);
        if (!artifact || !Array.isArray(artifact.columns) || !Array.isArray(artifact.rows)) fail(`Table ${tableName} references a missing source table ${spec.artifactId}.`, 'SCHEMA');
        if (Object.keys(spec.types).length !== artifact.columns.length || Object.keys(spec.types).some(column => !artifact.columns.includes(column))) fail(`Types for ${tableName} must match every source column exactly.`, 'SCHEMA');
        if (Object.values(tables).some(table => table.artifactId === spec.artifactId)) fail(`Source ${spec.artifactId} is already mapped to another query table.`, 'SCHEMA');
        const table = cloneTable({ columns: artifact.columns, rows: artifact.rows, types: spec.types }, tableName);
        tables[tableName] = { ...table, artifactId: spec.artifactId, description: (artifact.body || []).filter(value => typeof value === 'string').join('\n\n') };
      }
    }
    return tables;
  }

  function tokenize(query) {
    if (typeof query !== 'string' || !query.trim()) fail('Start with a table name, for example PublishingEvents | take 5.', 'SYNTAX');
    if (query.length > LIMITS.queryLength) fail(`Keep queries to ${LIMITS.queryLength} characters or fewer.`, 'LIMIT');
    const tokens = []; let position = 0, pipes = 0;
    const push = token => { tokens.push(token); if (tokens.length > LIMITS.tokens) fail('This query contains too many tokens. Split it into shorter steps.', 'LIMIT', token); };
    while (position < query.length) {
      const char = query[position], start = position;
      if (/\s/.test(char)) { position++; continue; }
      if (char === '/' && query[position + 1] === '/') { while (position < query.length && query[position] !== '\n') position++; continue; }
      if (char === '"' || char === "'") {
        const quote = char; let value = '', closed = false; position++;
        while (position < query.length) {
          const current = query[position++];
          if (current === quote) { closed = true; break; }
          if (current === '\n' || current === '\r') fail('Keep quoted strings on one line, or use an escaped \\n.', 'SYNTAX', { position: start });
          if (current !== '\\') { value += current; continue; }
          if (position >= query.length) break;
          const escaped = query[position++];
          const escapes = { '\\': '\\', "'": "'", '"': '"', n: '\n', r: '\r', t: '\t', b: '\b', f: '\f' };
          if (owns(escapes, escaped)) value += escapes[escaped];
          else if (escaped === 'u' && /^[0-9A-Fa-f]{4}$/.test(query.slice(position, position + 4))) { value += String.fromCharCode(parseInt(query.slice(position, position + 4), 16)); position += 4; }
          else fail('Unsupported string escape. Use escaped quotes, \\, \\n, \\r, \\t, or \\u followed by four hexadecimal digits.', 'SYNTAX', { position: position - 2 });
        }
        if (!closed) fail('Close the quoted string with the same quote character.', 'SYNTAX', { position: start });
        push({ kind: 'literal', type: 'string', value, position: start }); continue;
      }
      if (/[A-Za-z_]/.test(char)) {
        position++; while (position < query.length && /[A-Za-z0-9_]/.test(query[position])) position++;
        const value = query.slice(start, position); let next = position;
        while (next < query.length && /\s/.test(query[next])) next++;
        if (value === 'datetime' && query[next] === '(') {
          const close = query.indexOf(')', next + 1);
          if (close < 0) fail('Close the datetime(...) literal.', 'SYNTAX', { position: start });
          const text = query.slice(next + 1, close).trim(); datetimeValue(text, { position: start });
          push({ kind: 'literal', type: 'datetime', value: text, position: start }); position = close + 1;
        } else push({ kind: 'identifier', value, position: start });
        continue;
      }
      if (/\d/.test(char) || (char === '-' && /\d/.test(query[position + 1] || ''))) {
        position++; while (position < query.length && /\d/.test(query[position])) position++;
        const value = longValue(query.slice(start, position), 'Numeric literal', { position: start });
        push({ kind: 'literal', type: 'long', value, position: start }); continue;
      }
      const pair = query.slice(position, position + 2);
      if (['==', '!=', '>=', '<='].includes(pair)) { push({ kind: 'symbol', value: pair, position }); position += 2; continue; }
      if ('|(),=><'.includes(char)) {
        if (char === '|' && ++pipes > LIMITS.operators) fail(`Use at most ${LIMITS.operators} pipeline operators in one query.`, 'LIMIT', { position });
        push({ kind: 'symbol', value: char, position }); position++; continue;
      }
      fail(`Unsupported character ${JSON.stringify(char)}. This tool accepts one read-only pipeline; use the supported-operators help.`, 'UNSUPPORTED', { position });
    }
    return tokens;
  }

  class Parser {
    constructor(tokens) { this.tokens = tokens; this.at = 0; this.predicates = 0; }
    peek() { return this.tokens[this.at]; }
    is(value) { const token = this.peek(); return token && token.kind !== 'literal' && token.value === value; }
    take(value) { if (!this.is(value)) return false; this.at++; return true; }
    expect(value, message) { if (!this.take(value)) fail(message || `Expected ${value}.`, 'SYNTAX', this.peek()); }
    identifier(label = 'column name') {
      const token = this.peek();
      if (!token || token.kind !== 'identifier') fail(`Expected a ${label}.`, 'SYNTAX', token);
      this.at++; return token;
    }
    endStage() { if (this.peek() && !this.is('|')) fail('Unexpected expression. Use a pipe before the next operator; this subset accepts simple column lists and one count() aggregation.', 'UNSUPPORTED', this.peek()); }
    column(table) {
      const token = this.identifier(); const index = table.columns.indexOf(token.value);
      if (index < 0) fail(`Unknown column ${token.value}. Available columns: ${table.columns.join(', ')}. Column names are case-sensitive.`, 'SCHEMA', token);
      return { name: token.value, index, type: table.types[token.value] };
    }
    columns(table) {
      const columns = [this.column(table)];
      while (this.take(',')) columns.push(this.column(table));
      if (new Set(columns.map(column => column.name)).size !== columns.length) fail('List each column once.', 'SCHEMA');
      return columns;
    }
    condition(table, depth = 0) {
      if (depth > LIMITS.nesting) fail(`Use at most ${LIMITS.nesting} nested expression groups.`, 'LIMIT', this.peek());
      const alternatives = [this.conjunction(table, depth)];
      while (this.take('or')) alternatives.push(this.conjunction(table, depth));
      return row => alternatives.some(predicate => predicate(row));
    }
    conjunction(table, depth) {
      const requirements = [this.primary(table, depth)];
      while (this.take('and')) requirements.push(this.primary(table, depth));
      return row => requirements.every(predicate => predicate(row));
    }
    primary(table, depth) {
      if (this.take('(')) { const predicate = this.condition(table, depth + 1); this.expect(')', 'Close the parenthesized condition.'); return predicate; }
      if (++this.predicates > LIMITS.predicates) fail(`Use at most ${LIMITS.predicates} comparisons in one query.`, 'LIMIT', this.peek());
      const column = this.column(table); const operator = this.peek();
      if (!operator || operator.kind === 'literal' || !['==', '!=', '>', '>=', '<', '<=', 'contains', 'contains_cs', 'has', 'has_cs'].includes(operator.value)) fail('Use ==, !=, >, >=, <, <=, contains, contains_cs, has, or has_cs after the column. Keywords are lower-case.', 'UNSUPPORTED', operator);
      this.at++; const literal = this.peek();
      if (!literal || literal.kind !== 'literal') fail('Compare the column with a quoted string, whole number, or datetime(ISO) literal. Column-to-column comparisons are not supported here.', 'UNSUPPORTED', literal);
      this.at++;
      if (column.type !== literal.type) fail(`${column.name} is ${column.type}, but this literal is ${literal.type}. ${column.type === 'datetime' ? 'Wrap the ISO date in datetime(...).' : column.type === 'long' ? 'Use a whole number without quotes.' : 'Use a quoted string.'}`, 'TYPE', literal);
      const op = operator.value;
      if (['contains', 'contains_cs', 'has', 'has_cs'].includes(op)) {
        if (column.type !== 'string') fail(`${op} works on string columns in this tool. Use a typed comparison for ${column.name}.`, 'TYPE', operator);
        const needle = op.endsWith('_cs') ? literal.value : literal.value.toLowerCase();
        if (op.startsWith('has') && !TERM.test(needle)) fail('has/has_cs accept one alphanumeric term in this practice subset. Use contains/contains_cs for a phrase, punctuation, or an empty string.', 'UNSUPPORTED', literal);
        return row => {
          const text = op.endsWith('_cs') ? row[column.index] : row[column.index].toLowerCase();
          return op.startsWith('contains') ? text.includes(needle) : (text.match(/[\p{L}\p{N}]+/gu) || []).includes(needle);
        };
      }
      if (column.type === 'string' && !['==', '!='].includes(op)) fail('This practice subset supports == and != for exact string comparisons. Use sort/order by to order text, or contains/has to search it.', 'UNSUPPORTED', operator);
      const right = column.type === 'datetime' ? datetimeValue(literal.value) : literal.value;
      return row => {
        const left = column.type === 'datetime' ? datetimeValue(row[column.index]) : row[column.index];
        switch (op) {
          case '==': return left === right;
          case '!=': return left !== right;
          case '>': return left > right;
          case '>=': return left >= right;
          case '<': return left < right;
          case '<=': return left <= right;
          default: return false;
        }
      };
    }
  }

  function select(table, columns) {
    const types = Object.create(null);
    for (const column of columns) types[column.name] = column.type;
    return { columns: columns.map(column => column.name), rows: table.rows.map(row => columns.map(column => row[column.index])), types };
  }
  function rowKey(row, columns) {
    return JSON.stringify(columns.map(column => column.type === 'datetime' ? datetimeValue(row[column.index]) : row[column.index]));
  }

  function execute(query, tables) {
    const parser = new Parser(tokenize(query));
    const tableName = parser.identifier('table name').value;
    if (!tables || typeof tables !== 'object' || !owns(tables, tableName)) fail(`Unknown table ${tableName}. Use one of: ${Object.keys(tables || {}).join(', ') || '(none loaded)'}. Table names are case-sensitive.`, 'SCHEMA');
    const sourceArtifactId = tables[tableName].artifactId;
    let table = cloneTable(tables[tableName], tableName);
    parser.endStage();
    while (parser.peek()) {
      parser.expect('|'); const operator = parser.identifier('pipeline operator');
      switch (operator.value) {
        case 'where': {
          const predicate = parser.condition(table); parser.endStage();
          table.rows = table.rows.filter(predicate); break;
        }
        case 'project': {
          const columns = parser.columns(table); parser.endStage(); table = select(table, columns); break;
        }
        case 'take': case 'limit': {
          const amount = parser.peek();
          if (!amount || amount.kind !== 'literal' || amount.type !== 'long' || amount.value < 0) fail('take/limit need a non-negative whole number, for example take 5.', 'SYNTAX', amount);
          parser.at++; parser.endStage(); table.rows = table.rows.slice(0, amount.value); break;
        }
        case 'sort': case 'order': {
          parser.expect('by', 'Use sort by column asc or sort by column desc.');
          const sortColumns = [];
          do {
            const column = parser.column(table); let direction = 'desc';
            if (parser.take('asc')) direction = 'asc'; else parser.take('desc');
            sortColumns.push({ ...column, direction });
          } while (parser.take(','));
          parser.endStage();
          table.rows.sort((left, right) => {
            for (const column of sortColumns) {
              const a = column.type === 'datetime' ? datetimeValue(left[column.index]) : left[column.index];
              const b = column.type === 'datetime' ? datetimeValue(right[column.index]) : right[column.index];
              const comparison = a < b ? -1 : a > b ? 1 : 0;
              if (comparison) return column.direction === 'asc' ? comparison : -comparison;
            }
            return 0;
          }); break;
        }
        case 'count': {
          parser.endStage(); table = { columns: ['Count'], rows: [[table.rows.length]], types: { Count: 'long' } }; break;
        }
        case 'distinct': {
          const columns = parser.columns(table); parser.endStage();
          const seen = new Set();
          table.rows = table.rows.filter(row => { const key = rowKey(row, columns); if (seen.has(key)) return false; seen.add(key); return true; });
          table = select(table, columns); break;
        }
        case 'summarize': {
          let alias = 'count_';
          if (parser.peek()?.kind === 'identifier' && parser.tokens[parser.at + 1]?.value === '=') alias = parser.identifier('count column alias').value, parser.expect('=');
          parser.expect('count', 'This practice tool supports summarize count() or summarize alias=count() by columns.');
          parser.expect('('); parser.expect(')', 'Use count() with no arguments. To count distinct values, use distinct column | count.');
          const columns = parser.take('by') ? parser.columns(table) : [];
          parser.endStage();
          if (columns.some(column => column.name === alias)) fail(`The count alias ${alias} duplicates a grouping column. Choose a different alias.`, 'SCHEMA');
          const groups = new Map();
          for (const row of table.rows) {
            const key = rowKey(row, columns);
            const group = groups.get(key);
            if (group) group.count++; else groups.set(key, { values: columns.map(column => row[column.index]), count: 1 });
          }
          if (!columns.length && !groups.size) groups.set('[]', { values: [], count: 0 });
          const types = Object.create(null); for (const column of columns) types[column.name] = column.type; types[alias] = 'long';
          table = { columns: [...columns.map(column => column.name), alias], rows: [...groups.values()].map(group => [...group.values, group.count]), types }; break;
        }
        default: fail(`Unsupported operator ${operator.value}. Use where, project, take/limit, sort/order by, count, distinct, or summarize count(). Operators are lower-case.`, 'UNSUPPORTED', operator);
      }
    }
    return { columns: [...table.columns], rows: table.rows.map(row => [...row]), types: { ...table.types }, sourceArtifactId, tableName };
  }

  const help = Object.freeze({
    title: 'Beginner KQL practice subset',
    description: 'Queries run locally over the supplied case exhibits. This is a small practice interpreter, not Azure Data Explorer or full KQL.',
    operators: Object.freeze(['where', 'project', 'take', 'limit', 'sort by', 'order by', 'count', 'distinct', 'summarize count()']),
    notes: Object.freeze([
      'Table and column names are case-sensitive; write operators and keywords in lower-case.',
      'where supports column-to-literal comparisons. == and != are case-sensitive for strings. Numeric and datetime columns also support >, >=, <, <=.',
      'contains searches substrings; has searches a single alphanumeric term. Both ignore case. Add _cs for case-sensitive search; use contains for phrases and punctuation.',
      'Combine conditions with and/or and parentheses. and binds more tightly than or.',
      'Use single/double quoted strings, safe whole numbers, or datetime(ISO). Dates use YYYY-MM-DD; full timestamps need seconds plus Z or an explicit offset and support at most three fractional digits.',
      'project/distinct accept existing column lists. summarize supports one count(), optionally aliased, and optional by columns. count returns Count; summarize count() returns count_.',
      'sort/order by supports multiple columns and defaults to desc. take/limit returns the first remaining rows in this local implementation; add an explicit sort for a meaningful order.',
      'Line comments beginning // are supported. No joins, let, external calls, management commands, arbitrary expressions, nulls, floating-point numbers, or other functions are supported.',
      'Long values are restricted to JavaScript safe integers; date precision is milliseconds. Datetime cells display their original source text, while comparisons and grouping use their UTC instants.'
    ]),
    sources: Object.freeze([
      { title: 'Microsoft Learn: common KQL operators', url: 'https://learn.microsoft.com/en-us/kusto/query/tutorials/learn-common-operators' },
      { title: 'Microsoft Learn: string operators', url: 'https://learn.microsoft.com/en-us/kusto/query/datatypes-string-operators' },
      { title: 'Microsoft Learn: logical operators', url: 'https://learn.microsoft.com/en-us/kusto/query/logical-operators' },
      { title: 'Microsoft Learn: summarize', url: 'https://learn.microsoft.com/en-us/kusto/query/summarize-operator' },
      { title: 'Microsoft Learn: string literals', url: 'https://learn.microsoft.com/en-us/kusto/query/scalar-data-types/string' }
    ])
  });
  return Object.freeze({ getTables, execute, QueryError, limits: LIMITS, help });
});
