"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramArrow, DiagramGroupBox, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";

type Scenario = "ephemeral-open" | "ephemeral-missing";

function buildSteps(scenario: Scenario): DiagramStep[] {
  const isBroken = scenario === "ephemeral-missing";
  return [
    { title: "Request tới", description: "Client `203.0.113.7` mở kết nối HTTPS tới EC2: cổng đích `443`, cổng nguồn ngẫu nhiên (ephemeral) ví dụ `50123`." },
    { title: "NACL inbound", description: "NACL gác cổng subnet, duyệt rule theo SỐ từ nhỏ tới lớn, khớp là dừng. Rule `100 ALLOW TCP 443 0.0.0.0/0` → cho qua." },
    { title: "SG inbound", description: "Security Group gác cửa từng ENI. Rule `allow TCP 443 from 0.0.0.0/0` → cho qua, và SG ghi nhớ kết nối này (connection tracking)." },
    { title: "EC2 trả lời", description: "App trả response: từ cổng `443` về cổng `50123` của client." },
    { title: "SG outbound", description: "SG là STATEFUL: đây là response của kết nối đã được cho vào → tự động cho ra, không cần xét rule outbound." },
    {
      title: "NACL outbound",
      description: isBroken
        ? "NACL là STATELESS: nó không nhớ gì cả, xét response như một gói tin mới tới cổng `50123`. Không có rule nào khớp → rơi xuống rule `*` DENY."
        : "NACL là STATELESS: xét lại response như gói tin mới. Rule `100 ALLOW TCP 1024-65535 0.0.0.0/0` (ephemeral ports) → cho qua.",
    },
    {
      title: "Kết quả",
      description: isBroken
        ? "❌ Client chờ mãi rồi timeout. Log trên EC2 vẫn thấy request tới — dấu hiệu kinh điển của NACL thiếu rule chiều về."
        : "✅ Client nhận được trang web. Nhớ: SG nhớ chiều về, NACL phải mở cả hai chiều.",
    },
  ];
}

// Arrow segments: 0-2 request path (left → right), 3-5 response path (right → left).
const segments: { from: [number, number]; to: [number, number] }[] = [
  { from: [140, 112], to: [178, 112] },
  { from: [332, 112], to: [368, 112] },
  { from: [522, 112], to: [558, 112] },
  { from: [558, 176], to: [524, 176] },
  { from: [368, 176], to: [334, 176] },
  { from: [178, 176], to: [142, 176] },
];

export function SgNaclStatefulFlowDiagram() {
  const [scenario, setScenario] = useState<Scenario>("ephemeral-open");
  const isBroken = scenario === "ephemeral-missing";
  const activeNode = (step: number) => ["client", "nacl", "sg", "ec2", "sg", "nacl", "client"][step];

  return (
    <div>
      <div className="not-prose -mb-4 flex flex-wrap gap-2">
        {(["ephemeral-open", "ephemeral-missing"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setScenario(option)}
            className={clsx(
              "rounded-full px-3 py-1.5 text-sm font-medium",
              scenario === option ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
            )}
          >
            {option === "ephemeral-open" ? "NACL mở ephemeral ports" : "NACL quên rule chiều về"}
          </button>
        ))}
      </div>
      <StepDiagram key={scenario} title="Security Group (stateful) vs NACL (stateless)" viewBox="0 0 720 290" steps={buildSteps(scenario)}>
        {(step) => {
          const blocked = isBroken && step >= 5;
          const nodeState = (id: string) => (activeNode(step) === id ? "active" : "normal");
          return (
            <>
              <DiagramNode
                x={8}
                y={100}
                width={132}
                height={88}
                label="💻 Client"
                sublabel={step === 6 ? (isBroken ? "⏱️ timeout" : "✅ nhận trang") : "203.0.113.7"}
                tone={step === 6 ? (isBroken ? "rose" : "green") : "violet"}
                state={nodeState("client")}
              />
              <DiagramGroupBox x={160} y={14} width={552} height={266} label="Subnet 10.0.1.0/24" tone="slate" />
              <DiagramNode x={180} y={62} width={152} height={160} label="🚧 NACL" sublabel="stateless · subnet" tone={blocked ? "rose" : "amber"} state={nodeState("nacl")} />
              <DiagramNode x={370} y={62} width={152} height={160} label="🛡️ SG" sublabel="stateful · ENI" tone="blue" state={nodeState("sg")} />
              <DiagramNode x={560} y={100} width={140} height={88} label="🖥️ EC2" sublabel="web :443" tone="green" state={nodeState("ec2")} />

              {segments.map((segment, index) => {
                if (step < index) return null;
                const isBlockedSegment = blocked && index === 5;
                return (
                  <DiagramArrow
                    key={index}
                    from={segment.from}
                    to={segment.to}
                    tone={isBlockedSegment ? "rose" : index < 3 ? "violet" : "green"}
                    animated={step === index}
                    dimmed={step > index + 1 && !isBlockedSegment}
                  />
                );
              })}
              {blocked && <DiagramLabel x={160} y={200} text="✗ DENY" tone="rose" bold />}
              <DiagramLabel x={256} y={244} text="IN 100: TCP 443 ALLOW" size={11} tone="amber" />
              <DiagramLabel x={256} y={262} text={isBroken ? "OUT: chỉ có * DENY" : "OUT 100: 1024-65535 ALLOW"} size={11} tone={isBroken ? "rose" : "amber"} bold={isBroken} />
              <DiagramLabel x={446} y={244} text="IN: TCP 443 ALLOW" size={11} tone="blue" />
              <DiagramLabel x={446} y={262} text="OUT: tự cho response" size={11} tone="blue" />
            </>
          );
        }}
      </StepDiagram>
    </div>
  );
}
