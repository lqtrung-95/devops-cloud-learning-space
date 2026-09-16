"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramArrow, DiagramGroupBox, DiagramLabel, DiagramNode, MovingPacket } from "@/components/diagrams/diagram-shapes";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";

type Scenario = "healthy" | "instance-down";

const scenarios: Record<Scenario, { button: string; steps: DiagramStep[] }> = {
  healthy: {
    button: "✅ Cả 2 instance đều khoẻ",
    steps: [
      { title: "Client gọi gateway", description: "Client chỉ biết 1 địa chỉ duy nhất: `api.example.com`. Không cần biết Inventory service có bao nhiêu instance hay chạy ở đâu." },
      { title: "Gateway tra service discovery", description: "Gateway hỏi registry (DNS nội bộ / Consul / etcd, hoặc `Service` của Kubernetes): 'Inventory service đang có instance nào khoẻ?'" },
      { title: "Registry trả danh sách khoẻ", description: "Registry trả về [instance A, instance B] — cả hai vừa qua health check gần nhất." },
      { title: "Route theo round-robin", description: "Gateway chuyển tiếp request tới instance A (hoặc B, chia đều tải). Client không biết và không cần biết instance nào đã xử lý." },
    ],
  },
  "instance-down": {
    button: "❌ Instance A vừa chết",
    steps: [
      { title: "Client gọi gateway", description: "Vẫn 1 địa chỉ `api.example.com` — client không đổi gì cả dù backend vừa có sự cố." },
      { title: "Gateway tra service discovery", description: "Gateway hỏi registry như thường lệ." },
      { title: "Registry đã loại instance chết", description: "Health check chủ động (Nginx `max_fails`/`fail_timeout`, hoặc k8s readiness probe) phát hiện instance A không trả lời và loại nó khỏi danh sách route — registry giờ chỉ trả [instance B]." },
      { title: "Route sang instance còn sống", description: "Gateway chuyển toàn bộ traffic sang instance B. Client vẫn nhận response bình thường — sự cố được che giấu ở tầng hạ tầng, không lộ ra ngoài." },
    ],
  },
};

export function ApiGatewayServiceDiscoveryDiagram() {
  const [scenario, setScenario] = useState<Scenario>("healthy");
  const isDown = scenario === "instance-down";

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
            {scenarios[option].button}
          </button>
        ))}
      </div>
      <StepDiagram key={scenario} title="API gateway + service discovery: client → gateway → instance đang khoẻ" viewBox="0 0 720 300" steps={scenarios[scenario].steps}>
        {(step) => {
          const registryQueried = step >= 1;
          const registryAnswered = step >= 2;
          const routed = step >= 3;
          const routeToB = isDown; // when down, both scenarios' final route target differs

          return (
            <>
              <DiagramNode x={20} y={110} width={110} height={70} label="Client" emoji="🧑" tone="slate" state={step === 0 ? "active" : "normal"} />
              <DiagramNode x={190} y={110} width={130} height={70} label="API gateway" emoji="🚪" tone="violet" state={step >= 0 ? "active" : "normal"} />
              <DiagramArrow from={[130, 145]} to={[186, 145]} tone="slate" dimmed={step > 0} label="/inventory/sku-1" />

              <DiagramGroupBox x={370} y={20} width={180} height={90} label="Service discovery" tone="cyan">
                <DiagramNode
                  x={385}
                  y={50}
                  width={150}
                  height={45}
                  label="registry"
                  sublabel={registryAnswered ? (isDown ? "chỉ còn B" : "A, B đều khoẻ") : "chờ hỏi"}
                  emoji="📋"
                  tone="cyan"
                  state={registryQueried && !registryAnswered ? "active" : "normal"}
                />
              </DiagramGroupBox>
              <DiagramArrow from={[320, 130]} to={[385, 90]} tone="cyan" dimmed={!registryQueried} label="tra cứu" />

              <DiagramNode
                x={560}
                y={40}
                width={130}
                height={70}
                label="Instance A"
                sublabel={isDown ? "⚡ không phản hồi" : "khoẻ"}
                emoji="📦"
                tone={isDown ? "rose" : "green"}
                state={routed && !routeToB ? "active" : "normal"}
                dashed={isDown}
              />
              <DiagramNode
                x={560}
                y={180}
                width={130}
                height={70}
                label="Instance B"
                sublabel="khoẻ"
                emoji="📦"
                tone="green"
                state={routed ? "active" : "normal"}
              />

              {routed && !routeToB && <MovingPacket key={`a-${step}`} path="M 320 145 L 620 75" durationSeconds={1} repeat={false} tone="green" label="req" />}
              {routed && (
                <MovingPacket key={`b-${step}-${scenario}`} path="M 320 155 L 620 215" durationSeconds={1} repeat={false} tone="green" label="req" />
              )}

              {isDown && step >= 2 && <DiagramLabel x={625} y={130} text="A bị loại khỏi registry sau health check lỗi" tone="rose" bold size={12} />}
            </>
          );
        }}
      </StepDiagram>
    </div>
  );
}
