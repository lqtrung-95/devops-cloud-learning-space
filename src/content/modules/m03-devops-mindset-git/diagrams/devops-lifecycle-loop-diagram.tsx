"use client";

import { useState } from "react";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import { DiagramLabel, DiagramNode, MovingPacket } from "@/components/diagrams/diagram-shapes";
import type { DiagramTone } from "@/components/diagrams/diagram-tones";
import { InlineCodeText } from "@/components/ui/inline-code-text";

interface LifecycleStage {
  name: string;
  emoji: string;
  /** Center of the node on the figure-eight path. */
  cx: number;
  cy: number;
  tone: DiagramTone;
  what: string;
  practice: string;
  tools: string;
  courseModule: string;
}

// Dev loop on the left (Plan → Test), Ops loop on the right (Release → Monitor); feedback from Monitor flows back to Plan.
const stages: LifecycleStage[] = [
  { name: "Plan", emoji: "🗺️", cx: 296, cy: 88, tone: "violet", what: "Chọn việc cần làm dựa trên giá trị cho người dùng VÀ dữ liệu từ Monitor (lỗi, chậm, chi phí).", practice: "Chia việc nhỏ, ưu tiên theo feedback thật thay vì cảm tính.", tools: "GitHub Issues/Projects, Jira, Linear", courseModule: "M03" },
  { name: "Code", emoji: "⌨️", cx: 141, cy: 88, tone: "blue", what: "Viết code trên nhánh ngắn, commit nhỏ, review qua Pull Request.", practice: "Trunk-based development, conventional commits, pre-commit hooks.", tools: "Git, GitHub, `pre-commit`, VS Code", courseModule: "M03" },
  { name: "Build", emoji: "🏗️", cx: 141, cy: 212, tone: "cyan", what: "Biến source thành artifact bất biến: container image, binary, bundle.", practice: "Build một lần, deploy cùng artifact đó lên mọi môi trường.", tools: "Docker, GitHub Actions", courseModule: "M04–M05" },
  { name: "Test", emoji: "🧪", cx: 296, cy: 212, tone: "green", what: "Tự động chạy unit/integration test, lint, quét bảo mật trên mỗi PR.", practice: "Feedback trong vài phút; test đỏ thì không merge.", tools: "Jest/pytest, Trivy, SonarQube", courseModule: "M05" },
  { name: "Release", emoji: "🏷️", cx: 424, cy: 88, tone: "amber", what: "Đánh version, sinh changelog, đánh dấu artifact sẵn sàng phát hành.", practice: "Semantic versioning, release tự động từ commit message.", tools: "semantic-release, release-please, GitHub Releases", courseModule: "M03, M05" },
  { name: "Deploy", emoji: "🚀", cx: 579, cy: 88, tone: "rose", what: "Đưa artifact lên môi trường chạy thật, an toàn và lặp lại được.", practice: "Hạ tầng bằng code, GitOps, canary/blue-green, rollback nhanh.", tools: "Terraform, Kubernetes, Argo CD", courseModule: "M10–M14" },
  { name: "Operate", emoji: "🛠️", cx: 579, cy: 212, tone: "slate", what: "Giữ hệ thống chạy: scale, vá lỗi, xử lý sự cố, quản lý chi phí.", practice: "Runbook, on-call, postmortem không đổ lỗi (blameless).", tools: "AWS, kubectl, PagerDuty", courseModule: "M07–M09, M16" },
  { name: "Monitor", emoji: "📈", cx: 424, cy: 212, tone: "cyan", what: "Đo metrics, logs, traces; so với SLO; cảnh báo khi người dùng bị ảnh hưởng.", practice: "Đo DORA metrics và SLO — dữ liệu này quay về bước Plan.", tools: "Prometheus, Grafana, CloudWatch, OpenTelemetry", courseModule: "M15" },
];

const LOOP_PATH = "M 360 150 C 300 40, 110 40, 110 150 C 110 260, 300 260, 360 150 C 420 40, 610 40, 610 150 C 610 260, 420 260, 360 150";

export function DevopsLifecycleLoopDiagram() {
  const [selectedName, setSelectedName] = useState("Monitor");
  const selected = stages.find((stage) => stage.name === selectedName) ?? stages[0];

  return (
    <DiagramFrame
      title="Vòng lặp vô tận DevOps — bấm vào từng giai đoạn"
      viewBox="0 0 720 300"
      controls={
        <div className="flex items-start gap-3 text-sm leading-relaxed">
          <span className="text-3xl" aria-hidden>
            {selected.emoji}
          </span>
          <div className="space-y-1 text-stone-700 dark:text-stone-300">
            <p className="font-bold text-indigo-700 dark:text-indigo-300">
              {selected.name} <span className="font-normal text-stone-500">· học ở {selected.courseModule}</span>
            </p>
            <p>{selected.what}</p>
            <p>
              <span className="font-semibold">Thực hành tốt:</span> {selected.practice}
            </p>
            <p>
              <span className="font-semibold">Công cụ ví dụ:</span> <InlineCodeText text={selected.tools} />
            </p>
          </div>
        </div>
      }
      caption="Không có vạch đích: dữ liệu từ Monitor quay lại Plan. Dev và Ops là hai nửa của cùng một vòng, không phải hai phòng ban ném việc qua tường cho nhau."
    >
      <path d={LOOP_PATH} fill="none" strokeWidth={10} className="stroke-indigo-100 dark:stroke-indigo-950" />
      <path d={LOOP_PATH} fill="none" strokeWidth={2} strokeDasharray="6 6" className="stroke-indigo-400 dark:stroke-indigo-500" />
      <MovingPacket path={LOOP_PATH} durationSeconds={9} tone="violet" />
      <DiagramLabel x={220} y={155} text="DEV" size={16} bold tone="blue" />
      <DiagramLabel x={500} y={155} text="OPS" size={16} bold tone="rose" />
      <DiagramLabel x={360} y={286} text="Monitor → Plan: feedback khép vòng" size={12} tone="violet" bold />
      {stages.map((stage) => (
        <DiagramNode
          key={stage.name}
          x={stage.cx - 50}
          y={stage.cy - 20}
          width={100}
          height={40}
          label={`${stage.emoji} ${stage.name}`}
          tone={stage.tone}
          state={stage.name === selectedName ? "active" : "normal"}
          onClick={() => setSelectedName(stage.name)}
        />
      ))}
    </DiagramFrame>
  );
}
