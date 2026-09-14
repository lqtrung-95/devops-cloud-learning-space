"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import { DiagramArrow, DiagramGroupBox, DiagramLabel, DiagramNode, MovingPacket } from "@/components/diagrams/diagram-shapes";

type Deployment = "single-az" | "multi-az";

const availabilityZones = [
  { name: "ap-southeast-1a", short: "AZ a", x: 172 },
  { name: "ap-southeast-1b", short: "AZ b", x: 352 },
  { name: "ap-southeast-1c", short: "AZ c", x: 532 },
];

const AZ_WIDTH = 168;
const INSTANCE_Y = 196;

// Which AZ indexes run an EC2 instance of the app for each deployment style.
const instancesByDeployment: Record<Deployment, number[]> = {
  "single-az": [0],
  "multi-az": [0, 1],
};

export function RegionAzResilienceDiagram() {
  const [deployment, setDeployment] = useState<Deployment>("single-az");
  const [failedAz, setFailedAz] = useState<number | null>(null);

  const instanceAzs = instancesByDeployment[deployment];
  const survivingAzs = instanceAzs.filter((index) => index !== failedAz);
  const isOnline = survivingAzs.length > 0;
  const entryPoint: [number, number] = deployment === "multi-az" ? [286, 62] : [availabilityZones[0].x + 20, INSTANCE_Y + 25];

  return (
    <DiagramFrame
      title="Region & AZ — bấm vào một AZ để giả lập sự cố"
      viewBox="0 0 720 320"
      controls={
        <div className="space-y-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            {(["single-az", "multi-az"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setDeployment(option)}
                className={clsx(
                  "rounded-full px-3 py-1.5 font-medium",
                  deployment === option ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
                )}
              >
                {option === "single-az" ? "1 EC2 ở 1 AZ" : "ALB + EC2 ở 2 AZ"}
              </button>
            ))}
            <button type="button" onClick={() => setFailedAz(null)} className="rounded-full bg-stone-200 px-3 py-1.5 font-medium text-stone-700 dark:bg-stone-800 dark:text-stone-300">
              🔧 Khôi phục mọi AZ
            </button>
          </div>
          <p className={clsx("font-semibold", isOnline ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400")}>
            {isOnline
              ? `✅ App vẫn phục vụ — còn ${survivingAzs.length} AZ đang chạy instance.`
              : "❌ App sập — mọi instance đều nằm trong AZ đang gặp sự cố."}
          </p>
        </div>
      }
      caption="Mỗi AZ là một (hoặc vài) datacenter độc lập về điện, mạng, làm mát. Sự cố thường chỉ ảnh hưởng 1 AZ — nên chạy app ở ≥2 AZ. Edge location nằm ngoài region, gần người dùng, phục vụ CloudFront/Route 53."
    >
      <DiagramNode x={8} y={40} width={124} height={76} label="Người dùng" sublabel="Hà Nội, TP.HCM" emoji="👩‍💻" tone="violet" />
      <DiagramNode x={8} y={210} width={124} height={70} label="Edge location" sublabel="CloudFront cache" emoji="📍" tone="cyan" dashed />
      <DiagramArrow from={[70, 118]} to={[70, 206]} tone="cyan" label="gần" />

      <DiagramGroupBox x={160} y={8} width={552} height={304} label="Region ap-southeast-1 (Singapore)" tone="blue" />

      {deployment === "multi-az" && (
        <DiagramNode x={290} y={36} width={170} height={52} label="⚖️ ALB" sublabel="trải trên nhiều AZ" tone="green" state={isOnline ? "normal" : "dimmed"} />
      )}
      <DiagramArrow from={[134, 78]} to={entryPoint} tone={isOnline ? "green" : "rose"} animated={isOnline} curve={deployment === "single-az" ? -30 : 0} />

      {availabilityZones.map((az, index) => {
        const isFailed = failedAz === index;
        const hasInstance = instanceAzs.includes(index);
        return (
          <g key={az.name} className="cursor-pointer" onClick={() => setFailedAz(isFailed ? null : index)}>
            <rect x={az.x} y={112} width={AZ_WIDTH - 12} height={190} rx={14} fill="transparent" />
            <DiagramGroupBox x={az.x} y={112} width={AZ_WIDTH - 12} height={190} label={isFailed ? `${az.short} ⚡ sự cố` : az.short} tone={isFailed ? "rose" : "slate"} />
            <DiagramLabel x={az.x + (AZ_WIDTH - 12) / 2} y={150} text={isFailed ? "🔥 mất điện" : "🏢 🏢 datacenter"} size={12} tone={isFailed ? "rose" : "slate"} />
            {hasInstance ? (
              <DiagramNode
                x={az.x + 14}
                y={INSTANCE_Y}
                width={AZ_WIDTH - 40}
                height={56}
                label="🖥️ EC2 app"
                sublabel={isFailed ? "không phản hồi" : "đang chạy"}
                tone={isFailed ? "rose" : "green"}
                state={isFailed ? "dimmed" : "normal"}
              />
            ) : (
              <DiagramLabel x={az.x + (AZ_WIDTH - 12) / 2} y={228} text="(trống)" size={11} />
            )}
            <DiagramLabel x={az.x + (AZ_WIDTH - 12) / 2} y={288} text={az.name} size={11} />
          </g>
        );
      })}

      {deployment === "multi-az" &&
        instanceAzs.map((index) => (
          <DiagramArrow
            key={`alb-${index}`}
            from={[375, 90]}
            to={[availabilityZones[index].x + 78, INSTANCE_Y - 2]}
            tone={failedAz === index ? "rose" : "green"}
            dimmed={failedAz === index}
            animated={failedAz !== index}
          />
        ))}
      {deployment === "multi-az" && survivingAzs.length > 0 && (
        <MovingPacket
          key={`packet-${failedAz}`}
          path={`M 375 90 L ${availabilityZones[survivingAzs[0]].x + 78} ${INSTANCE_Y - 2}`}
          durationSeconds={1.4}
          tone="green"
        />
      )}
    </DiagramFrame>
  );
}
