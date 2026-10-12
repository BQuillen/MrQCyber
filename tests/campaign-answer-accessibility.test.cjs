'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const C = require('../learn/osint/campaign-player/player-core.js');
const folder = path.join(__dirname, '../learn/osint/campaign-player');
const A = JSON.parse(fs.readFileSync(path.join(folder, 'activity.json'), 'utf8'));
const all = A.tracks.flatMap(track => C.questions(A, track.id));
const q = id => C.locate(A, id).question;
const check = (id, answer) => C.validateAnswer(q(id), answer);
const answerFor = question => question.type === 'choice' ? question.validation.correctOption : question.type === 'fill' ? question.validation.accepted[0] : 'This information was shared before it was public.';

function finishThrough(state, trackId, questionId) {
  for (const question of C.questions(A, trackId)) {
    C.setAnswer(A, state, question.id, answerFor(question));
    assert.equal(C.submit(A, state, question.id).ok, true, question.id);
    if (question.id === questionId) return;
  }
}

test('all 30 short answers allow a response in the student’s own words without word or keyword gates', () => {
  const short = all.filter(question => question.type === 'short');
  assert.equal(short.length, 30);
  for (const question of short) {
    for (const answer of ['Oversharing.', 'I think this needs investigation.', 'The screenshot gave away upcoming plans.']) {
      const result = C.validateAnswer(question, answer);
      assert.equal(result.ok, true, question.id + ': ' + answer);
      assert.equal(result.reviewRequired, true);
      assert.equal(result.message, 'Response saved for teacher review.');
    }
    assert.deepEqual(question.validation, { responseRequired: true });
  }
  // Older activity metadata must not silently reintroduce the same gates.
  assert.equal(C.validateAnswer({ type: 'short', validation: { minWords: 100, minConcepts: 2, concepts: [{ any: ['exact phrase'] }], recordPairs: [{ record: 'TF-1', receipt: 'REC-1' }, { record: 'TF-2', receipt: 'REC-2' }] } }, 'TF-1 and REC-2').ok, true);
});

test('empty and punctuation-only responses cannot skip any question', () => {
  for (const question of all) for (const answer of ['', ' \n\t ', '...']) assert.equal(C.validateAnswer(question, answer).ok, false, question.id);
});

test('both question 8s accept a natural response and open the next question', () => {
  for (const [track, id, answer] of [
    ['year1', 'Y1-08', 'I cannot verify who is behind the account.'],
    ['year2', 'Y2-08', 'The approved document is version 3.']
  ]) {
    const state = C.createState(A), questions = C.questions(A, track), index = questions.findIndex(question => question.id === id);
    finishThrough(state, track, questions[index - 1].id);
    C.setAnswer(A, state, id, answer);
    const submitted = C.submit(A, state, id);
    assert.equal(submitted.ok, true);
    assert.equal(submitted.nextId, questions[index + 1].id);
    assert.equal(C.canAccess(A, state, submitted.nextId), true);
    assert.equal(state.responses[id].submittedAnswer, answer);
  }
});

test('factual fills accept their single detail inside a sentence and retain every authored alias', () => {
  for (const question of all.filter(item => item.type === 'fill')) {
    for (const value of question.validation.accepted) {
      assert.equal(C.validateAnswer(question, value).ok, true, question.id + ': ' + value);
      assert.equal(C.validateAnswer(question, 'The recorded value is ' + value + '.').ok, true, question.id + ' in a sentence: ' + value);
    }
  }
  for (const wrong of ['13', 'version 13', '3.4', 'version 3.4', 'v3.4', 'version 4', 'I do not know']) assert.equal(check('Y2-08', wrong).ok, false, wrong);
  for (const wrong of ['RS-2021', 'RS-201', 'RS-202.1']) assert.equal(check('Y2-16', wrong).ok, false, wrong);
});

test('date and time fills accept common formats, prose and copied values without an extra UTC suffix', () => {
  for (const value of ['October 6th, 2023', 'It was announced on 10/6/2023.', '10/06/23', '10/6', '2023/10/06']) assert.equal(check('Y1-04b', value).ok, true, value);
  for (const value of ['2023-10-06T14:00:00Z', '2023-10-06 14:00:00', 'October 6, 2023 at 2:00 PM', 'Release was approved for 10/6/2023 at 14:00 UTC.']) assert.equal(check('Y2-07b', value).ok, true, value);
  for (const value of ['It was scheduled at 11:54.', '11:54 AM', '2026-10-23T11:54:00Z']) assert.equal(check('Y2-10', value).ok, true, value);
  for (const value of ['12:46:04', 'The receiving time was 12:46:04 UTC.']) assert.equal(check('Y2-29', value).ok, true, value);
});

