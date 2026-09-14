import type { MDXContent } from "mdx/types";

type LessonLoader = (lessonSlug: string) => Promise<{ default: MDXContent }>;

/**
 * One loader per registered module. Each import template is scoped to a single module folder,
 * so the bundler only compiles MDX of registered modules — a half-written module elsewhere
 * cannot break the build. Keep in sync with `curriculum-registry.ts`.
 */
export const lessonContentLoaders: Record<string, LessonLoader> = {
  "m01-linux-shell": (lessonSlug) => import(`./modules/m01-linux-shell/lessons/${lessonSlug}.mdx`),
  "m02-networking": (lessonSlug) => import(`./modules/m02-networking/lessons/${lessonSlug}.mdx`),
  "m03-devops-mindset-git": (lessonSlug) => import(`./modules/m03-devops-mindset-git/lessons/${lessonSlug}.mdx`),
  "m04-docker-containers": (lessonSlug) => import(`./modules/m04-docker-containers/lessons/${lessonSlug}.mdx`),
  "m05-cicd-github-actions": (lessonSlug) => import(`./modules/m05-cicd-github-actions/lessons/${lessonSlug}.mdx`),
  "m06-aws-core-iam": (lessonSlug) => import(`./modules/m06-aws-core-iam/lessons/${lessonSlug}.mdx`),
  "m07-aws-networking-compute": (lessonSlug) => import(`./modules/m07-aws-networking-compute/lessons/${lessonSlug}.mdx`),
  "m08-aws-storage-database-serverless": (lessonSlug) => import(`./modules/m08-aws-storage-database-serverless/lessons/${lessonSlug}.mdx`),
  "m10-terraform": (lessonSlug) => import(`./modules/m10-terraform/lessons/${lessonSlug}.mdx`),
  "m12-kubernetes-core": (lessonSlug) => import(`./modules/m12-kubernetes-core/lessons/${lessonSlug}.mdx`),
};
