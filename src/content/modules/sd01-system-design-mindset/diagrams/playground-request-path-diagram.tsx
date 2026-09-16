"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramArrow, DiagramGroupBox, DiagramNode, MovingPacket } from "@/components/diagrams/diagram-shapes";
import type { DiagramTone } from "@/components/diagrams/diagram-tones";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";

type Scenario = "read" | "write";

const nodes: Record<string, { x: number; y: number; label: string; sublabel: string; emoji: string; tone: DiagramTone }> = {
  k6: { x: 10, y: 110, label: "k6", sublabel: "5 VU", emoji: "🧪", tone: "violet" },
  nginx: { x: 170, y: 110, label: "nginx", sublabel: ":8080", emoji: "🚪", tone: "slate" },
  app: { x: 330, y: 110, label: "app", sublabel: "Fastify :3000", emoji: "🟩", tone: "green" },
  postgres: { x: 540, y: 40, label: "postgres", sublabel: ":5432", emoji: "🐘", tone: "blue" },
  redis: { x: 540, y: 190, label: "redis", sublabel: ":6379", emoji: "🟥", tone: "rose" },
};

const scenarios: Record<Scenario, { active: string[][]; steps: DiagramStep[] }> = {
  read: {
    active: [["k6", "nginx"], ["nginx", "app"], ["app", "postgres"], ["app", "redis"], ["k6"]],
    steps: [
      { title: "k6 gửi GET", description: "Mỗi VU gọi `GET /api/items/42` vào cổng 8080 — giống một user thật mở trang sản phẩm." },
      { title: "Nginx chuyển tiếp", description: "Nginx là cửa trước: nhận request và `proxy_pass` tới service `app:3000` qua mạng nội bộ của Compose (tên service = DNS)." },
      { title: "Đọc Postgres", description: "App chạy `SELECT ... WHERE id = $1`. Đây là round trip mạng + đọc index — phần tốn thời gian nhất của request (ở module Caching ta sẽ đặt Redis trước chỗ này)." },
      { title: "Đếm lượt xem", description: "App `INCR views:item:42` trên Redis. 'Đọc' ở góc nhìn user vẫn có thể sinh ra một thao tác ghi nhỏ — khi ước lượng hãy đếm cả những ghi 'ẩn' này." },
      { title: "Trả JSON", description: "Response đi ngược lại qua Nginx về k6. k6 ghi lại `http_req_duration` — p95 của hàng trăm lần như vậy là baseline của bạn." },
    ],
  },
  write: {
    active: [["k6", "nginx"], ["nginx", "app"], ["app", "postgres"], ["k6"]],
    steps: [
      { title: "k6 gửi POST", description: "`POST /api/items` với body JSON — ví dụ tạo sản phẩm mới." },
      { title: "Nginx chuyển tiếp", description: "Cùng đường với request đọc. Load balancer không phân biệt đọc/ghi — sự khác biệt nằm ở tầng dữ liệu." },
      { title: "Ghi Postgres", description: "`INSERT ... RETURNING id` phải ghi WAL xuống đĩa rồi mới xác nhận (mặc định). Ghi không cache được; muốn scale ghi phải nghĩ tới batch, queue hoặc partition." },
      { title: "Trả 201", description: "App trả `201 Created`. Tỉ lệ số request đọc/ghi mà k6 bắn chính là read/write ratio bạn giả định." },
    ],
  },
};

const center = (id: string): [number, number] => [nodes[id].x + 70, nodes[id].y + 40];

export function PlaygroundRequestPathDiagram() {
  const [scenario, setScenario] = useState<Scenario>("read");
  const { active, steps } = scenarios[scenario];

  return (
    <div>
      <div className="not-prose -mb-4 flex flex-wrap gap-2">
        {(["read", "write"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setScenario(option)}
            className={clsx(
              "rounded-full px-3 py-1.5 text-sm font-medium",
              scenario === option ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
            )}
          >
            {option === "read" ? "📖 Đường đọc (GET)" : "✍️ Đường ghi (POST)"}
          </button>
        ))}
      </div>
      <StepDiagram key={scenario} title="Một request đi qua sd-playground" viewBox="0 0 720 290" steps={steps}>
        {(step) => {
          const current = active[step];
          const [from, to] = current;
          return (
            <>
              <DiagramGroupBox x={150} y={16} width={560} height={264} label="docker compose · network sd-playground_default" tone="slate" />
              <DiagramArrow from={[152, 150]} to={[168, 150]} tone="violet" dimmed={from !== "k6" || !to} />
              <DiagramArrow from={[312, 150]} to={[328, 150]} tone="slate" dimmed={!(from === "nginx" && to === "app")} />
              <DiagramArrow from={[472, 135]} to={[536, 85]} tone="blue" dimmed={to !== "postgres"} />
              <DiagramArrow from={[472, 165]} to={[536, 225]} tone="rose" dimmed={to !== "redis" || scenario === "write"} />
              {Object.entries(nodes).map(([id, node]) => (
                <DiagramNode
                  key={id}
                  x={node.x}
                  y={node.y}
                  width={140}
                  height={80}
                  label={node.label}
                  sublabel={node.sublabel}
                  emoji={node.emoji}
                  tone={node.tone}
                  state={current.includes(id) ? "active" : scenario === "write" && id === "redis" ? "dimmed" : "normal"}
                />
              ))}
              {to && <MovingPacket key={`${scenario}-${step}`} path={`M ${center(from)[0]} ${center(from)[1]} L ${center(to)[0]} ${center(to)[1]}`} durationSeconds={1.2} tone={scenario === "read" ? "blue" : "amber"} label={scenario === "read" ? "GET" : "POST"} />}
              {!to && (
                <MovingPacket key={`${scenario}-${step}-back`} path={`M ${center("app")[0]} ${center("app")[1]} L ${center("k6")[0]} ${center("k6")[1]}`} durationSeconds={1.4} tone="green" label={scenario === "read" ? "200 JSON" : "201"} />
              )}
            </>
          );
        }}
      </StepDiagram>
    </div>
  );
}
