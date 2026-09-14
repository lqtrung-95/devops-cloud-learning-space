"use client";

import { useState } from "react";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import { DiagramArrow, DiagramNode } from "@/components/diagrams/diagram-shapes";
import type { DiagramTone } from "@/components/diagrams/diagram-tones";

type Strategy = "backup-restore" | "pilot-light" | "warm-standby" | "active-active";

interface StrategyInfo {
  label: string;
  tone: DiagramTone;
  cost: number; // 1-4 relative bars
  rtoHours: string;
  rpoMinutes: string;
  drSize: number; // relative width of the DR-region box, 0 = none running
  drState: string;
  description: string;
}

const strategies: Record<Strategy, StrategyInfo> = {
  "backup-restore": {
    label: "💾 Backup & Restore",
    tone: "slate",
    cost: 1,
    rtoHours: "vài giờ",
    rpoMinutes: "theo lịch backup (vd 24h)",
    drSize: 0,
    drState: "Không có gì chạy ở region DR",
    description: "Chỉ backup (RDS snapshot, AMI, S3 cross-region replication) sang region DR. Khi sự cố: dựng toàn bộ hạ tầng từ IaC + restore snapshot. Rẻ nhất, chậm nhất.",
  },
  "pilot-light": {
    label: "🕯️ Pilot Light",
    tone: "amber",
    cost: 2,
    rtoHours: "vài chục phút",
    rpoMinutes: "vài phút (replication liên tục)",
    drSize: 30,
    drState: "DB replica chạy sẵn (thu nhỏ); app server tắt",
    description: "Lõi quan trọng nhất (thường là database) chạy sẵn dạng thu nhỏ ở region DR, replication liên tục. Khi cần: bật app server, scale DB lên.",
  },
  "warm-standby": {
    label: "🌤️ Warm Standby",
    tone: "cyan",
    cost: 3,
    rtoHours: "vài phút",
    rpoMinutes: "gần như 0 (replication liên tục)",
    drSize: 55,
    drState: "Bản sao đầy đủ nhưng chạy capacity nhỏ hơn",
    description: "Toàn bộ stack chạy ở cả 2 region, nhưng DR chỉ chạy capacity nhỏ (vd 1 instance thay vì 10). Khi sự cố: scale-out nhanh và chuyển traffic sang.",
  },
  "active-active": {
    label: "🌍 Multi-site Active-Active",
    tone: "green",
    cost: 4,
    rtoHours: "gần như 0",
    rpoMinutes: "gần như 0",
    drSize: 100,
    drState: "Chạy full capacity, phục vụ traffic thật song song",
    description: "Cả 2 (hoặc nhiều) region cùng phục vụ traffic thật ngày thường (vd qua Route 53 latency routing). Mất 1 region, region còn lại đã quen tải, gần như không gián đoạn. Đắt và phức tạp nhất.",
  },
};

const order: Strategy[] = ["backup-restore", "pilot-light", "warm-standby", "active-active"];

export function DrStrategyCostRtoDiagram() {
  const [strategy, setStrategy] = useState<Strategy>("pilot-light");
  const info = strategies[strategy];

  return (
    <DiagramFrame
      title="4 chiến lược DR — đánh đổi chi phí vs RTO/RPO"
      viewBox="0 0 720 260"
      controls={
        <div className="space-y-2 text-sm">
          <div className="flex flex-wrap gap-2">
            {order.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setStrategy(key)}
                className={
                  strategy === key
                    ? "rounded-full bg-indigo-600 px-3 py-1.5 font-medium text-white"
                    : "rounded-full bg-stone-200 px-3 py-1.5 font-medium text-stone-700 dark:bg-stone-800 dark:text-stone-300"
                }
              >
                {strategies[key].label}
              </button>
            ))}
          </div>
          <p className="text-stone-700 dark:text-stone-300">{info.description}</p>
          <div className="flex flex-wrap gap-4 font-mono text-[13px]">
            <span>
              RTO: <strong>{info.rtoHours}</strong>
            </span>
            <span>
              RPO: <strong>{info.rpoMinutes}</strong>
            </span>
          </div>
        </div>
      }
      caption="Càng sang phải, RTO/RPO càng nhỏ (phục hồi nhanh, mất ít dữ liệu) nhưng chi phí vận hành 2 region càng cao. Chọn theo mức chịu đựng downtime thật của business, không chọn theo 'càng tốt càng hay'."
    >
      <DiagramNode x={20} y={20} width={190} height={80} label="Region chính" sublabel="production, full capacity" tone="blue" state="active" />
      <DiagramNode x={20} y={130} width={190} height={90} label="💰 Chi phí tương đối" sublabel={"💰".repeat(info.cost)} tone="amber" />

      <DiagramArrow from={[212, 55]} to={[290, 55]} tone="slate" animated label="replication" />

      {info.drSize > 0 ? (
        <DiagramNode
          x={290}
          y={20}
          width={(info.drSize / 100) * 340 + 60}
          height={80}
          label="Region DR"
          sublabel={info.drState}
          tone={info.tone}
          state="active"
        />
      ) : (
        <DiagramNode x={290} y={20} width={150} height={80} label="Region DR" sublabel={info.drState} tone="slate" dashed state="dimmed" />
      )}

      {order.map((key, index) => (
        <DiagramNode
          key={key}
          x={290 + index * 105}
          y={130}
          width={95}
          height={90}
          label={strategies[key].label.replace(/^[^ ]+ /, "")}
          sublabel={`RTO ${strategies[key].rtoHours}`}
          tone={strategies[key].tone}
          state={strategy === key ? "active" : "dimmed"}
          onClick={() => setStrategy(key)}
        />
      ))}
    </DiagramFrame>
  );
}
