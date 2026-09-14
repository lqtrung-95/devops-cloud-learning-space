"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import { DiagramArrow, DiagramGroupBox, DiagramLabel, DiagramNode, MovingPacket } from "@/components/diagrams/diagram-shapes";

type SettingKey = "publicIgwRoute" | "webPublicIp" | "privateNatRoute";

const settings: { key: SettingKey; label: string }[] = [
  { key: "publicIgwRoute", label: "Public RT: 0.0.0.0/0 → igw" },
  { key: "webPublicIp", label: "EC2 web có public IP" },
  { key: "privateNatRoute", label: "Private RT: 0.0.0.0/0 → nat" },
];

export function VpcRouteTableReachabilityDiagram() {
  const [on, setOn] = useState<Record<SettingKey, boolean>>({ publicIgwRoute: true, webPublicIp: true, privateNatRoute: false });

  const webReachable = on.publicIgwRoute && on.webPublicIp;
  const natWorks = on.publicIgwRoute;
  const appOutbound = on.privateNatRoute && natWorks;

  const flows = [
    { label: "Internet → web (HTTP vào)", ok: webReachable, why: webReachable ? "route tới IGW + public IP" : "cần CẢ route 0.0.0.0/0 → IGW lẫn public IP" },
    { label: "web → Internet (tải package)", ok: webReachable, why: webReachable ? "đi thẳng qua IGW" : "subnet public nhưng thiếu route/public IP thì vẫn không ra được" },
    { label: "app (private) → Internet", ok: appOutbound, why: appOutbound ? "đi qua NAT Gateway rồi ra IGW" : !on.privateNatRoute ? "private RT chưa có route tới NAT" : "NAT nằm trong public subnet mất route IGW" },
    { label: "Internet → app (vào thẳng)", ok: false, why: "luôn bị chặn: NAT chỉ cho kết nối đi ra" },
  ];

  return (
    <DiagramFrame
      title="VPC & route table — bật/tắt route để xem ai đi được đâu"
      viewBox="0 0 720 320"
      controls={
        <div className="space-y-3 text-sm">
          <div className="flex flex-wrap gap-2">
            {settings.map((setting) => (
              <button
                key={setting.key}
                type="button"
                onClick={() => setOn((current) => ({ ...current, [setting.key]: !current[setting.key] }))}
                className={clsx(
                  "rounded-full px-3 py-1.5 font-mono text-xs font-medium",
                  on[setting.key] ? "bg-emerald-600 text-white" : "bg-stone-200 text-stone-600 line-through dark:bg-stone-800 dark:text-stone-400",
                )}
              >
                {setting.label}
              </button>
            ))}
          </div>
          <ul className="grid gap-1 sm:grid-cols-2">
            {flows.map((flow) => (
              <li key={flow.label} className={flow.ok ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"}>
                {flow.ok ? "✅" : "❌"} <strong>{flow.label}</strong> — {flow.why}
              </li>
            ))}
          </ul>
        </div>
      }
      caption="Subnet 'public' hay 'private' không phải là một checkbox: nó được quyết định bởi route table. Giả sử Security Group và NACL đã cho phép traffic."
    >
      <DiagramNode x={8} y={30} width={112} height={64} label="🌍 Internet" tone="violet" />
      <DiagramNode x={8} y={196} width={112} height={60} label="🚪 IGW" sublabel="Internet Gateway" tone="blue" />
      <DiagramArrow from={[64, 96]} to={[64, 192]} tone="blue" bidirectional />

      <DiagramGroupBox x={140} y={8} width={572} height={304} label="VPC 10.0.0.0/16" tone="blue" />
      <DiagramGroupBox x={156} y={36} width={250} height={264} label="Public subnet 10.0.1.0/24" tone="green" />
      <DiagramGroupBox x={424} y={36} width={272} height={264} label="Private subnet 10.0.11.0/24" tone="amber" />

      <DiagramNode x={180} y={62} width={200} height={60} label="🖥️ web" sublabel={on.webPublicIp ? "10.0.1.10 · 54.x.x.x" : "10.0.1.10 · không public IP"} tone={webReachable ? "green" : "rose"} />
      <DiagramNode x={180} y={216} width={200} height={60} label="🔁 NAT Gateway" sublabel="có Elastic IP" tone={natWorks ? "green" : "rose"} state={on.privateNatRoute ? "normal" : "dimmed"} />
      <DiagramLabel x={172} y={150} text="10.0.0.0/16 → local" anchor="start" size={11} />
      <DiagramLabel x={172} y={168} text={on.publicIgwRoute ? "0.0.0.0/0 → igw-0abc" : "(không có 0.0.0.0/0)"} anchor="start" size={11} tone={on.publicIgwRoute ? "green" : "rose"} bold />

      <DiagramNode x={470} y={216} width={200} height={60} label="🖥️ app" sublabel="10.0.11.25 · chỉ IP private" tone={appOutbound ? "green" : "amber"} />
      <DiagramLabel x={440} y={80} text="Route table private:" anchor="start" size={11} bold />
      <DiagramLabel x={440} y={100} text="10.0.0.0/16 → local" anchor="start" size={11} />
      <DiagramLabel x={440} y={120} text={on.privateNatRoute ? "0.0.0.0/0 → nat-0def" : "(không có 0.0.0.0/0)"} anchor="start" size={11} tone={on.privateNatRoute ? "green" : "rose"} bold />
      <DiagramLabel x={440} y={160} text="⛔ Internet không mở kết nối" anchor="start" size={11} tone="rose" />
      <DiagramLabel x={440} y={176} text="vào subnet này được" anchor="start" size={11} tone="rose" />

      <DiagramArrow from={[122, 212]} to={[178, 104]} tone={webReachable ? "green" : "rose"} dimmed={!webReachable} animated={webReachable} bidirectional />
      <DiagramArrow from={[122, 240]} to={[176, 244]} tone={natWorks ? "green" : "rose"} dimmed={!natWorks} bidirectional />
      <DiagramArrow from={[468, 246]} to={[384, 246]} tone={on.privateNatRoute ? "green" : "slate"} dimmed={!on.privateNatRoute} animated={appOutbound} label="ra ngoài" />

      {appOutbound && <MovingPacket key="app-out" path="M 470 246 L 380 246 L 120 240 L 64 190 L 64 96" durationSeconds={2.6} tone="green" />}
      {webReachable && <MovingPacket key="web-in" path="M 64 96 L 64 196 L 122 212 L 180 104" durationSeconds={2} tone="violet" />}
    </DiagramFrame>
  );
}
