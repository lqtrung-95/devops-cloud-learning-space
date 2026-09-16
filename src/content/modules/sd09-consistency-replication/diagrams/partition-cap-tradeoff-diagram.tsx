"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramArrow, DiagramGroupBox, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";

type PartitionChoice = "cp" | "ap";
type NormalChoice = "consistency" | "latency";

const buttonClass = (active: boolean) =>
  clsx(
    "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
    active ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
  );

/**
 * Toggle between "network bình thường" and "network partition" between two branches.
 * During a partition: choose CP (refuse) vs AP (serve stale). Without a partition:
 * choose the PACELC "else" branch — wait for consensus (consistency) vs answer fast (latency).
 */
export function PartitionCapTradeoffDiagram() {
  const [partitioned, setPartitioned] = useState(false);
  const [cpOrAp, setCpOrAp] = useState<PartitionChoice>("cp");
  const [normal, setNormal] = useState<NormalChoice>("latency");

  let resultLabel: string;
  let resultTone: "rose" | "amber" | "blue" | "green";
  let resultEmoji: string;

  if (partitioned) {
    if (cpOrAp === "cp") {
      resultLabel = "🚫 503 — từ chối, chờ nối lại dây";
      resultTone = "rose";
      resultEmoji = "🚫";
    } else {
      resultLabel = "📄 Trả sổ cũ (cách đây 10 phút)";
      resultTone = "amber";
      resultEmoji = "📄";
    }
  } else if (normal === "consistency") {
    resultLabel = "⏳ Chờ A xác nhận rồi mới trả lời (latency cao hơn)";
    resultTone = "blue";
    resultEmoji = "⏳";
  } else {
    resultLabel = "⚡ Trả ngay từ sổ local (có thể chưa cập nhật)";
    resultTone = "green";
    resultEmoji = "⚡";
  }

  const caption = partitioned
    ? cpOrAp === "cp"
      ? "CAP — nhánh Partition, chọn Consistency (CP): B thà từ chối còn hơn trả dữ liệu có thể sai."
      : "CAP — nhánh Partition, chọn Availability (AP): B trả dữ liệu cũ để còn phục vụ được khách."
    : normal === "consistency"
      ? "PACELC — nhánh Else (không partition), chọn Consistency: đổi latency lấy đảm bảo B luôn khớp A."
      : "PACELC — nhánh Else (không partition), chọn Latency: đổi một chút rủi ro lệch sổ lấy tốc độ trả lời.";

  return (
    <DiagramFrame
      title="Chi nhánh A (leader) và chi nhánh B (replica) nối bằng đường dây điện thoại"
      viewBox="0 0 720 260"
      caption={caption}
      controls={
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setPartitioned(false)} className={buttonClass(!partitioned)}>
            Đường dây bình thường
          </button>
          <button type="button" onClick={() => setPartitioned(true)} className={buttonClass(partitioned)}>
            Đường dây bị đứt (partition)
          </button>
          <span className="mx-1 text-stone-400">·</span>
          {partitioned ? (
            <>
              <button type="button" onClick={() => setCpOrAp("cp")} className={buttonClass(cpOrAp === "cp")}>
                CP: từ chối
              </button>
              <button type="button" onClick={() => setCpOrAp("ap")} className={buttonClass(cpOrAp === "ap")}>
                AP: trả sổ cũ
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => setNormal("consistency")} className={buttonClass(normal === "consistency")}>
                Chờ đồng bộ (EC)
              </button>
              <button type="button" onClick={() => setNormal("latency")} className={buttonClass(normal === "latency")}>
                Trả nhanh (EL)
              </button>
            </>
          )}
        </div>
      }
    >
      <DiagramGroupBox x={20} y={30} width={200} height={130} label="Chi nhánh A (leader)" tone="blue">
        <DiagramNode x={45} y={70} width={150} height={60} emoji="📒" label="Sổ: đơn #42 = đã giao" tone="blue" state="active" rounded={10} />
      </DiagramGroupBox>

      <DiagramGroupBox x={500} y={30} width={200} height={130} label="Chi nhánh B (replica)" tone="violet">
        <DiagramNode
          x={525}
          y={70}
          width={150}
          height={60}
          emoji={resultEmoji}
          label={resultLabel}
          tone={resultTone}
          state="active"
          rounded={10}
        />
      </DiagramGroupBox>

      <DiagramArrow
        from={[220, 95]}
        to={[500, 95]}
        tone={partitioned ? "rose" : "green"}
        animated={!partitioned}
        label={partitioned ? "✂️ đứt liên lạc" : "đồng bộ"}
      />

      <DiagramLabel
        x={360}
        y={200}
        text={
          partitioned
            ? "Khách hỏi B khi không liên lạc được với A → B phải tự quyết định ngay tại chỗ"
            : "Khách hỏi B lúc mạng bình thường → B vẫn phải quyết định: chờ hay trả ngay"
        }
        size={12.5}
      />
    </DiagramFrame>
  );
}
