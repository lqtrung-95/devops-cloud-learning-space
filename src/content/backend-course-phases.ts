import type { PhaseDefinition } from "./content-types";

export const backendCoursePhases: PhaseDefinition[] = [
  {
    id: "b-phase-0",
    courseId: "backend-development",
    order: 0,
    title: "Nền tảng Node.js & REST API",
    weeks: "Tuần 1–4",
    emoji: "🧱",
    description: "Dựng khung backend TypeScript: HTTP, routing, validation và error handling chuẩn production.",
  },
  {
    id: "b-phase-1",
    courseId: "backend-development",
    order: 1,
    title: "Data & Identity",
    weeks: "Tuần 5–10",
    emoji: "🔐",
    description: "Database, ORM, authentication, authorization và kiểm thử — xương sống của mọi backend thật.",
  },
  {
    id: "b-phase-2",
    courseId: "backend-development",
    order: 2,
    title: "Nâng cao & Async",
    weeks: "Tuần 11–16",
    emoji: "⚡",
    description: "File upload, background job, cache, realtime và GraphQL — mở rộng API vượt ra ngoài CRUD.",
  },
  {
    id: "b-phase-3",
    courseId: "backend-development",
    order: 3,
    title: "Kiến trúc dịch vụ & Production",
    weeks: "Tuần 17–21",
    emoji: "🛡️",
    description: "gRPC, tách service, bảo mật, observability và container hoá — đưa backend lên production an toàn.",
  },
  {
    id: "b-phase-4",
    courseId: "backend-development",
    order: 4,
    title: "Capstone",
    weeks: "Tuần 22–24",
    emoji: "🏁",
    description: "API gateway, backward compatibility và hoàn thiện taskflow-api production-ready.",
  },
];
