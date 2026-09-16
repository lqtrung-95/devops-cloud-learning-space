"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramArrow, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";
import type { DiagramTone } from "@/components/diagrams/diagram-tones";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";

type Scenario = "ram" | "sticky" | "redis";
type ArrowId = "userLb" | "lbA" | "lbB" | "aRedis" | "bRedis";

interface SessionStep extends DiagramStep {
  active: string[];
  arrows: ArrowId[];
  appADown?: boolean;
  result?: { text: string; tone: DiagramTone };
}

const scenarioLabels: Record<Scenario, string> = {
  ram: "Session trong RAM",
  sticky: "Sticky session",
  redis: "Session trong Redis",
};

const scenarios: Record<Scenario, SessionStep[]> = {
  ram: [
    { title: "Đăng nhập", description: "User gửi `POST /login`. Load balancer (round robin) chuyển tới App A.", active: ["user", "lb", "appA"], arrows: ["userLb", "lbA"] },
    { title: "Lưu vào RAM", description: "App A tạo session `abc` trong một `Map` trong RAM của chính nó, trả cookie `sid=abc`. Chỉ đầu bếp A 'nhớ order trong đầu'.", active: ["appA"], arrows: [] },
    { title: "Request kế tiếp", description: "`GET /me` kèm cookie `sid=abc`. Lượt round robin tiếp theo rơi vào App B.", active: ["user", "lb", "appB"], arrows: ["userLb", "lbB"] },
    { title: "401 😱", description: "App B không hề biết session `abc` → trả `401`. User bị 'đăng xuất' ngẫu nhiên, càng nhiều instance càng hay gặp.", active: ["appB"], arrows: [], result: { text: "401 Unauthorized — B không có session abc", tone: "rose" } },
  ],
  sticky: [
    { title: "Đăng nhập", description: "`POST /login` tới App A. Load balancer gắn user với A (cookie affinity hoặc hash IP).", active: ["user", "lb", "appA"], arrows: ["userLb", "lbA"] },
    { title: "Luôn về A", description: "`GET /me` → LB thấy affinity → gửi lại App A → `200`. Tạm ổn, nhưng tải chia theo user chứ không theo request.", active: ["user", "lb", "appA"], arrows: ["userLb", "lbA"], result: { text: "200 OK — nhưng chỉ vì luôn quay về A", tone: "amber" } },
    { title: "A chết / scale-in", description: "Deploy, crash hoặc autoscaling tắt App A. Toàn bộ session trong RAM của A biến mất theo.", active: ["appA"], arrows: [], appADown: true },
    { title: "Mất session", description: "LB buộc phải gửi user sang App B → `401`. Sticky chỉ che giấu vấn đề state, không giải quyết nó.", active: ["user", "lb", "appB"], arrows: ["userLb", "lbB"], appADown: true, result: { text: "401 — session chết cùng App A", tone: "rose" } },
  ],
  redis: [
    { title: "Đăng nhập", description: "`POST /login` tới App A. A ghi `SET sess:abc {...} EX 1800` vào Redis dùng chung — sổ order để ở quầy thu ngân chung.", active: ["user", "lb", "appA", "redis"], arrows: ["userLb", "lbA", "aRedis"] },
    { title: "Request kế tiếp", description: "`GET /me` rơi vào App B. B không cần nhớ gì trong RAM.", active: ["user", "lb", "appB"], arrows: ["userLb", "lbB"] },
    { title: "Đọc Redis", description: "B chạy `GET sess:abc` → có dữ liệu. Thêm cỡ một round trip trong datacenter (~0,5 ms) cho mỗi request.", active: ["appB", "redis"], arrows: ["bRedis"] },
    { title: "200 ✅", description: "App A có chết cũng không sao: instance nào cũng phục vụ được. Đổi lại, Redis trở thành dependency quan trọng — cần replica/HA và timeout hợp lý.", active: ["appB", "user"], arrows: [], appADown: true, result: { text: "200 OK — instance nào cũng đọc được session", tone: "green" } },
  ],
};

const arrowGeometry: Record<ArrowId, { from: [number, number]; to: [number, number] }> = {
  userLb: { from: [142, 150], to: [196, 150] },
  lbA: { from: [318, 136], to: [388, 78] },
  lbB: { from: [318, 164], to: [388, 222] },
  aRedis: { from: [540, 78], to: [586, 132] },
  bRedis: { from: [540, 222], to: [586, 168] },
};

export function SessionStoreScenarioDiagram() {
  const [scenario, setScenario] = useState<Scenario>("ram");
  const steps = scenarios[scenario];

  return (
    <div>
      <div className="not-prose -mb-4 flex flex-wrap gap-2">
        {(Object.keys(scenarioLabels) as Scenario[]).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setScenario(option)}
            className={clsx(
              "rounded-full px-3 py-1.5 text-sm font-medium",
              scenario === option ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
            )}
          >
            {scenarioLabels[option]}
          </button>
        ))}
      </div>
      <StepDiagram key={scenario} title="User có bị đăng xuất khi đổi instance?" viewBox="0 0 720 300" steps={steps}>
        {(stepIndex) => {
          const step = steps[stepIndex];
          const stateOf = (id: string) => (step.active.includes(id) ? "active" : "normal");
          const hasSessionInA = scenario !== "redis" && stepIndex >= 1 && !step.appADown;
          return (
            <>
              {(Object.keys(arrowGeometry) as ArrowId[]).map((id) => (
                <DiagramArrow key={id} {...arrowGeometry[id]} tone={step.arrows.includes(id) ? "violet" : "slate"} animated={step.arrows.includes(id)} dimmed={!step.arrows.includes(id)} />
              ))}
              <DiagramNode x={20} y={110} width={120} height={80} label="User" sublabel="cookie sid=abc" emoji="🧑" tone="violet" state={stateOf("user")} />
              <DiagramNode x={198} y={110} width={118} height={80} label="Nginx" sublabel="load balancer" emoji="⚖️" tone="blue" state={stateOf("lb")} />
              <DiagramNode
                x={390}
                y={34}
                width={148}
                height={80}
                label={step.appADown ? "App A ✗" : "App A"}
                sublabel={hasSessionInA ? "RAM: sess abc" : step.appADown ? "đã tắt" : "RAM: trống"}
                emoji="🖥️"
                tone={step.appADown ? "rose" : "cyan"}
                state={step.appADown ? "dimmed" : stateOf("appA")}
              />
              <DiagramNode x={390} y={186} width={148} height={80} label="App B" sublabel="RAM: trống" emoji="🖥️" tone="cyan" state={stateOf("appB")} />
              <DiagramNode
                x={588}
                y={110}
                width={118}
                height={80}
                label="Redis"
                sublabel={scenario === "redis" ? "sess:abc" : "không dùng"}
                emoji="🗂️"
                tone="amber"
                state={scenario === "redis" ? stateOf("redis") : "dimmed"}
              />
              {step.result && <DiagramLabel x={360} y={292} text={step.result.text} tone={step.result.tone} size={13} bold />}
            </>
          );
        }}
      </StepDiagram>
    </div>
  );
}
