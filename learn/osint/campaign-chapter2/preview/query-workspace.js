'use strict';

// The query engine reads only the supplied fictional case tables.
// This view never loads instructor answers or sends a query to a service.
(() => {
  function el(tag, attrs = {}, children = []) {
    const item = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
      if (value === undefined || value === null || value === false) continue;
      if (key === 'text') item.textContent = String(value);
      else if (key.startsWith('on')) item.addEventListener(key.slice(2), value);
      else if (key === 'disabled') item.disabled = Boolean(value);
      else item.setAttribute(key, String(value));
    }
    for (const child of Array.isArray(children) ? children : [children]) if (child != null) item.append(child instanceof Node ? child : document.createTextNode(String(child)));
    return item;
  }
  const p = (text, cls = '') => el('p', { text, class: cls });
  const link = (text, href, cls = '') => el('a', { text, href, class: cls });
  const action = (text, onclick, cls = '') => el('button', { type: 'button', text, onclick, class: cls });
  const field = (text, input) => el('label', { class: 'field' }, [el('span', { class: 'field-title', text }), input]);

  function mount(container, context) {
    const engine = window.CampaignQuery;
    if (!engine) { container.append(p('The query tool could not be loaded. You can still inspect every source in the evidence library.', 'notice'), link('Open the evidence library', '#/compass')); return; }
    const tables = engine.getTables(context.caseData);
    const tableNames = Object.keys(tables);
    const lessons = context.lessons || [];
    const lesson = lessons.find(item => item.questionId === context.question.id);
    const initialTable = lesson?.tableName && tables[lesson.tableName] ? lesson.tableName : tableNames[0];
    let draft = context.note.query || lesson?.starterQuery || `${initialTable}\n| take 5`;
    let previousDraft = null;
    let lastRun = null;
    let runSequence = 0;
    const totalRows = tableNames.reduce((sum, name) => sum + tables[name].rows.length, 0);

    container.append(el('header', { class: 'page-heading query-heading' }, [
      el('span', { class: 'eyebrow', text: 'Year 2 / query workspace' }),
      el('h1', { text: 'Ask the records a question.' }),
      p(`Practise a supported set of KQL operators on ${tableNames.length} supplied tables (${totalRows} rows). These are bounded case extracts. A result tells you what these records show; it does not identify a person by itself.`)
    ]));
    const questionPicker = el('select', { 'aria-label': 'Investigation question' });
    for (const question of context.questions) questionPicker.append(el('option', { value: question.id, text: `${question.id} · ${lessons.find(item => item.questionId === question.id)?.title || 'Interpret and report'}` }));
    questionPicker.value = context.question.id;
    questionPicker.addEventListener('change', () => { location.hash = '#/query/' + encodeURIComponent(questionPicker.value); });
    container.append(el('div', { class: 'query-context' }, [field('Investigation question', questionPicker), el('div', {}, [p(context.question.prompt, 'query-question'), link('Return to this question →', '#/guide/year2/' + encodeURIComponent(context.question.id))])]));

    const tablePicker = el('select', { 'aria-label': 'Inspect a table schema' });
    tableNames.forEach(name => tablePicker.append(el('option', { value: name, text: name })));
    tablePicker.value = initialTable;
    const schemaBox = el('div');
    const lessonBox = el('section', { class: 'query-lesson' });
    if (lesson) {
      lessonBox.append(el('h2', { text: lesson.title }), p(lesson.objective));
      if (lesson.steps?.length) lessonBox.append(el('ol', {}, lesson.steps.map(step => el('li', { text: step }))));
      if (lesson.hints?.length) lessonBox.append(el('details', {}, [el('summary', { text: 'Query hints' }), el('ul', {}, lesson.hints.map(hint => el('li', { text: hint })))]));
    } else lessonBox.append(el('h2', { text: 'Use queries when they help.' }), p('This question asks you to interpret or report. You may inspect relevant tables, but a successful query is not a substitute for explaining the evidence.'));
    const sidebar = el('aside', { class: 'query-sidebar', 'aria-label': 'Table schema and query lesson' }, [field('Inspect a table schema', tablePicker), schemaBox, lessonBox]);

    const editor = el('textarea', { class: 'query-editor', rows: 9, maxlength: '12000', spellcheck: 'false', autocapitalize: 'off', autocomplete: 'off', 'aria-describedby': 'query-editor-help', text: draft });
    const editorHelp = p('Start with a table name. Add one operator after each |. Table and column names are case-sensitive. Ctrl+Enter runs the query.', 'helper');
    editorHelp.id = 'query-editor-help';
    const feedback = el('p', { class: 'feedback', role: 'status', 'aria-live': 'polite' });
    const results = el('section', { class: 'query-results', 'aria-label': 'Query results' }, p('Run a query to see the records it returns.', 'query-empty'));
    const saved = el('p', { class: 'feedback', role: 'status', 'aria-live': 'polite' });
    const saveRun = action('Save query to working notes', () => {
      if (!lastRun || lastRun.query !== editor.value) return;
      const outcome = context.onSaveRun(lastRun);
      saved.className = 'feedback' + (outcome.ok ? '' : ' error');
      saved.textContent = outcome.message;
    }, 'button-small');
    saveRun.disabled = true;
    const undo = action('Undo query replacement', () => {
      if (previousDraft === null) return;
      const restore = previousDraft; previousDraft = null;
      editor.value = restore; draft = restore; context.onDraftChange(draft); invalidate(); undo.hidden = true; editor.focus();
    }, 'button-small');
    undo.hidden = true;
    function invalidate() {
      saveRun.disabled = true; saved.textContent = '';
      if (lastRun) {
        feedback.textContent = 'Query changed. Run it again before saving a result.';
        results.replaceChildren(p('The query has changed. Run it again to display current results.', 'query-empty'));
      }
      feedback.className = 'feedback';
    }
    function replaceDraft(value) {
      previousDraft = editor.value; undo.hidden = false;
      editor.value = value; draft = value; context.onDraftChange(draft); invalidate(); editor.focus();
    }
    editor.addEventListener('input', () => { draft = editor.value; context.onDraftChange(draft); invalidate(); });
    editor.addEventListener('keydown', event => { if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') { event.preventDefault(); run(); } });
    function renderSchema() {
      const name = tablePicker.value; const table = tables[name];
      schemaBox.replaceChildren(el('div', { class: 'query-source' }, [el('strong', { text: name }), p(`${table.rows.length} supplied rows.`, 'helper'), link(`Source: ${table.artifactId}`, '#/evidence/' + encodeURIComponent(table.artifactId))]), el('dl', { class: 'query-columns' }, table.columns.flatMap(column => [el('dt', { text: column }), el('dd', { text: table.types[column] })])), action('Start query for this table', () => replaceDraft(`${name}\n| take 5`), 'button-small'), p('This button replaces the editor. You can undo the replacement.', 'helper'));
    }
    tablePicker.addEventListener('change', renderSchema); renderSchema();

    function run() {
      saved.textContent = ''; feedback.className = 'feedback';
      const query = editor.value;
      context.onDraftChange(query);
      try {
        const result = engine.execute(query, tables);
        runSequence++;
        lastRun = { query, result, ranAt: new Date().toISOString(), runSequence, caseRevision: context.caseData.contentRevision || 'chapter-1-2026-10-06' };
        const table = el('table', { class: 'data-table query-data' }, [el('caption', { class: 'sr-only', text: 'Results from the last successful query' }), el('thead', {}, el('tr', {}, result.columns.map(name => el('th', { scope: 'col', text: name })))), el('tbody', {}, result.rows.map(row => el('tr', {}, row.map(value => el('td', { text: value ?? '' }))))) ]);
        results.replaceChildren(el('div', { class: 'query-result-heading' }, [el('h2', { text: `${result.rows.length} ${result.rows.length === 1 ? 'row' : 'rows'} returned` }), link('Read the source context →', '#/evidence/' + encodeURIComponent(result.sourceArtifactId))]), p(`Table: ${result.tableName} · Source: ${result.sourceArtifactId} · All ${result.rows.length} returned rows are shown.`, 'helper'), el('details', { class: 'query-run-details' }, [el('summary', { text: 'Query used for these results' }), el('pre', { text: query })]));
        if (result.rows.length) results.append(el('div', { class: 'table-wrap', tabindex: '0', 'aria-label': 'Scrollable query results' }, table));
        else results.append(p('No matching rows in this extract. Check your spelling and filters, then consider the source coverage. A missing result is not proof that an event never happened.', 'query-empty'));
        feedback.textContent = 'Query completed. Explain what the result supports before drawing a conclusion.';
        saveRun.disabled = false;
      } catch (error) {
        lastRun = null; saveRun.disabled = true;
        feedback.className = 'feedback error'; feedback.textContent = error.message || 'The query could not run.';
        results.replaceChildren(p('No results from this query. Fix the query and run it again.', 'query-empty'));
      }
    }

    const controls = [action('Run query', run, 'button-primary')];
    if (lesson) controls.push(action('Use lesson starter', () => replaceDraft(lesson.starterQuery), 'button-small'));
    controls.push(undo);
    const editorPanel = el('section', { class: 'query-editor-panel' }, [field('KQL query', editor), editorHelp, el('div', { class: 'query-actions' }, controls), feedback]);
    const workspace = el('div', { class: 'query-layout' }, [sidebar, el('div', { class: 'query-main' }, [editorPanel, results, el('div', { class: 'query-save' }, [saveRun, saved, p('Saves the exact query, run time, row count, source and available record IDs. Results do not mark a question correct.', 'helper')])])]);
    container.append(workspace);
    const examples = [
      ['Preview a table', 'PublishingEvents\n| take 5'],
      ['Filter and choose columns', 'PublishingEvents\n| where action == "Publish"\n| project event_id, timestamp, action'],
      ['Put records in time order', 'PublishingEvents\n| order by timestamp asc'],
      ['Count distinct values', 'PublishingEvents\n| distinct actor_account_id\n| count'],
      ['Count each action', 'PublishingEvents\n| summarize count() by action']
    ];
    container.append(el('details', { class: 'query-reference' }, [el('summary', { text: 'Supported KQL and examples' }), p('This local practice tool implements a limited KQL subset. It is not the full Azure Data Explorer or KC7 service. Unsupported syntax produces an error.'), el('ul', {}, [el('li', { text: 'where: ==, !=, numeric/date comparisons, contains / contains_cs, has / has_cs, and / or and parentheses.' }), el('li', { text: 'project, take / limit, sort / order by, count, distinct, summarize count() with optional by columns.' }), el('li', { text: 'Use datetime(2026-10-23T00:00:00Z) for a UTC date literal. Version columns use numbers. Text values use quotes.' }), el('li', { text: 'No joins, let, union, arbitrary functions, nulls or decimal numbers. Use has for one alphanumeric term and contains for phrases. Up to 12,000 characters and 25 operators.' })]), el('div', { class: 'query-examples' }, examples.map(([title, query]) => el('article', {}, [el('h3', { text: title }), el('pre', { text: query }), action('Use example: ' + title, () => replaceDraft(query), 'button-small')]))), p('Each example replaces the editor; use Undo query replacement to recover the previous draft.', 'helper'), el('p', {}, [link('Microsoft Learn: KQL tutorial', 'https://learn.microsoft.com/en-us/kusto/query/tutorials/learn-common-operators?view=microsoft-fabric')]) ]));
  }
  window.CampaignQueryWorkspace = Object.freeze({ mount });
})();
