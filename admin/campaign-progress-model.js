'use strict';
(function (root, factory) {
  const core = typeof module === 'object' && module.exports
    ? require('../learn/osint/campaign-player/player-core.js') : root.CampaignPlayerCore;
  const api = factory(core);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.CampaignTeacherModel = api;
})(typeof window === 'object' ? window : null, function (C) {
  if (!C) throw new Error('Load CampaignPlayerCore before CampaignTeacherModel.');
  const text = value => typeof value === 'string' ? value : '';
  const clone = value => JSON.parse(JSON.stringify(value));
  const trackFor = (activity, id) => activity.tracks.find(track => track.id === id);

  function summarize(activity, state, trackId, savedState = state) {
    const track = trackFor(activity, trackId);
    if (!track) throw new Error('Choose an available investigation track.');
    const list = C.questions(activity, trackId), completed = C.frontier(activity, state, trackId);
    const next = list[completed] || null;
    // restore supplies a usable current question when a saved cursor is absent
    // or relocked. That fallback is not evidence of which question was viewed.
    const viewed = list.find(question => question.id === savedState?.activeQuestion?.[trackId]) || null;
    const hasResponseWork = question => {
      const response = state.responses[question.id];
      return !!(response && (response.answer.trim() || response.query.trim() || response.queryEdited || response.hints.length || response.capture.summary.trim()));
    };
    let offset = 0;
    return {
      id: track.id, label: track.label, total: list.length, completed,
      percent: list.length ? Math.round(completed / list.length * 100) : 0,
      score: C.score(activity, state, trackId), maxScore: list.length * activity.scoring.pointsPerQuestion,
      hintsUsed: list.reduce((total, question) => total + (state.responses[question.id]?.hints.length || 0), 0),
      nextQuestionId: next?.id || null, nextQuestionTitle: next?.title || null,
      lastViewedQuestionId: viewed?.id || null, lastViewedQuestionTitle: viewed?.title || null,
      retainedChecked: list.slice(completed + 1).filter(question => C.isComplete(activity, state, question.id)).length,
      draftCount: list.filter(question => state.responses[question.id]?.answer.trim() && !C.isComplete(activity, state, question.id)).length,
      hasWork: list.some(hasResponseWork),
      sections: track.sections.map(section => {
        const summary = { id: section.id, title: section.title, total: section.questions.length, completed: Math.max(0, Math.min(section.questions.length, completed - offset)) };
        offset += section.questions.length;
        return summary;
      })
    };
  }

  /**
   * Overview rows contain server roster/save metadata and a progress_state with
   * only version, activityId, revision, trackId, activeQuestion and responses.
   * Returns metadata plus tracks[] and track (the assigned/preferred summary).
   * Summary completed/score match the student player's contiguous frontier.
   * retainedChecked reports checked work beyond an edited earlier response.
   * No save is distinct from an empty saved snapshot; malformed saves return an
   * explicit invalid status, never a fabricated successful save. updatedAt is
   * the server's last save, not live presence. All text must be rendered as text.
   */
  function normalizeOverview(activity, row) {
    row = row && typeof row === 'object' ? row : {};
    const hasProgress = row.has_progress === true;
    let state = C.createState(activity), error = null;
    if (hasProgress) {
      try { state = C.restore(activity, row.progress_state); }
      catch (_) { error = 'This saved investigation could not be read with the current activity.'; }
    }
    const preferred = trackFor(activity, row.track_id) || trackFor(activity, state.trackId) || activity.tracks[0];
    const tracks = activity.tracks.map(track => summarize(activity, state, track.id, hasProgress && !error ? row.progress_state : null));
    return {
      userId: text(row.user_id), assignmentId: text(row.assignment_id),
      username: text(row.username), classLabel: text(row.class_label), trackId: preferred.id,
      isTest: row.is_test === true, enabled: row.enabled === true, hasProgress,
      revision: hasProgress ? row.revision ?? null : null,
      updatedAt: hasProgress ? text(row.updated_at) || null : null,
      activityRevision: hasProgress ? text(row.progress_state?.revision) || null : null,
      lastActiveTrackId: hasProgress && !error ? state.trackId : null,
      saveStatus: error ? 'invalid' : hasProgress ? 'saved' : 'not-saved', error,
      tracks, track: tracks.find(track => track.id === preferred.id)
    };
  }

  /**
   * Detailed read-only view of one full saved state, separated by track.
   * A null/undefined state means no online save and returns empty work; an
   * incompatible non-null save throws instead of hiding a format problem.
   * questions includes checked/draft/empty status, source wording, selected
   * choice text, and saved query drafts. A checked item may be retained behind
   * the frontier; accessible identifies what the student can currently open.
   * Findings omit legacy certainty fields; queries include all retained runs,
   * including runs beyond the current frontier, newest first. Neither is an
   * exhaustive history of attempts. Restoring recreates automatic timeline
   * entries exactly as the student player does, without changing the input.
   */
  function details(activity, fullStoredState, trackId) {
    const track = trackFor(activity, trackId);
    if (!track) throw new Error('Choose an available investigation track.');
    const state = fullStoredState == null ? C.restore(activity, C.createState(activity)) : C.restore(activity, fullStoredState);
    const savedState = fullStoredState == null ? null : typeof fullStoredState === 'string' ? JSON.parse(fullStoredState) : fullStoredState;
    const summary = summarize(activity, state, trackId, savedState);
    const questions = track.sections.flatMap(section => section.questions.map(question => {
      const response = state.responses[question.id], checked = C.isComplete(activity, state, question.id);
      const accessible = C.canAccess(activity, state, question.id);
      return {
        id: question.id, title: question.title, prompt: question.prompt, type: question.type,
        sectionId: section.id, sectionTitle: section.title,
        status: checked ? 'checked' : response.answer.trim() ? 'draft' : 'empty',
        accessible, retained: checked && !accessible,
        answer: response.answer,
        answerText: question.type === 'choice' ? (question.options?.find(option => option.id === response.answer)?.text || response.answer) : response.answer,
        submittedAnswer: response.submittedAnswer,
        hintsUsed: response.hints.length, query: response.query
      };
    }));
    const findings = C.SECTIONS.flatMap(section => C.orderedFindings(activity, state, trackId, section).map(item => {
      const { certainty, ...finding } = item;
      return clone(finding);
    }));
    const queryRuns = state.queryRuns.filter(item => C.locate(activity, item.questionId)?.track.id === trackId).slice().reverse().map(clone);
    return { trackId, trackLabel: track.label, summary, questions, reportDraft: clone(state.reportDraft[trackId]), findings, queryRuns };
  }
  return Object.freeze({ normalizeOverview, details });
});
