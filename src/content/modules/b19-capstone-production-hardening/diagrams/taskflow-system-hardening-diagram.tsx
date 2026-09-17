"use client";

import { useState } from "react";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import { DiagramArrow, DiagramNode } from "@/components/diagrams/diagram-shapes";
import type { DiagramTone } from "@/components/diagrams/diagram-tones";

interface SystemNode {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  sublabel: string;
  tone: DiagramTone;
  introducedAt: string;
  hardened: string;
  gap: string;
}

/** Toàn bộ hệ thống taskflow-api sau B18 — bấm từng ô để xem module nào đưa nó vào và tình trạng hardening. */
const nodes: SystemNode[] = [
  { id: "client", x: 280, y: 8, w: 160, h: 42, label: "Client", sublabel: "web / mobile / curl", tone: "slate", introducedAt: "—", hardened: "Không phải phần cần harden.", gap: "Gửi request qua nginx, không gọi thẳng api." },
  { id: "nginx", x: 280, y: 66, w: 160, h: 42, label: "nginx", sublabel: "API gateway :8081", tone: "violet", introducedAt: "B17 (hạ tầng), B18 (vai trò gateway)", hardened: "Rate limit tập trung; route `/v1` và `/v2` về đúng `api` mà không phá client cũ.", gap: "Chưa có TLS termination thật (dev dùng HTTP) — cần trước khi lên production thật." },
  { id: "api", x: 280, y: 130, w: 160, h: 54, label: "api", sublabel: "Fastify :3000", tone: "blue", introducedAt: "B01", hardened: "Validation (B03), auth+RBAC (B05/B06), rate limit + helmet + CORS (B15), structured log (B16), non-root + healthcheck + graceful shutdown (B17).", gap: "Hash password (argon2id) chạy đồng bộ trên event loop — nghi phạm số 1 khi load test tăng tải (xem lesson sau)." },
  { id: "worker", x: 70, y: 214, w: 160, h: 54, label: "worker", sublabel: "BullMQ consumer", tone: "amber", introducedAt: "B09", hardened: "Retry có giới hạn cho job notification/activity log.", gap: "Graceful shutdown cho job đang chạy dở chưa được kiểm chứng lại ở checklist lần này." },
  { id: "notification", x: 480, y: 214, w: 170, h: 54, label: "notification-service", sublabel: "gRPC :50051", tone: "rose", introducedAt: "B13 (tách service), B14 (event-driven qua outbox)", hardened: "Chạy độc lập, nhận event qua outbox thay vì gọi đồng bộ trực tiếp mọi lúc.", gap: "Chưa có retry/circuit breaker khi gRPC call từ `api` timeout — một điểm nghẽn khi service này down." },
  { id: "postgres", x: 40, y: 298, w: 130, h: 46, label: "postgres", sublabel: ":5434→5432", tone: "green", introducedAt: "B01 (hạ tầng), B04 (schema)", hardened: "Schema đầy đủ, parameterized query qua Drizzle (chặn injection).", gap: "Chưa có quy trình backup/restore đã thử nghiệm thật — mục lớn nhất còn thiếu trong checklist." },
  { id: "redis", x: 210, y: 298, w: 110, h: 46, label: "redis", sublabel: ":6380→6379", tone: "green", introducedAt: "B01 (hạ tầng), B10 (cache-aside)", hardened: "Cache-aside cho task list, invalidate đúng lúc khi task đổi trạng thái.", gap: "Không cấu hình persistence (AOF/RDB) — chấp nhận được vì chỉ là cache, không phải nguồn sự thật." },
  { id: "minio", x: 470, y: 298, w: 110, h: 46, label: "minio", sublabel: ":9002 / :9003", tone: "cyan", introducedAt: "B08", hardened: "Presigned URL có thời hạn, giới hạn size/type khi upload attachment.", gap: "Chưa bật versioning/lifecycle rule cho bucket — bình thường trong dev, cần bật khi lên S3 thật." },
];

const arrows: { from: [number, number]; to: [number, number]; label: string; curve?: number }[] = [
  { from: [360, 50], to: [360, 66], label: "" },
  { from: [360, 108], to: [360, 130], label: "" },
  { from: [305, 184], to: [150, 214], label: "enqueue job (Redis)" },
  { from: [420, 184], to: [560, 214], label: "gRPC call" },
  { from: [335, 184], to: [105, 298], label: "SQL (Drizzle)", curve: -30 },
  { from: [360, 184], to: [265, 298], label: "cache-aside", curve: 10 },
  { from: [400, 184], to: [525, 298], label: "presigned URL", curve: 30 },
  { from: [130, 268], to: [105, 298], label: "ghi activity_logs" },
  { from: [170, 268], to: [230, 298], label: "dequeue" },
];

export function TaskflowSystemHardeningDiagram() {
  const [selectedId, setSelectedId] = useState("api");
  const current = nodes.find((node) => node.id === selectedId)!;

  return (
    <DiagramFrame
      title="Toàn cảnh taskflow-api sau B18 — bấm một service để xem tình trạng hardening"
      viewBox="0 0 720 360"
      caption={
        <div>
          <p className="font-semibold text-stone-800 dark:text-stone-200">
            {current.label} — giới thiệu ở {current.introducedAt}
          </p>
          <p className="mt-1">
            <span className="font-medium">Đã harden: </span>
            {current.hardened}
          </p>
          <p className="mt-1">
            <span className="font-medium">Còn thiếu / cần lưu ý: </span>
            {current.gap}
          </p>
        </div>
      }
    >
      {arrows.map((arrow, index) => (
        <DiagramArrow key={index} from={arrow.from} to={arrow.to} label={arrow.label} tone="slate" curve={arrow.curve} />
      ))}
      {nodes.map((node) => (
        <DiagramNode
          key={node.id}
          x={node.x}
          y={node.y}
          width={node.w}
          height={node.h}
          label={node.label}
          sublabel={node.sublabel}
          tone={node.tone}
          state={node.id === selectedId ? "active" : "normal"}
          onClick={() => setSelectedId(node.id)}
        />
      ))}
    </DiagramFrame>
  );
}
