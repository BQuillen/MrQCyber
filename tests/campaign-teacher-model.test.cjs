'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const C = require('../learn/osint/campaign-player/player-core.js');
const M = require('../admin/campaign-progress-model.js');

function fixture() {
  const q = (id, overrides = {}) => ({ id, title: 'Question ' + id, prompt: 'Find the supplied detail.', type: 'fill', validation: { accepted: ['yes'] }, hints: ['First clue', 'Second clue', 'Third clue'], ...overrides });
  const track = id => ({ id, label: id, sections: [
    { id: 'one', title: 'Section one', questions: [q(id + '-01'), q(id + '-02')], availableArtifactIds: ['REC-01'], availableTableNames: ['Records'] },
    { id: 'two', title: 'Section two', questions: [q(id + '-03'), q(id + '-04')], availableArtifactIds: ['REC-01'], availableTableNames: ['Records'] }
  ] });
  return { id: 'teacher-fixture', revision: 'v1', scoring: { pointsPerQuestion: 10, hintCost: 2 }, tracks: [track('year1'), track('year2')], caseData: { artifacts: [{ id: 'REC-01', columns: ['record_id', 'description'], rows: [['REC-1', 'First']] }], queryTables: { Records: { artifactId: 'REC-01' } } } };
}
function row(state, overrides = {}) {
  return { user_id: 'student-1', assignment_id: 'assignment', username: 'a-am-y1-01', class_label: 'A Day AM Year 1', track_id: 'year1', enabled: true, is_test: false, has_progress: state != null, revision: 4, updated_at: '2026-10-12T14:30:00Z', progress_state: state, ...overrides };
}
function submit(a, s, id) { C.setAnswer(a, s, id, 'yes'); assert.equal(C.submit(a, s, id).ok, true); }
function receipt(overrides = {}) { return { query: 'Records | count', tableName: 'Records', sourceArtifactId: 'REC-01', ranAt: '2026-10-12T14:00:00Z', caseRevision: 'v1', rowCount: 1, recordIds: ['REC-1'], resultSnapshot: { columns: ['Count'], rows: [[1]] }, ...overrides }; }

test('no online save differs from a saved empty investigation without invented accomplishments', () => {
  const a = fixture(), empty = C.createState(a);
  const absent = M.normalizeOverview(a, row(null));
  assert.equal(absent.saveStatus, 'not-saved'); assert.equal(absent.hasProgress, false);
  assert.equal(absent.updatedAt, null); assert.equal(absent.track.completed, 0); assert.equal(absent.track.hasWork, false);
  const saved = M.normalizeOverview(a, row(empty));
  assert.equal(saved.saveStatus, 'saved'); assert.equal(saved.hasProgress, true);
  assert.equal(saved.updatedAt, '2026-10-12T14:30:00Z'); assert.equal(saved.track.hasWork, false);
  assert.equal(saved.track.completed, 0); assert.equal(saved.track.total, 4); assert.equal(saved.track.nextQuestionId, 'year1-01');
  assert.equal(saved.track.lastViewedQuestionId, null, 'a fallback cursor is not a recorded visit');
  assert.equal(saved.track.draftCount, 0); assert.equal(saved.track.score, 0);
});

test('editing an earlier answer relocks completion while preserving later checked work and last viewed question', () => {
  const a = fixture(), s = C.createState(a);
  for (const question of C.questions(a, 'year1')) submit(a, s, question.id);
  s.activeQuestion.year1 = 'year1-01';
  let result = M.normalizeOverview(a, row(s));
  assert.equal(result.track.completed, 4); assert.equal(result.track.nextQuestionId, null);
  assert.equal(result.track.lastViewedQuestionId, 'year1-01');
  C.setAnswer(a, s, 'year1-02', 'a revised unsubmitted answer');
  result = M.normalizeOverview(a, row(s));
  assert.equal(result.track.completed, 1); assert.equal(result.track.nextQuestionId, 'year1-02');
  assert.equal(result.track.lastViewedQuestionId, 'year1-01'); assert.equal(result.track.retainedChecked, 2);
  assert.equal(result.track.draftCount, 1); assert.equal(result.track.score, 10);
  assert.deepEqual(result.track.sections.map(section => section.completed), [1, 0]);
  const detail = M.details(a, s, 'year1');
  assert.deepEqual(detail.questions.map(question => question.status), ['checked', 'draft', 'checked', 'checked']);
  assert.deepEqual(detail.questions.map(question => question.retained), [false, false, true, true]);
  assert.deepEqual(detail.questions.map(question => question.accessible), [true, true, false, false]);
});

