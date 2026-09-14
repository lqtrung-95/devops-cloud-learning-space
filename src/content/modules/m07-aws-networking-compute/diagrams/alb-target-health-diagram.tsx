"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import { DiagramArrow, DiagramGroupBox, DiagramNode, MovingPacket } from "@/components/diagrams/diagram-shapes";

const targets = [
  { id: "web-1", az: "AZ a", x: 50 },
  { id: "web-2", az: "AZ b", x: 280 },
  { id: "web-3", az: "AZ a", x: 510 },
];

const TARGET_Y = 214;
const TARGET_WIDTH = 160;

export function AlbTargetHealthDiagram() {
  const [crashed, setCrashed] = useState<string[]>([]);
  const [wrongHealthPath, setWrongHealthPath] = useState(false);

  const isHealthy = (id: string) => !wrongHealthPath && !crashed.includes(id);
  const healthyTargets = targets.filter((target) => isHealthy(target.id));
  const allUnhealthy = healthyTargets.length === 0;
  const toggleCrash = (id: string) => setCrashed((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));

  let status: string;
  if (wrongHealthPath) {
    status = "❌ Health check gọi /healthz nhưng app chỉ có /health → 404 (Target.ResponseCodeMismatch). App vẫn sống mà mọi target bị đánh dấu unhealthy.";
  } else if (allUnhealthy) {
    status = "❌ Mọi target unhealthy → ALB 'fail open' gửi request tới tất cả, nhưng app đã chết nên người dùng nhận 502/503.";
  } else {
    status = `✅ ALB chỉ gửi request tới ${healthyTargets.length} target healthy: ${healthyTargets.map((target) => target.id).join(", ")}.`;
  }

  return (
    <DiagramFrame
      title="ALB & target group — bấm vào instance để làm nó crash"
      viewBox="0 0 720 310"
      controls={
        <div className="space-y-3 text-sm">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setWrongHealthPath(!wrongHealthPath)}
              className={clsx("rounded-full px-3 py-1.5 font-medium", wrongHealthPath ? "bg-rose-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300")}
            >
              {wrongHealthPath ? "Sửa health check path về /health" : "Giả lập: health check path sai"}
            </button>
            <button
              type="button"
              onClick={() => {
                setCrashed([]);
                setWrongHealthPath(false);
              }}
              className="rounded-full bg-stone-200 px-3 py-1.5 font-medium text-stone-700 dark:bg-stone-800 dark:text-stone-300"
            >
              🔧 Khôi phục tất cả
            </button>
          </div>
          <p className={clsx("font-semibold", allUnhealthy ? "text-rose-700 dark:text-rose-400" : "text-emerald-700 dark:text-emerald-400")}>{status}</p>
        </div>
      }
      caption="Health check chạy liên tục (vd mỗi 30 giây). Target chỉ bị đánh dấu unhealthy sau số lần fail liên tiếp = unhealthy threshold, và quay lại healthy sau healthy threshold lần thành công."
    >
      <DiagramNode x={290} y={6} width={140} height={50} label="👩‍💻 Người dùng" tone="violet" />
      <DiagramArrow from={[360, 58]} to={[360, 84]} tone={allUnhealthy ? "rose" : "violet"} animated />
      <DiagramNode x={240} y={88} width={240} height={62} label="⚖️ Application Load Balancer" sublabel="listener HTTPS :443 → web-tg" tone="blue" />

      <DiagramGroupBox x={20} y={170} width={680} height={132} label={`Target group web-tg · health check GET ${wrongHealthPath ? "/healthz ✗" : "/health"} · 200`} tone={allUnhealthy ? "rose" : "slate"} />

      {targets.map((target) => {
        const healthy = isHealthy(target.id);
        const isCrashed = crashed.includes(target.id);
        const centerX = target.x + TARGET_WIDTH / 2;
        return (
          <g key={target.id}>
            <DiagramArrow
              from={[360, 152]}
              to={[centerX, TARGET_Y - 4]}
              tone={healthy ? "green" : "rose"}
              dimmed={!healthy && !allUnhealthy}
              animated={healthy || allUnhealthy}
              label={healthy ? "200 OK" : isCrashed ? "timeout" : "404"}
            />
            <DiagramNode
              x={target.x}
              y={TARGET_Y}
              width={TARGET_WIDTH}
              height={74}
              label={`${isCrashed ? "💥" : "🖥️"} ${target.id}`}
              sublabel={`${target.az} · ${healthy ? "healthy" : "unhealthy"}`}
              tone={healthy ? "green" : "rose"}
              state={healthy ? "normal" : "dimmed"}
              onClick={() => toggleCrash(target.id)}
            />
          </g>
        );
      })}

      {healthyTargets.map((target, index) => (
        <MovingPacket
          key={`${target.id}-${crashed.join("-")}`}
          path={`M 360 152 L ${target.x + TARGET_WIDTH / 2} ${TARGET_Y - 4}`}
          durationSeconds={1.2 * healthyTargets.length}
          delaySeconds={1.2 * index}
          tone="green"
        />
      ))}
    </DiagramFrame>
  );
}
