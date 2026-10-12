'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const C = require('../learn/osint/campaign-player/player-core.js');
const Q = require('../learn/osint/campaign-player/query-engine.js');
const A = JSON.parse(fs.readFileSync(path.join(__dirname, '../learn/osint/campaign-player/activity.json'), 'utf8'));
const legacy = require('./fixtures/campaign-progress-before-scaffolding.json');
const question = id => C.locate(A, id).question;
const answer = q => q.type === 'choice' ? q.validation.correctOption : q.type === 'fill' ? q.validation.accepted[0] : 'My explanation of the source.';
const nextRequired = state => C.questions(A, 'year1')[C.frontier(A, state, 'year1')]?.id;
function submit(state, id, value = answer(question(id))) {
  C.setAnswer(A, state, id, value);
  assert.equal(C.submit(A, state, id).ok, true, id);
}

test('the first collection introduces the relationship and jobs before registrations and the photograph', () => {
  const first = A.tracks.find(t => t.id === 'year1').sections[0];
  assert.deepEqual(first.questions.map(q => q.id), [
    'Y1-01', 'Y1-02', 'Y1-03', 'Y1-04', 'Y1-04a', 'Y1-04b', 'Y1-04c', 'Y1-04d',
    'Y1-08', 'Y1-04e', 'Y1-04f', 'Y1-05', 'Y1-06', 'Y1-06a', 'Y1-07', 'Y1-09', 'Y1-10', 'Y1-11', 'Y1-12'
  ]);
  assert.deepEqual(A.tracks.map(t => C.questions(A, t.id).length), [43, 40]);
  const added = C.questions(A, 'year1').filter(q => !legacy.originalQuestions.year1.includes(q.id));
  assert.deepEqual(added.map(q => q.id), ['Y1-04e', 'Y1-04f', 'Y1-06a']);
  assert.equal(new Set(A.tracks.flatMap(t => C.questions(A, t.id).map(q => q.id))).size, 83);
  for (const [track, ids] of Object.entries(legacy.originalQuestions)) {
    for (const id of ids) assert.equal(C.locate(A, id).track.id, track, 'Retain saved question ID ' + id);
  }
  assert.deepEqual(C.questions(A, 'year2').map(q => q.id), legacy.originalQuestions.year2);
});

test('new job and registration questions open their evidence in the current collection', () => {
  const state = C.createState(A);
  for (const q of A.tracks.find(t => t.id === 'year1').sections[0].questions) {
    const scoped = C.scopedCase(A, state, q.id);
    if (['Y1-04e', 'Y1-04f', 'Y1-06a'].includes(q.id)) {
      const availableCitations = C.citationIds({ caseData: scoped });
      for (const id of q.report.suggestedEvidenceIds) assert(availableCitations.has(id), q.id + ': ' + id);
      if (q.workspace.mode === 'browser') {
        assert.equal(C.pageAvailable(A, state, q.id, q.workspace.pageId), true, q.id);
        const page = A.pages.find(p => p.id === q.workspace.pageId);
        assert(page && page.artifactIds.length, q.id + ' has an evidence page');
      } else {
        const result = Q.execute(q.workspace.starterQuery, Q.getTables(scoped));
        assert.equal(result.tableName, 'EventRegistrations');
        assert.equal(result.rows.length, 1);
        const row = Object.fromEntries(result.columns.map((column, i) => [column, result.rows[0][i]]));
        assert.equal(row.name, 'Crane Gordon');
        assert.equal(row.affiliation, 'Campaign');
        assert.equal(row.purpose, 'Scheduling');
      }
    }
    submit(state, q.id);
  }
  assert.equal(question('Y1-04e').workspace.pageId, 'high-five');
  assert.equal(question('Y1-04f').workspace.pageId, 'campaign-team');
  const count = Q.execute('EventRegistrations\n| where affiliation == "High Five Consultancy"\n| count', Q.getTables(C.scopedCase(A, state, 'Y1-06')));
  assert.deepEqual(count.rows, [[5]], 'The preceding count still establishes the High Five registrations.');
});

test('the assignment month accepts normal month/year formats but rejects a different assignment date', () => {
  for (const value of ['November 2024', 'Nov 2024', '11/2024', '2024-11', 'Crane joined in November 2024.', '4 November 2024', '11/04/2024']) {
    assert.equal(C.validateAnswer(question('Y1-04f'), value).ok, true, value);
  }
  for (const value of ['', 'November 2023', '10/2024', '11/2025', '2023-11', '2024', 'I do not know']) {
    assert.equal(C.validateAnswer(question('Y1-04f'), value).ok, false, value);
  }
});

