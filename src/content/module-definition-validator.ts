import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { ModuleDefinition } from "./content-types";

/**
 * Structural + editorial checks for one content module. Used by unit tests and by
 * `pnpm validate:module <slug>` so content authors get fast feedback.
 * Returns human-readable problems; empty array = valid.
 */

const MODULES_DIR = path.join(process.cwd(), "src/content/modules");
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const contentRules = {
  minLessons: 3,
  maxLessons: 6,
  minQuizQuestions: 8,
  maxQuizQuestions: 12,
  minLabs: 2,
};

function findDuplicates(values: string[]): string[] {
  return values.filter((value, index) => values.indexOf(value) !== index);
}

export function validateModuleDefinition(learningModule: ModuleDefinition): string[] {
  const problems: string[] = [];
  const where = (detail: string) => `[${learningModule.slug}] ${detail}`;

  if (!/^m\d{2}$/.test(learningModule.id)) problems.push(where(`id "${learningModule.id}" must look like m01`));
  if (!learningModule.slug.startsWith(`${learningModule.id}-`) || !SLUG_PATTERN.test(learningModule.slug)) {
    problems.push(where(`slug must be kebab-case and start with "${learningModule.id}-"`));
  }
  if (!existsSync(path.join(MODULES_DIR, learningModule.slug))) problems.push(where("module folder does not exist"));

  const { lessons, labs, quiz } = learningModule;
  if (lessons.length < contentRules.minLessons || lessons.length > contentRules.maxLessons) {
    problems.push(where(`needs ${contentRules.minLessons}-${contentRules.maxLessons} lessons, has ${lessons.length}`));
  }
  if (labs.length < contentRules.minLabs) problems.push(where(`needs at least ${contentRules.minLabs} labs`));
  if (quiz.length < contentRules.minQuizQuestions || quiz.length > contentRules.maxQuizQuestions) {
    problems.push(where(`needs ${contentRules.minQuizQuestions}-${contentRules.maxQuizQuestions} quiz questions, has ${quiz.length}`));
  }
  if (learningModule.objectives.length === 0) problems.push(where("objectives are empty"));
  if (learningModule.resources.length === 0) problems.push(where("resources are empty"));

  for (const duplicate of findDuplicates(lessons.map((lesson) => lesson.slug))) problems.push(where(`duplicate lesson slug ${duplicate}`));
  for (const duplicate of findDuplicates(labs.map((lab) => lab.id))) problems.push(where(`duplicate lab id ${duplicate}`));
  for (const duplicate of findDuplicates(quiz.map((question) => question.id))) problems.push(where(`duplicate quiz id ${duplicate}`));

  for (const lesson of lessons) {
    if (!SLUG_PATTERN.test(lesson.slug)) problems.push(where(`lesson slug "${lesson.slug}" must be kebab-case`));
    const lessonFile = path.join(MODULES_DIR, learningModule.slug, "lessons", `${lesson.slug}.mdx`);
    if (!existsSync(lessonFile)) {
      problems.push(where(`missing lesson file lessons/${lesson.slug}.mdx`));
      continue;
    }
    const source = readFileSync(lessonFile, "utf8");
    if (!source.includes("<Eli5")) problems.push(where(`lesson ${lesson.slug} has no <Eli5> box`));
    if (!/import\s+\{[^}]+\}\s+from\s+"\.\.\/diagrams\//.test(source)) problems.push(where(`lesson ${lesson.slug} imports no diagram`));
    if (!source.includes("<Technical")) problems.push(where(`lesson ${lesson.slug} has no <Technical> section`));
    if (!source.includes("<KeyTerms")) problems.push(where(`lesson ${lesson.slug} has no <KeyTerms> recap`));
    if (!source.includes("<QuickCheck")) problems.push(where(`lesson ${lesson.slug} has no <QuickCheck>`));
    for (const match of source.matchAll(/from\s+"\.\.\/diagrams\/([^"]+)"/g)) {
      if (!existsSync(path.join(MODULES_DIR, learningModule.slug, "diagrams", `${match[1]}.tsx`))) {
        problems.push(where(`lesson ${lesson.slug} imports missing diagram ${match[1]}.tsx`));
      }
    }
  }

  for (const lab of labs) {
    if (!SLUG_PATTERN.test(lab.id)) problems.push(where(`lab id "${lab.id}" must be kebab-case`));
    if (lab.steps.length < 3) problems.push(where(`lab ${lab.id} needs at least 3 steps`));
  }

  for (const question of quiz) {
    if (question.options.length < 3) problems.push(where(`quiz ${question.id} needs at least 3 options`));
    if (!Number.isInteger(question.answerIndex) || question.answerIndex < 0 || question.answerIndex >= question.options.length) {
      problems.push(where(`quiz ${question.id} answerIndex out of range`));
    }
    if (findDuplicates(question.options).length > 0) problems.push(where(`quiz ${question.id} has duplicate options`));
    if (!question.explanation.trim()) problems.push(where(`quiz ${question.id} has no explanation`));
  }

  return problems;
}
