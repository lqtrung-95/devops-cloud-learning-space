"use client";

import { useState } from "react";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import { DiagramLabel } from "@/components/diagrams/diagram-shapes";
import { diagramToneClasses } from "@/components/diagrams/diagram-tones";

interface Candidate {
  id: string;
  label: string;
  /** 0-100, ước lượng tương đối — không phải điểm số chính xác tuyệt đối. */
  effort: number;
  impact: number;
  chosen: boolean;
  reasoning: string;
}

/** 5 việc có thể làm nếu taskflow-api có thêm 1 tháng — 3 việc được CHỌN cho design doc, 2 việc xếp sau. */
const candidates: Candidate[] = [
  {
    id: "fix-login-bottleneck",
    label: "Sửa bottleneck CPU ở đăng nhập (worker threads / scale api)",
    effort: 55,
    impact: 88,
    chosen: true,
    reasoning: "Impact cao vì đây là bottleneck đầu tiên đo được thật ở lesson trước — ảnh hưởng trực tiếp tới mọi user mỗi lần đăng nhập. Effort trung bình vì cần tách việc hash CPU-bound ra khỏi event loop chính.",
  },
  {
    id: "db-backup-drill",
    label: "Tự động backup Postgres + thử restore thật",
    effort: 22,
    impact: 82,
    chosen: true,
    reasoning: "Quick win rõ ràng: `pg_dump` theo lịch + một lần restore thử tốn không nhiều công, nhưng đây là mục lớn nhất còn thiếu trong checklist — mất dữ liệu là rủi ro nghiêm trọng nhất chưa được che chắn.",
  },
  {
    id: "circuit-breaker-grpc",
    label: "Retry + circuit breaker giữa api và notification-service",
    effort: 28,
    impact: 58,
    chosen: true,
    reasoning: "Effort thấp (thư viện retry có sẵn), impact vừa phải nhưng ngăn được kiểu lỗi dây chuyền: notification-service down không nên làm tạo task cũng timeout theo.",
  },
  {
    id: "dependency-scanning",
    label: "Thêm Dependabot/Renovate + quét SBOM vào CI",
    effort: 15,
    impact: 42,
    chosen: false,
    reasoning: "Effort rất thấp nhưng impact thấp hơn 3 mục trên trong ngắn hạn — `pnpm audit` thủ công ở B15 đã che được phần lớn rủi ro cấp bách, việc tự động hoá có thể để tháng sau.",
  },
  {
    id: "horizontal-scale-api",
    label: "Scale ngang api + pgbouncer",
    effort: 72,
    impact: 80,
    chosen: false,
    reasoning: "Impact cao nhưng effort cao nhất và phụ thuộc vào việc sửa bottleneck CPU trước — scale ngang một service vẫn nghẽn CPU không giải quyết được gốc vấn đề, nên xếp sau trong 1 tháng.",
  },
];

const chartLeft = 60;
const chartRight = 690;
const chartTop = 20;
const chartBottom = 280;

function toX(effort: number): number {
  return chartLeft + (effort / 100) * (chartRight - chartLeft);
}
function toY(impact: number): number {
  return chartTop + ((100 - impact) / 100) * (chartBottom - chartTop);
}

const midX = toX(50);
const midY = toY(50);

/** Ma trận effort/impact cho 5 việc có thể làm trong "1 tháng nữa" — bấm một điểm để xem lý do chọn hay không chọn. */
export function ImprovementPriorityMatrixDiagram() {
  const [selectedId, setSelectedId] = useState("fix-login-bottleneck");
  const current = candidates.find((candidate) => candidate.id === selectedId)!;

  return (
    <DiagramFrame
      title="Effort vs impact: chọn 3 cải tiến ưu tiên cho design doc — bấm một điểm để xem lý do"
      viewBox="0 0 720 320"
      caption={
        <div>
          <p className="font-semibold text-stone-800 dark:text-stone-200">
            {current.chosen ? "✅ Được chọn — " : "⏭️ Xếp sau — "}
            {current.label}
          </p>
          <p className="mt-1">{current.reasoning}</p>
        </div>
      }
    >
      <rect x={chartLeft} y={chartTop} width={chartRight - chartLeft} height={chartBottom - chartTop} fill="none" className="stroke-stone-300 dark:stroke-stone-700" strokeWidth={1.5} />
      <line x1={midX} y1={chartTop} x2={midX} y2={chartBottom} strokeDasharray="5 5" className="stroke-stone-400 dark:stroke-stone-600" strokeWidth={1.25} />
      <line x1={chartLeft} y1={midY} x2={chartRight} y2={midY} strokeDasharray="5 5" className="stroke-stone-400 dark:stroke-stone-600" strokeWidth={1.25} />

      <DiagramLabel x={chartLeft + 6} y={chartTop + 16} text="Làm ngay (quick win)" anchor="start" size={11} tone="green" bold />
      <DiagramLabel x={chartRight - 6} y={chartTop + 16} text="Dự án lớn, cần kế hoạch" anchor="end" size={11} tone="amber" bold />
      <DiagramLabel x={chartLeft + 6} y={chartBottom - 8} text="Làm khi rảnh" anchor="start" size={11} tone="slate" />
      <DiagramLabel x={chartRight - 6} y={chartBottom - 8} text="Tránh / hoãn" anchor="end" size={11} tone="rose" />

      <DiagramLabel x={(chartLeft + chartRight) / 2} y={chartBottom + 24} text="Effort (công sức cần bỏ ra) →" size={12} tone="slate" bold />
      <text x={16} y={(chartTop + chartBottom) / 2} textAnchor="middle" fontSize={12} fontWeight={600} className="fill-stone-700 dark:fill-stone-300" transform={`rotate(-90 16 ${(chartTop + chartBottom) / 2})`}>
        Impact (tác động mang lại) →
      </text>

      {candidates.map((candidate) => {
        const cx = toX(candidate.effort);
        const cy = toY(candidate.impact);
        const isSelected = candidate.id === selectedId;
        const tone = candidate.chosen ? "green" : "slate";
        const tones = diagramToneClasses[tone];
        return (
          <g key={candidate.id} className="cursor-pointer" onClick={() => setSelectedId(candidate.id)}>
            <circle cx={cx} cy={cy} r={isSelected ? 12 : 9} className={tones.shape} strokeWidth={isSelected ? 3 : 1.5} />
            {candidate.chosen && (
              <text x={cx} y={cy + 4} textAnchor="middle" fontSize={11} className={tones.text}>
                ✓
              </text>
            )}
            <DiagramLabel
              x={cx}
              y={cy - 16}
              text={candidate.id === "fix-login-bottleneck" ? "Sửa bottleneck login" : candidate.label.split(" ").slice(0, 3).join(" ")}
              size={10}
              tone={tone}
            />
          </g>
        );
      })}
    </DiagramFrame>
  );
}
