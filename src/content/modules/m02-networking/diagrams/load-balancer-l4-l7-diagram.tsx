"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import { DiagramArrow, DiagramLabel, DiagramNode, MovingPacket } from "@/components/diagrams/diagram-shapes";

type Mode = "l4" | "l7";
type BackendId = "api-1" | "api-2" | "web-1";

interface SentRequest {
  path: string;
  target: BackendId | null;
  status: number;
}

const backends: { id: BackendId; sublabel: string; y: number; kind: "api" | "web" }[] = [
  { id: "api-1", sublabel: "API :3001", y: 20, kind: "api" },
  { id: "api-2", sublabel: "API :3002", y: 116, kind: "api" },
  { id: "web-1", sublabel: "static web :8080", y: 212, kind: "web" },
];

const requestPaths = ["GET /api/users", "GET /img/logo.png", "GET /api/orders", "GET /", "GET /api/cart"];

export function LoadBalancerL4L7Diagram() {
  const [mode, setMode] = useState<Mode>("l7");
  const [api2Down, setApi2Down] = useState(false);
  const [sent, setSent] = useState<SentRequest[]>([]);

  const healthy = (id: BackendId) => !(id === "api-2" && api2Down);

  const sendRequest = () => {
    const path = requestPaths[sent.length % requestPaths.length];
    const wantsApi = path.startsWith("GET /api");
    // L4 only sees IP:port, so every healthy backend is in one pool. L7 reads the path and picks a pool.
    const pool = backends.filter((backend) => healthy(backend.id) && (mode === "l4" || backend.kind === (wantsApi ? "api" : "web")));
    const poolIds = pool.map((backend) => backend.id);
    const previousInPool = sent.filter((request) => request.target && poolIds.includes(request.target)).length;
    const target = pool.length > 0 ? pool[previousInPool % pool.length] : null;
    const status = !target ? 503 : (target.kind === "api") === wantsApi ? 200 : 404;
    setSent([...sent, { path, target: target?.id ?? null, status }]);
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setSent([]);
  };

  const last = sent.at(-1);
  const lastBackend = backends.find((backend) => backend.id === last?.target);

  return (
    <DiagramFrame
      title="Load balancer L4 vs L7 — bấm gửi request và xem nó đi đâu"
      viewBox="0 0 720 330"
      controls={
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {(["l4", "l7"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => switchMode(option)}
              className={clsx("rounded-full px-3 py-1.5 font-medium", mode === option ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300")}
            >
              {option === "l4" ? "L4: chỉ nhìn IP:port" : "L7: đọc HTTP path"}
            </button>
          ))}
          <button type="button" onClick={sendRequest} className="rounded-lg bg-emerald-600 px-3 py-1.5 font-medium text-white hover:bg-emerald-700">
            📨 Gửi {requestPaths[sent.length % requestPaths.length]}
          </button>
          <label className="ml-auto flex items-center gap-2">
            <input type="checkbox" checked={api2Down} onChange={(event) => setApi2Down(event.target.checked)} className="size-4 accent-rose-600" />
            api-2 hỏng (health check fail)
          </label>
        </div>
      }
      caption="Round-robin = chia lần lượt. L4 chia đều mọi máy vì không hiểu HTTP; L7 đọc path nên gửi /api tới API, còn lại tới web. Máy fail health check bị loại khỏi vòng chia."
    >
      <DiagramNode x={10} y={115} width={120} height={90} label="Clients" sublabel="trình duyệt" emoji="👥" tone="violet" />
      <DiagramArrow from={[134, 160]} to={[216, 160]} tone="slate" />
      <DiagramNode
        x={220}
        y={105}
        width={180}
        height={110}
        label={mode === "l4" ? "L4 load balancer" : "L7 reverse proxy"}
        sublabel={mode === "l4" ? "vd AWS NLB" : "vd Nginx / AWS ALB"}
        emoji="⚖️"
        tone={mode === "l4" ? "amber" : "blue"}
        state="active"
      />
      <DiagramLabel x={310} y={236} text={mode === "l4" ? "thấy: TCP → 10.0.1.10:443 (nội dung đã mã hoá)" : "thấy: Host, path, header, cookie"} size={11.5} bold />

      {backends.map((backend) => {
        const isUp = healthy(backend.id);
        const served = sent.filter((request) => request.target === backend.id).length;
        return (
          <g key={backend.id}>
            <DiagramArrow from={[404, 160]} to={[536, backend.y + 30]} tone={last?.target === backend.id ? "green" : "slate"} dimmed={!isUp} />
            <DiagramNode
              x={540}
              y={backend.y}
              width={170}
              height={60}
              label={`${isUp ? "🟢" : "🔴"} ${backend.id}`}
              sublabel={`${backend.sublabel} · nhận ${served}`}
              tone={isUp ? (backend.kind === "api" ? "cyan" : "green") : "rose"}
              state={!isUp ? "dimmed" : last?.target === backend.id ? "active" : "normal"}
            />
          </g>
        );
      })}

      {last && lastBackend && (
        <MovingPacket key={sent.length} path={`M 130 160 L 310 160 L 540 ${lastBackend.y + 30}`} durationSeconds={1.4} repeat={false} tone={last.status === 200 ? "green" : "rose"} label={last.path.replace("GET ", "")} />
      )}

      {sent.slice(-3).map((request, index, recent) => (
        <DiagramLabel
          key={sent.length - recent.length + index}
          x={16}
          y={262 + index * 22}
          anchor="start"
          size={12}
          tone={request.status === 200 ? "green" : "rose"}
          bold={index === recent.length - 1}
          text={`#${sent.length - recent.length + index + 1} ${request.path} → ${request.target ?? "không còn máy"} · ${request.status}${request.status === 404 ? " (gửi nhầm máy)" : ""}`}
        />
      ))}
    </DiagramFrame>
  );
}
