"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramArrow, DiagramNode } from "@/components/diagrams/diagram-shapes";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";

type Scenario = "miss" | "hit" | "update";
type Hop = "app-cache" | "cache-app" | "app-db" | "db-app" | "app-user";

const scenarios: Record<Scenario, { label: string; steps: (DiagramStep & { hop: Hop; arrowLabel: string })[] }> = {
  miss: {
    label: "❄️ Cache miss (lần đầu)",
    steps: [
      { title: "Hỏi cache", hop: "app-cache", arrowLabel: "GET product:42", description: "User mở trang sản phẩm 42. App hỏi Redis trước: `GET product:42`." },
      { title: "Không có", hop: "cache-app", arrowLabel: "(nil)", description: "Redis trả về `nil` — chưa ai cất món này vào 'tủ lạnh'." },
      { title: "Hỏi database", hop: "app-db", arrowLabel: "SELECT … WHERE id=42", description: "App chạy query trên RDS. Chậm hơn (thường vài chục ms, có thể hơn khi DB bận)." },
      { title: "Cất vào cache", hop: "db-app", arrowLabel: "row + SET EX 300", description: "Có kết quả, app lưu vào Redis kèm TTL: `SET product:42 '<json>' EX 300` — tự hết hạn sau 5 phút." },
      { title: "Trả kết quả", hop: "app-user", arrowLabel: "200 OK", description: "Trả trang cho user. Lần sau trong 5 phút sẽ là cache hit." },
    ],
  },
  hit: {
    label: "🔥 Cache hit",
    steps: [
      { title: "Hỏi cache", hop: "app-cache", arrowLabel: "GET product:42", description: "User khác mở cùng sản phẩm. App hỏi Redis." },
      { title: "Có ngay", hop: "cache-app", arrowLabel: "json (<1ms)", description: "Redis trả dữ liệu từ RAM, thường dưới 1 ms. Database không bị đụng tới — đó là cách cache giảm tải cho DB." },
      { title: "Trả kết quả", hop: "app-user", arrowLabel: "200 OK", description: "Trang hiện nhanh hơn. Rủi ro: dữ liệu có thể cũ tối đa bằng TTL." },
    ],
  },
  update: {
    label: "✏️ Cập nhật giá",
    steps: [
      { title: "Ghi database", hop: "app-db", arrowLabel: "UPDATE price", description: "Admin đổi giá sản phẩm 42. Nguồn sự thật luôn là database: ghi vào RDS trước." },
      { title: "Xoá cache", hop: "app-cache", arrowLabel: "DEL product:42", description: "Rồi xoá key trong Redis (`DEL product:42`). Lần đọc tiếp theo sẽ miss và nạp giá mới — tránh bán giá cũ suốt 5 phút." },
      { title: "Xác nhận", hop: "app-user", arrowLabel: "200 OK", description: "Nếu bước DEL lỡ thất bại, TTL vẫn là 'lưới an toàn' cuối cùng: dữ liệu cũ tự hết hạn." },
    ],
  },
};

const arrows: Record<Hop, { from: [number, number]; to: [number, number] }> = {
  "app-cache": { from: [300, 150], to: [196, 205] },
  "cache-app": { from: [196, 240], to: [300, 180] },
  "app-db": { from: [420, 150], to: [524, 205] },
  "db-app": { from: [524, 240], to: [420, 180] },
  "app-user": { from: [360, 108], to: [360, 72] },
};

export function CacheAsideFlowDiagram() {
  const [scenario, setScenario] = useState<Scenario>("miss");
  const { steps } = scenarios[scenario];

  return (
    <div>
      <div className="not-prose -mb-4 flex flex-wrap gap-2">
        {(Object.keys(scenarios) as Scenario[]).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setScenario(option)}
            className={clsx(
              "rounded-full px-3 py-1.5 text-sm font-medium",
              scenario === option ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
            )}
          >
            {scenarios[option].label}
          </button>
        ))}
      </div>
      <StepDiagram key={scenario} title="Cache-aside (lazy loading) với ElastiCache" viewBox="0 0 720 300" steps={steps}>
        {(step) => {
          const hop = steps[step].hop;
          const touches = (node: "cache" | "db" | "user") =>
            (node === "cache" && hop.includes("cache")) || (node === "db" && hop.includes("db")) || (node === "user" && hop === "app-user");
          return (
            <>
              <DiagramNode x={290} y={10} width={140} height={58} label="User" emoji="🧑" tone="slate" state={touches("user") ? "active" : "normal"} />
              <DiagramNode x={290} y={110} width={140} height={80} label="App" sublabel="EC2 / ECS" emoji="⚙️" tone="violet" state="active" />
              <DiagramNode x={30} y={200} width={165} height={84} label="ElastiCache" sublabel="Redis · RAM · TTL" emoji="⚡" tone="rose" state={touches("cache") ? "active" : "dimmed"} />
              <DiagramNode x={525} y={200} width={165} height={84} label="RDS Postgres" sublabel="nguồn sự thật" emoji="🐘" tone="blue" state={touches("db") ? "active" : "dimmed"} />
              <DiagramArrow key={`${scenario}-${step}`} from={arrows[hop].from} to={arrows[hop].to} tone="amber" animated label={steps[step].arrowLabel} />
            </>
          );
        }}
      </StepDiagram>
    </div>
  );
}
