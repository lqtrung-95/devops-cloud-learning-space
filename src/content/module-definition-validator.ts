import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { LabSubmissionSpec, ModuleDefinition } from "./content-types";
import { coursePhases } from "./course-registry";

/**
 * Structural + editorial checks for one content module. Used by unit tests and by
 * `pnpm validate:module <slug>` so content authors get fast feedback.
 * Returns human-readable problems; empty array = valid.
 */

const MODULES_DIR = path.join(process.cwd(), "src/content/modules");
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const ALLOWED_REGEX_FLAGS = /^[ims]*$/;
// Matches quiz question text that can only be answered by seeing the option list
// (e.g. "which of the following...") — those questions need a standalone `recallPrompt`
// to work as a flashcard front.
const OPTION_DEPENDENT_PATTERN = /nào (sau đây|dưới đây)|phát biểu nào|đáp án nào|câu nào/i;

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

  if (!/^[a-z]+\d{2}$/.test(learningModule.id)) problems.push(where(`id "${learningModule.id}" must look like m01 or sd01`));
  if (!coursePhases.some((phase) => phase.id === learningModule.phaseId)) problems.push(where(`phaseId "${learningModule.phaseId}" does not exist`));
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
    if (lab.submission) validateLabSubmission(lab.submission, lab.id, where, problems);
  }

  for (const question of quiz) {
    if (question.options.length < 3) problems.push(where(`quiz ${question.id} needs at least 3 options`));
    if (!Number.isInteger(question.answerIndex) || question.answerIndex < 0 || question.answerIndex >= question.options.length) {
      problems.push(where(`quiz ${question.id} answerIndex out of range`));
    }
    if (findDuplicates(question.options).length > 0) problems.push(where(`quiz ${question.id} has duplicate options`));
    if (!question.explanation.trim()) problems.push(where(`quiz ${question.id} has no explanation`));
    if (OPTION_DEPENDENT_PATTERN.test(question.question) && !question.recallPrompt?.trim()) {
      problems.push(where(`quiz ${question.id} is option-dependent — add recallPrompt`));
    }
    if (question.recallPrompt !== undefined && !question.recallPrompt.trim()) {
      problems.push(where(`quiz ${question.id} recallPrompt is blank`));
    }
  }

  return problems;
}

/** Validates one lab's optional submission spec — only called when `lab.submission` is set. */
function validateLabSubmission(submission: LabSubmissionSpec, labId: string, where: (detail: string) => string, problems: string[]): void {
  if (!submission.prompt.trim()) problems.push(where(`lab ${labId} submission prompt is empty`));

  for (const duplicate of findDuplicates(submission.checks.map((check) => check.id))) {
    problems.push(where(`lab ${labId} has duplicate check id ${duplicate}`));
  }

  for (const check of submission.checks) {
    if (!SLUG_PATTERN.test(check.id)) problems.push(where(`lab ${labId} check id "${check.id}" must be kebab-case`));
    if (!check.label.trim()) problems.push(where(`lab ${labId} check ${check.id} has an empty label`));

    switch (check.matcher.kind) {
      case "contains":
        if (!check.matcher.value.trim()) problems.push(where(`lab ${labId} check ${check.id} (contains) has an empty value`));
        break;
      case "regex":
        validateRegexMatcher(check.matcher.pattern, check.matcher.flags, labId, check.id, where, problems);
        break;
      case "numberInRange": {
        const isValidRegex = validateRegexMatcher(check.matcher.pattern, undefined, labId, check.id, where, problems);
        if (isValidRegex) {
          // Counts `(` not followed by `?` (i.e. not a non-capturing/lookaround group) — good enough for the simple authored patterns this validator sees.
          const captureGroups = (check.matcher.pattern.match(/\((?!\?)/g) ?? []).length;
          if (captureGroups !== 1) problems.push(where(`lab ${labId} check ${check.id} (numberInRange) pattern must have exactly 1 capture group`));
        }
        if (check.matcher.min === undefined && check.matcher.max === undefined) {
          problems.push(where(`lab ${labId} check ${check.id} (numberInRange) needs at least one of min/max`));
        }
        break;
      }
      case "jsonHasKeys":
        if (check.matcher.keys.length === 0) problems.push(where(`lab ${labId} check ${check.id} (jsonHasKeys) needs at least 1 key`));
        break;
    }
  }
}

/** Compiles a regex + flags, pushing a problem on failure. Returns whether it compiled. */
function validateRegexMatcher(
  pattern: string,
  flags: string | undefined,
  labId: string,
  checkId: string,
  where: (detail: string) => string,
  problems: string[],
): boolean {
  if (flags !== undefined && !ALLOWED_REGEX_FLAGS.test(flags)) {
    problems.push(where(`lab ${labId} check ${checkId} regex flags "${flags}" must be a subset of "ims"`));
    return false;
  }
  try {
    new RegExp(pattern, flags ?? "");
    return true;
  } catch {
    problems.push(where(`lab ${labId} check ${checkId} regex pattern does not compile: ${pattern}`));
    return false;
  }
}
