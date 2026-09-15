import type { PhaseDefinition } from "./content-types";

export const systemDesignCoursePhases: PhaseDefinition[] = [
  {
    id: "sd-phase-0",
    courseId: "system-design",
    order: 0,
    title: "Nền móng",
    weeks: "Tuần 1–3",
    emoji: "🧭",
    description: "Cách tư duy khi thiết kế hệ thống: làm rõ yêu cầu, ước lượng quy mô và hiểu các máy nói chuyện với nhau ra sao.",
  },
  {
    id: "sd-phase-1",
    courseId: "system-design",
    order: 1,
    title: "Building blocks",
    weeks: "Tuần 4–11",
    emoji: "🧩",
    description: "Những viên gạch dựng nên mọi hệ thống lớn: load balancer, cache, database, hàng đợi, storage và search.",
  },
  {
    id: "sd-phase-2",
    courseId: "system-design",
    order: 2,
    title: "Distributed systems",
    weeks: "Tuần 12–16",
    emoji: "🕸️",
    description: "Khi dữ liệu nằm trên nhiều máy: nhất quán, đồng thuận, chịu lỗi và chia hệ thống thành nhiều service.",
  },
  {
    id: "sd-phase-3",
    courseId: "system-design",
    order: 3,
    title: "Vận hành ở quy mô lớn",
    weeks: "Tuần 17",
    emoji: "🌏",
    description: "Đặt SLO, lên kế hoạch capacity, chạy nhiều region và giữ chi phí trong tầm kiểm soát.",
  },
  {
    id: "sd-phase-4",
    courseId: "system-design",
    order: 4,
    title: "Case study phỏng vấn",
    weeks: "Tuần 18–24",
    emoji: "🎤",
    description: "Ghép các viên gạch thành hệ thống thật: URL shortener, news feed, chat, video, Uber, booking — và luyện phỏng vấn thử.",
  },
];
