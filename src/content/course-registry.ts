import type { CourseDefinition, PhaseDefinition } from "./content-types";
import { backendCoursePhases } from "./backend-course-phases";
import { devopsCoursePhases } from "./devops-course-phases";
import { systemDesignCoursePhases } from "./system-design-course-phases";

/** Courses in display order. */
export const courses: CourseDefinition[] = [
  {
    id: "devops-cloud",
    slug: "devops-cloud",
    title: "DevOps & Cloud",
    emoji: "☁️",
    tagline: "AWS-first · 28 tuần",
    description: "Từ Linux, Docker, CI/CD, AWS, Terraform tới Kubernetes và SRE — đủ để ứng tuyển DevOps/SRE junior–mid.",
    weeksTotal: 28,
    hoursPerWeek: 10,
  },
  {
    id: "system-design",
    slug: "system-design",
    title: "System Design",
    emoji: "🏗️",
    tagline: "Nền tảng + phỏng vấn · 24 tuần",
    description: "Cache, database, hàng đợi, distributed systems rồi tới các case study kinh điển — hiểu vì sao hệ thống lớn được thiết kế như vậy.",
    weeksTotal: 24,
    hoursPerWeek: 10,
  },
  {
    id: "backend-development",
    slug: "backend-development",
    title: "Backend Development",
    emoji: "🧩",
    tagline: "Node.js/TypeScript · 24 tuần",
    description: "Xây taskflow-api từ REST cơ bản tới production-ready: auth, testing, GraphQL, gRPC, security, observability.",
    weeksTotal: 24,
    hoursPerWeek: 10,
  },
];

export const coursePhases: PhaseDefinition[] = [...devopsCoursePhases, ...systemDesignCoursePhases, ...backendCoursePhases];
