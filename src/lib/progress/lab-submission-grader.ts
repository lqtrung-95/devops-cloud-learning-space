import type { LabCheck, LabSubmissionSpec } from "@/content/content-types";

/**
 * Pure grading engine for lab submissions — no I/O, no `server-only` import, so both
 * Vitest and the server action (phase 02) can call it. Must never throw: a malformed
 * authored spec or hostile learner input becomes a failing outcome, not a 500.
 */

export const LAB_SUBMISSION_MAX_LENGTH = 10_000; // chars, enforced again in the action
const ALLOWED_REGEX_FLAGS = /^[ims]*$/;

export interface LabCheckOutcome {
  checkId: string;
  passed: boolean;
}

export interface LabGradeResult {
  /** Every check passed AND checks.length > 0. */
  passed: boolean;
  /** checks.length > 0 — distinguishes a real grade from an evidence-only submission. */
  autoGraded: boolean;
  outcomes: LabCheckOutcome[];
}

/** Collapses runs of whitespace to one space and trims; used before `contains` matching. */
function normalizeWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function matchContains(matcher: Extract<LabCheck["matcher"], { kind: "contains" }>, content: string): boolean {
  const normalizedContent = normalizeWhitespace(matcher.caseSensitive ? content : content.toLowerCase());
  const normalizedValue = normalizeWhitespace(matcher.caseSensitive ? matcher.value : matcher.value.toLowerCase());
  return normalizedContent.includes(normalizedValue);
}

function compileRegex(pattern: string, flags: string | undefined): RegExp | null {
  if (flags !== undefined && !ALLOWED_REGEX_FLAGS.test(flags)) return null;
  try {
    return new RegExp(pattern, flags ?? "");
  } catch {
    return null;
  }
}

function matchRegex(matcher: Extract<LabCheck["matcher"], { kind: "regex" }>, content: string): boolean {
  const regex = compileRegex(matcher.pattern, matcher.flags);
  if (!regex) return false;
  return regex.test(content);
}

function matchNumberInRange(matcher: Extract<LabCheck["matcher"], { kind: "numberInRange" }>, content: string): boolean {
  const regex = compileRegex(matcher.pattern, undefined);
  if (!regex) return false;
  const match = regex.exec(content);
  if (!match) return false;
  const value = Number.parseFloat(match[1]);
  if (Number.isNaN(value)) return false;
  if (matcher.min !== undefined && value < matcher.min) return false;
  if (matcher.max !== undefined && value > matcher.max) return false;
  return true;
}

/** Reads a dot-path (`a.b.c`) out of a parsed JSON value; missing/undefined at any hop fails. */
function hasDotPath(value: unknown, dotPath: string): boolean {
  let current: unknown = value;
  for (const segment of dotPath.split(".")) {
    if (typeof current !== "object" || current === null || !(segment in current)) return false;
    current = (current as Record<string, unknown>)[segment];
  }
  return current !== undefined;
}

function matchJsonHasKeys(matcher: Extract<LabCheck["matcher"], { kind: "jsonHasKeys" }>, content: string): boolean {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return false;
  }
  return matcher.keys.every((key) => hasDotPath(parsed, key));
}

function runCheck(check: LabCheck, content: string): LabCheckOutcome {
  const passed = (() => {
    switch (check.matcher.kind) {
      case "contains":
        return matchContains(check.matcher, content);
      case "regex":
        return matchRegex(check.matcher, content);
      case "numberInRange":
        return matchNumberInRange(check.matcher, content);
      case "jsonHasKeys":
        return matchJsonHasKeys(check.matcher, content);
    }
  })();
  return { checkId: check.id, passed };
}

/** Grades a learner's pasted submission against an author-written spec. Total function — never throws. */
export function gradeLabSubmission(spec: LabSubmissionSpec, content: string): LabGradeResult {
  const truncated = content.slice(0, LAB_SUBMISSION_MAX_LENGTH);

  if (spec.checks.length === 0) {
    return { passed: false, autoGraded: false, outcomes: [] };
  }

  const outcomes = spec.checks.map((check) => runCheck(check, truncated));
  return { passed: outcomes.every((outcome) => outcome.passed), autoGraded: true, outcomes };
}