test('missing online save yields empty details without inventing a visit, while malformed saves fail', () => {
  const a = fixture();
  for (const missing of [null, undefined]) {
    const detail = M.details(a, missing, 'year2');
    assert.equal(detail.trackId, 'year2'); assert.equal(detail.summary.completed, 0);
    assert.equal(detail.summary.lastViewedQuestionId, null); assert.equal(detail.summary.nextQuestionId, 'year2-01');
    assert.ok(detail.questions.every(question => question.status === 'empty' && question.answer === ''));
    assert.deepEqual(detail.reportDraft, { attacker: '', timeline: '', mitigation: '' });
    assert.deepEqual(detail.findings, []); assert.deepEqual(detail.queryRuns, []);
  }
  for (const malformed of [{}, [], 'invalid json', { ...C.createState(a), version: 1 }]) assert.throws(() => M.details(a, malformed, 'year2'));
});

test('assigned track stays separate from last active track and computes real hint deductions', () => {
  const a = fixture(), s = C.createState(a);
  C.revealHint(a, s, 'year2-01', 0); C.revealHint(a, s, 'year2-01', 1); submit(a, s, 'year2-01');
  C.revealHint(a, s, 'year2-02', 0); C.setAnswer(a, s, 'year2-02', 'draft');
  s.trackId = 'year1';
  const overview = M.normalizeOverview(a, row(s, { track_id: 'year2' }));
  assert.equal(overview.trackId, 'year2'); assert.equal(overview.lastActiveTrackId, 'year1');
  assert.equal(overview.track.completed, 1); assert.equal(overview.track.score, 6); assert.equal(overview.track.hintsUsed, 3);
  assert.equal(overview.track.maxScore, 40); assert.equal(overview.track.percent, 25);
  assert.equal(overview.tracks[0].completed, 0); assert.equal(overview.tracks[0].hintsUsed, 0);
  assert.equal(M.details(a, s, 'year2').questions[0].hintsUsed, 2);
});

test('overview needs only the projected snapshot and reports incompatible saves explicitly', () => {
  const a = fixture(), s = C.createState(a); submit(a, s, 'year1-01');
  const projected = Object.fromEntries(['version', 'activityId', 'revision', 'trackId', 'activeQuestion', 'responses'].map(key => [key, s[key]]));
  assert.equal(M.normalizeOverview(a, row(projected)).track.completed, 1);
  for (const bad of [null, {}, { ...projected, activityId: 'different' }, { ...projected, version: 1 }]) {
    const result = M.normalizeOverview(a, row(bad, { has_progress: true }));
    assert.equal(result.saveStatus, 'invalid'); assert.ok(result.error); assert.equal(result.hasProgress, true);
  }
});

