"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import { DiagramArrow, DiagramGroupBox, DiagramLabel, DiagramNode, MovingPacket } from "@/components/diagrams/diagram-shapes";

type Layer = "l4" | "l7";
type RequestKind = "api" | "static";

const requestLabels: Record<RequestKind, string> = {
  api: "GET /api/orders",
  static: "GET /static/app.js",
};

// What the load balancer can read from the same HTTPS request, per layer.
const visibility: { field: string; l4: string; l7: string; l4Ok: boolean }[] = [
  { field: "IP nguồn : port đích", l4: "✓ 203.0.113.7 → :443", l7: "✓ 203.0.113.7 → :443", l4Ok: true },
  { field: "TLS", l4: "✗ chỉ thấy byte mã hoá (passthrough)", l7: "✓ LB giải mã (TLS termination)", l4Ok: false },
  { field: "Host, path, method", l4: "✗ không đọc được", l7: "✓ Host: shop.vn · path", l4Ok: false },
  { field: "Header, cookie", l4: "✗ không đọc được", l7: "✓ thêm X-Forwarded-For, X-Request-Id", l4Ok: false },
];

export function L4VsL7RoutingDiagram() {
  const [layer, setLayer] = useState<Layer>("l7");
  const [request, setRequest] = useState<RequestKind>("static");
  const [replay, setReplay] = useState(0);

  // L4 cannot see the path, so every connection lands in the same pool.
  const target: RequestKind = layer === "l4" ? "api" : request;
  const targetY = target === "api" ? 70 : 222;

  const pill = (active: boolean) =>
    clsx(
      "rounded-full px-3 py-1.5 text-sm font-medium",
      active ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
    );

  const controls = (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="font-medium text-stone-600 dark:text-stone-400">Loại LB:</span>
      {(["l4", "l7"] as const).map((option) => (
        <button key={option} type="button" className={pill(layer === option)} onClick={() => { setLayer(option); setReplay(replay + 1); }}>
          {option === "l4" ? "L4 (TCP)" : "L7 (HTTP)"}
        </button>
      ))}
      <span className="ml-2 font-medium text-stone-600 dark:text-stone-400">Request:</span>
      {(["api", "static"] as const).map((option) => (
        <button key={option} type="button" className={pill(request === option)} onClick={() => { setRequest(option); setReplay(replay + 1); }}>
          {requestLabels[option]}
        </button>
      ))}
    </div>
  );

  return (
    <DiagramFrame
      title="Load balancer L4 và L7 nhìn thấy gì?"
      viewBox="0 0 720 340"
      controls={controls}
      caption={
        layer === "l4"
          ? "L4 chỉ nhìn 'số bàn' (IP:port) nên mọi kết nối vào cùng một pool, dù là API hay file tĩnh. Nhẹ, nhanh, hợp với giao thức không phải HTTP — nhưng không định tuyến theo path được."
          : "L7 đọc cả 'tờ order': giải mã TLS, thấy path nên gửi /static tới pool riêng, và chọn server theo từng request (kể cả nhiều request trên cùng một kết nối keep-alive). Đổi lại tốn CPU hơn và luôn có 2 kết nối: client ↔ LB và LB ↔ app."
      }
    >
      <DiagramNode x={10} y={96} width={116} height={80} label="Client" sublabel={requestLabels[request].split(" ")[1]} emoji="📱" tone="violet" />
      <DiagramNode
        x={196}
        y={86}
        width={170}
        height={100}
        label={layer === "l4" ? "L4 load balancer" : "L7 load balancer"}
        sublabel={layer === "l4" ? "NLB · nginx stream" : "ALB · nginx http"}
        emoji="⚖️"
        tone="blue"
        state="active"
      />
      <DiagramArrow from={[128, 136]} to={[192, 136]} tone="violet" label={layer === "l4" ? "TCP :443" : "HTTPS"} />
      <DiagramArrow from={[368, 124]} to={[468, 70]} tone={target === "api" ? "green" : "slate"} dimmed={target !== "api"} animated={target === "api"} />
      <DiagramArrow from={[368, 150]} to={[468, 222]} tone={target === "static" ? "green" : "slate"} dimmed={target !== "static"} animated={target === "static"} />

      <DiagramGroupBox x={470} y={20} width={240} height={100} label={layer === "l4" ? "Pool duy nhất (mọi kết nối)" : "API pool · /api/*"} tone="cyan">
        <DiagramNode x={486} y={46} width={66} height={56} label="app-1" tone="cyan" state={target === "api" ? "normal" : "dimmed"} />
        <DiagramNode x={558} y={46} width={66} height={56} label="app-2" tone="cyan" state={target === "api" ? "normal" : "dimmed"} />
        <DiagramNode x={630} y={46} width={66} height={56} label="app-3" tone="cyan" state={target === "api" ? "normal" : "dimmed"} />
      </DiagramGroupBox>
      <DiagramGroupBox x={470} y={172} width={240} height={100} label={layer === "l4" ? "Static pool (L4 không chọn được)" : "Static pool · /static/*"} tone="amber">
        <DiagramNode x={486} y={198} width={100} height={56} label="static-1" tone="amber" state={target === "static" ? "normal" : "dimmed"} />
        <DiagramNode x={596} y={198} width={100} height={56} label="static-2" tone="amber" state={target === "static" ? "normal" : "dimmed"} />
      </DiagramGroupBox>

      <MovingPacket key={`${layer}-${request}-${replay}`} path={`M 70 136 L 280 136 L 470 ${targetY}`} durationSeconds={1.8} repeat={false} tone="violet" />

      <DiagramLabel x={14} y={214} text="LB đọc được gì từ cùng một request?" anchor="start" bold size={12.5} />
      {visibility.map((row, index) => {
        const ok = layer === "l7" || row.l4Ok;
        return (
          <g key={row.field}>
            <DiagramLabel x={14} y={240 + index * 24} text={row.field} anchor="start" size={12} />
            <DiagramLabel x={160} y={240 + index * 24} text={layer === "l4" ? row.l4 : row.l7} anchor="start" size={12} tone={ok ? "green" : "rose"} />
          </g>
        );
      })}
      <DiagramLabel x={470} y={300} text={layer === "l4" ? "Chọn server theo từng kết nối TCP" : "2 kết nối: client↔LB, LB↔app"} anchor="start" size={12} bold tone="blue" />
    </DiagramFrame>
  );
}
