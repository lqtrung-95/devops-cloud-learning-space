"use client";

import { useState } from "react";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import { DiagramNode } from "@/components/diagrams/diagram-shapes";
import type { DiagramTone } from "@/components/diagrams/diagram-tones";

type Status = "handled-earlier" | "handled-here" | "out-of-scope";

interface OwaspItem {
  code: string;
  name: string;
  tone: DiagramTone;
  status: Status;
  note: string;
}

/** OWASP Top 10 (2021) mapped to what taskflow-api already has vs. what B15 adds. */
const items: OwaspItem[] = [
  { code: "A01", name: "Broken Access Control", tone: "blue", status: "handled-earlier", note: "Đã xử lý ở B06: requireRole + lọc organization_id ngay trong WHERE chặn IDOR chéo tổ chức." },
  { code: "A02", name: "Cryptographic Failures", tone: "blue", status: "handled-earlier", note: "Đã xử lý ở B05: argon2id hash mật khẩu, JWT ký bằng secret riêng, refresh token hash trước khi lưu DB." },
  { code: "A03", name: "Injection", tone: "blue", status: "handled-earlier", note: "Đã giảm thiểu từ B04: Drizzle build parameterized query. Module này chỉ viết TEST xác nhận lại bằng thực nghiệm." },
  { code: "A04", name: "Insecure Design", tone: "amber", status: "handled-here", note: "Chọn scope rate limit (chặt cho login, lỏng cho toàn API) là một quyết định thiết kế bảo mật thêm ở B15." },
  { code: "A05", name: "Security Misconfiguration", tone: "amber", status: "handled-here", note: "@fastify/helmet thêm header mặc định an toàn; CORS dùng allowlist origin thay vì để mở '*'." },
  { code: "A06", name: "Vulnerable Components", tone: "amber", status: "handled-here", note: "pnpm audit quét dependency thật, xử lý hoặc document lỗ hổng tìm thấy — không bịa CVE." },
  { code: "A07", name: "Identification & Auth Failures", tone: "blue", status: "handled-earlier", note: "Đã xử lý ở B05: access/refresh token, revoke thật trong DB, lỗi 401 chung chung chống user enumeration." },
  { code: "A08", name: "Software & Data Integrity Failures", tone: "slate", status: "out-of-scope", note: "Pipeline CI kiểm tra lint/test/build trước merge thuộc phạm vi B17 — chưa làm ở module này." },
  { code: "A09", name: "Logging & Monitoring Failures", tone: "slate", status: "out-of-scope", note: "Structured log + requestId xuyên suốt request thuộc phạm vi B16. B15 chỉ đảm bảo log KHÔNG rò secret." },
  { code: "A10", name: "SSRF", tone: "slate", status: "out-of-scope", note: "taskflow-api hiện chưa có tính năng gọi URL do user cung cấp (webhook outbound) nên rủi ro SSRF chưa phát sinh — cần xem lại khi thêm tính năng đó." },
];

const statusLabel: Record<Status, string> = {
  "handled-earlier": "✅ Đã xử lý ở module trước",
  "handled-here": "🛠️ Xử lý ở B15 (module này)",
  "out-of-scope": "⏭️ Ngoài phạm vi B15",
};

/** Click từng ô OWASP Top 10 để xem taskflow-api đã/đang/chưa xử lý hạng mục đó ở đâu. */
export function OwaspTop10ChecklistDiagram() {
  const [selected, setSelected] = useState(0);
  const columns = 5;
  const nodeWidth = 130;
  const nodeHeight = 62;
  const gapX = 10;
  const gapY = 14;
  const startX = 10;
  const startY = 20;
  const current = items[selected];

  return (
    <DiagramFrame
      title="OWASP Top 10 (2021) áp cho taskflow-api — bấm để xem chi tiết"
      viewBox="0 0 720 190"
      caption={
        <div>
          <p className="font-semibold text-stone-800 dark:text-stone-200">
            {current.code} — {current.name}: {statusLabel[current.status]}
          </p>
          <p className="mt-1">{current.note}</p>
        </div>
      }
    >
      {items.map((item, index) => {
        const row = Math.floor(index / columns);
        const col = index % columns;
        const x = startX + col * (nodeWidth + gapX);
        const y = startY + row * (nodeHeight + gapY);
        return (
          <DiagramNode
            key={item.code}
            x={x}
            y={y}
            width={nodeWidth}
            height={nodeHeight}
            label={item.code}
            sublabel={item.name}
            tone={item.tone}
            state={index === selected ? "active" : "normal"}
            onClick={() => setSelected(index)}
          />
        );
      })}
    </DiagramFrame>
  );
}
