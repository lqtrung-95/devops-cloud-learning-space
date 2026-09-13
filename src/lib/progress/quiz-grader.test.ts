import { describe, expect, it } from "vitest";
import type { QuizQuestion } from "@/content/content-types";
import { gradeQuiz, toPercent } from "./quiz-grader";

const questions: QuizQuestion[] = Array.from({ length: 5 }, (_, index) => ({
  id: `q${index}`,
  question: `Question ${index}`,
  options: ["a", "b", "c"],
  answerIndex: index % 3,
  explanation: `Because ${index}`,
}));

describe("gradeQuiz", () => {
  it("scores all-correct answers as passed", () => {
    const grade = gradeQuiz(questions, [0, 1, 2, 0, 1]);
    expect(grade).toMatchObject({ score: 5, total: 5, percent: 100, passed: true });
  });

  it("passes exactly at the 80% threshold", () => {
    const grade = gradeQuiz(questions, [0, 1, 2, 0, 2]);
    expect(grade.percent).toBe(80);
    expect(grade.passed).toBe(true);
  });

  it("fails below the threshold and reports each result with explanation", () => {
    const grade = gradeQuiz(questions, [0, 0, 0, 0, 0]);
    expect(grade.score).toBe(2);
    expect(grade.passed).toBe(false);
    expect(grade.results[1]).toEqual({ questionId: "q1", selectedIndex: 0, correctIndex: 1, isCorrect: false, explanation: "Because 1" });
  });

  it("treats missing or invalid answers as unanswered", () => {
    const grade = gradeQuiz(questions, [0, Number.NaN]);
    expect(grade.results[1].selectedIndex).toBe(-1);
    expect(grade.results[4].selectedIndex).toBe(-1);
    expect(grade.score).toBe(1);
  });
});

describe("toPercent", () => {
  it("handles zero total", () => {
    expect(toPercent(0, 0)).toBe(0);
  });

  it("rounds to whole percent", () => {
    expect(toPercent(2, 3)).toBe(67);
  });
});
