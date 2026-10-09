'use strict';
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.CampaignPlayerCore = api;
})(typeof window === 'object' ? window : null, function () {
  const VERSION = 2, STORAGE_KEY = 'campaign-guided-investigation-v2', MAX_BYTES = 64 * 1024 * 1024;
  const QUERY_HISTORY_LIMIT = 100, QUERY_HISTORY_MAX_BYTES = 512 * 1024;
  const BUILTIN_QUERY_SOURCES = Object.freeze({ EventRevisions: 'EVENT-02', EventRegistrations: 'GUESTS-01', NetworkConnections: 'NETWORK-01', ApprovalEvents: 'APPROVALS-01', AccountPermissions: 'ACCESS-01', PublishingEvents: 'PUBLISH-01', SessionObservations: 'SESSION-01', DocumentEvents: 'DOCLOG-01' });
  const SECTIONS = ['attacker', 'timeline', 'mitigation'];
  const labels = { attacker: 'Attacker profile', timeline: 'Attack timeline', mitigation: 'Mitigation recommendations' };
  const clean = (value, limit = 12000) => typeof value === 'string' ? value.slice(0, limit) : '';
  const normalize = value => clean(value).normalize('NFKC').toLowerCase().replace(/[’‘]/g, "'").replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ');
  const sameAnswer = (a, b) => typeof a === 'string' && typeof b === 'string' && a.trim().replace(/\s+/g, ' ') === b.trim().replace(/\s+/g, ' ');
  function temporalValue(raw, rule) {
    const spec = rule.temporal;
    if (!spec) return null;
    const expected = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}):(\d{2})Z)?$/.exec(spec.value || '');
    if (!expected) return null;
    let text = clean(raw).normalize('NFKC').toLowerCase().trim().replace(/(\d)(?:st|nd|rd|th)\b/g, '$1').replace(/,/g, '').replace(/\s+/g, ' ');
    let dateText = text, clock = null;
    if (spec.kind !== 'date') {
      const time = /(?:^|[ t])(\d{1,2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?\s*(a\.?m\.?|p\.?m\.?)?\s*(utc|gmt|z|\+00:?00)?$/.exec(text);
      if (!time || (spec.kind === 'utc-datetime' && !time[6])) return null;
      let hour = Number(time[1]); const minute = Number(time[2]), second = Number(time[3] || 0), fraction = Number(time[4] || 0);
      if (minute > 59 || second > 59 || fraction !== 0) return null;
      if (time[5]) { if (hour < 1 || hour > 12) return null; hour = hour % 12 + (time[5].startsWith('p') ? 12 : 0); }
      else if (hour > 23) return null;
      clock = [hour, minute, second]; dateText = text.slice(0, time.index).trim().replace(/\s+at$/, '').trim();
    }
    let parts;
    if (!dateText && spec.kind === 'utc-time') parts = expected.slice(1, 4).map(Number);
    else {
      const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(dateText);
      const named = /^(?:(\d{1,2}) ([a-z]+)|([a-z]+) (\d{1,2}))(?: (\d{4}))?$/.exec(dateText);
      if (iso) parts = iso.slice(1).map(Number);
      else if (named) {
        const months = ['january','february','march','april','may','june','july','august','september','october','november','december'];
        const monthName = named[2] || named[3];
        const month = months.findIndex(m => m === monthName || m.slice(0, 3) === monthName || (m === 'september' && monthName === 'sept')) + 1;
        if (!month) return null;
        parts = [Number(named[5] || expected[1]), month, Number(named[1] || named[4])];
      } else return null;
    }
    if (parts.some((n, i) => n !== Number(expected[i + 1]))) return null;
    if (spec.kind === 'date') return spec.value;
    return clock.every((n, i) => n === Number(expected[i + 4])) ? spec.value : null;
  }
  function incompatibleRecordPair(question, raw) {
    const pairs = question.validation?.recordPairs || [];
    if (!pairs.length) return false;
    const clauses = clean(raw).split(/[.;\n]|\bwhile\b|\bwhereas\b/i);
    return clauses.some(clause => {
      const value = ' ' + normalize(clause) + ' ';
      // Only catch a simple positive one-to-one claim; comparisons and negation
      // remain for teacher review instead of guessing their meaning.
      if (/\b(?:not|no|never|rather|instead|wrong|incorrect|mismatch)\b/.test(value)) return false;
      const records = pairs.filter(pair => value.includes(' ' + normalize(pair.record) + ' '));
      const receipts = pairs.filter(pair => value.includes(' ' + normalize(pair.receipt) + ' '));
      return records.length === 1 && receipts.length === 1 && records[0].receipt !== receipts[0].receipt;
    });
  }
  function questions(activity, trackId) { return (activity.tracks.find(t => t.id === trackId)?.sections || []).flatMap(s => s.questions); }
  function locate(activity, id) {
    for (const track of activity.tracks) for (const section of track.sections) {
      const question = section.questions.find(q => q.id === id);
      if (question) return { track, section, question, index: questions(activity, track.id).findIndex(q => q.id === id) };
    }
    return null;
  }
  function createState(activity) {
    return { version: VERSION, activityId: activity.id, revision: activity.revision, trackId: activity.tracks[0].id, activeQuestion: {}, responses: {}, queryRuns: [], findings: [], reportDraft: Object.fromEntries(activity.tracks.map(t => [t.id, { attacker: '', timeline: '', mitigation: '' }])) };
  }
  function response(state, id) { return state.responses[id] ||= { answer: '', submittedAnswer: null, hints: [], query: '', queryEdited: false, capture: { summary: '', timestamp: '', evidenceText: '', section: '', certainty: 'Observed' } }; }
  function validateAnswer(question, answer) {
    const raw = clean(answer), value = normalize(raw), rule = question.validation || {};
    if (!value) return { ok: false, message: 'Add your response before continuing.' };
    if (question.type === 'choice') return { ok: raw === rule.correctOption, message: raw === rule.correctOption ? 'Response checked.' : 'Look at the source again and try another response.' };
    if (question.type === 'fill') {
      const ok = rule.temporal ? temporalValue(raw, rule) !== null : (rule.accepted || []).some(item => normalize(item) === value);
      const formatHelp = rule.temporal?.kind === 'date' ? ' Enter only the date; month names, ordinal days and ISO dates are accepted.' : rule.temporal ? ' Enter the requested UTC time, using a 24-hour clock or AM/PM. Include the date when requested.' : ' Spacing and capitalization do not matter.';
      return { ok, message: ok ? 'Response checked.' : 'Check the requested detail in the source.' + formatHelp };
    }
    const words = value.split(' '), minWords = rule.minWords || 8;
    if (words.length < minWords || new Set(words).size < Math.min(5, minWords)) return { ok: false, message: `Explain the finding in a sentence of at least ${minWords} words. Repeated words alone do not count as an explanation.` };
    const matched = (rule.concepts || []).filter(group => (group.any || []).some(term => (' ' + value + ' ').includes(' ' + normalize(term) + ' ')));
    const needed = rule.minConcepts ?? (rule.concepts || []).length;
    if (matched.length < needed) {
      const missingConcepts = (rule.concepts || []).filter(group => !matched.includes(group)).map(group => group.label || 'Explain the remaining evidence connection');
      return { ok: false, missingConcepts, message: 'The completeness check could not find these points: ' + missingConcepts.join('; ') + '. Explain them in your own words. This feedback is free; hints are optional.' };
    }
    if (incompatibleRecordPair(question, raw)) return { ok: false, message: 'Check the transfer or exchange and its receiving-record pairing. The IDs named together do not match the supplied records. This feedback is free.' };
    return { ok: true, reviewRequired: true, message: 'Key ideas found. Your explanation remains available for teacher review.' };
  }
  function isComplete(activity, state, id) {
    const found = locate(activity, id), r = state.responses[id];
    return Boolean(found && r && sameAnswer(r.submittedAnswer, r.answer) && validateAnswer(found.question, r.answer).ok);
  }
  function frontier(activity, state, trackId) {
    const list = questions(activity, trackId), index = list.findIndex(q => !isComplete(activity, state, q.id));
    return index < 0 ? list.length : index;
  }
  function canAccess(activity, state, id) { const f = locate(activity, id); return Boolean(f && f.index <= frontier(activity, state, f.track.id)); }
  function setAnswer(activity, state, id, answer) {
    if (!canAccess(activity, state, id)) throw new Error('Finish the earlier questions first.');
    response(state, id).answer = clean(answer);
  }
  function submit(activity, state, id) {
    const f = locate(activity, id);
    if (!f || !canAccess(activity, state, id)) return { ok: false, message: 'Finish the earlier questions first.' };
    const r = response(state, id), result = validateAnswer(f.question, r.answer);
    if (!result.ok) return result;
    r.submittedAnswer = r.answer;
    if (timelineEvents(activity, id).length) r.timelineSubmittedAnswer = r.answer;
    const timeline = syncTimeline(activity, state, id);
    const list = questions(activity, f.track.id);
    return { ...result, timelineAdded: timeline.added, timelineUpdated: timeline.updated, nextId: list[f.index + 1]?.id || null, trackComplete: frontier(activity, state, f.track.id) === list.length };
  }
  function revealHint(activity, state, id, index) {
    const f = locate(activity, id);
    if (!f || !canAccess(activity, state, id) || !Number.isInteger(index) || index < 0 || index >= f.question.hints.length) throw new Error('That hint is not available.');
    const r = response(state, id), hintId = 'hint-' + (index + 1);
    if (r.hints.includes(hintId)) return { charged: false, text: f.question.hints[index] };
    if (index > r.hints.length) throw new Error('Reveal hints in order.');
    r.hints.push(hintId);
    return { charged: true, text: f.question.hints[index] };
  }
  function points(activity, state, id) {
    if (!isComplete(activity, state, id)) return 0;
    const f = locate(activity, id), max = activity.scoring.pointsPerQuestion;
    const count = new Set((state.responses[id]?.hints || []).filter(h => /^hint-[1-9]\d*$/.test(h) && Number(h.slice(5)) <= f.question.hints.length)).size;
    return Math.max(0, max - count * activity.scoring.hintCost);
  }
  function score(activity, state, trackId) { return questions(activity, trackId).slice(0, frontier(activity, state, trackId)).reduce((sum, q) => sum + points(activity, state, q.id), 0); }
  function scopedCase(activity, state, id) {
    const f = locate(activity, id);
    if (!f || !canAccess(activity, state, id)) throw new Error('This section has not been unlocked.');
    const allowed = new Set(f.section.availableArtifactIds), names = new Set(f.section.availableTableNames);
    return { ...activity.caseData, artifacts: activity.caseData.artifacts.filter(a => allowed.has(a.id)), queryTables: Object.fromEntries(Object.entries(activity.caseData.queryTables || {}).filter(([name, spec]) => names.has(name) && allowed.has(spec.artifactId))) };
  }
  function pageAvailable(activity, state, id, pageId) {
    const scope = new Set(scopedCase(activity, state, id).artifacts.map(a => a.id)), page = activity.pages.find(p => p.id === pageId);
    return Boolean(page && page.artifactIds.length && page.artifactIds.every(a => scope.has(a)));
  }
  function citationIds(activity) {
    const ids = new Set();
    for (const a of activity.caseData.artifacts) { ids.add(a.id); if (/^[A-Za-z][A-Za-z0-9_]*_id$/.test(a.columns?.[0] || '')) for (const row of a.rows || []) ids.add(String(row[0])); }
    return ids;
  }
  function normalizeCitationIds(activity, supplied) {
    const known = new Map([...citationIds(activity)].map(id => [id.toLowerCase(), id]));
    return [...new Set((Array.isArray(supplied) ? supplied : []).map(id => typeof id === 'string' ? known.get(id.trim().toLowerCase()) || id.trim() : id))];
  }
  function timelineTimestamp(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}Z)?$/.test(value)) return null;
    const iso = value.length === 10 ? value + 'T00:00:00Z' : value;
    const parsed = Date.parse(iso);
    if (!Number.isFinite(parsed) || new Date(parsed).toISOString() !== iso.replace('Z', '.000Z')) return null;
    return { value, day: value.slice(0, 10), precise: value.length > 10, order: parsed };
  }
  function formatTimelineTimestamp(value) {
    const time = timelineTimestamp(value);
    return time ? time.precise ? value.replace('T', ' ').replace('Z', ' UTC') : value + ' (date only; time not recorded)' : clean(value, 100);
  }
  function timelineEvents(activity, questionId) {
    const found = locate(activity, questionId);
    if (!found) return [];
    const scope = new Set(found.section.availableArtifactIds);
    const scoped = { caseData: { artifacts: activity.caseData.artifacts.filter(a => scope.has(a.id)) } };
    const allowed = citationIds(scoped), seen = new Set();
    return (Array.isArray(found.question.timelineEvents) ? found.question.timelineEvents : []).flatMap(event => {
      if (!event || !/^[A-Za-z0-9_-]{1,60}$/.test(event.id || '') || seen.has(event.id) || !clean(event.title, 200).trim() || !timelineTimestamp(event.timestamp)) return [];
      const evidenceIds = normalizeCitationIds(scoped, event.evidenceIds);
      if (!evidenceIds.length || evidenceIds.some(id => !allowed.has(id))) return [];
      seen.add(event.id);
      const answerMatchAny = Array.isArray(event.answerMatchAny) ? event.answerMatchAny.filter(term => typeof term === 'string' && normalize(term)).map(term => clean(term, 100)) : null;
      return [{ id: event.id, title: clean(event.title, 200), timestamp: event.timestamp, evidenceIds, ...(answerMatchAny ? { answerMatchAny } : {}) }];
    });
  }
  function timelineEventMatches(event, answer) {
    if (!event.answerMatchAny) return true;
    const normalized = ' ' + normalize(answer) + ' ';
    return event.answerMatchAny.some(term => {
      const token = normalize(term);
      return normalized.includes(' ' + token + ' ') || (/^[a-z]+ \d+$/.test(token) && normalized.includes(' ' + token.replace(' ', '') + ' '));
    });
  }
  function timelineDescription(question, answer) {
    return question.type === 'choice' ? clean(question.options?.find(option => option.id === answer)?.text) : clean(answer);
  }
  function timelineDescriptionEdited(question, prior) {
    return Boolean(prior && (prior.autoTimeline?.descriptionEdited === true || prior.summary !== timelineDescription(question, prior.autoTimeline?.sourceAnswer)));
  }
  function automaticFinding(question, event, answer, prior) {
    const descriptionEdited = timelineDescriptionEdited(question, prior);
    return { id: 'timeline-' + question.id + '-' + event.id, questionId: question.id, section: 'timeline', summary: descriptionEdited ? clean(prior.summary) : timelineDescription(question, answer), timestamp: event.timestamp, certainty: prior && ['Observed', 'Inference', 'Question'].includes(prior.certainty) ? prior.certainty : 'Question', evidenceIds: [...event.evidenceIds], queryReceipt: null, autoTimeline: { eventId: event.id, title: event.title, sourceAnswer: answer, descriptionEdited } };
  }
  function syncTimeline(activity, state, questionId) {
    const result = { added: 0, updated: 0 };
    for (const track of activity.tracks) for (const question of questions(activity, track.id)) {
      if ((questionId && question.id !== questionId) || !canAccess(activity, state, question.id) || !isComplete(activity, state, question.id)) continue;
      const answer = state.responses[question.id].submittedAnswer;
      const events = timelineEvents(activity, question.id).filter(event => timelineEventMatches(event, answer));
      const allowedEvents = new Set(events.map(event => event.id));
      state.findings = state.findings.filter(f => {
        if (f.questionId !== question.id || !f.autoTimeline || allowedEvents.has(f.autoTimeline.eventId)) return true;
        result.updated++;
        // Revising an answer can select a different transfer. Preserve any prose
        // the student has independently revised as an ordinary report finding.
        if (timelineDescriptionEdited(question, f)) { f.id = 'finding-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8); f.certainty = 'Question'; delete f.autoTimeline; return true; }
        return false;
      });
      for (const event of events) {
        if (!timelineDescription(question, answer).trim()) continue;
        const matches = state.findings.filter(f => f.questionId === question.id && f.autoTimeline?.eventId === event.id);
        const prior = matches[0], item = automaticFinding(question, event, answer, prior);
        if (prior) {
          if (JSON.stringify(prior) !== JSON.stringify(item)) { Object.assign(prior, item); result.updated++; }
          if (matches.length > 1) state.findings = state.findings.filter(f => !matches.slice(1).includes(f));
        } else { state.findings.push(item); result.added++; }
      }
    }
    return result;
  }
  function orderedFindings(activity, state, trackId, section) {
    const own = new Set(questions(activity, trackId).map(q => q.id));
    const findings = state.findings.filter(f => own.has(f.questionId) && (!section || f.section === section));
    if (section !== 'timeline') return findings;
    return findings.slice().sort((a, b) => {
      const left = timelineTimestamp(a.timestamp), right = timelineTimestamp(b.timestamp);
      const parseManual = value => { const parsed = Date.parse(value); return Number.isFinite(parsed) ? parsed : Infinity; };
      const l = left?.order ?? parseManual(a.timestamp), r = right?.order ?? parseManual(b.timestamp);
      return l === r ? 0 : l < r ? -1 : 1;
    });
  }
  function sanitizeSnapshot(value) {
    if (!value || !Array.isArray(value.columns) || !value.columns.length || !value.columns.every(c => typeof c === 'string') || !Array.isArray(value.rows)) return null;
    let truncated = value.truncated === true || value.columns.length > 32 || value.rows.length > 100, remaining = 20000;
    const bounded = (text, limit) => { const next = text.slice(0, Math.max(0, Math.min(limit, remaining))); remaining -= next.length; if (next.length < text.length) truncated = true; return next; };
    const columns = value.columns.slice(0, 32).map(c => bounded(c, 100));
    const rows = [];
    for (const row of value.rows.slice(0, 100)) {
      if (!Array.isArray(row)) { truncated = true; continue; }
      rows.push(columns.map((_, i) => {
        const cell = row[i];
        if (typeof cell === 'string') return bounded(cell, 2000);
        if (cell === null || typeof cell === 'boolean' || (typeof cell === 'number' && Number.isFinite(cell))) return cell;
        if (cell !== undefined) truncated = true;
        return null;
      }));
    }
    return { columns, rows, truncated };
  }
  function sanitizeReceipt(value, activity) {
    if (!value || typeof value !== 'object') return null;
    const artifacts = new Set(activity.caseData.artifacts.map(a => a.id));
    const sourceArtifactId = normalizeCitationIds(activity, [value.sourceArtifactId])[0];
    if (!artifacts.has(sourceArtifactId) || typeof value.query !== 'string') return null;
    const snapshot = sanitizeSnapshot(value.resultSnapshot), ids = citationIds(activity);
    return { query: clean(value.query), tableName: clean(value.tableName, 100), sourceArtifactId, ranAt: clean(value.ranAt, 50), caseRevision: clean(value.caseRevision, 100), rowCount: Number.isSafeInteger(value.rowCount) && value.rowCount >= 0 ? value.rowCount : 0, recordIds: normalizeCitationIds(activity, value.recordIds).filter(x => ids.has(x)).slice(0, 100), ...(snapshot ? { resultSnapshot: snapshot } : {}) };
  }
  function historyReceipt(activity, questionId, value) {
    const found = locate(activity, questionId);
    if (!found) return null;
    const scopeIds = new Set(found.section.availableArtifactIds);
    const receipt = sanitizeReceipt(value, { caseData: { artifacts: activity.caseData.artifacts.filter(a => scopeIds.has(a.id)) } });
    if (!receipt || !found.section.availableTableNames.includes(receipt.tableName)) return null;
    const source = activity.caseData.queryTables?.[receipt.tableName]?.artifactId || BUILTIN_QUERY_SOURCES[receipt.tableName];
    // Receipts are saved work, not permission to load additional evidence. A run
    // must retain its original section's table and matching source artifact.
    const firstTable = /^(?:\s|\/\/[^\n]*(?:\n|$))*([A-Za-z_][A-Za-z0-9_]*)/.exec(receipt.query)?.[1];
    if (!source || source !== receipt.sourceArtifactId || firstTable !== receipt.tableName) return null;
    return receipt;
  }
  function boundedQueryRuns(activity, entries) {
    const counts = new Map(), bytes = new Map(), kept = [], seenIds = new Set();
    for (let i = entries.length - 1; i >= 0; i--) {
      const item = entries[i], trackId = locate(activity, item?.questionId)?.track.id;
      if (!trackId || typeof item.id !== 'string' || !item.id || seenIds.has(item.id)) continue;
      const count = counts.get(trackId) || 0, size = new TextEncoder().encode(JSON.stringify(item)).byteLength;
      const used = bytes.get(trackId) || 0;
      // Once a track reaches its bound, prune its oldest entries as a block.
      if (count >= QUERY_HISTORY_LIMIT || used + size > QUERY_HISTORY_MAX_BYTES) { counts.set(trackId, QUERY_HISTORY_LIMIT); continue; }
      seenIds.add(item.id); counts.set(trackId, count + 1); bytes.set(trackId, used + size); kept.push(item);
    }
    return kept.reverse();
  }
  function recordQueryRun(activity, state, questionId, value) {
    if (!canAccess(activity, state, questionId)) throw new Error('Choose an available question for this query.');
    const receipt = historyReceipt(activity, questionId, value);
    if (!receipt) throw new Error('Use a query table and source available in this question’s section.');
    const trackId = locate(activity, questionId).track.id;
    const runs = Array.isArray(state.queryRuns) ? state.queryRuns : [];
    const last = runs.findLast(item => locate(activity, item.questionId)?.track.id === trackId);
    const comparable = r => JSON.stringify({ ...r, ranAt: '' });
    let item;
    if (last?.questionId === questionId && comparable(last.queryReceipt) === comparable(receipt)) {
      item = { ...last, queryReceipt: receipt };
      state.queryRuns = runs.filter(entry => entry !== last).concat(item);
    } else {
      item = { id: 'query-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8), questionId, queryReceipt: receipt };
      state.queryRuns = runs.concat(item);
    }
    state.queryRuns = boundedQueryRuns(activity, state.queryRuns);
    return item;
  }
  function queryHistory(activity, state, trackId) {
    if (!activity.tracks.some(track => track.id === trackId)) return [];
    return (Array.isArray(state.queryRuns) ? state.queryRuns : []).filter(item => locate(activity, item.questionId)?.track.id === trackId && canAccess(activity, state, item.questionId)).flatMap(item => {
      const receipt = historyReceipt(activity, item.questionId, item.queryReceipt);
      return receipt ? [{ id: item.id, questionId: item.questionId, queryReceipt: receipt }] : [];
    }).reverse();
  }
  function addFinding(activity, state, value) {
    if (!locate(activity, value.questionId) || !canAccess(activity, state, value.questionId)) throw new Error('Choose an available question for this finding.');
    if (!SECTIONS.includes(value.section) || !clean(value.summary).trim()) throw new Error('Choose a report section and describe your finding.');
    const allowed = citationIds({ caseData: scopedCase(activity, state, value.questionId) });
    const supplied = normalizeCitationIds({ caseData: scopedCase(activity, state, value.questionId) }, value.evidenceIds);
    if (supplied.some(id => !allowed.has(id))) throw new Error('Use a source or record ID available in this section.');
    const item = { id: 'finding-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8), questionId: value.questionId, section: value.section, summary: clean(value.summary), timestamp: clean(value.timestamp, 100), certainty: ['Observed', 'Inference', 'Question'].includes(value.certainty) ? value.certainty : 'Observed', evidenceIds: [...new Set(supplied)], queryReceipt: sanitizeReceipt(value.queryReceipt, { caseData: scopedCase(activity, state, value.questionId) }) };
    if (state.findings.filter(f => !f.autoTimeline).length >= 300) throw new Error('Export your report before adding more than 300 findings.');
    state.findings.push(item); return item;
  }
  function restore(activity, raw, existing) {
    const text = typeof raw === 'string' ? raw : JSON.stringify(raw);
    if (new TextEncoder().encode(text).byteLength > MAX_BYTES) throw new Error('This backup is too large (maximum 64 MB).');
    const value = JSON.parse(text);
    if (!value || value.version !== VERSION || value.activityId !== activity.id) throw new Error('This is not a backup for the guided Campaign Post activity. Older chapter notebooks remain separate.');
    const next = createState(activity);
    if (activity.tracks.some(t => t.id === value.trackId)) next.trackId = value.trackId;
    for (const t of activity.tracks) for (const q of questions(activity, t.id)) {
      const incoming = value.responses?.[q.id], prior = existing?.responses?.[q.id];
      const r = response(next, q.id);
      if (incoming && typeof incoming === 'object') {
        r.answer = clean(incoming.answer); r.query = clean(incoming.query); r.queryEdited = incoming.queryEdited === true;
        r.capture = { summary: clean(incoming.capture?.summary), timestamp: clean(incoming.capture?.timestamp, 100), evidenceText: clean(incoming.capture?.evidenceText, 3000), section: SECTIONS.includes(incoming.capture?.section) ? incoming.capture.section : '', certainty: ['Observed', 'Inference', 'Question'].includes(incoming.capture?.certainty) ? incoming.capture.certainty : 'Observed' };
        r.submittedAnswer = sameAnswer(incoming.submittedAnswer, r.answer) && validateAnswer(q, r.answer).ok ? r.answer : null;
        if (timelineEvents(activity, q.id).length) {
          const priorTimelineAnswer = typeof incoming.submittedAnswer === 'string' && validateAnswer(q, incoming.submittedAnswer).ok ? incoming.submittedAnswer : incoming.timelineSubmittedAnswer;
          if (typeof priorTimelineAnswer === 'string' && validateAnswer(q, priorTimelineAnswer).ok) r.timelineSubmittedAnswer = clean(priorTimelineAnswer);
        }
      }
      const used = new Set([...(Array.isArray(incoming?.hints) ? incoming.hints : []), ...(Array.isArray(prior?.hints) ? prior.hints : [])].filter(h => /^hint-[1-9]\d*$/.test(h) && Number(h.slice(5)) <= q.hints.length));
      // Revealing a later progressive hint entails the earlier hints too.
      const count = Math.max(0, ...[...used].map(h => Number(h.slice(5))));
      r.hints = Array.from({ length: count }, (_, i) => 'hint-' + (i + 1));
    }
    const incomingRuns = [];
    for (const item of (Array.isArray(value.queryRuns) ? value.queryRuns : [])) {
      if (!item || typeof item !== 'object') continue;
      const id = clean(item.id, 100), receipt = historyReceipt(activity, item.questionId, item.queryReceipt);
      if (id && receipt) incomingRuns.push({ id, questionId: item.questionId, queryReceipt: receipt });
    }
    next.queryRuns = boundedQueryRuns(activity, incomingRuns);
    const usedFindingIds = new Set();
    let manualFindingCount = 0;
    for (const item of (Array.isArray(value.findings) ? value.findings : [])) {
      if (!item || !locate(activity, item.questionId) || !SECTIONS.includes(item.section) || (!item.autoTimeline && !clean(item.summary).trim())) continue;
      if (item.autoTimeline) {
        const question = locate(activity, item.questionId).question;
        const event = timelineEvents(activity, item.questionId).find(event => event.id === item.autoTimeline.eventId);
        const submittedAnswer = clean(next.responses[item.questionId]?.timelineSubmittedAnswer);
        if (!event || !sameAnswer(item.autoTimeline.sourceAnswer, submittedAnswer) || !validateAnswer(question, submittedAnswer).ok || !timelineEventMatches(event, submittedAnswer) || !timelineDescription(question, submittedAnswer).trim()) continue;
        const automatic = automaticFinding(question, event, submittedAnswer, item);
        if (usedFindingIds.has(automatic.id)) continue;
        usedFindingIds.add(automatic.id); next.findings.push(automatic); continue;
      }
      if (manualFindingCount >= 300 || clean(item.id, 100).startsWith('timeline-')) continue;
      const id = clean(item.id, 100); if (!id || usedFindingIds.has(id)) continue; usedFindingIds.add(id);
      const scopeIds = new Set(locate(activity, item.questionId).section.availableArtifactIds);
      const scoped = { caseData: { artifacts: activity.caseData.artifacts.filter(a => scopeIds.has(a.id)) } };
      const findingIds = citationIds(scoped);
      next.findings.push({ id, questionId: item.questionId, section: item.section, summary: clean(item.summary), timestamp: clean(item.timestamp, 100), certainty: ['Observed', 'Inference', 'Question'].includes(item.certainty) ? item.certainty : 'Observed', evidenceIds: normalizeCitationIds(scoped, item.evidenceIds).filter(v => findingIds.has(v)).slice(0, 100), queryReceipt: sanitizeReceipt(item.queryReceipt, scoped) });
      manualFindingCount++;
    }
    syncTimeline(activity, next);
    for (const track of activity.tracks) for (const name of SECTIONS) next.reportDraft[track.id][name] = clean(value.reportDraft?.[track.id]?.[name] ?? (track.id === next.trackId ? value.reportDraft?.[name] : ''), 30000);
    for (const track of activity.tracks) {
      const desired = value.activeQuestion?.[track.id], list = questions(activity, track.id), edge = frontier(activity, next, track.id);
      next.activeQuestion[track.id] = desired && locate(activity, desired)?.track.id === track.id && canAccess(activity, next, desired) ? desired : list[Math.min(edge, list.length - 1)].id;
    }
    return next;
  }
  function exportReport(activity, state, trackId) {
    const track = activity.tracks.find(t => t.id === trackId);
    const lines = [activity.title + ' — evidence for an incident response report', track.label, '', 'Organize and revise these findings for your presentation. Responses are practice-checked, not automatically graded for reasoning.', ''];
    for (const section of SECTIONS) {
      lines.push(labels[section].toUpperCase(), '');
      if (state.reportDraft[trackId]?.[section]) lines.push(state.reportDraft[trackId][section], '');
      const findings = orderedFindings(activity, state, trackId, section);
      for (const f of findings) {
        if (f.autoTimeline) lines.push('Event: ' + f.autoTimeline.title, 'Timestamp: ' + formatTimelineTimestamp(f.timestamp), 'Your description: ' + f.summary);
        else lines.push((f.timestamp ? f.timestamp + ' — ' : '') + f.summary);
        lines.push('Sources: ' + (f.evidenceIds.join(', ') || 'Add a citation'), 'Investigation question: ' + f.questionId);
        if (f.autoTimeline && (!isComplete(activity, state, f.questionId) || !canAccess(activity, state, f.questionId))) lines.push('Recheck the response for this saved event before using it in your final report.');
        if (f.queryReceipt) lines.push('Query evidence (verify against the case): ' + f.queryReceipt.sourceArtifactId + ' · ' + f.queryReceipt.rowCount + ' rows · run ' + f.queryReceipt.ranAt, f.queryReceipt.query);
        if (f.queryReceipt?.resultSnapshot) {
          const snapshot = f.queryReceipt.resultSnapshot;
          const cells = row => row.map(cell => typeof cell === 'string' ? JSON.stringify(cell) : String(cell)).join('\t');
          lines.push('Saved query result:', cells(snapshot.columns), ...snapshot.rows.map(cells));
          if (snapshot.truncated) lines.push('Snapshot limited in size; rerun the preserved query for the complete result.');
        }
        lines.push('');
      }
      if (!findings.length) lines.push('No selected findings yet.', '');
    }
    return lines.join('\n');
  }
  return Object.freeze({ VERSION, STORAGE_KEY, MAX_BYTES, QUERY_HISTORY_LIMIT, QUERY_HISTORY_MAX_BYTES, SECTIONS, labels, normalize, questions, locate, createState, response, validateAnswer, isComplete, frontier, canAccess, setAnswer, submit, revealHint, points, score, scopedCase, pageAvailable, citationIds, normalizeCitationIds, addFinding, recordQueryRun, queryHistory, timelineEvents, syncTimeline, orderedFindings, formatTimelineTimestamp, restore, exportReport });
});