test('the photograph question tests names and jobs without previewing the later attack', () => {
  const q = question('Y1-07');
  assert.equal(q.validation.correctOption, 'a', 'Existing saved choice remains valid.');
  const supported = q.options.find(option => option.id === 'a').text;
  assert.match(supported, /Crane/);
  assert.match(supported, /Dex/);
  assert.match(supported, /Campaign|scheduler|scheduling/i);
  assert.match(supported, /High Five/);
  const studentText = [q.title, q.prompt, ...q.hints, ...q.options.map(option => option.text)].join(' ');
  assert(!/secret agreement|planned the later post|sabotage|attack|attacker|compromis|operated the campaign account/i.test(studentText), 'This early observation must not supply later conclusions.');
});

test('a genuine previous-version save retains every answer and finding while requiring the three new responses', () => {
  assert.equal(legacy.sourceCommit, '82980a60c6425d44aaa3438147da9f2012a83e60');
  assert.deepEqual(Object.values(legacy.originalQuestions).map(ids => ids.length), [40, 40]);
  const original = JSON.stringify(legacy.state);
  const restored = C.restore(A, legacy.state);
  assert.equal(JSON.stringify(legacy.state), original, 'Restoration must not mutate the old snapshot.');
  for (const [id, prior] of Object.entries(legacy.state.responses)) assert.deepEqual(restored.responses[id], prior, id);
  assert.deepEqual(restored.queryRuns, legacy.state.queryRuns);
  assert.deepEqual(restored.findings, legacy.state.findings);
  assert.deepEqual(restored.reportDraft, legacy.state.reportDraft);
  assert.equal(restored.findings.find(f => f.id === legacy.editedTimelineId).summary, 'My revised timeline account of the original event.');
  assert.equal(restored.version, 2);
  assert.equal(restored.activityId, legacy.state.activityId);
  assert.equal(restored.revision, legacy.state.revision);
  assert.equal(nextRequired(restored), 'Y1-04e');
  assert.equal(restored.activeQuestion.year1, 'Y1-04e');
  assert.equal(restored.activeQuestion.year2, legacy.state.activeQuestion.year2);
  assert.equal(C.frontier(A, restored, 'year2'), 40);
  for (const id of ['Y1-04e', 'Y1-04f', 'Y1-06a']) {
    assert.equal(restored.responses[id].answer, '', id + ' is not auto-filled');
    assert.equal(restored.responses[id].submittedAnswer, null);
    assert.deepEqual(restored.responses[id].hints, []);
  }
  assert.equal(C.isComplete(A, restored, 'Y1-12'), true, 'Later checked work remains retained.');
  assert.equal(C.canAccess(A, restored, 'Y1-12'), false, 'New responses are still required in sequence.');
  submit(restored, 'Y1-04e');
  assert.equal(nextRequired(restored), 'Y1-04f');
  submit(restored, 'Y1-04f', '11/2024');
  assert.equal(nextRequired(restored), 'Y1-06a', 'Previously completed intermediate work stays complete.');
  submit(restored, 'Y1-06a');
  assert.equal(C.frontier(A, restored, 'year1'), 43);
  assert.equal(C.score(A, restored, 'year1'), 424);
  assert.equal(C.score(A, restored, 'year2'), 398);
  assert.equal(C.canAccess(A, restored, 'Y1-12'), true);
  for (const [id, prior] of Object.entries(legacy.state.responses)) assert.deepEqual(restored.responses[id], prior, id);
  assert.deepEqual(restored.queryRuns, legacy.state.queryRuns);
  assert.deepEqual(restored.reportDraft, legacy.state.reportDraft);
});

test('a returning student’s unfinished later answer and query stay drafts after the new steps are inserted', () => {
  const saved = structuredClone(legacy.state);
  saved.responses['Y1-12'].answer = 'My unfinished explanation';
  saved.responses['Y1-12'].submittedAnswer = null;
  saved.responses['Y1-12'].query = 'EventRegistrations\n| where affiliation == "Campaign"';
  saved.responses['Y1-12'].queryEdited = true;
  const restored = C.restore(A, saved);
  assert.deepEqual(restored.responses['Y1-12'], saved.responses['Y1-12']);
  for (const id of ['Y1-04e', 'Y1-04f', 'Y1-06a']) submit(restored, id);
  assert.equal(nextRequired(restored), 'Y1-12');
  assert.equal(C.isComplete(A, restored, 'Y1-12'), false);
  assert.deepEqual(restored.responses['Y1-12'], saved.responses['Y1-12']);
  assert.deepEqual(restored.queryRuns, saved.queryRuns);
  assert.deepEqual(restored.reportDraft, saved.reportDraft);
});
