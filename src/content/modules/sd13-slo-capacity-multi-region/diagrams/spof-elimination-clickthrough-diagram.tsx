"use client";

import { useState } from "react";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import { DiagramArrow, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";

type ComponentKey = "lb" | "app" | "db" | "cache";

interface ComponentInfo {
  key: ComponentKey;
  label: string;
  emoji: string;
  x: number;
}

const components: ComponentInfo[] = [
  { key: "lb", label: "Load balancer", emoji: "🚦", x: 20 },
  { key: "app", label: "App server", emoji: "⚙️", x: 200 },
  { key: "cache", label: "Redis cache", emoji: "🧠", x: 380 },
  { key: "db", label: "Postgres primary", emoji: "🗄️", x: 380 },
];

/**
 * Click a component to toggle it between "1 instance" (SPOF) and "redundant" (2+ instances).
 * Then click "Mô phỏng 1 node chết" to see whether the request path survives: redundant
 * components reroute fine, SPOF components take the whole request path down with them.
 */
export function SpofEliminationClickthroughDiagram() {
  const [redundant, setRedundant] = useState<Record<ComponentKey, boolean>>({ lb: true, app: true, cache: false, db: false });
  const [failed, setFailed] = useState<ComponentKey | null>(null);

  const toggle = (key: ComponentKey) => {
    setFailed(null);
    setRedundant((previous) => ({ ...previous, [key]: !previous[key] }));
  };

  const simulateRandomFailure = () => {
    const pick = components[Math.floor(Math.random() * components.length)];
    setFailed(pick.key);
  };

  const isOutage = failed !== null && !redundant[failed];

  const nodeState = (key: ComponentKey): "normal" | "active" | "dimmed" => {
    if (failed === key) return redundant[key] ? "active" : "dimmed";
    return "normal";
  };

  const nodeTone = (key: ComponentKey) => {
    if (failed === key) return redundant[key] ? "green" : "rose";
    return redundant[key] ? "green" : "amber";
  };

  return (
    <DiagramFrame
      title="Rà SPOF: click từng thành phần để bật/tắt redundancy, rồi mô phỏng 1 node chết"
      viewBox="0 0 720 260"
      controls={
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {components.map((component) => (
              <button
                key={component.key}
                type="button"
                onClick={() => toggle(component.key)}
                className={
                  redundant[component.key]
                    ? "rounded-full bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white"
                    : "rounded-full bg-amber-500 px-3 py-1.5 text-sm font-medium text-white"
                }
              >
                {component.emoji} {component.label}: {redundant[component.key] ? "redundant" : "1 instance (SPOF)"}
              </button>
            ))}
          </div>
          <button type="button" onClick={simulateRandomFailure} className="rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-medium text-white">
            💥 Mô phỏng 1 node chết ngẫu nhiên
          </button>
        </div>
      }
      caption={
        failed === null
          ? "Chọn cấu hình redundancy cho từng thành phần rồi bấm mô phỏng để xem điều gì xảy ra khi một node chết."
          : isOutage
            ? `${components.find((c) => c.key === failed)?.label} chỉ có 1 instance và nó vừa chết ⇒ toàn bộ request cần đi qua đây đều fail, dù các thành phần khác vẫn sống khoẻ.`
            : `${components.find((c) => c.key === failed)?.label} có instance dự phòng ⇒ traffic tự động chuyển sang instance còn lại, request vẫn thành công.`
      }
    >
      <DiagramNode x={20} y={100} width={140} height={70} emoji="🚦" label="Load balancer" tone={nodeTone("lb")} state={nodeState("lb")} />
      <DiagramNode x={200} y={100} width={140} height={70} emoji="⚙️" label="App server" tone={nodeTone("app")} state={nodeState("app")} />
      <DiagramNode x={400} y={40} width={150} height={60} emoji="🧠" label="Redis cache" tone={nodeTone("cache")} state={nodeState("cache")} />
      <DiagramNode x={400} y={150} width={150} height={60} emoji="🗄️" label="Postgres primary" tone={nodeTone("db")} state={nodeState("db")} />

      <DiagramArrow from={[160, 135]} to={[200, 135]} tone={isOutage && failed === "lb" ? "rose" : "slate"} dimmed={isOutage && failed === "lb"} />
      <DiagramArrow from={[340, 120]} to={[400, 70]} tone={isOutage && (failed === "app" || failed === "cache") ? "rose" : "slate"} dimmed={isOutage && failed === "app"} />
      <DiagramArrow from={[340, 145]} to={[400, 180]} tone={isOutage && (failed === "app" || failed === "db") ? "rose" : "slate"} dimmed={isOutage && failed === "app"} />

      <DiagramLabel x={360} y={235} text="Redundant = 2+ instance ở AZ khác nhau. 1 instance = SPOF, dù các thành phần khác đã dự phòng đủ." size={11.5} />
    </DiagramFrame>
  );
}
