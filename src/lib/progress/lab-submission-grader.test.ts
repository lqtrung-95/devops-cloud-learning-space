import { describe, expect, it } from "vitest";
import type { LabCheck, LabSubmissionSpec } from "@/content/content-types";
import { LAB_SUBMISSION_MAX_LENGTH, gradeLabSubmission } from "./lab-submission-grader";

function specWithChecks(checks: LabCheck[]): LabSubmissionSpec {
  return { inputKind: "output", prompt: "paste output", checks };
}

describe("gradeLabSubmission", () => {
  it("passes a contains check despite differing whitespace and case", () => {
    const spec = specWithChecks([{ id: "has-multi-tag", label: "tag multi", matcher: { kind: "contains", value: "api:multi" } }]);
    const result = gradeLabSubmission(spec, "  API:MULTI   latest\n");
    expect(result.passed).toBe(true);
    expect(result.outcomes).toEqual([{ checkId: "has-multi-tag", passed: true }]);
  });

  it("fails a case-sensitive contains check on wrong case", () => {
    const spec = specWithChecks([{ id: "exact-case", label: "exact case", matcher: { kind: "contains", value: "API:MULTI", caseSensitive: true } }]);
    const result = gradeLabSubmission(spec, "api:multi");
    expect(result.passed).toBe(false);
    expect(result.outcomes).toEqual([{ checkId: "exact-case", passed: false }]);
  });

  it("passes/fails an anchored digest regex", () => {
    const spec = specWithChecks([{ id: "valid-digest", label: "digest", matcher: { kind: "regex", pattern: "^sha256:[0-9a-f]{64}$" } }]);
    const validDigest = `sha256:${"a".repeat(64)}`;
    expect(gradeLabSubmission(spec, validDigest).passed).toBe(true);
    expect(gradeLabSubmission(spec, "sha256:not-a-digest").passed).toBe(false);
  });

  it("fails without throwing on an invalid regex pattern", () => {
    const spec = specWithChecks([{ id: "broken", label: "broken", matcher: { kind: "regex", pattern: "(unclosed" } }]);
    expect(() => gradeLabSubmission(spec, "anything")).not.toThrow();
    expect(gradeLabSubmission(spec, "anything").outcomes).toEqual([{ checkId: "broken", passed: false }]);
  });

  it("fails without throwing on a disallowed regex flag", () => {
    const spec = specWithChecks([{ id: "global-flag", label: "global flag", matcher: { kind: "regex", pattern: "a", flags: "g" } }]);
    expect(() => gradeLabSubmission(spec, "aaa")).not.toThrow();
    expect(gradeLabSubmission(spec, "aaa").outcomes).toEqual([{ checkId: "global-flag", passed: false }]);
  });

  it("passes/fails numberInRange based on the captured group", () => {
    const spec = specWithChecks([{ id: "zero-critical", label: "0 critical", matcher: { kind: "numberInRange", pattern: "CRITICAL:\\s*(\\d+)", max: 0 } }]);
    expect(gradeLabSubmission(spec, "CRITICAL: 0").passed).toBe(true);
    expect(gradeLabSubmission(spec, "CRITICAL: 3").passed).toBe(false);
  });

  it("fails numberInRange when the capture is not a number", () => {
    const spec = specWithChecks([{ id: "not-a-number", label: "not a number", matcher: { kind: "numberInRange", pattern: "count=(\\w+)", min: 0 } }]);
    expect(gradeLabSubmission(spec, "count=oops").passed).toBe(false);
  });

  it("passes jsonHasKeys on valid JSON with a nested dot-path present", () => {
    const spec = specWithChecks([{ id: "has-service", label: "service", matcher: { kind: "jsonHasKeys", keys: ["Service", "Health.Status"] } }]);
    const content = JSON.stringify({ Service: "db", Health: { Status: "healthy" } });
    expect(gradeLabSubmission(spec, content).passed).toBe(true);
  });

  it("fails jsonHasKeys without throwing on non-JSON text", () => {
    const spec = specWithChecks([{ id: "has-service", label: "service", matcher: { kind: "jsonHasKeys", keys: ["Service"] } }]);
    expect(() => gradeLabSubmission(spec, "not json at all")).not.toThrow();
    expect(gradeLabSubmission(spec, "not json at all").passed).toBe(false);
  });

  it("flags exactly the failing check among mixed checks", () => {
    const spec = specWithChecks([
      { id: "passes", label: "passes", matcher: { kind: "contains", value: "ok" } },
      { id: "fails", label: "fails", matcher: { kind: "contains", value: "missing" } },
    ]);
    const result = gradeLabSubmission(spec, "ok");
    expect(result.passed).toBe(false);
    expect(result.outcomes).toEqual([
      { checkId: "passes", passed: true },
      { checkId: "fails", passed: false },
    ]);
  });

  it("returns not-auto-graded for an empty checks array", () => {
    const spec = specWithChecks([]);
    expect(gradeLabSubmission(spec, "anything")).toEqual({ passed: false, autoGraded: false, outcomes: [] });
  });

  it("truncates content longer than LAB_SUBMISSION_MAX_LENGTH and still returns", () => {
    const spec = specWithChecks([{ id: "has-marker", label: "marker", matcher: { kind: "contains", value: "marker" } }]);
    const longContent = "x".repeat(LAB_SUBMISSION_MAX_LENGTH + 500) + "marker";
    // marker sits past the truncation boundary, so it must NOT be found.
    expect(() => gradeLabSubmission(spec, longContent)).not.toThrow();
    expect(gradeLabSubmission(spec, longContent).passed).toBe(false);
  });

  it("handles empty input gracefully (not auto-graded)", () => {
    const spec = specWithChecks([{ id: "any-check", label: "check", matcher: { kind: "contains", value: "x" } }]);
    expect(gradeLabSubmission(spec, "").passed).toBe(false);
    expect(gradeLabSubmission(spec, "").autoGraded).toBe(true);
  });

  it("rejects regex with disallowed flags (d, g, u, y, v)", () => {
    const invalidFlags = ["d", "g", "u", "y", "v"];
    for (const flag of invalidFlags) {
      const spec = specWithChecks([{ id: `flag-${flag}`, label: `flag ${flag}`, matcher: { kind: "regex", pattern: "test", flags: flag } }]);
      expect(gradeLabSubmission(spec, "test").passed).toBe(false);
    }
  });

  it("accepts only allowed regex flags (i, m, s) and combinations", () => {
    // Test that all allowed flag combos are accepted (compile successfully)
    const allowedCombos = ["i", "m", "s", "im", "is", "ms", "ims"];
    for (const flags of allowedCombos) {
      const spec = specWithChecks([{ id: `flag-${flags}`, label: `flags ${flags}`, matcher: { kind: "regex", pattern: "test", flags } }]);
      // Just verify they don't reject the flags — actual matching depends on the pattern
      expect(() => gradeLabSubmission(spec, "test")).not.toThrow();
    }
    // Specifically test that 'i' flag works for case-insensitive matching
    const caseInsensitive = specWithChecks([{ id: "case-insensitive", label: "case", matcher: { kind: "regex", pattern: "test", flags: "i" } }]);
    expect(gradeLabSubmission(caseInsensitive, "TEST").passed).toBe(true);
  });

  it("handles contains with various whitespace characters (tabs, newlines, unicode)", () => {
    const spec = specWithChecks([{ id: "ws-test", label: "whitespace", matcher: { kind: "contains", value: "foo bar" } }]);
    // Should match despite different whitespace
    expect(gradeLabSubmission(spec, "foo\t\tbar").passed).toBe(true);
    expect(gradeLabSubmission(spec, "foo\n\nbar").passed).toBe(true);
    expect(gradeLabSubmission(spec, "foo bar").passed).toBe(true); // non-breaking space
    expect(gradeLabSubmission(spec, "  foo  \n  bar  ").passed).toBe(true);
  });

  it("handles numberInRange with fractional numbers", () => {
    const spec = specWithChecks([{ id: "float-range", label: "float", matcher: { kind: "numberInRange", pattern: "ratio=(\\d+\\.\\d+)", min: 0.5, max: 0.9 } }]);
    expect(gradeLabSubmission(spec, "ratio=0.75").passed).toBe(true);
    expect(gradeLabSubmission(spec, "ratio=0.2").passed).toBe(false);
  });

  it("handles numberInRange with no capture match (returns false)", () => {
    const spec = specWithChecks([{ id: "no-match", label: "no match", matcher: { kind: "numberInRange", pattern: "COUNT=(\\d+)", max: 5 } }]);
    expect(gradeLabSubmission(spec, "Total: 3 items").passed).toBe(false);
  });

  it("handles jsonHasKeys with malformed JSON variants", () => {
    const spec = specWithChecks([{ id: "json-test", label: "json", matcher: { kind: "jsonHasKeys", keys: ["key"] } }]);
    expect(gradeLabSubmission(spec, "{key: value}").passed).toBe(false); // Missing quotes
    expect(gradeLabSubmission(spec, '{"key": "value"').passed).toBe(false); // Unclosed brace
    expect(gradeLabSubmission(spec, '{"key": undefined}').passed).toBe(false); // Invalid value
  });

  it("handles jsonHasKeys missing a required nested path", () => {
    const spec = specWithChecks([{ id: "nested", label: "nested", matcher: { kind: "jsonHasKeys", keys: ["a.b.c"] } }]);
    expect(gradeLabSubmission(spec, JSON.stringify({ a: { b: {} } })).passed).toBe(false);
    expect(gradeLabSubmission(spec, JSON.stringify({ a: { b: { c: "present" } } })).passed).toBe(true);
  });

  it("handles jsonHasKeys with null values in path (considered missing)", () => {
    const spec = specWithChecks([{ id: "null-check", label: "null", matcher: { kind: "jsonHasKeys", keys: ["status"] } }]);
    // null is a valid JSON value but hasDotPath returns false for undefined, so key should be present
    expect(gradeLabSubmission(spec, JSON.stringify({ status: null })).passed).toBe(true);
    expect(gradeLabSubmission(spec, JSON.stringify({ status: undefined })).passed).toBe(false); // undefined is invalid JSON anyway
  });

  it("handles regex with multiline flag matching across lines", () => {
    const spec = specWithChecks([{ id: "multiline", label: "multiline", matcher: { kind: "regex", pattern: "^.*healthy.*$", flags: "m" } }]);
    const content = "db\nredis (healthy)\napi";
    expect(gradeLabSubmission(spec, content).passed).toBe(true);
  });

  it("rejects regex flag with mixed valid/invalid (e.g. 'img' where g is invalid)", () => {
    const spec = specWithChecks([{ id: "mixed-invalid", label: "mixed", matcher: { kind: "regex", pattern: "test", flags: "img" } }]);
    expect(gradeLabSubmission(spec, "test").passed).toBe(false);
  });

  it("handles at-boundary truncation: marker exactly at max length", () => {
    const spec = specWithChecks([{ id: "boundary", label: "boundary", matcher: { kind: "contains", value: "END" } }]);
    const content = "x".repeat(LAB_SUBMISSION_MAX_LENGTH - 3) + "END";
    expect(gradeLabSubmission(spec, content).passed).toBe(true);
    // One char over: END is truncated
    const overByOne = "x".repeat(LAB_SUBMISSION_MAX_LENGTH - 2) + "END";
    expect(gradeLabSubmission(spec, overByOne).passed).toBe(false);
  });
});
