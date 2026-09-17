/**
 * Content model for the curriculum. Each module lives in
 * `src/content/modules/<module-slug>/` with `module-meta.ts`,
 * `lessons/<lesson-slug>.mdx` and `diagrams/*.tsx`.
 */

export interface CourseDefinition {
  id: string;
  /** URL segment: `/courses/<slug>`. */
  slug: string;
  title: string;
  emoji: string;
  /** Short badge line, e.g. "AWS-first · 28 tuần". */
  tagline: string;
  description: string;
  weeksTotal: number;
  hoursPerWeek: number;
}

/** A phase belongs to exactly one course; a module's course is derived from its phase. */
export interface PhaseDefinition {
  /** Unique across all courses. */
  id: string;
  courseId: string;
  order: number;
  title: string;
  weeks: string;
  emoji: string;
  description: string;
}

export interface LessonDefinition {
  /** Must match the MDX filename: `lessons/<slug>.mdx`. */
  slug: string;
  title: string;
  /** Estimated reading + hands-on time. */
  minutes: number;
  summary: string;
}

export type LabCheckMatcher =
  /** Normalized substring match (trim + collapse whitespace, case-insensitive by default). */
  | { kind: "contains"; value: string; caseSensitive?: boolean }
  /** Author-written regex. `flags` limited to i/m/s. */
  | { kind: "regex"; pattern: string; flags?: string }
  /** `pattern` must have exactly 1 capture group; its value is parsed as a number and range-checked. */
  | { kind: "numberInRange"; pattern: string; min?: number; max?: number }
  /** Submitted text must parse as JSON and contain every dot-path. */
  | { kind: "jsonHasKeys"; keys: string[] };

export interface LabCheck {
  /** kebab-case, stable — stored in submission history. */
  id: string;
  /** Vietnamese, shown BEFORE submitting so the learner knows what is verified. */
  label: string;
  /** Vietnamese nudge shown only when this check fails. Never reveal the matcher. */
  hint?: string;
  matcher: LabCheckMatcher;
}

export interface LabSubmissionSpec {
  /** `output` = multiline paste; `url` = a link; `value` = one short token. Drives the input widget. */
  inputKind: "output" | "url" | "value";
  /** Vietnamese: the exact command to run and what to paste back. */
  prompt: string;
  /** Empty = evidence-only lab (stored, self-attested, no auto-grade). */
  checks: LabCheck[];
}

export interface LabDefinition {
  /** Stable id used in progress keys — never rename once published. */
  id: string;
  title: string;
  description: string;
  steps: string[];
  /** Optional — labs without it keep the legacy self-tick checkbox. */
  submission?: LabSubmissionSpec;
}

/** Lab submission spec as sent to the browser — matchers stay on the server, hint text is safe to ship (it never restates the matcher). */
export interface PublicLabSubmissionSpec {
  inputKind: LabSubmissionSpec["inputKind"];
  prompt: string;
  checks: Array<Pick<LabCheck, "id" | "label" | "hint">>;
}

/** Lab as sent to the browser — matchers stripped so the client bundle never carries an answer key. */
export interface PublicLabDefinition {
  id: string;
  title: string;
  description: string;
  steps: string[];
  submission?: PublicLabSubmissionSpec;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  answerIndex: number;
  /** Shown after submitting — explain why, ideally with the ELI5 analogy. */
  explanation: string;
  /** Standalone re-phrasing used when the question is asked without its options. */
  recallPrompt?: string;
}

export interface ResourceLink {
  title: string;
  url: string;
  kind: "doc" | "book" | "course" | "tool" | "video" | "practice";
}

export interface ModuleDefinition {
  /** Short id used in progress keys, e.g. "m01" or "sd01" — unique across all courses. */
  id: string;
  /** Folder name and URL segment, e.g. "m01-linux-shell" — unique across all courses. */
  slug: string;
  phaseId: string;
  /** Learning order within the module's course. */
  order: number;
  weeks: string;
  title: string;
  emoji: string;
  /** One or two sentences, everyday analogy, no jargon. */
  eli5Summary: string;
  objectives: string[];
  lessons: LessonDefinition[];
  labs: LabDefinition[];
  deliverable: string;
  successCriteria: string;
  resources: ResourceLink[];
  quiz: QuizQuestion[];
}

/** Quiz question as sent to the browser — the answer stays on the server. */
export type PublicQuizQuestion = Omit<QuizQuestion, "answerIndex" | "explanation">;
