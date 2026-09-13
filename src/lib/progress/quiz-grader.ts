import type { QuizQuestion } from "@/content/content-types";

export const QUIZ_PASS_PERCENT = 80;

export interface QuizQuestionResult {
  questionId: string;
  selectedIndex: number;
  correctIndex: number;
  isCorrect: boolean;
  explanation: string;
}

export interface QuizGradeResult {
  score: number;
  total: number;
  percent: number;
  passed: boolean;
  results: QuizQuestionResult[];
}

/** Grades answers (selected option index per question, -1 = unanswered) against the answer key. */
export function gradeQuiz(questions: QuizQuestion[], answers: number[]): QuizGradeResult {
  const results = questions.map((question, index) => {
    const selectedIndex = Number.isInteger(answers[index]) ? answers[index] : -1;
    return {
      questionId: question.id,
      selectedIndex,
      correctIndex: question.answerIndex,
      isCorrect: selectedIndex === question.answerIndex,
      explanation: question.explanation,
    };
  });

  const score = results.filter((result) => result.isCorrect).length;
  const total = questions.length;
  const percent = toPercent(score, total);
  return { score, total, percent, passed: percent >= QUIZ_PASS_PERCENT, results };
}

export function toPercent(score: number, total: number): number {
  return total === 0 ? 0 : Math.round((score / total) * 100);
}
