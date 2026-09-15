import { describe, expect, it } from "vitest";
import { coursePhases, courses } from "./course-registry";
import { curriculumModules } from "./curriculum-registry";
import { getCourseForModule, getModulesForCourse, getPhasesWithModules } from "./curriculum-lookup";
import { validateModuleDefinition } from "./module-definition-validator";

const unique = (values: Array<string | number>) => new Set(values).size === values.length;

describe("course registry", () => {
  it("has unique course ids and slugs", () => {
    expect(unique(courses.map((course) => course.id))).toBe(true);
    expect(unique(courses.map((course) => course.slug))).toBe(true);
  });

  it("has globally unique phase ids that point at an existing course", () => {
    expect(unique(coursePhases.map((phase) => phase.id))).toBe(true);
    const courseIds = new Set(courses.map((course) => course.id));
    for (const phase of coursePhases) expect(courseIds.has(phase.courseId)).toBe(true);
  });

  it("orders phases uniquely within each course", () => {
    for (const course of courses) {
      expect(unique(coursePhases.filter((phase) => phase.courseId === course.id).map((phase) => phase.order))).toBe(true);
    }
  });
});

describe("curriculum registry", () => {
  // Progress keys and quiz attempts store only the module id, so ids and slugs must never collide across courses.
  it("has globally unique module ids and slugs", () => {
    expect(unique(curriculumModules.map((learningModule) => learningModule.id))).toBe(true);
    expect(unique(curriculumModules.map((learningModule) => learningModule.slug))).toBe(true);
  });

  it("orders modules uniquely within each course", () => {
    for (const course of courses) expect(unique(getModulesForCourse(course.id).map((learningModule) => learningModule.order))).toBe(true);
  });

  it("resolves every module to a course and lists it under exactly one phase of that course", () => {
    for (const learningModule of curriculumModules) {
      const course = getCourseForModule(learningModule);
      const listings = getPhasesWithModules(course.id).filter((phase) => phase.modules.includes(learningModule));
      expect(listings).toHaveLength(1);
    }
  });

  it("has a lesson content loader for every registered module", async () => {
    const source = await import("node:fs").then((fs) => fs.readFileSync("src/content/lesson-content-loaders.ts", "utf8"));
    for (const learningModule of curriculumModules) expect(source).toContain(`"${learningModule.slug}": (lessonSlug) => import(\`./modules/${learningModule.slug}/lessons/`);
  });

  it.each(curriculumModules.map((learningModule) => [learningModule.slug, learningModule] as const))("%s passes content rules", (_, learningModule) => {
    expect(validateModuleDefinition(learningModule)).toEqual([]);
  });
});
