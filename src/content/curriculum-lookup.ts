import type { ModuleDefinition, PhaseDefinition, PublicQuizQuestion } from "./content-types";
import { curriculumPhases } from "./curriculum-phases";
import { curriculumModules } from "./curriculum-registry";
import { labItemKey, lessonItemKey } from "@/lib/progress/progress-item-keys";

export function getAllModules(): ModuleDefinition[] {
  return [...curriculumModules].sort((a, b) => a.order - b.order);
}

export function getModuleBySlug(slug: string): ModuleDefinition | undefined {
  return curriculumModules.find((learningModule) => learningModule.slug === slug);
}

export function getModuleById(id: string): ModuleDefinition | undefined {
  return curriculumModules.find((learningModule) => learningModule.id === id);
}

export function getPhasesWithModules(): Array<PhaseDefinition & { modules: ModuleDefinition[] }> {
  const modules = getAllModules();
  return [...curriculumPhases]
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

/** Every progress key that exists in the curriculum — used to reject forged keys. */
export function getAllProgressItemKeys(): Set<string> {
  const keys = new Set<string>();
  for (const learningModule of curriculumModules) {
    learningModule.lessons.forEach((lesson) => keys.add(lessonItemKey(learningModule.id, lesson.slug)));
    learningModule.labs.forEach((lab) => keys.add(labItemKey(learningModule.id, lab.id)));
  }
  return keys;
}

export function isKnownProgressItemKey(itemKey: string): boolean {
  return getAllProgressItemKeys().has(itemKey);
}

/** Strips answers/explanations before sending quiz questions to the browser. */
export function toPublicQuizQuestions(learningModule: ModuleDefinition): PublicQuizQuestion[] {
  return learningModule.quiz.map(({ id, question, options }) => ({ id, question, options }));
}
