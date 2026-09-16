"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramArrow, DiagramNode } from "@/components/diagrams/diagram-shapes";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";

type Scenario = "leaked" | "redacted";

const scenarios: Record<Scenario, { label: string; logLine: string; tone: "rose" | "green"; steps: DiagramStep[] }> = {
  leaked: {
    label: "Log KHÔNG redact (rò rỉ)",
    logLine: 'error: connect ECONNREFUSED — url="postgres://taskflow:taskflow@postgres:5432/taskflow"',
    tone: "rose",
    steps: [
      { title: "1. Lỗi kết nối DB", description: "Postgres tạm thời không phản hồi (ví dụ đang restart). `pinojs` bắt lỗi kết nối để log lại phục vụ debug." },
      { title: "2. Log nguyên object lỗi", description: "Dev log thẳng `err` object, bao gồm cả `connectionString` — dòng log chứa nguyên mật khẩu DB dạng plaintext." },
      { title: "3. Log rời khỏi server", description: "Log được đẩy sang dịch vụ log tập trung, ghi ra file, hoặc backup — bất kỳ ai/hệ thống nào đọc được log (kể cả bên thứ ba) đều thấy mật khẩu DB thật." },
    ],
  },
  redacted: {
    label: "Log ĐÃ redact (an toàn)",
    logLine: 'error: connect ECONNREFUSED — host="postgres" db="taskflow" (connectionString: [redacted])',
    tone: "green",
    steps: [
      { title: "1. Lỗi kết nối DB", description: "Cùng một lỗi kết nối xảy ra — không có gì khác ở tầng ứng dụng, chỉ khác ở cách LOG được cấu hình." },
      { title: "2. pino redact trước khi ghi", description: "Logger cấu hình `redact: { paths: [\"*.connectionString\", \"*.password\"], censor: \"[redacted]\" }` — giá trị nhạy cảm bị thay bằng placeholder TRƯỚC khi dòng log được tạo ra." },
      { title: "3. Log an toàn khi chia sẻ", description: "Log vẫn đủ thông tin để debug (host, tên DB, mã lỗi) nhưng không còn mật khẩu — an toàn dù log được đẩy đi bất kỳ đâu." },
    ],
  },
};

/** So sánh log lỗi kết nối DB bị rò mật khẩu vs. đã được redact trước khi ghi. */
export function SecretRedactionInLogsDiagram() {
  const [scenario, setScenario] = useState<Scenario>("leaked");
  const { steps, logLine, tone } = scenarios[scenario];

  return (
    <div>
      <div className="not-prose -mb-4 flex flex-wrap gap-2">
        {(Object.keys(scenarios) as Scenario[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setScenario(key)}
            className={clsx(
              "rounded-full px-3 py-1.5 text-sm font-medium",
              scenario === key ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
            )}
          >
            {scenarios[key].label}
          </button>
        ))}
      </div>
      <StepDiagram key={scenario} title="Secret trong log lỗi: rò rỉ vs. đã redact" viewBox="0 0 720 260" steps={steps}>
        {(step) => (
          <>
            <DiagramNode x={20} y={20} width={160} height={56} label="🐘 Postgres" sublabel="ECONNREFUSED" tone="slate" state={step >= 0 ? "active" : "normal"} />
            <DiagramArrow from={[180, 48]} to={[280, 48]} tone="slate" dimmed={step < 0} />
            <DiagramNode x={280} y={20} width={180} height={56} label="🪵 pino logger" sublabel={step >= 1 ? "áp dụng redact config" : "bắt lỗi kết nối"} tone={step >= 1 ? tone : "blue"} state={step >= 1 ? "active" : "normal"} />
            <DiagramArrow from={[460, 48]} to={[560, 48]} tone={tone} dimmed={step < 2} animated={step >= 2} />
            <DiagramNode x={560} y={20} width={140} height={56} label="📤 Log storage" sublabel="tập trung / bên thứ 3" tone="slate" state={step >= 2 ? "active" : "normal"} dashed />

            <DiagramNode
              x={40}
              y={120}
              width={640}
              height={90}
              label={step >= 1 ? (tone === "rose" ? "❌ Dòng log rò rỉ mật khẩu DB" : "✅ Dòng log đã được redact") : "⏳ Chưa ghi log"}
              sublabel={step >= 1 ? logLine : "đang chờ pino xử lý lỗi"}
              tone={step >= 1 ? tone : "slate"}
              state={step >= 1 ? "active" : "normal"}
            />
          </>
        )}
      </StepDiagram>
    </div>
  );
}
