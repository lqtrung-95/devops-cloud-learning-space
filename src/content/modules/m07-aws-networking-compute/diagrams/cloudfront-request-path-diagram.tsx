"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramArrow, DiagramNode, MovingPacket } from "@/components/diagrams/diagram-shapes";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";

type Scenario = "cache-miss" | "cache-hit";
type NodeId = "browser" | "route53" | "edge" | "acm" | "alb" | "app";

interface PathStep extends DiagramStep {
  active: NodeId[];
  /** Arrow keys visible in this step. */
  arrows: string[];
}

const commonStart: PathStep[] = [
  { title: "Hỏi DNS", active: ["browser", "route53"], arrows: ["dns"], description: "Trình duyệt hỏi `app.example.com`. Route 53 có Alias record (A/AAAA) trỏ tới distribution CloudFront và trả về IP của edge gần người dùng." },
  { title: "TLS tại edge", active: ["browser", "edge", "acm"], arrows: ["tls", "cert-edge"], description: "Kết nối HTTPS tới edge location gần nhất. Edge dùng certificate ACM ở `us-east-1` cho `app.example.com` (cert miễn phí, tự gia hạn)." },
];

const scenarioSteps: Record<Scenario, PathStep[]> = {
  "cache-hit": [
    ...commonStart,
    { title: "Cache HIT", active: ["browser", "edge"], arrows: ["tls", "hit"], description: "Object còn trong cache edge (chưa hết TTL) → trả ngay, header `X-Cache: Hit from cloudfront`. Origin không hề nhận request — nhanh và giảm tải." },
  ],
  "cache-miss": [
    ...commonStart,
    { title: "Cache MISS", active: ["edge", "alb", "acm"], arrows: ["tls", "origin", "cert-alb"], description: "Không có trong cache → edge gửi request tới origin: ALB ở `ap-southeast-1`, qua HTTPS với certificate ACM CÙNG region với ALB." },
    { title: "Tới target", active: ["alb", "app"], arrows: ["origin", "target"], description: "ALB chọn một target healthy (EC2 trong ASG hoặc ECS task) theo listener rule và chuyển request." },
    { title: "Trả & cache", active: ["browser", "edge", "app"], arrows: ["tls", "origin", "target", "back"], description: "Response đi ngược về edge. Edge lưu cache theo cache policy/`Cache-Control`, rồi trả cho người dùng với `X-Cache: Miss from cloudfront`. Request sau sẽ HIT." },
  ],
};

const nodes: Record<NodeId, { x: number; y: number; width: number; label: string; sublabel: string; tone: "violet" | "blue" | "cyan" | "green" | "amber" | "slate" }> = {
  browser: { x: 8, y: 118, width: 132, label: "👩‍💻 Trình duyệt", sublabel: "Hà Nội", tone: "violet" },
  route53: { x: 180, y: 12, width: 180, label: "🧭 Route 53", sublabel: "alias app.example.com", tone: "blue" },
  edge: { x: 190, y: 118, width: 170, label: "📍 CloudFront edge", sublabel: "cache gần người dùng", tone: "cyan" },
  acm: { x: 400, y: 12, width: 180, label: "📜 ACM", sublabel: "us-east-1 · region ALB", tone: "amber" },
  alb: { x: 410, y: 118, width: 140, label: "⚖️ ALB", sublabel: "ap-southeast-1", tone: "blue" },
  app: { x: 590, y: 118, width: 122, label: "🖥️ App", sublabel: "EC2 / ECS", tone: "green" },
};

const arrowDefs: Record<string, { from: [number, number]; to: [number, number]; label?: string; curve?: number; tone: "violet" | "cyan" | "amber" | "blue" | "green" }> = {
  dns: { from: [90, 114], to: [176, 50], label: "DNS?", tone: "violet" },
  tls: { from: [142, 150], to: [186, 150], tone: "violet" },
  "cert-edge": { from: [410, 80], to: [320, 114], label: "cert", tone: "amber" },
  hit: { from: [275, 196], to: [74, 196], label: "⚡ HIT", curve: -30, tone: "cyan" },
  origin: { from: [362, 150], to: [406, 150], tone: "cyan" },
  "cert-alb": { from: [490, 80], to: [480, 114], label: "cert", tone: "amber" },
  target: { from: [552, 150], to: [586, 150], tone: "blue" },
  back: { from: [650, 196], to: [74, 196], label: "response + cache", curve: -50, tone: "green" },
};

export function CloudfrontRequestPathDiagram() {
  const [scenario, setScenario] = useState<Scenario>("cache-miss");
  const steps = scenarioSteps[scenario];

  return (
    <div>
      <div className="not-prose -mb-4 flex flex-wrap gap-2">
        {(["cache-miss", "cache-hit"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setScenario(option)}
            className={clsx(
              "rounded-full px-3 py-1.5 text-sm font-medium",
              scenario === option ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
            )}
          >
            {option === "cache-miss" ? "Lần đầu: cache MISS" : "Lần sau: cache HIT"}
          </button>
        ))}
      </div>
      <StepDiagram key={scenario} title="Một request đi qua Route 53 → CloudFront → ALB" viewBox="0 0 720 290" steps={steps}>
        {(step) => {
          const current = steps[step];
          return (
            <>
              {(Object.keys(nodes) as NodeId[]).map((id) => {
                const node = nodes[id];
                return (
                  <DiagramNode
                    key={id}
                    x={node.x}
                    y={node.y}
                    width={node.width}
                    height={id === "route53" || id === "acm" ? 64 : 76}
                    label={node.label}
                    sublabel={node.sublabel}
                    tone={node.tone}
                    state={current.active.includes(id) ? "active" : "dimmed"}
                  />
                );
              })}
              {current.arrows.map((key) => {
                const arrow = arrowDefs[key];
                return <DiagramArrow key={key} from={arrow.from} to={arrow.to} label={arrow.label} curve={arrow.curve} tone={arrow.tone} animated />;
              })}
              {current.arrows.includes("back") && <MovingPacket key="back" path="M 650 196 Q 362 246 74 196" durationSeconds={2.2} tone="green" />}
              {current.arrows.includes("hit") && <MovingPacket key="hit" path="M 275 196 Q 174 226 74 196" durationSeconds={1.2} tone="cyan" />}
            </>
          );
        }}
      </StepDiagram>
    </div>
  );
}
