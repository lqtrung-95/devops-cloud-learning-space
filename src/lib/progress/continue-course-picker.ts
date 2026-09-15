import type { CourseProgressSummary } from "./module-progress-calculator";

function isUnfinished(summary: CourseProgressSummary | undefined): boolean {
  return Boolean(summary && summary.modulesTotal > 0 && summary.modulesDone < summary.modulesTotal);
}

/**
 * Which course the dashboard's "continue learning" banner should point at:
 * the course the learner touched most recently, else the first started course,
 * else the first course with content left (so new and "finished one course" learners still get a next step).
 */
export function pickContinueCourseId(
  courseIdsInDisplayOrder: readonly string[],
  summaries: ReadonlyMap<string, CourseProgressSummary>,
  lastActiveCourseId: string | null,
): string | undefined {
  if (lastActiveCourseId && isUnfinished(summaries.get(lastActiveCourseId))) return lastActiveCourseId;
  return (
    courseIdsInDisplayOrder.find((id) => summaries.get(id)?.hasStarted && isUnfinished(summaries.get(id))) ??
    courseIdsInDisplayOrder.find((id) => isUnfinished(summaries.get(id)))
  );
}
