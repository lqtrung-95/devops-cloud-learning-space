"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramArrow, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";
import type { DiagramTone } from "@/components/diagrams/diagram-tones";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";

type Scenario = "passive" | "active" | "draining";
type AppStatus = "up" | "down" | "marked" | "draining" | "starting" | "stopped";

interface FailoverStep extends DiagramStep {
  apps: [AppStatus, AppStatus, AppStatus];
  /** Request arrows from Nginx to app index. */
  traffic: { to: number; tone: DiagramTone; label?: string }[];
  probes?: boolean;
  note?: string;
}

const statusView: Record<AppStatus, { text: string; tone: DiagramTone }> = {
  up: { text: "✓ khả dụng", tone: "green" },
  down: { text: "✗ đã chết", tone: "rose" },
  marked: { text: "⛔ bị loại tạm", tone: "rose" },
  draining: { text: "🚿 draining", tone: "amber" },
  starting: { text: "⏳ đang khởi động", tone: "amber" },
  stopped: { text: "⏹ đã dừng sạch", tone: "slate" },
};

const scenarioLabels: Record<Scenario, string> = {
  passive: "Passive (Nginx OSS)",
  active: "Active health check",
  draining: "Deploy: connection draining",
};

const scenarios: Record<Scenario, FailoverStep[]> = {
  passive: [
    { title: "Bình thường", description: "Upstream có `server app:3000 max_fails=3 fail_timeout=10s;`. Nginx không đi kiểm tra ai cả — nó chỉ đếm lỗi của request thật.", apps: ["up", "up", "up"], traffic: [{ to: 1, tone: "green" }] },
    { title: "app-2 chết", description: "`docker kill` app-2. Nginx chưa biết gì vì không có probe; lượt round robin tiếp theo vẫn trỏ vào app-2.", apps: ["up", "down", "up"], traffic: [] },
    { title: "Lỗi rồi retry", description: "Request thật tới app-2 bị `connect timeout` (1s). Nhờ `proxy_next_upstream error timeout`, Nginx thử lại ở app-3 → user nhận `200` nhưng chậm thêm ~1s. Lỗi thứ 1/3 được ghi nhận.", apps: ["up", "down", "up"], traffic: [{ to: 1, tone: "rose", label: "timeout" }, { to: 2, tone: "green", label: "retry" }] },
    { title: "Đủ max_fails", description: "3 lỗi trong 10 giây ⇒ app-2 bị coi là không khả dụng trong `fail_timeout` = 10s. Mọi request chỉ vào app-1 và app-3.", apps: ["up", "marked", "up"], traffic: [{ to: 0, tone: "green" }, { to: 2, tone: "green" }] },
    { title: "Thử lại sau 10s", description: "Hết 10s, Nginx lại gửi request thật tới app-2 để thử. Vẫn chết → bị loại tiếp. Nếu `POST` (không idempotent) hoặc tắt `proxy_next_upstream`, user đó nhận `502`.", apps: ["up", "down", "up"], traffic: [{ to: 1, tone: "rose", label: "thử" }, { to: 2, tone: "green", label: "retry" }], note: "Passive = người dùng thật làm 'chuột bạch'" },
  ],
  active: [
    { title: "Probe định kỳ", description: "Load balancer tự gửi `GET /health` tới mọi instance theo chu kỳ (ví dụ 5s). Có ở AWS ALB/NLB target group, Kubernetes readiness probe, HAProxy, NGINX Plus (`health_check`).", apps: ["up", "up", "up"], traffic: [], probes: true },
    { title: "app-2 chết", description: "app-2 crash giữa hai lần probe. Vài request trong khoảng này vẫn có thể lỗi — active check giảm chứ không xoá hẳn cửa sổ lỗi.", apps: ["up", "down", "up"], traffic: [{ to: 1, tone: "rose", label: "lỗi" }] },
    { title: "Probe thất bại", description: "Probe lỗi liên tiếp đủ ngưỡng (ví dụ `fails=2`) ⇒ app-2 bị loại khỏi rotation mà không cần thêm request thật nào hỏng.", apps: ["up", "marked", "up"], traffic: [], probes: true },
    { title: "Chỉ gửi instance khoẻ", description: "Traffic chỉ vào app-1 và app-3. Probe vẫn tiếp tục gõ cửa app-2.", apps: ["up", "marked", "up"], traffic: [{ to: 0, tone: "green" }, { to: 2, tone: "green" }], probes: true },
    { title: "Hồi phục", description: "app-2 chạy lại, probe thành công đủ ngưỡng (ví dụ `passes=2`) ⇒ được đưa lại vào rotation.", apps: ["up", "up", "up"], traffic: [{ to: 1, tone: "green" }], note: "Ngưỡng fails/passes tránh 'bật tắt' liên tục (flapping)" },
  ],
  draining: [
    { title: "Nhận SIGTERM", description: "Rolling deploy thay app-2. `docker compose` / Kubernetes gửi `SIGTERM`, chờ `stop_grace_period` (mặc định 10s) rồi mới `SIGKILL`.", apps: ["up", "draining", "up"], traffic: [{ to: 1, tone: "amber", label: "3 đang chạy" }] },
    { title: "Ngừng nhận mới", description: "app-2 báo readiness fail / được deregister khỏi LB. Request mới đi app-1, app-3; 3 request đang chạy trên app-2 vẫn được làm nốt.", apps: ["up", "draining", "up"], traffic: [{ to: 0, tone: "green" }, { to: 2, tone: "green" }, { to: 1, tone: "amber", label: "làm nốt" }] },
    { title: "Thoát sạch", description: "`await app.close()` đợi request cuối xong, đóng pool DB/Redis rồi `exit 0`. Không user nào nhận lỗi.", apps: ["up", "stopped", "up"], traffic: [{ to: 0, tone: "green" }, { to: 2, tone: "green" }] },
    { title: "Bản mới vào", description: "app-2 bản mới khởi động, qua health check rồi mới nhận traffic. Mới khởi động còn lạnh (JIT, pool, cache) — ALB có slow start, Nginx OSS thì không.", apps: ["up", "starting", "up"], traffic: [{ to: 1, tone: "green", label: "sau khi healthy" }], note: "Draining ≈ treo biển 'không nhận khách mới'" },
  ],
};

