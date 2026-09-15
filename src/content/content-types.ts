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

export interface LabDefinition {
  /** Stable id used in progress keys — never rename once published. */
  id: string;
  title: string;
  description: string;
  steps: string[];
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  answerIndex: number;
  /** Shown after submitting — explain why, ideally with the ELI5 analogy. */
  explanation: string;
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
