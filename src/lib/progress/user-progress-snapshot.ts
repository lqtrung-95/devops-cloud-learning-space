import "server-only";
import { getAllModules } from "@/content/curriculum-lookup";
import { getBestQuizPercentByModule, getCompletedItemKeys } from "./learning-progress-repository";
import { calculateModuleProgress, calculateOverallPercent, type ModuleProgress } from "./module-progress-calculator";

export interface UserProgressSnapshot {
  completedKeys: Set<string>;
  moduleProgressById: Map<string, ModuleProgress>;
  overallPercent: number;
}

/** Loads everything needed to render progress for one user (null user → empty snapshot). */
export async function getUserProgressSnapshot(userId: string | null): Promise<UserProgressSnapshot> {
  const [completedKeys, bestQuizByModule] = userId
    ? await Promise.all([getCompletedItemKeys(userId), getBestQuizPercentByModule(userId)])
    : [new Set<string>(), new Map<string, number>()];

  const moduleProgressById = new Map(
    getAllModules().map((learningModule) => [learningModule.id, calculateModuleProgress(learningModule, completedKeys, bestQuizByModule.get(learningModule.id) ?? null)]),
  );

  return {
    completedKeys,
    moduleProgressById,
    overallPercent: calculateOverallPercent([...moduleProgressById.values()]),
  };
}
