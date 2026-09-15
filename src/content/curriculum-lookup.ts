import type { CourseDefinition, ModuleDefinition, PhaseDefinition, PublicQuizQuestion } from "./content-types";
import { coursePhases, courses } from "./course-registry";
import { curriculumModules } from "./curriculum-registry";
import { labItemKey, lessonItemKey } from "@/lib/progress/progress-item-keys";

export type PhaseWithModules = PhaseDefinition & { modules: ModuleDefinition[] };

export function getAllCourses(): CourseDefinition[] {
  return courses;
}

export function getCourseBySlug(slug: string): CourseDefinition | undefined {
  return courses.find((course) => course.slug === slug);
}

export function getPhaseById(id: string): PhaseDefinition | undefined {
  return coursePhases.find((phase) => phase.id === id);
}

/** Every module belongs to the course of its phase; the registry test guarantees the phase exists. */
export function getCourseForModule(learningModule: ModuleDefinition): CourseDefinition {
  const courseId = getPhaseById(learningModule.phaseId)?.courseId;
  const course = courses.find((candidate) => candidate.id === courseId);
  if (!course) throw new Error(`Module ${learningModule.id} has no course (phase ${learningModule.phaseId})`);
  return course;
}

/** Modules of every course, each course in its own learning order. */
export function getAllModules(): ModuleDefinition[] {
  return courses.flatMap((course) => getModulesForCourse(course.id));
}

export function getModulesForCourse(courseId: string): ModuleDefinition[] {
  return curriculumModules
    .filter((learningModule) => getPhaseById(learningModule.phaseId)?.courseId === courseId)
    .sort((a, b) => a.order - b.order);
}

export function getModuleBySlug(slug: string): ModuleDefinition | undefined {
  return curriculumModules.find((learningModule) => learningModule.slug === slug);
}

export function getModuleById(id: string): ModuleDefinition | undefined {
  return curriculumModules.find((learningModule) => learningModule.id === id);
}

export function getPhasesWithModules(courseId: string): PhaseWithModules[] {
  const modules = getModulesForCourse(courseId);
  return coursePhases
    .filter((phase) => phase.courseId === courseId)
    .sort((a, b) => a.order - b.order)
    .map((phase) => ({ ...phase, modules: modules.filter((learningModule) => learningModule.phaseId === phase.id) }));
}

export function getLessonContext(moduleSlug: string, lessonSlug: string) {
  const learningModule = getModuleBySlug(moduleSlug);
  if (!learningModule) return undefined;
  const index = learningModule.lessons.findIndex((lesson) => lesson.slug === lessonSlug);
  if (index === -1) return undefined;
  return {
    learningModule,
    lesson: learningModule.lessons[index],
    index,
    previousLesson: learningModule.lessons[index - 1],
    nextLesson: learningModule.lessons[index + 1],
  };
}

let allProgressItemKeys: Set<string> | undefined;

/** Every progress key that exists in the curriculum — used to reject forged keys. Built once. */
export function getAllProgressItemKeys(): ReadonlySet<string> {
  if (allProgressItemKeys) return allProgressItemKeys;
  const keys = new Set<string>();
  for (const learningModule of curriculumModules) {
    learningModule.lessons.forEach((lesson) => keys.add(lessonItemKey(learningModule.id, lesson.slug)));
    learningModule.labs.forEach((lab) => keys.add(labItemKey(learningModule.id, lab.id)));
  }
  allProgressItemKeys = keys;
  return keys;
}

export function isKnownProgressItemKey(itemKey: string): boolean {
  return getAllProgressItemKeys().has(itemKey);
}

/** Strips answers/explanations before sending quiz questions to the browser. */
export function toPublicQuizQuestions(learningModule: ModuleDefinition): PublicQuizQuestion[] {
  return learningModule.quiz.map(({ id, question, options }) => ({ id, question, options }));
}