test('a wrong date, year, time or partial numeric value does not match the requested fact', () => {
  for (const value of ['2024/10/06', '10/6/2024', '6 October 2024', 'October 12', '2023-10-060']) assert.equal(check('Y1-04b', value).ok, false, value);
  for (const value of ['2024-10-06T14:00:00Z', '2024/10/06 14:00 UTC', '6 October 2023 14:10 UTC', '14:00 UTC', '2023-10-06T14:00:001Z', '2023-10-06T14:000:00Z', '6 October 2023 14:00 -04:00']) assert.equal(check('Y2-07b', value).ok, false, value);
  for (const value of ['11:55', '11:54:001', '111:54', '2025/10/23 11:54 UTC']) assert.equal(check('Y2-10', value).ok, false, value);
  assert.equal(check('Y2-29', '12:46').ok, false, 'the requested record includes nonzero seconds');
});

test('choice questions still require the selected supported option', () => {
  for (const question of all.filter(item => item.type === 'choice')) {
    for (const option of question.options) assert.equal(C.validateAnswer(question, option.id).ok, option.id === question.validation.correctOption, question.id + ': ' + option.id);
  }
});

test('all 80 questions progress in order and keep the student’s own timeline descriptions', () => {
  const state = C.createState(A);
  for (const track of A.tracks) {
    const questions = C.questions(A, track.id);
    assert.equal(C.canAccess(A, state, questions[1].id), false);
    for (let index = 0; index < questions.length; index++) {
      const question = questions[index], answer = answerFor(question);
      assert.equal(C.frontier(A, state, track.id), index);
      C.setAnswer(A, state, question.id, answer);
      if (index === 0) C.revealHint(A, state, question.id, 0);
      assert.equal(C.submit(A, state, question.id).ok, true, question.id);
      assert.equal(C.frontier(A, state, track.id), index + 1);
      for (const finding of state.findings.filter(item => item.questionId === question.id && item.autoTimeline && question.type === 'short')) assert.equal(finding.summary, answer);
    }
    assert.equal(C.score(A, state, track.id), 398);
  }
  assert.equal(all.length, 80);
  assert.ok(state.findings.length > 0);
});

test('saved work, hints, queries, timeline edits and report drafts survive restore with the unchanged format', () => {
  const state = C.createState(A);
  finishThrough(state, 'year1'); finishThrough(state, 'year2');
  C.revealHint(A, state, 'Y1-08', 0);
  state.reportDraft.year1.attacker = 'My profile notes';
  state.reportDraft.year2.mitigation = 'Review access regularly.';
  state.responses['Y2-08'].query = 'ApprovalEvents | where document_id == "DOC-CONNECTIVITY-01"';
  state.responses['Y2-08'].queryEdited = true;
  const timeline = state.findings.find(item => item.autoTimeline);
  timeline.summary = 'My revised timeline description'; timeline.autoTimeline.descriptionEdited = true;
  state.responses['Y1-08'].capture = { summary: 'An unfinished additional finding', timestamp: '', evidenceText: 'still checking this source', section: 'attacker', certainty: 'Observed' };
  const restored = C.restore(A, JSON.stringify(state));
  assert.equal(restored.version, 2); assert.equal(restored.activityId, 'mandy-high-five-guided'); assert.equal(restored.revision, 'guided-2026-10-09-timeline1');
  for (const track of A.tracks) assert.equal(C.frontier(A, restored, track.id), 40);
  assert.equal(C.score(A, restored, 'year1'), 398);
  assert.equal(restored.responses['Y2-08'].query, state.responses['Y2-08'].query);
  assert.equal(restored.responses['Y2-08'].queryEdited, true);
  assert.deepEqual(restored.reportDraft, state.reportDraft);
  assert.equal(restored.findings.find(item => item.id === timeline.id).summary, 'My revised timeline description');
  assert.deepEqual(restored.responses['Y1-08'].capture, state.responses['Y1-08'].capture);
  C.setAnswer(A, restored, 'Y1-08', 'A clearer explanation.');
  assert.equal(C.canAccess(A, restored, 'Y1-09'), false, 'an edited response still needs explicit submission');
  assert.equal(C.submit(A, restored, 'Y1-08').ok, true);
  assert.equal(C.frontier(A, restored, 'year1'), 40, 'later saved responses remain available');
});

test('the browser bundle and JSON deliver the same activity without changing its identity or question count', () => {
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(folder, 'activity-data.js'), 'utf8'), context);
  assert.deepEqual(JSON.parse(JSON.stringify(context.window.CAMPAIGN_ACTIVITY)), A);
  assert.equal(A.revision, 'guided-2026-10-09-timeline1');
  assert.match(A.practiceNotice, /save for teacher review/);
  assert.doesNotMatch(A.practiceNotice, /completeness check/);
});
