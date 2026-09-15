import type { ModuleDefinition } from "@/content/content-types";
import { labItemKey, lessonItemKey } from "./progress-item-keys";
import { QUIZ_PASS_PERCENT } from "./quiz-grader";

export interface ModuleProgress {
  lessonsDone: number;
  lessonsTotal: number;
  labsDone: number;
  labsTotal: number;
  bestQuizPercent: number | null;
  quizPassed: boolean;
  /** 0–100, counts each lesson, each lab and the quiz as one unit. */
  percent: number;
  isComplete: boolean;
}

/** A module is complete when every lesson and lab is done and the best quiz score passes. */
export function calculateModuleProgress(
  learningModule: ModuleDefinition,
  completedKeys: ReadonlySet<string>,
  bestQuizPercent: number | null,
): ModuleProgress {
  const lessonsDone = learningModule.lessons.filter((lesson) => completedKeys.has(lessonItemKey(learningModule.id, lesson.slug))).length;
  const labsDone = learningModule.labs.filter((lab) => completedKeys.has(labItemKey(learningModule.id, lab.id))).length;
  const quizPassed = bestQuizPercent !== null && bestQuizPercent >= QUIZ_PASS_PERCENT;

  const units = learningModule.lessons.length + learningModule.labs.length + 1;
  const doneUnits = lessonsDone + labsDone + (quizPassed ? 1 : 0);

  return {
    lessonsDone,
    lessonsTotal: learningModule.lessons.length,
    labsDone,
    labsTotal: learningModule.labs.length,
    bestQuizPercent,
    quizPassed,
    percent: Math.round((doneUnits / units) * 100),
    isComplete: doneUnits === units,
  };
}

/** Average of module percents — each module weighs the same regardless of size. */
export function calculateOverallPercent(moduleProgressList: ModuleProgress[]): number {
  if (moduleProgressList.length === 0) return 0;
  const sum = moduleProgressList.reduce((total, progress) => total + progress.percent, 0);
  return Math.round(sum / moduleProgressList.length);
}

export interface CourseProgressSummary {
  percent: number;
  modulesDone: number;
  modulesTotal: number;
  lessonsDone: number;
  lessonsTotal: number;
  labsDone: number;
  labsTotal: number;
  /** Any lesson, lab or quiz attempt recorded in the course. */
  hasStarted: boolean;
}

/** Rolls up the progress of one course's modules. */
export function summarizeCourseProgress(moduleProgressList: ModuleProgress[]): CourseProgressSummary {
  const sum = (pick: (progress: ModuleProgress) => number) => moduleProgressList.reduce((total, progress) => total + pick(progress), 0);
  return {
    percent: calculateOverallPercent(moduleProgressList),
    modulesDone: moduleProgressList.filter((progress) => progress.isComplete).length,
    modulesTotal: moduleProgressList.length,
    lessonsDone: sum((progress) => progress.lessonsDone),
    lessonsTotal: sum((progress) => progress.lessonsTotal),
    labsDone: sum((progress) => progress.labsDone),
    labsTotal: sum((progress) => progress.labsTotal),
    hasStarted: moduleProgressList.some((progress) => progress.lessonsDone > 0 || progress.labsDone > 0 || progress.bestQuizPercent !== null),
  };
}
