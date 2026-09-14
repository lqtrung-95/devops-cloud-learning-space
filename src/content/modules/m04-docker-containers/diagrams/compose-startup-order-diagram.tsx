"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramArrow, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";
import type { DiagramTone } from "@/components/diagrams/diagram-tones";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";

type Scenario = "started" | "healthy";
type Status = [label: string, tone: DiagramTone];

const services = [
  { name: "db", sublabel: "postgres:17-alpine", emoji: "🐘" },
  { name: "redis", sublabel: "redis:7-alpine", emoji: "🧱" },
  { name: "api", sublabel: "depends_on: db, redis", emoji: "⚙️" },
  { name: "frontend", sublabel: "depends_on: api", emoji: "🖥️" },
];

const WAITING: Status = ["… chưa tạo", "slate"];

interface Frame {
  step: DiagramStep;
  /** Status per service, same order as `services`. */
  statuses: Status[];
  log: string;
  logTone: DiagramTone;
}

const scenarios: Record<Scenario, Frame[]> = {
  started: [
    { step: { title: "compose up", description: "`depends_on: [db, redis]` dạng ngắn chỉ đảm bảo THỨ TỰ TẠO container, không đợi service bên trong sẵn sàng." }, statuses: [WAITING, WAITING, WAITING, WAITING], log: "Network app_default Created", logTone: "slate" },
    { step: { title: "db started", description: "Container db đã chạy (running) nhưng Postgres vẫn đang khởi tạo dữ liệu lần đầu — mất vài giây." }, statuses: [["🟡 running, đang init…", "amber"], ["🟢 running", "green"], WAITING, WAITING], log: "db  | initdb: creating database…", logTone: "amber" },
    { step: { title: "api chạy ngay", description: "Compose thấy db 'started' là tạo api luôn. API mở kết nối tới `db:5432`…" }, statuses: [["🟡 running, đang init…", "amber"], ["🟢 running", "green"], ["🟡 kết nối db…", "amber"], ["🟡 running", "amber"]], log: "api | connecting to db:5432", logTone: "amber" },
    { step: { title: "api crash", description: "Postgres chưa nhận kết nối → `ECONNREFUSED`, API thoát với exit code 1. Frontend trả 502. Khách tới cửa khi bếp chưa nhóm lửa." }, statuses: [["🟢 ready (quá muộn)", "green"], ["🟢 running", "green"], ["🔴 exited (1)", "rose"], ["🔴 502 Bad Gateway", "rose"]], log: "api | Error: connect ECONNREFUSED 172.18.0.2:5432", logTone: "rose" },
  ],
  healthy: [
    { step: { title: "compose up", description: "Mỗi service phụ thuộc khai báo `condition: service_healthy`. db và redis có `healthcheck`." }, statuses: [WAITING, WAITING, WAITING, WAITING], log: "Network app_default Created", logTone: "slate" },
    { step: { title: "đợi healthcheck", description: "db và redis chạy; Docker gọi `pg_isready` / `redis-cli ping` mỗi 5s. api CHƯA được tạo vì db chưa healthy." }, statuses: [["🟡 health: starting", "amber"], ["🟡 health: starting", "amber"], ["⏸ đợi db, redis", "slate"], WAITING], log: "db  | pg_isready: no response (retry 1/10)", logTone: "amber" },
    { step: { title: "db healthy", description: "`pg_isready` trả về 0 → db chuyển `healthy`. redis cũng healthy. Điều kiện của api đã thoả." }, statuses: [["🟢 healthy", "green"], ["🟢 healthy", "green"], ["🟡 health: starting", "amber"], ["⏸ đợi api", "slate"]], log: "db  | accepting connections", logTone: "green" },
    { step: { title: "api healthy", description: "API kết nối db thành công, `/healthz` trả 200 → api healthy. Giờ mới tới lượt frontend." }, statuses: [["🟢 healthy", "green"], ["🟢 healthy", "green"], ["🟢 healthy", "green"], ["🟡 starting", "amber"]], log: "api | listening on :3000", logTone: "green" },
    { step: { title: "sẵn sàng ✅", description: "db, redis, api healthy; frontend (không có healthcheck) đã running. `docker compose up -d --wait` chỉ trả về lúc này — rất hợp để dùng trong CI hoặc script deploy." }, statuses: [["🟢 healthy", "green"], ["🟢 healthy", "green"], ["🟢 healthy", "green"], ["🟢 running", "green"]], log: "✔ Container app-frontend-1  Started", logTone: "green" },
  ],
};

export function ComposeStartupOrderDiagram() {
  const [scenario, setScenario] = useState<Scenario>("started");
  const frames = scenarios[scenario];

  return (
    <div>
      <div className="not-prose -mb-4 flex flex-wrap gap-2">
        {(["started", "healthy"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setScenario(option)}
            className={clsx(
              "rounded-full px-3 py-1.5 text-sm font-medium",
              scenario === option ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
            )}
          >
            {option === "started" ? "depends_on dạng ngắn" : "depends_on + service_healthy"}
          </button>
        ))}
      </div>
      <StepDiagram key={scenario} title="docker compose up: ai khởi động trước, ai phải đợi?" viewBox="0 0 720 300" steps={frames.map((frame) => frame.step)}>
        {(step) => {
          const frame = frames[step];
          return (
            <>
              {services.map((service, index) => {
                const y = 12 + index * 62;
                const [label, tone] = frame.statuses[index];
                return (
                  <g key={service.name}>
                    <DiagramNode x={20} y={y} width={220} height={50} label={`${service.emoji} ${service.name}`} sublabel={service.sublabel} tone="slate" rounded={8} />
                    <DiagramArrow from={[244, y + 25]} to={[290, y + 25]} tone={tone} dimmed={label === WAITING[0]} />
                    <DiagramNode x={294} y={y} width={230} height={50} label={label} tone={tone} rounded={8} state={tone === "rose" ? "active" : label === WAITING[0] ? "dimmed" : "normal"} />
                  </g>
                );
              })}
              {["db + redis", "api", "frontend"].map((name, index) => (
                <DiagramNode key={name} x={560} y={14 + index * 80} width={140} height={40} label={name} tone="slate" rounded={8} />
              ))}
              {[0, 1].map((index) => (
                <DiagramArrow
                  key={`wait-${index}`}
                  from={[630, 92 + index * 80]}
                  to={[630, 58 + index * 80]}
                  tone={scenario === "started" ? "rose" : "green"}
                  label={scenario === "started" ? "chỉ đợi started" : "đợi healthy"}
                />
              ))}
              <DiagramLabel x={630} y={244} text={scenario === "started" ? "Không đợi app sẵn sàng" : "Chuỗi đợi healthy"} tone={scenario === "started" ? "rose" : "green"} bold />
              <rect x={20} y={258} width={680} height={32} rx={8} className="fill-stone-900 dark:fill-stone-800" />
              <text x={34} y={279} fontSize={12.5} className={clsx("font-mono", frame.logTone === "rose" ? "fill-rose-300" : frame.logTone === "green" ? "fill-emerald-300" : "fill-stone-200")}>
                {frame.log}
              </text>
            </>
          );
        }}
      </StepDiagram>
    </div>
  );
}
