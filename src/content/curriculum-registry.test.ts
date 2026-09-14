import { describe, expect, it } from "vitest";
import { curriculumPhases } from "./curriculum-phases";
import { curriculumModules } from "./curriculum-registry";
import { validateModuleDefinition } from "./module-definition-validator";

describe("curriculum registry", () => {
  it("has unique module ids, slugs and orders", () => {
    const ids = curriculumModules.map((learningModule) => learningModule.id);
    const slugs = curriculumModules.map((learningModule) => learningModule.slug);
    const orders = curriculumModules.map((learningModule) => learningModule.order);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(new Set(orders).size).toBe(orders.length);
  });

  it("has a lesson content loader for every registered module", async () => {
    const source = await import("node:fs").then((fs) => fs.readFileSync("src/content/lesson-content-loaders.ts", "utf8"));
    for (const learningModule of curriculumModules) expect(source).toContain(`"${learningModule.slug}": (lessonSlug) => import(\`./modules/${learningModule.slug}/lessons/`);
  });

  it("assigns every module to an existing phase", () => {
    const phaseIds = new Set(curriculumPhases.map((phase) => phase.id));
    for (const learningModule of curriculumModules) expect(phaseIds.has(learningModule.phaseId)).toBe(true);
  });

  it.each(curriculumModules.map((learningModule) => [learningModule.slug, learningModule] as const))("%s passes content rules", (_, learningModule) => {
    expect(validateModuleDefinition(learningModule)).toEqual([]);
  });
});
