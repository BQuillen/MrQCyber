'use strict';

// The signed-in admin controller supplies the client. This module never creates
// a session or stores student work in browser storage.
(function (root) {
  function create({ root: container, client, user, activity, assignmentId, onAuthError }) {
    const model = root.CampaignTeacherModel;
    let visible = false, disposed = false, epoch = 0, timer, loading = false, mutating = false;
    let students = [], groups = [], members = [], selected = null, detailTrack = null, detailRequest = 0;
    let lastRefresh = null;
    const filters = { classLabel: '', track: '', group: '', search: '', tests: false };
    const el = (tag, className, text) => {
      const node = document.createElement(tag);
      if (className) node.className = className;
      if (text !== undefined) node.textContent = String(text);
      return node;
    };
    const button = (text, action, className = 'quiet-button') => {
      const node = el('button', className, text);
      node.type = 'button'; node.addEventListener('click', action); return node;
    };
    const option = (value, label) => { const node = el('option', '', label); node.value = value; return node; };
    const textBlock = (text, className = 'td-text') => el('p', className, text || 'No saved response.');
    const active = token => visible && !disposed && token === epoch;
    const memberGroup = id => members.find(row => row.user_id === id)?.group_id || '';
    const groupName = id => groups.find(row => row.id === id)?.name || 'Ungrouped';
    const dateText = value => {
      if (!value) return 'No online save';
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? 'Save time unavailable' : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
    };
    const fail = result => { if (result.error) throw result.error; return result.data; };
    const handleError = (error, fallback) => {
      if (['PGRST301', 'PGRST303'].includes(error?.code) || error?.status === 401) onAuthError();
      else message(fallback, true);
    };

    const header = el('div', 'td-header');
    const intro = el('div');
    const back = el('a', 'td-back', '← Resources'); back.href = '#/';
    intro.append(back, el('p', 'eyebrow', 'THE CAMPAIGN POST'), el('h1', '', 'Student progress'), el('p', 'td-subtitle', 'A view of each login’s saved work, with groups organized for you.'));
    const refreshButton = button('Refresh progress', () => refresh(true), 'primary-button');
    const refreshInfo = el('p', 'td-refresh-info');
    const headerActions = el('div', 'td-header-actions'); headerActions.append(refreshButton, refreshInfo);
    header.append(intro, headerActions);
    const notice = el('div', 'td-notice'); notice.setAttribute('role', 'status'); notice.setAttribute('aria-live', 'polite');
    const dashboardBody = el('div');
    const detailBody = el('section', 'td-detail'); detailBody.hidden = true;
    container.replaceChildren(header, notice, dashboardBody, detailBody);
    function message(text = '', error = false) { notice.textContent = text; notice.classList.toggle('error', error); }

    const summary = el('div', 'td-summary');
    const controls = el('div', 'td-filters');
    const fields = {};
    function selectFilter(key, label) {
      const wrapper = el('label', 'td-filter', label), select = el('select');
      select.setAttribute('aria-label', label);
      select.addEventListener('change', () => { filters[key] = select.value; renderList(); });
      fields[key] = select; wrapper.append(select); controls.append(wrapper); return select;
    }
    selectFilter('classLabel', 'Class'); selectFilter('track', 'Investigation'); selectFilter('group', 'Group');
    const searchLabel = el('label', 'td-filter td-search', 'Find a login');
    const search = el('input'); search.type = 'search'; search.placeholder = 'e.g. a-am-y1-03'; search.setAttribute('aria-label', 'Find a login');
    search.addEventListener('input', () => { filters.search = search.value; renderList(); }); searchLabel.append(search); controls.append(searchLabel);
    const testLabel = el('label', 'td-check');
    const testToggle = el('input'); testToggle.type = 'checkbox';
    testToggle.addEventListener('change', () => { filters.tests = testToggle.checked; renderList(); });
    testLabel.append(testToggle, document.createTextNode('Include test logins')); controls.append(testLabel);
    const groupArea = el('details', 'td-groups');
    groupArea.append(el('summary', '', 'Your teaching groups'));
    const groupIntro = el('p', 'td-note', 'Groups are private to your instructor view. Add students from either year; each login keeps its own work.');
    const groupForm = el('form', 'td-group-form');
    const groupLabel = el('label', '', 'New group name');
    const groupInput = el('input'); groupInput.required = true; groupInput.maxLength = 64; groupInput.placeholder = 'e.g. Table 1'; groupInput.setAttribute('aria-label', 'New group name'); groupLabel.append(groupInput);
    const createGroupButton = el('button', 'quiet-button', 'Create group'); createGroupButton.type = 'submit';
    groupForm.append(groupLabel, createGroupButton);
    groupForm.addEventListener('submit', event => { event.preventDefault(); createGroup(groupInput.value); });
    const groupList = el('div', 'td-group-list'); groupArea.append(groupIntro, groupForm, groupList);
    const listInfo = el('p', 'td-list-info'); listInfo.setAttribute('aria-live', 'polite');
    const list = el('div', 'td-table-wrap');
    const explanation = el('p', 'td-note', 'Progress follows the student’s next required question. Written responses are saved for teacher review; completion and practice points do not grade their quality. Times show the last confirmed online save, not whether someone is online; unsynced browser work will not appear here.');
    dashboardBody.append(summary, controls, groupArea, listInfo, list, explanation);

    function setOptions(select, entries, chosen) {
      select.replaceChildren(...entries.map(([value, label]) => option(value, label)));
      select.value = entries.some(([value]) => value === chosen) ? chosen : '';
    }
    function renderFilters() {
      setOptions(fields.classLabel, [['', 'All classes'], ...[...new Set(students.map(s => s.classLabel))].sort().map(name => [name, name])], filters.classLabel);
      setOptions(fields.track, [['', 'Both years'], ...activity.tracks.map(track => [track.id, track.id === 'year1' ? 'Year 1' : 'Year 2'])], filters.track);
      setOptions(fields.group, [['', 'All groups'], ['none', 'Ungrouped'], ...groups.map(group => [group.id, group.name])], filters.group);
      filters.group = fields.group.value;
    }
    function filteredStudents() {
      const term = filters.search.trim().toLowerCase();
      return students.filter(student =>
        (filters.tests || !student.isTest) && (!filters.classLabel || student.classLabel === filters.classLabel) &&
        (!filters.track || student.trackId === filters.track) &&
        (!filters.group || (filters.group === 'none' ? !memberGroup(student.userId) : memberGroup(student.userId) === filters.group)) &&
        (!term || `${student.username} ${student.classLabel}`.toLowerCase().includes(term))
      );
    }
    function stat(value, label) { const box = el('div', 'td-stat'); box.append(el('strong', '', value), el('span', '', label)); return box; }
    function progressBar(track) {
      const meter = el('progress'); meter.max = track.total; meter.value = track.completed;
      meter.setAttribute('aria-label', `${track.completed} of ${track.total} questions complete`); return meter;
    }
    function groupSelect(student) {
      const select = el('select', 'td-group-select');
      select.setAttribute('aria-label', `Group for ${student.username}`);
      setOptions(select, [['', 'Ungrouped'], ...groups.map(group => [group.id, group.name])], memberGroup(student.userId));
      select.disabled = mutating;
      select.addEventListener('change', () => assignGroup(student, select.value, select)); return select;
    }
    function renderList() {
      const rows = filteredStudents();
      summary.replaceChildren(
        stat(rows.length, 'Logins in this view'),
        stat(rows.filter(s => s.hasProgress).length, 'With an online save'),
        stat(rows.filter(s => s.saveStatus === 'saved' && s.track.completed === s.track.total).length, 'Investigation complete'),
        stat(rows.filter(s => memberGroup(s.userId)).length, 'Assigned to a group')
      );
      listInfo.textContent = `${rows.length} of ${students.filter(s => filters.tests || !s.isTest).length} logins shown`;
      if (!rows.length) { list.replaceChildren(el('p', 'td-empty', students.length ? 'No logins match these filters.' : 'No logins are available for this assignment.')); return; }
      const table = el('table', 'td-table');
      const head = el('thead'), heading = el('tr');
      ['Login / class', 'Progress', 'Next required question', 'Points / hints', 'Last online save', 'Your group'].forEach(label => { const th = el('th', '', label); th.scope = 'col'; heading.append(th); });
      head.append(heading); const body = el('tbody');
      for (const student of rows) {
        const row = el('tr'), identity = el('td');
        identity.append(button(student.username, () => openStudent(student), 'td-login-link'), el('small', '', student.classLabel));
        if (student.isTest) identity.append(el('span', 'td-badge', 'Test login'));
        if (!student.enabled) identity.append(el('span', 'td-badge warning', 'Disabled'));
        const complete = el('td');
        if (student.saveStatus === 'invalid') complete.append(el('span', 'td-badge warning', 'Save needs review'));
        else { complete.append(el('strong', '', `${student.track.completed} / ${student.track.total}`), progressBar(student.track)); }
        if (student.track.retainedChecked) complete.append(el('small', '', `${student.track.retainedChecked} later checked response${student.track.retainedChecked === 1 ? '' : 's'} retained`));
        const next = el('td', 'td-next');
        if (student.saveStatus === 'invalid') next.append(textBlock('Open saved work for details.'));
        else if (student.track.nextQuestionId) next.append(el('strong', '', student.track.nextQuestionId), el('small', '', student.track.nextQuestionTitle));
        else next.append(el('span', 'td-badge complete', 'Complete'));
        const score = el('td'); score.append(el('strong', '', `${student.track.score} / ${student.track.maxScore}`), el('small', '', `${student.track.hintsUsed} hints used`));
        const saved = el('td', 'td-saved'); saved.append(el('span', '', dateText(student.updatedAt)));
        if (!student.hasProgress) saved.append(el('small', '', 'No synced work yet'));
        const group = el('td'); group.append(groupSelect(student));
        row.append(identity, complete, next, score, saved, group); body.append(row);
      }
      table.append(head, body); list.replaceChildren(table);
    }
    function renderGroups() {
      groupList.replaceChildren();
      if (!groups.length) { groupList.append(el('p', 'td-note', 'Create a group, then use each login’s group menu to add members.')); return; }
      for (const group of groups) {
        const card = el('article', 'td-group-card');
        const roster = students.filter(student => memberGroup(student.userId) === group.id);
        const total = roster.reduce((n, student) => n + student.track.total, 0);
        const completed = roster.reduce((n, student) => n + student.track.completed, 0);
        const title = el('h3', '', group.name);
        card.append(title, el('p', 'td-note', `${roster.length} login${roster.length === 1 ? '' : 's'} · ${completed} / ${total} questions complete`));
        const names = el('ul', 'td-member-list');
        for (const student of roster) { const item = el('li'); item.append(button(student.username, () => openStudent(student), 'td-login-link'), el('span', '', student.saveStatus === 'invalid' ? 'Save needs review' : `${student.track.completed}/${student.track.total} · ${student.track.nextQuestionId || 'Complete'}`)); names.append(item); }
        if (!roster.length) names.append(el('li', 'td-note', 'No members yet.'));
        const actions = el('div', 'td-group-actions');
        const rename = button('Rename', () => {
          const form = el('form', 'td-rename'); const input = el('input'); input.value = group.name; input.required = true; input.maxLength = 64; input.setAttribute('aria-label', `New name for ${group.name}`);
          const save = el('button', 'quiet-button', 'Save'); save.type = 'submit';
          form.addEventListener('submit', event => { event.preventDefault(); renameGroup(group, input.value); });
          form.append(input, save, button('Cancel', renderGroups)); actions.replaceChildren(form); input.focus();
        });
        const remove = button('Delete group', () => {
          if (root.confirm(`Delete “${group.name}”? Its ${roster.length} login(s) will become ungrouped. Their saved work will stay unchanged.`)) deleteGroup(group);
        });
        rename.disabled = remove.disabled = mutating;
        actions.append(rename, remove); card.append(names, actions); groupList.append(card);
      }
    }
    function render() { renderFilters(); renderList(); renderGroups(); }

    function schedule() {
      clearTimeout(timer);
      if (visible && !disposed && !document.hidden) timer = setTimeout(() => refresh(false), 60000);
    }
    async function refresh(manual = false) {
      if (!visible || disposed || loading || mutating) return;
      const token = epoch; loading = true; refreshButton.disabled = true; createGroupButton.disabled = true;
      if (!lastRefresh) message('Loading student progress…');
      try {
        const results = await Promise.all([
          client.from('campaign_teacher_progress_overview').select('*').eq('assignment_id', assignmentId).order('username'),
          client.from('campaign_teacher_groups').select('id,owner_id,assignment_id,name,created_at').eq('assignment_id', assignmentId).eq('owner_id', user.id).order('name'),
          client.from('campaign_teacher_group_members').select('owner_id,assignment_id,user_id,group_id').eq('assignment_id', assignmentId).eq('owner_id', user.id)
        ]);
        if (!active(token)) return;
        const [roster, groupRows, memberRows] = results.map(fail);
        students = (roster || []).map(row => model.normalizeOverview(activity, row)); groups = groupRows || []; members = memberRows || [];
        lastRefresh = new Date(); refreshInfo.textContent = `Overview updated ${lastRefresh.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} · refreshes every minute`;
        render(); message(manual ? 'Progress refreshed from online saves.' : '');
        if (selected && manual) { const current = students.find(student => student.userId === selected.userId); if (current) await openStudent(current, detailTrack); }
      } catch (error) {
        if (active(token)) handleError(error, 'Student progress could not be loaded. Check your connection, then use Refresh progress.');
      } finally {
        if (token === epoch) { loading = false; refreshButton.disabled = false; createGroupButton.disabled = false; schedule(); }
      }
    }
    async function mutate(work, success, onSuccess) {
      if (!visible || disposed || mutating) return false;
      if (loading) { message('Progress is refreshing. Please try the group change again in a moment.'); return false; }
      const token = epoch; mutating = true; clearTimeout(timer); createGroupButton.disabled = true; refreshButton.disabled = true;
      message('Saving your group changes…');
      let done = false;
      try { const result = await work(); fail(result); if (!active(token)) return false; onSuccess?.(result.data); done = true; message(success); }
      catch (error) { if (active(token)) handleError(error, error?.code === '23505' ? 'A group with that name already exists. Choose another name.' : 'The group change could not be saved. Refresh progress before trying again.'); }
      finally { if (token === epoch) { mutating = false; createGroupButton.disabled = false; refreshButton.disabled = false; render(); schedule(); } }
      return done;
    }
    function cleanName(value) {
      const name = String(value || '').trim().replace(/\s+/g, ' ');
      if (!name || name.length > 64) { message('Use a group name between 1 and 64 characters.', true); return null; } return name;
    }
    async function createGroup(value) {
      const name = cleanName(value); if (!name) return;
      await mutate(() => client.from('campaign_teacher_groups').insert({ name, owner_id: user.id, assignment_id: assignmentId }).select('id,owner_id,assignment_id,name,created_at').single(), `Created “${name}”. Add members using the group menus below.`, row => { groups.push(row); groups.sort((a, b) => a.name.localeCompare(b.name)); groupInput.value = ''; });
    }
    async function renameGroup(group, value) {
      const name = cleanName(value); if (!name) return;
      await mutate(() => client.from('campaign_teacher_groups').update({ name }).eq('id', group.id).eq('assignment_id', assignmentId).eq('owner_id', user.id).select('id,name').single(), 'Group renamed.', row => { group.name = row.name; groups.sort((a, b) => a.name.localeCompare(b.name)); });
    }
    async function deleteGroup(group) {
      await mutate(() => client.from('campaign_teacher_groups').delete().eq('id', group.id).eq('assignment_id', assignmentId).eq('owner_id', user.id).select('id').single(), 'Group deleted. Student work is unchanged.', () => { groups = groups.filter(row => row.id !== group.id); members = members.filter(row => row.group_id !== group.id); });
    }
    async function assignGroup(student, groupId, select) {
      const old = memberGroup(student.userId); select.disabled = true;
      const done = await mutate(() => groupId
        ? client.from('campaign_teacher_group_members').upsert({ owner_id: user.id, assignment_id: assignmentId, user_id: student.userId, group_id: groupId }, { onConflict: 'owner_id,assignment_id,user_id' }).select('user_id,group_id,owner_id,assignment_id').single()
        : client.from('campaign_teacher_group_members').delete().eq('owner_id', user.id).eq('assignment_id', assignmentId).eq('user_id', student.userId).select('user_id').single(), `${student.username}: ${groupName(groupId)}.`, () => { members = members.filter(row => row.user_id !== student.userId); if (groupId) members.push({ user_id: student.userId, group_id: groupId, owner_id: user.id, assignment_id: assignmentId }); });
      if (!done) { select.value = old; select.disabled = false; }
    }

    function disclosure(title, content, open = false) { const box = el('details', 'td-disclosure'); box.open = open; box.append(el('summary', '', title), content); return box; }
    function evidenceText(value) { return typeof value === 'string' ? value : value === null || value === undefined ? '' : JSON.stringify(value); }
    function renderQuery(run) {
      const receipt = run.queryReceipt || {}, content = el('div', 'td-disclosure-body');
      content.append(el('p', 'td-note', `${dateText(receipt.ranAt)} · ${receipt.rowCount ?? 0} rows · ${receipt.tableName || 'Query'}`), el('pre', 'td-query', receipt.query || ''));
      if (receipt.recordIds?.length) content.append(textBlock(`Record IDs: ${receipt.recordIds.join(', ')}`));
      const snapshot = receipt.resultSnapshot;
      if (snapshot?.columns?.length && Array.isArray(snapshot.rows)) {
        const wrap = el('div', 'td-table-wrap'); const table = el('table', 'td-table td-results'), thead = el('thead'), headerRow = el('tr');
        snapshot.columns.forEach(column => { const th = el('th', '', evidenceText(column)); th.scope = 'col'; headerRow.append(th); }); thead.append(headerRow);
        const tbody = el('tbody');
        snapshot.rows.slice(0, 100).forEach(row => { const tr = el('tr'); snapshot.columns.forEach((column, index) => tr.append(el('td', '', evidenceText(Array.isArray(row) ? row[index] : row[column])))); tbody.append(tr); });
        table.append(thead, tbody); wrap.append(table); content.append(wrap);
        if (snapshot.truncated || snapshot.rows.length > 100) content.append(el('p', 'td-note', 'Showing a saved result excerpt (up to 100 rows in this view).'));
      }
      return disclosure(`${run.questionId || 'Query'} · ${receipt.tableName || 'Saved query'} · ${receipt.rowCount ?? 0} rows`, content);
    }
    function renderDetail(student, saved, trackId) {
      const detail = model.details(activity, saved?.state || null, trackId);
      detailBody.replaceChildren();
      const backButton = button('← All student progress', () => { selected = null; detailRequest += 1; detailBody.hidden = true; dashboardBody.hidden = false; message(); refreshButton.focus(); });
      const heading = el('div', 'td-detail-heading'); heading.append(el('h2', '', student.username), el('p', 'td-note', `${student.classLabel} · ${groupName(memberGroup(student.userId))} · ${dateText(saved?.updated_at)}`));
      const trackLabel = el('label', 'td-detail-track', 'Review investigation'); const trackSelect = el('select');
      setOptions(trackSelect, activity.tracks.map(track => [track.id, track.label]), trackId);
      trackSelect.addEventListener('change', () => { detailTrack = trackSelect.value; renderDetail(student, saved, detailTrack); }); trackLabel.append(trackSelect);
      detailBody.append(backButton, heading, trackLabel);
      detailBody.append(el('p', 'td-note', 'You are reviewing a saved snapshot. Use Refresh progress to load newer work for this login.'));
      if (!saved) detailBody.append(el('p', 'td-empty', 'No online save exists for this login yet. Local work will appear after the student signs in and saves online.'));
      const track = detail.summary;
      const detailStats = el('div', 'td-summary'); detailStats.append(stat(`${track.completed} / ${track.total}`, 'Questions complete'), stat(`${track.score} / ${track.maxScore}`, 'Practice points'), stat(track.hintsUsed, 'Hints used'), stat(track.nextQuestionId || 'Complete', 'Next required question')); detailBody.append(detailStats);
      const sectionProgress = el('div', 'td-sections');
      for (const section of track.sections) sectionProgress.append(el('p', '', `${section.title}: ${section.completed} / ${section.total}`));
      detailBody.append(sectionProgress, el('p', 'td-note', `Last viewed question: ${track.lastViewedQuestionId || 'Not recorded'}. Completion reflects the current sequential path; editing an earlier answer can lock later questions while retaining their saved responses.`));
      const responses = el('div');
      let sectionId;
      for (const question of detail.questions) {
        if (question.sectionId !== sectionId) { responses.append(el('h4', 'td-section-heading', question.sectionTitle)); sectionId = question.sectionId; }
        const content = el('div', 'td-disclosure-body');
        content.append(textBlock(question.prompt, 'td-question-prompt'), el('p', 'td-note', `${question.hintsUsed} hints used${question.retained ? ' · Saved after the current locked question' : ''}`), textBlock(question.answerText || question.answer));
        if (question.query) content.append(el('h5', '', 'Current query draft'), el('pre', 'td-query', question.query));
        const status = question.status === 'checked' ? (question.type === 'short' ? 'Submitted' : 'Checked') : question.status === 'draft' ? 'Draft' : 'No response';
        responses.append(disclosure(`${question.id} · ${question.title} · ${status}`, content));
      }
      const responseCount = detail.questions.filter(question => question.status !== 'empty').length;
      detailBody.append(disclosure(`Responses · ${responseCount} saved`, responses, true));
      const report = el('div', 'td-disclosure-body');
      for (const [key, title] of [['attacker', 'Attacker profile'], ['timeline', 'Attack timeline'], ['mitigation', 'Mitigation recommendations']]) {
        const area = el('section', 'td-report-section'); area.append(el('h4', '', title), el('h5', '', 'Report draft'), textBlock(detail.reportDraft[key]));
        const findings = detail.findings.filter(finding => finding.section === key);
        area.append(el('h5', '', `Findings · ${findings.length}`));
        if (!findings.length) area.append(el('p', 'td-note', 'No saved findings in this section.'));
        for (const finding of findings) {
          const card = el('article', 'td-finding');
          const refs = Array.isArray(finding.evidenceIds) ? finding.evidenceIds.join(', ') : '';
          card.append(el('p', 'td-note', [finding.questionId, finding.timestamp, refs].filter(Boolean).join(' · ')), textBlock(finding.summary));
          area.append(card);
        }
        report.append(area);
      }
      detailBody.append(disclosure(`Incident report · ${detail.findings.length} findings`, report));
      const queries = el('div', 'td-disclosure-body');
      queries.append(el('p', 'td-note', 'These are the successful query runs retained in the student’s save, including available result excerpts. This history is limited and is not a count of all attempts.'));
      if (!detail.queryRuns.length) queries.append(el('p', 'td-note', 'No saved query runs for this investigation.'));
      detail.queryRuns.forEach(run => queries.append(renderQuery(run)));
      detailBody.append(disclosure(`Saved queries · ${detail.queryRuns.length}`, queries));
    }
    async function openStudent(student, trackId = student.trackId) {
      if (!visible || disposed) return;
      selected = student; detailTrack = trackId; const token = epoch, request = ++detailRequest;
      dashboardBody.hidden = true; detailBody.hidden = false;
      detailBody.replaceChildren(button('← All student progress', () => { selected = null; detailRequest += 1; detailBody.hidden = true; dashboardBody.hidden = false; message(); }), el('p', 'td-empty', `Loading ${student.username}…`));
      try {
        const result = await client.from('campaign_progress').select('state,revision,updated_at').eq('user_id', student.userId).eq('assignment_id', assignmentId).eq('activity_id', activity.id).maybeSingle();
        if (!active(token) || request !== detailRequest) return;
        const saved = fail(result); renderDetail(student, saved, trackId);
        const heading = detailBody.querySelector('h2'); if (heading) { heading.tabIndex = -1; heading.focus(); }
      } catch (error) {
        if (active(token) && request === detailRequest) { detailBody.replaceChildren(button('← All student progress', () => { selected = null; detailRequest += 1; detailBody.hidden = true; dashboardBody.hidden = false; message(); }), el('p', 'td-empty', 'Saved work could not be displayed.'), button('Try again', () => openStudent(student, trackId))); handleError(error, 'Could not load this saved work. It may use an unsupported version, or the connection may be unavailable.'); }
      }
    }
    function visibilityChanged() { if (!visible || disposed) return; if (document.hidden) clearTimeout(timer); else refresh(false); }
    document.addEventListener('visibilitychange', visibilityChanged);
    return {
      show() { if (disposed) return; if (visible) return; visible = true; container.hidden = false; dashboardBody.hidden = false; detailBody.hidden = true; selected = null; detailTrack = null; refresh(false); },
      hide() { visible = false; epoch += 1; detailRequest += 1; loading = false; mutating = false; clearTimeout(timer); container.hidden = true; refreshButton.disabled = false; createGroupButton.disabled = false; },
      clear() { this.hide(); disposed = true; students = []; groups = []; members = []; selected = null; container.replaceChildren(); document.removeEventListener('visibilitychange', visibilityChanged); }
    };
  }
  root.CampaignTeacherDashboard = Object.freeze({ create });
})(window);
