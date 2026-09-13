/**
 * Validates one content module without touching the shared registry.
 * Usage: pnpm validate:module m02-networking
 *
 * Checks: module-meta structure/editorial rules, MDX files compile, diagram files exist.
 */
import { compile } from "@mdx-js/mdx";
import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import remarkGfm from "remark-gfm";
import type { ModuleDefinition } from "../src/content/content-types";
import { validateModuleDefinition } from "../src/content/module-definition-validator";

async function main() {
  const slug = process.argv[2];
  if (!slug) {
    console.error("Usage: pnpm validate:module <module-slug>");
    process.exit(2);
  }

  const moduleDir = path.join(process.cwd(), "src/content/modules", slug);
  const metaExports = (await import(pathToFileURL(path.join(moduleDir, "module-meta.ts")).href)) as Record<string, unknown>;
  const learningModule = Object.values(metaExports).find(
    (value): value is ModuleDefinition => typeof value === "object" && value !== null && "slug" in value && "lessons" in value,
  );
  if (!learningModule) throw new Error(`module-meta.ts in ${slug} exports no ModuleDefinition`);

  const problems = validateModuleDefinition(learningModule);

  for (const lesson of learningModule.lessons) {
    const file = path.join(moduleDir, "lessons", `${lesson.slug}.mdx`);
    try {
      await compile(readFileSync(file, "utf8"), { remarkPlugins: [remarkGfm] });
    } catch (error) {
      problems.push(`[${slug}] MDX compile error in ${lesson.slug}.mdx: ${(error as Error).message}`);
    }
  }

  if (problems.length > 0) {
    console.error(`❌ ${problems.length} problem(s):\n${problems.map((problem) => `  - ${problem}`).join("\n")}`);
    process.exit(1);
  }
  const stats = `${learningModule.lessons.length} lessons, ${learningModule.labs.length} labs, ${learningModule.quiz.length} quiz questions`;
  console.log(`✅ ${slug} is valid (${stats})`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
