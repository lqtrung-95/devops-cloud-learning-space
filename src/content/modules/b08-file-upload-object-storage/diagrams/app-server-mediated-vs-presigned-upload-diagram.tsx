"use client";

import { useState } from "react";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import { DiagramArrow, DiagramGroupBox, DiagramNode, MovingPacket } from "@/components/diagrams/diagram-shapes";

type Scenario = "mediated" | "presigned";

const scenarios: { key: Scenario; label: string; emoji: string }[] = [
  { key: "mediated", label: "Qua app server", emoji: "🐢" },
  { key: "presigned", label: "Presigned URL trực tiếp", emoji: "⚡" },
];

/**
 * Toggle between two upload architectures and watch where the file BYTES actually
 * travel — app server as a relay (mediated) vs. app server only signing a URL
 * while bytes go straight client → object storage (presigned).
 */
export function AppServerMediatedVsPresignedUploadDiagram() {
  const [scenario, setScenario] = useState<Scenario>("mediated");
  const isMediated = scenario === "mediated";

  return (
    <DiagramFrame
      title="File bytes đi đường nào: qua app server hay thẳng lên storage?"
      viewBox="0 0 720 300"
      controls={
        <div className="flex flex-wrap gap-2">
          {scenarios.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setScenario(item.key)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                scenario === item.key
                  ? "bg-indigo-600 text-white"
                  : "bg-stone-100 text-stone-700 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700"
              }`}
            >
              {item.emoji} {item.label}
            </button>
          ))}
        </div>
      }
      caption={
        isMediated
          ? "Mọi byte file đi qua Fastify hai lần: client → server, rồi server → MinIO. App server tốn băng thông kép và phải giữ toàn bộ file trong memory/disk tạm."
          : "Fastify chỉ trao đổi JSON nhỏ (metadata + URL đã ký). File thật đi thẳng client → MinIO — app server không bao giờ chạm vào một byte nào của file."
      }
    >
      <DiagramGroupBox x={8} y={16} width={704} height={266} label="" tone="slate" />

      <DiagramNode x={24} y={110} width={140} height={72} label="Client" sublabel="browser / script" emoji="💻" tone="violet" />
      <DiagramNode x={290} y={30} width={150} height={64} label="taskflow-api" sublabel="Fastify" emoji="🛡️" tone="blue" state={isMediated ? "active" : "normal"} />
      <DiagramNode x={556} y={110} width={140} height={72} label="MinIO" sublabel="object storage" emoji="🗄️" tone="green" />

      {isMediated ? (
        <>
          {/* Client -> server: full file bytes */}
          <DiagramArrow from={[164, 130]} to={[290, 68]} tone="rose" curve={-10} label="POST /attachments (multipart, toàn bộ file)" />
          <MovingPacket key="mediated-in" path="M 164 140 C 220 100, 260 80, 290 66" tone="rose" label="bytes" durationSeconds={1.8} />
          {/* server -> minio: relays the same bytes again */}
          <DiagramArrow from={[440, 68]} to={[556, 130]} tone="amber" curve={-10} label="server tự PUT lại lên MinIO" />
          <MovingPacket key="mediated-out" path="M 442 70 C 480 95, 520 115, 556 128" tone="amber" label="bytes" durationSeconds={1.8} delaySeconds={0.9} />
          <DiagramNode x={230} y={190} width={260} height={56} label="⚠️ Băng thông đi 2 lần + buffer" sublabel="app server là điểm nghẽn" tone="rose" state="active" />
        </>
      ) : (
        <>
          {/* Small JSON request/response with server */}
          <DiagramArrow from={[164, 130]} to={[290, 75]} tone="blue" curve={-8} label="POST /presign { filename, size, type }" />
          <DiagramArrow from={[290, 90]} to={[164, 150]} tone="blue" curve={8} label="{ uploadUrl, key }" />
          {/* Direct client -> minio PUT, bypassing server */}
          <DiagramArrow from={[164, 160]} to={[556, 145]} tone="green" curve={20} label="PUT thẳng file lên uploadUrl" />
          <MovingPacket key="presigned-direct" path="M 164 165 C 320 220, 460 210, 556 150" tone="green" label="bytes" durationSeconds={2.2} />
          <DiagramNode x={230} y={230} width={260} height={44} label="✅ App server không chạm byte nào" sublabel="chỉ ký URL, không relay file" tone="green" state="active" />
        </>
      )}
    </DiagramFrame>
  );
}