export function HealthCheckFailoverDiagram() {
  const [scenario, setScenario] = useState<Scenario>("passive");
  const steps = scenarios[scenario];

  return (
    <div>
      <div className="not-prose -mb-4 flex flex-wrap gap-2">
        {(Object.keys(scenarioLabels) as Scenario[]).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setScenario(option)}
            className={clsx("rounded-full px-3 py-1.5 text-sm font-medium", scenario === option ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300")}
          >
            {scenarioLabels[option]}
          </button>
        ))}
      </div>
      <StepDiagram key={scenario} title="Một instance chết — load balancer làm gì?" viewBox="0 0 720 310" steps={steps}>
        {(stepIndex) => {
          const step = steps[stepIndex];
          return (
            <>
              <DiagramNode x={12} y={112} width={112} height={76} label="Users" sublabel="k6 200 VU" emoji="👥" tone="violet" />
              <DiagramArrow from={[126, 150]} to={[176, 150]} tone="violet" animated />
              <DiagramNode x={178} y={106} width={150} height={88} label="Nginx" sublabel={scenario === "active" ? "probe mỗi 5s" : "đếm lỗi thật"} emoji="⚖️" tone="blue" state="active" />
              {[0, 1, 2].map((index) => {
                const y = 18 + index * 96;
                const status = statusView[step.apps[index]];
                return (
                  <g key={index}>
                    {step.probes && <DiagramArrow from={[330, 140 + index * 10]} to={[426, y + 22]} tone="amber" animated label={index === 0 ? "GET /health" : undefined} curve={-12} />}
                    <DiagramNode
                      x={428}
                      y={y}
                      width={150}
                      height={66}
                      label={`app-${index + 1}`}
                      sublabel={step.apps[index] === "down" || step.apps[index] === "stopped" ? "container đã tắt" : ":3000"}
                      tone={status.tone === "green" ? "cyan" : status.tone}
                      state={["down", "marked", "stopped"].includes(step.apps[index]) ? "dimmed" : "normal"}
                    />
                    <DiagramLabel x={590} y={y + 38} text={status.text} anchor="start" tone={status.tone} bold size={12.5} />
                  </g>
                );
              })}
              {step.traffic.map((arrow, index) => (
                <DiagramArrow key={`${arrow.to}-${index}`} from={[330, 156 + index * 8]} to={[426, 18 + arrow.to * 96 + 44]} tone={arrow.tone} animated label={arrow.label} />
              ))}
              {step.note && <DiagramLabel x={12} y={296} text={step.note} anchor="start" size={13} bold tone="slate" />}
            </>
          );
        }}
      </StepDiagram>
    </div>
  );
}