test('details retain locked saved queries, separate tracks and order timeline without evidence status', () => {
  const a = fixture(), s = C.createState(a);
  submit(a, s, 'year1-01'); submit(a, s, 'year1-02');
  const run1 = C.recordQueryRun(a, s, 'year1-03', receipt());
  const run2 = C.recordQueryRun(a, s, 'year1-03', receipt({ query: 'Records | take 1', ranAt: '2026-10-12T14:01:00Z' }));
  C.recordQueryRun(a, s, 'year2-01', receipt());
  for (const [timestamp, summary] of [['2026-10-12T14:00:00Z', 'Later'], ['2026-10-11T14:00:00Z', 'Earlier']]) C.addFinding(a, s, { questionId: 'year1-03', section: 'timeline', timestamp, summary, evidenceIds: ['REC-1'], certainty: 'Inference', queryReceipt: receipt() });
  C.addFinding(a, s, { questionId: 'year2-01', section: 'attacker', summary: 'Other track', evidenceIds: ['REC-1'] });
  s.reportDraft.year1.attacker = 'Saved profile'; s.reportDraft.year2.attacker = 'Different profile';
  C.setAnswer(a, s, 'year1-01', 'unsubmitted edit');
  const detail = M.details(a, s, 'year1');
  assert.deepEqual(detail.queryRuns.map(run => run.id), [run2.id, run1.id]);
  assert.deepEqual(detail.findings.map(finding => finding.summary), ['Earlier', 'Later']);
  assert.ok(detail.findings.every(finding => !Object.hasOwn(finding, 'certainty')));
  assert.equal(detail.reportDraft.attacker, 'Saved profile');
  assert.ok(detail.questions.every(question => question.id.startsWith('year1')));
});

test('plain untrusted response text remains inert data and no input or activity is mutated', () => {
  const a = fixture(), s = C.createState(a), hostile = '<img src=x onerror="alert(1)">';
  C.setAnswer(a, s, 'year1-01', hostile);
  s.reportDraft.year1.attacker = hostile;
  C.addFinding(a, s, { questionId: 'year1-01', section: 'attacker', summary: hostile, evidenceIds: ['REC-1'] });
  const aBefore = JSON.stringify(a), sBefore = JSON.stringify(s);
  const overview = M.normalizeOverview(a, row(s, { username: hostile }));
  const detail = M.details(a, s, 'year1');
  assert.equal(overview.username, hostile); assert.equal(detail.questions[0].answerText, hostile);
  assert.equal(detail.reportDraft.attacker, hostile); assert.equal(detail.findings[0].summary, hostile);
  detail.findings[0].evidenceIds.push('changed'); detail.reportDraft.attacker = 'changed';
  assert.equal(JSON.stringify(a), aBefore); assert.equal(JSON.stringify(s), sBefore);
  assert.throws(() => M.details(a, s, 'missing'), /available investigation track/);
});

test('automatic timeline regeneration and choice labels match the player without changing saved work', () => {
  const a = fixture(), q = a.tracks[0].sections[0].questions[0];
  q.type = 'choice'; q.options = [{ id: 'yes', text: 'The captured policy was changed.' }];
  q.validation = { correctOption: 'yes' };
  q.timelineEvents = [{ id: 'policy-change', title: 'Changed policy published', timestamp: '2026-10-11T12:00:00Z', evidenceIds: ['REC-1'] }];
  const s = C.createState(a); submit(a, s, q.id); s.findings = [];
  const before = JSON.stringify(s), detail = M.details(a, s, 'year1');
  assert.equal(detail.questions[0].answer, 'yes');
  assert.equal(detail.questions[0].answerText, 'The captured policy was changed.');
  assert.equal(detail.findings.length, 1); assert.equal(detail.findings[0].timestamp, '2026-10-11T12:00:00Z');
  assert.equal(detail.findings[0].summary, 'The captured policy was changed.');
  assert.equal(Object.hasOwn(detail.findings[0], 'certainty'), false);
  assert.equal(JSON.stringify(s), before);
});

test('browser export and deployed current activity work with the same scoring core', () => {
  const context = { window: { CampaignPlayerCore: C } };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../admin/campaign-progress-model.js'), 'utf8'), context);
  assert.equal(typeof context.window.CampaignTeacherModel.normalizeOverview, 'function');
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../learn/osint/campaign-player/activity-data.js'), 'utf8'), context);
  const a = context.window.CAMPAIGN_ACTIVITY, overview = M.normalizeOverview(a, row(C.createState(a)));
  assert.equal(overview.tracks.length, 2);
  assert.deepEqual(Array.from(overview.tracks, track => track.total), [40, 40]);
  assert.deepEqual(Array.from(overview.tracks, track => track.maxScore), [400, 400]);
  assert.equal(overview.track.nextQuestionId, 'Y1-01');
});
