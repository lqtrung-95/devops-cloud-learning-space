"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import { DiagramArrow, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";
import { InlineCodeText } from "@/components/ui/inline-code-text";

type Severity = "page" | "warning";
type BlockedAt = "none" | "inhibit" | "silence";

interface Settings {
  severity: Severity;
  silenced: boolean;
  nodeDownFiring: boolean;
  alertCount: number;
}

const toggleButton = (active: boolean) =>
  clsx(
    "rounded-full px-3 py-1.5 text-sm font-medium",
    active ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
  );

// Mirrors Alertmanager's order: route → group → inhibit → silence → notify.
function outcome({ severity, silenced, nodeDownFiring }: Settings): { blockedAt: BlockedAt; text: string } {
  if (nodeDownFiring && severity === "warning") {
    return { blockedAt: "inhibit", text: "Inhibition: alert `NodeDown` đang firing với cùng label `node` → các alert `warning` của pod trên node đó bị ẩn. On-call chỉ thấy nguyên nhân gốc." };
  }
  if (silenced) {
    return { blockedAt: "silence", text: "Silence khớp matcher `service=checkout` → Alertmanager vẫn nhận và hiển thị alert nhưng không gửi thông báo. Dùng khi bảo trì có kế hoạch, luôn đặt thời hạn." };
  }
  if (severity === "page") {
    return { blockedAt: "none", text: "Route con `severity=\"page\"` khớp → receiver PagerDuty đánh thức on-call." };
  }
  return { blockedAt: "none", text: "Không khớp route con nào → rơi về receiver mặc định: Slack `#alerts`, xử lý trong giờ làm việc." };
}

export function AlertmanagerRoutingSimulatorDiagram() {
  const [settings, setSettings] = useState<Settings>({ severity: "page", silenced: false, nodeDownFiring: false, alertCount: 12 });
  const update = (patch: Partial<Settings>) => setSettings((current) => ({ ...current, ...patch }));
  const result = outcome(settings);
  const delivered = result.blockedAt === "none";
  const toPager = settings.severity === "page";

  return (
    <DiagramFrame
      title="Alertmanager — bật/tắt để xem thông báo đi đâu"
      viewBox="0 0 720 300"
      controls={
        <div className="space-y-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">Severity:</span>
            {(["page", "warning"] as const).map((severity) => (
              <button key={severity} type="button" onClick={() => update({ severity })} className={toggleButton(settings.severity === severity)}>
                {severity}
              </button>
            ))}
            <button type="button" onClick={() => update({ nodeDownFiring: !settings.nodeDownFiring })} className={toggleButton(settings.nodeDownFiring)}>
              💀 NodeDown đang firing
            </button>
            <button type="button" onClick={() => update({ silenced: !settings.silenced })} className={toggleButton(settings.silenced)}>
              🔇 Silence bảo trì
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">Số alert cùng lúc:</span>
            {[1, 12, 40].map((count) => (
              <button key={count} type="button" onClick={() => update({ alertCount: count })} className={toggleButton(settings.alertCount === count)}>
                {count}
              </button>
            ))}
          </div>
          <p className="leading-relaxed text-stone-700 dark:text-stone-300">
            <InlineCodeText text={result.text} />
          </p>
        </div>
      }
      caption="Route chọn receiver; group_by gom nhiều alert thành 1 thông báo; inhibition để alert nguyên nhân che alert hệ quả; silence tắt tạm theo matcher."
    >
      <DiagramNode x={8} y={105} width={112} height={90} label="Prometheus" sublabel={`${settings.alertCount} alert`} emoji="🔥" tone="amber" />
      <DiagramNode x={146} y={105} width={112} height={90} label="Route" sublabel={`severity=${settings.severity}`} emoji="🌳" tone="cyan" state="active" />
      <DiagramNode x={284} y={105} width={112} height={90} label="Group" sublabel={`${settings.alertCount} → 1`} emoji="📦" tone="violet" state="active" />
      <DiagramNode
        x={422}
        y={30}
        width={120}
        height={70}
        label="Inhibit?"
        sublabel={result.blockedAt === "inhibit" ? "bị che" : "không che"}
        tone={result.blockedAt === "inhibit" ? "rose" : "slate"}
        state={result.blockedAt === "inhibit" ? "active" : "normal"}
      />
      <DiagramNode
        x={422}
        y={200}
        width={120}
        height={70}
        label="Silence?"
        sublabel={result.blockedAt === "silence" ? "bị tắt tiếng" : "không khớp"}
        tone={result.blockedAt === "silence" ? "rose" : "slate"}
        state={result.blockedAt === "silence" ? "active" : result.blockedAt === "inhibit" ? "dimmed" : "normal"}
      />
      <DiagramNode x={590} y={30} width={122} height={80} label="PagerDuty" sublabel="gọi on-call" emoji="📟" tone="rose" state={delivered && toPager ? "active" : "dimmed"} />
      <DiagramNode x={590} y={190} width={122} height={80} label="Slack" sublabel="#alerts" emoji="💬" tone="blue" state={delivered && !toPager ? "active" : "dimmed"} />

      <DiagramArrow from={[122, 150]} to={[142, 150]} tone="amber" animated />
      <DiagramArrow from={[260, 150]} to={[280, 150]} tone="cyan" />
      <DiagramArrow from={[398, 130]} to={[430, 102]} tone="violet" />
      <DiagramArrow from={[482, 102]} to={[482, 196]} tone="slate" dimmed={result.blockedAt === "inhibit"} animated={result.blockedAt !== "inhibit"} />
      <DiagramArrow from={[544, 225]} to={[586, 80]} tone="rose" dimmed={!delivered || !toPager} animated={delivered && toPager} curve={-20} />
      <DiagramArrow from={[544, 240]} to={[586, 235]} tone="blue" dimmed={!delivered || toPager} animated={delivered && !toPager} />

      <DiagramLabel x={200} y={240} text={`group_by: ${settings.alertCount} alert → 1 tin nhắn`} tone="violet" bold />
      {!delivered && <DiagramLabel x={650} y={150} text="🚫 không gửi" tone="rose" bold size={13} />}
    </DiagramFrame>
  );
}
