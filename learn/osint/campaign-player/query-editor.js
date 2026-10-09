'use strict';

// Dependency-free editor for the bounded local CampaignQuery interpreter.
(function (root, factory) {
  const api = factory(typeof module === 'object' && module.exports ? require('./query-engine.js') : root?.CampaignQuery);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.CampaignPlayerEditor = api;
})(typeof window === 'object' ? window : null, function (engine) {
  const KEYWORDS = new Set(['where', 'project', 'take', 'limit', 'sort', 'order', 'by', 'asc', 'desc', 'count', 'distinct', 'summarize', 'and', 'or', 'contains', 'contains_cs', 'has', 'has_cs', 'datetime']);
  const OPERATORS = ['where', 'project', 'take', 'limit', 'sort by', 'order by', 'count', 'distinct', 'summarize'];
  let instanceCount = 0;
  // Only successful runs emitted by this editor can be restored. Keep provenance
  // in memory: serialized/imported progress must not supply query-result rows.
  const successfulRuns = new WeakMap();

  function rememberRun(run, tables) {
    successfulRuns.set(run, { run: JSON.stringify(run), source: JSON.stringify(tables[run.result.tableName]) });
    return run;
  }

  function restoreRun(run, query, tables) {
    if (!run || typeof run !== 'object' || run.query !== query) return null;
    const saved = successfulRuns.get(run), result = run.result;
    if (!saved || !result || !Object.prototype.hasOwnProperty.call(tables, result.tableName)) return null;
    const table = tables[result.tableName];
    if (result.sourceArtifactId !== table.artifactId) return null;
    // Compare the complete result, including aggregate values, and its original
    // source table. No rerun is needed; stale or changed data requires Run again.
    try { return saved.run === JSON.stringify(run) && saved.source === JSON.stringify(table) ? run : null; }
    catch (_) { return null; }
  }

  function lex(value) {
    const text = String(value); const tokens = []; let i = 0;
    while (i < text.length) {
      const start = i; let kind = 'punctuation', closed = true;
      if (/\s/.test(text[i])) { kind = 'space'; while (i < text.length && /\s/.test(text[i])) i++; }
      else if (text.slice(i, i + 2) === '//') { kind = 'comment'; while (i < text.length && text[i] !== '\n') i++; }
      else if (text[i] === '"' || text[i] === "'") {
        kind = 'string'; const quote = text[i++]; closed = false;
        while (i < text.length) { const char = text[i++]; if (char === '\\' && i < text.length) i++; else if (char === quote) { closed = true; break; } }
      } else if (/[A-Za-z_]/.test(text[i])) {
        i++; while (i < text.length && /[A-Za-z0-9_]/.test(text[i])) i++;
        kind = KEYWORDS.has(text.slice(start, i)) ? 'keyword' : 'identifier';
      } else if (/[0-9]/.test(text[i])) { kind = 'number'; i++; while (i < text.length && /[0-9.]/.test(text[i])) i++; }
      else { if ('|=!<>'.includes(text[i])) kind = 'operator'; i++; if ('=!<>'.includes(text[start]) && text[i] === '=') i++; }
      tokens.push({ text: text.slice(start, i), start, end: i, kind, closed });
    }
    return tokens;
  }

  function highlight(query, tables = {}) {
    const columns = new Set(Object.values(tables).flatMap(table => table.columns || []));
    return lex(query).map(token => ({ ...token, kind: token.kind === 'identifier' ? (Object.prototype.hasOwnProperty.call(tables, token.text) ? 'table' : columns.has(token.text) ? 'column' : 'identifier') : token.kind }));
  }

  function suggest(query, cursor, tables = {}) {
    query = String(query); cursor = Math.max(0, Math.min(query.length, Number.isInteger(cursor) ? cursor : query.length));
    const empty = { items: [], from: cursor, to: cursor };
    if (query.length > 12000) return empty;
    const tokens = lex(query);
    if (tokens.some(token => (token.kind === 'comment' && cursor > token.start && cursor <= token.end) || (token.kind === 'string' && cursor > token.start && (cursor < token.end || cursor === token.end && !token.closed)))) return empty;
    const word = tokens.find(token => ['identifier', 'keyword'].includes(token.kind) && cursor >= token.start && cursor <= token.end);
    const from = word ? word.start : cursor, to = word ? word.end : cursor;
    const partial = query.slice(from, cursor).toLowerCase();
    const before = tokens.filter(token => token.end <= from && !['space', 'comment'].includes(token.kind));
    // A datetime literal is one value, not a place to insert a column name.
    const literalStart = before.findLastIndex((token, i) => token.text === '(' && before[i - 1]?.text === 'datetime');
    if (literalStart >= 0 && !before.slice(literalStart + 1).some(token => token.text === ')')) return empty;
    const pipe = before.findLastIndex(token => token.text === '|' && token.kind === 'operator');
    const item = (label, kind, detail = '') => ({ label, insertText: label, kind, detail });
    let choices = [];
    if (pipe < 0) {
      if (!before.length) choices = Object.entries(tables).map(([name, table]) => item(name, 'table', `${table.rows.length} rows · ${table.artifactId}`));
    } else {
      const stage = before.slice(pipe + 1).map(token => token.text);
      let visible;
      try { visible = engine.execute(query.slice(0, before[pipe].start).trim() + '\n| take 0', tables); }
      catch (_) { return { ...empty, from, to }; }
      const columnChoices = () => visible.columns.map(name => item(name, 'column', visible.types[name]));
      const last = stage.at(-1);
      if (!stage.length) choices = OPERATORS.map(name => item(name, 'operator'));
      else if (stage[0] === 'where') {
        if (stage.length === 1 || ['and', 'or', '('].includes(last)) choices = columnChoices();
        else if (visible.columns.includes(last)) {
          const operators = visible.types[last] === 'string' ? ['==', '!=', 'contains', 'contains_cs', 'has', 'has_cs'] : ['==', '!=', '>', '>=', '<', '<='];
          choices = operators.map(name => item(name, 'operator'));
        } else if (['==', '!=', '>', '>=', '<', '<='].includes(last)) choices = visible.types[stage.at(-2)] === 'datetime' ? [item('datetime()', 'literal', 'ISO date or timestamp')] : [];
        else if (!['contains', 'contains_cs', 'has', 'has_cs'].includes(last)) choices = ['and', 'or'].map(name => item(name, 'operator'));
      } else if (['project', 'distinct'].includes(stage[0])) {
        if (stage.length === 1 || last === ',') choices = columnChoices().filter(choice => !stage.slice(1).includes(choice.label));
      } else if (['sort', 'order'].includes(stage[0])) {
        if (stage.length === 1) choices = [item('by', 'keyword')];
        else if (stage[1] === 'by' && (stage.length === 2 || last === ',')) choices = columnChoices();
        else if (stage[1] === 'by' && visible.columns.includes(last)) choices = ['asc', 'desc'].map(name => item(name, 'keyword'));
      } else if (stage[0] === 'summarize') {
        if (stage.length === 1 || last === '=') choices = [item('count()', 'function', 'Count rows')];
        else if (!stage.includes('by') && last === ')') choices = [item('by', 'keyword')];
        else if (stage.includes('by') && (last === 'by' || last === ',')) choices = columnChoices();
      }
    }
    return { from, to, items: choices.filter(choice => choice.label.toLowerCase().startsWith(partial)).slice(0, 40) };
  }

  // Resolve only explicit preserved-document references in the active case.
  // Projecting away a version offers a choice; it does not assert a row's version.
  function documentLinks(result, row, columnIndex, caseData = {}) {
    const column = result?.columns?.[columnIndex], value = row?.[columnIndex];
    const fileField = column === 'file_sha256' ? 'fileSha256' : column === 'file_id' ? 'fileId' : null;
    if ((!fileField && !['document_id', 'source_document', 'reference_id'].includes(column)) || typeof value !== 'string') return { references: [], needsVersionChoice: false };
    const available = new Set((caseData.artifacts || []).filter(a => {
      const declared = caseData.discoveryChannels?.[a.id];
      return Array.isArray(declared) ? declared.includes('data') : (caseData.artifactVisibility?.[a.id] || a.visibility) !== 'public';
    }).map(a => a.id));
    let references = (Array.isArray(caseData.documentReferences) ? caseData.documentReferences : []).filter(item => item && typeof item.documentId === 'string' && item[fileField || 'documentId'] === value && typeof item.artifactId === 'string' && available.has(item.artifactId));
    if (fileField) references = references.filter(item => [['file_id', 'fileId'], ['file_sha256', 'fileSha256']].every(([field, key]) => {
      const index = result.columns.indexOf(field);
      return index < 0 || item[key] == null || row[index] === item[key];
    }));
    const versionColumns = column === 'source_document' ? ['source_version'] : ['version', 'version_to', 'version_from'];
    const versions = versionColumns.filter(name => result.columns.includes(name)).map(name => ({ name, value: row[result.columns.indexOf(name)] })).filter(item => item.value !== null && item.value !== undefined && item.value !== '');
    if (!fileField && versions.length) references = references.filter(item => item.version != null && versions.some(version => String(version.value) === String(item.version)));
    const seen = new Set();
    references = references.filter(item => { const key = item.artifactId + ':' + String(item.version ?? ''); if (seen.has(key)) return false; seen.add(key); return true; }).map(item => ({ documentId: item.documentId, artifactId: item.artifactId, version: item.version, label: typeof item.label === 'string' ? item.label : item.artifactId }));
    return { references, needsVersionChoice: !fileField && !versions.length && references.some(item => item.version != null), versionFields: versions.map(item => item.name) };
  }

  function mount(container, options = {}) {
    if (!container || typeof container.replaceChildren !== 'function') throw new Error('The query editor needs a DOM container.');
    const document = container.ownerDocument || globalThis.document;
    const id = 'cpqe-' + (++instanceCount); const cleanup = []; let destroyed = false, composing = false, completion = null, selected = 0, currentResult = null, restoredRun = null;
    const on = (el, type, listener) => { el.addEventListener(type, listener); cleanup.push(() => el.removeEventListener(type, listener)); };
    function el(tag, attrs = {}, children = []) {
      const node = document.createElement(tag);
      for (const [key, value] of Object.entries(attrs)) if (value != null) {
        if (key === 'text') node.textContent = String(value); else node.setAttribute(key, String(value));
      }
      for (const child of Array.isArray(children) ? children : [children]) if (child != null) node.append(typeof child === 'string' ? document.createTextNode(child) : child);
      return node;
    }
    const button = (label, action, attrs = {}) => { const b = el('button', { type: 'button', text: label, ...attrs }); on(b, 'click', action); return b; };
    let tables = {}, schemaError = '';
    try { if (!engine) throw new Error('The local query engine is unavailable.'); tables = engine.getTables(options.caseData); }
    catch (error) { schemaError = error.message; }
    const root = el('section', { class: 'cpqe' + (options.compact ? ' cpqe-compact' : ''), 'aria-label': 'Query editor and results' });
    const rail = el('aside', { class: 'cpqe-schema', 'aria-label': 'Available tables and columns' });
    const work = el('div', { class: 'cpqe-work' });
    const status = el('span', { class: 'cpqe-status', role: 'status', 'aria-live': 'polite', text: 'Ready' });
    const help = el('p', { id: id + '-help', class: 'cpqe-shortcuts', text: 'Ctrl/Cmd+Enter: run · Enter: new line · Ctrl+Space: suggest · ↑/↓: choose · Tab: insert suggestion · Esc: close' });
    const label = el('label', { for: id + '-input', class: 'cpqe-editor-label', text: 'KQL query' });
    const input = el('textarea', { id: id + '-input', class: 'cpqe-input', spellcheck: 'false', autocomplete: 'off', autocapitalize: 'off', wrap: 'off', maxlength: '12000', rows: '9', role: 'combobox', 'aria-autocomplete': 'list', 'aria-haspopup': 'listbox', 'aria-controls': id + '-suggestions', 'aria-expanded': 'false', 'aria-describedby': id + '-help' });
    input.value = typeof options.initialQuery === 'string' ? options.initialQuery : '';
    const overlay = el('pre', { class: 'cpqe-highlight', 'aria-hidden': 'true' });
    const lineNumbers = el('pre', { class: 'cpqe-lines', 'aria-hidden': 'true' });
    const list = el('div', { id: id + '-suggestions', class: 'cpqe-suggestions', role: 'listbox', 'aria-label': 'Query suggestions', hidden: '' });
    const surface = el('div', { class: 'cpqe-surface' }, [lineNumbers, overlay, input, list]);
    const results = el('section', { class: 'cpqe-results', 'aria-label': 'Query results' });
    const runButton = button('▶ Run query', run, { class: 'cpqe-run', title: 'Run current query (Ctrl/Cmd+Enter)' });
    if (schemaError) runButton.disabled = true;
    work.append(el('div', { class: 'cpqe-toolbar' }, [label, runButton, status]), surface, help, results);
    root.append(rail, work); container.replaceChildren(root);

    function closeSuggestions() { completion = null; list.replaceChildren(); list.hidden = true; list.setAttribute('hidden', ''); input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant'); }
    function paint() {
      overlay.replaceChildren(...highlight(input.value, tables).map(token => el('span', { class: 'cpqe-token-' + token.kind, text: token.text })), document.createTextNode('\n'));
      lineNumbers.textContent = Array.from({ length: input.value.split('\n').length }, (_, i) => i + 1).join('\n'); syncScroll();
    }
    function syncScroll() { overlay.scrollTop = input.scrollTop; overlay.scrollLeft = input.scrollLeft; lineNumbers.scrollTop = input.scrollTop; }
    function clearResults(message) { currentResult = null; restoredRun = null; results.replaceChildren(el('p', { class: 'cpqe-results-empty', text: message || 'Run a query to inspect the supplied records.' })); }
    function notifyDraft() {
      if (destroyed) return;
      const hadResults = currentResult !== null; paint(); clearResults(hadResults ? 'Query changed. Run again to refresh the results.' : undefined); status.textContent = 'Draft changed';
      if (typeof options.onDraftChange === 'function') options.onDraftChange(input.value);
    }
    function drawSuggestions() {
      // Keep the list inside the editor so a short player panel cannot clip it.
      const height = surface.clientHeight || 240;
      const line = input.value.slice(0, input.selectionStart).split('\n').length;
      const caretTop = Math.max(15, Math.min(height - 30, 15 + (line - 1) * 21 - input.scrollTop));
      const below = height - caretTop - 31;
      const menuHeight = Math.min(180, below >= 90 ? below : Math.max(60, caretTop - 8));
      const menuTop = below >= 90 ? caretTop + 23 : Math.max(8, caretTop - menuHeight);
      list.setAttribute('style', `top:${menuTop}px;max-height:${menuHeight}px`);
      list.replaceChildren(...completion.items.map((item, index) => {
        const option = el('div', { id: id + '-option-' + index, class: 'cpqe-option', role: 'option', 'aria-selected': index === selected ? 'true' : 'false' }, [el('span', { class: 'cpqe-option-kind', text: item.kind }), el('strong', { text: item.label }), el('small', { text: item.detail })]);
        on(option, 'mousedown', event => { event.preventDefault(); selected = index; acceptSuggestion(); });
        return option;
      }));
      list.hidden = false; list.removeAttribute('hidden'); input.setAttribute('aria-expanded', 'true'); input.setAttribute('aria-activedescendant', id + '-option-' + selected);
      list.children[selected]?.scrollIntoView?.({ block: 'nearest' });
    }
    function refreshSuggestions() {
      if (destroyed || composing || input.selectionStart !== input.selectionEnd) { closeSuggestions(); return; }
      completion = suggest(input.value, input.selectionStart, tables); selected = 0;
      if (!completion.items.length) closeSuggestions(); else drawSuggestions();
    }
    function acceptSuggestion() {
      if (!completion?.items.length) return;
      const { from, to } = completion; const value = completion.items[selected].insertText;
      input.value = input.value.slice(0, from) + value + input.value.slice(to);
      input.setSelectionRange(from + value.length, from + value.length); closeSuggestions(); notifyDraft(); input.focus();
    }
    function insert(value) {
      if (destroyed) return;
      const start = input.selectionStart ?? input.value.length, end = input.selectionEnd ?? start;
      input.value = input.value.slice(0, start) + value + input.value.slice(end); input.setSelectionRange(start + value.length, start + value.length); closeSuggestions(); notifyDraft(); input.focus();
    }
    function sourceButton(artifactId) { return button('Source: ' + artifactId, () => { if (typeof options.onSource === 'function') options.onSource(artifactId); }, { class: 'cpqe-source', disabled: typeof options.onSource === 'function' ? null : '' }); }
    function resultCell(result, row, index) {
      const cell = el('td', {}, el('span', { text: row[index] }));
      const resolution = documentLinks(result, row, index, options.caseData);
      const open = typeof options.onDocument === 'function' ? options.onDocument : options.onSource;
      if (!resolution.references.length || typeof open !== 'function') return cell;
      const links = resolution.references.map(item => button((item.version != null ? 'Version ' + item.version + ' · ' : '') + item.label, () => open(item.artifactId), { class: 'cpqe-source cpqe-document-link', 'aria-label': 'Open provided document ' + item.documentId + (item.version != null ? ', version ' + item.version : '') + ': ' + item.label }));
      if (resolution.needsVersionChoice) cell.append(el('details', { class: 'cpqe-document-choices' }, [el('summary', { text: 'Available preserved versions' }), el('small', { text: 'This result omits the version. Choose a preserved document to inspect.' }), ...links]));
      else cell.append(el('div', { class: 'cpqe-document-links' }, links));
      return cell;
    }
    function renderResult(result) {
      const cap = 200; const rows = result.rows.slice(0, cap);
      const table = el('table', {}, [el('caption', { class: 'cpqe-sr-only', text: 'Results for ' + result.tableName }), el('thead', {}, [el('tr', {}, result.columns.map(column => el('th', { scope: 'col' }, [el('span', { text: column }), el('small', { text: result.types[column] })])))]), el('tbody', {}, rows.map(row => el('tr', {}, row.map((_value, index) => resultCell(result, row, index)))))]);
      results.replaceChildren(el('div', { class: 'cpqe-result-heading' }, [el('h3', { text: 'Results' }), el('span', { text: result.tableName + ' · ' + result.rows.length + (result.rows.length === 1 ? ' row' : ' rows') }), sourceButton(result.sourceArtifactId)]), el('div', { class: 'cpqe-result-scroll', tabindex: '0', 'aria-label': 'Scrollable query results' }, [table]));
      if (!rows.length) results.append(el('p', { class: 'cpqe-results-empty', text: 'No rows match the current query.' }));
      if (result.rows.length > cap) results.append(el('p', { class: 'cpqe-results-empty', text: `Showing the first ${cap} of ${result.rows.length} rows. Narrow the query to inspect more precisely.` }));
    }
    function run() {
      if (destroyed || schemaError) return;
      closeSuggestions(); const query = input.value; clearResults();
      let result;
      try { result = engine.execute(query, tables); }
      catch (error) { status.textContent = 'Query needs attention'; results.replaceChildren(el('p', { class: 'cpqe-error', role: 'alert', text: error.message })); return; }
      if (destroyed || input.value !== query) return;
      currentResult = result; renderResult(result); status.textContent = 'Run complete';
      const receipt = rememberRun({ query, result, ranAt: new Date().toISOString() }, tables);
      if (typeof options.onRun === 'function') options.onRun(receipt);
    }
    function renderSchema(filter = '') {
      const listNode = rail.querySelector('.cpqe-table-list'); if (!listNode) return;
      listNode.replaceChildren(); const needle = filter.toLowerCase();
      for (const [name, table] of Object.entries(tables)) {
        if (needle && ![name, ...table.columns].some(value => value.toLowerCase().includes(needle))) continue;
        const details = el('details', { class: 'cpqe-table' }, [el('summary', {}, [el('span', { text: name }), el('small', { text: String(table.rows.length) })])]);
        details.append(el('div', { class: 'cpqe-table-actions' }, [button('Insert table', () => insert(name)), sourceButton(table.artifactId)]));
        const columns = el('ul', { class: 'cpqe-columns' });
        for (const column of table.columns) columns.append(el('li', {}, button(column, () => insert(column), { title: `Insert ${column} (${table.types[column]})`, 'aria-label': `Insert column ${column}, type ${table.types[column]}` })), el('li', { class: 'cpqe-column-type', text: table.types[column] }));
        details.append(columns); listNode.append(details);
      }
      if (!listNode.childNodes.length) listNode.append(el('p', { class: 'cpqe-results-empty', text: 'No matching tables or columns.' }));
    }
    const schemaFilter = el('input', { type: 'search', placeholder: 'Find a table or column', 'aria-label': 'Filter table schemas', class: 'cpqe-schema-filter' });
    rail.append(el('h3', { text: 'Case tables' }), el('p', { class: 'cpqe-schema-note', text: 'Supplied case records · local query subset' }), schemaFilter, el('div', { class: 'cpqe-table-list' }));
    on(schemaFilter, 'input', () => renderSchema(schemaFilter.value));
    on(input, 'input', event => { notifyDraft(); if (event.inputType === 'insertLineBreak') closeSuggestions(); else refreshSuggestions(); }); on(input, 'scroll', syncScroll);
    on(input, 'compositionstart', () => { composing = true; closeSuggestions(); }); on(input, 'compositionend', () => { composing = false; refreshSuggestions(); });
    on(input, 'click', refreshSuggestions);
    on(input, 'keyup', event => { if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) refreshSuggestions(); });
    on(input, 'blur', closeSuggestions);
    on(input, 'keydown', event => {
      if (event.isComposing || composing) return;
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') { event.preventDefault(); run(); return; }
      // Enter keeps the textarea's native newline behavior even when a
      // suggestion is selected. Tab is the explicit completion shortcut.
      if (event.key === 'Enter' || (event.key === 'Tab' && event.shiftKey)) { closeSuggestions(); return; }
      if (event.ctrlKey && (event.code === 'Space' || event.key === ' ')) { event.preventDefault(); refreshSuggestions(); return; }
      if (event.key === 'Escape' && completion) { event.preventDefault(); closeSuggestions(); return; }
      if (!completion?.items.length) return;
      if (['ArrowDown', 'ArrowUp'].includes(event.key)) { event.preventDefault(); selected = (selected + (event.key === 'ArrowDown' ? 1 : -1) + completion.items.length) % completion.items.length; drawSuggestions(); }
      else if (event.key === 'Tab' && !event.ctrlKey && !event.metaKey && !event.altKey) { event.preventDefault(); acceptSuggestion(); }
    });
    renderSchema(); paint(); clearResults();
    if (schemaError) { status.textContent = 'Tables unavailable'; results.replaceChildren(el('p', { class: 'cpqe-error', role: 'alert', text: schemaError })); }
    else if ((restoredRun = restoreRun(options.initialRun, input.value, tables))) {
      currentResult = restoredRun.result; renderResult(currentResult); status.textContent = 'Previous query result restored';
    }
    return Object.freeze({
      getValue: () => input.value,
      // Restoration never calls onRun or changes the original receipt timestamp.
      getRestoredRun: () => restoredRun,
      setValue(value) { if (destroyed) return; value = String(value ?? ''); if (input.value === value) return; input.value = value; input.setSelectionRange(value.length, value.length); closeSuggestions(); notifyDraft(); },
      focus() { if (!destroyed) input.focus(); },
      destroy() { if (destroyed) return; destroyed = true; restoredRun = null; cleanup.splice(0).forEach(fn => fn()); container.replaceChildren(); }
    });
  }

  return Object.freeze({ mount, suggest, highlight, documentLinks });
});
