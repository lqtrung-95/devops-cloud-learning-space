"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import { DiagramArrow, DiagramGroupBox, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";
import type { DiagramTone } from "@/components/diagrams/diagram-tones";
import { InlineCodeText } from "@/components/ui/inline-code-text";

type Lifecycle = "running" | "down" | "down-volumes";
type Kind = "outside" | "container" | "bind" | "writable" | "volume";

interface Item {
  id: string;
  kind: Kind;
  x: number;
  y: number;
  width: number;
  label: string;
  sublabel: string;
  tone: DiagramTone;
  info: string;
}

const items: Item[] = [
  { id: "browser", kind: "outside", x: 10, y: 60, width: 130, label: "🌐 Trình duyệt", sublabel: "localhost:8080", tone: "slate", info: "Bên ngoài host không thấy mạng nội bộ của Docker. Chỉ vào được qua port đã publish bằng `-p` / `ports:`." },
  { id: "port", kind: "outside", x: 168, y: 60, width: 96, label: "8080→80", sublabel: "publish port", tone: "amber", info: "`-p 8080:80` = cửa chính của toà nhà: request tới port 8080 của host được chuyển vào port 80 của container web. Mặc định bind 0.0.0.0 — mọi địa chỉ IP của host." },
  { id: "web", kind: "container", x: 300, y: 60, width: 118, label: "web", sublabel: "nginx :80", tone: "blue", info: "Container reverse proxy. Gọi API bằng tên `api:3000` — DNS nội bộ của user-defined network trả về IP hiện tại của container api." },
  { id: "api", kind: "container", x: 440, y: 60, width: 118, label: "api", sublabel: "node :3000", tone: "violet", info: "Không cần publish port: chỉ web và các container cùng network gọi được api. Ít cửa mở ra ngoài = an toàn hơn." },
  { id: "db", kind: "container", x: 580, y: 60, width: 118, label: "db", sublabel: "postgres :5432", tone: "cyan", info: "Database KHÔNG publish port ra host. api kết nối `db:5432`. Dữ liệu nằm trong volume pgdata chứ không nằm trong container." },
  { id: "bind", kind: "bind", x: 290, y: 238, width: 138, label: "📄 ./nginx.conf", sublabel: "bind mount", tone: "amber", info: "Bind mount = gắn thẳng một file/thư mục CÓ SẴN trên host vào container. Sửa trên host là container thấy ngay — hợp cho cấu hình và hot-reload khi dev." },
  { id: "writable", kind: "writable", x: 440, y: 238, width: 118, label: "📝 /tmp/uploads", sublabel: "writable layer", tone: "rose", info: "Ghi file vào container mà không mount gì → nằm ở writable layer. Xoá container là mất. Đừng để dữ liệu quan trọng ở đây." },
  { id: "volume", kind: "volume", x: 580, y: 238, width: 118, label: "🗄️ pgdata", sublabel: "named volume", tone: "green", info: "Named volume do Docker quản lý (trên Linux thường ở /var/lib/docker/volumes). Sống độc lập với container: xoá container vẫn còn, chỉ mất khi `docker volume rm` hoặc `docker compose down -v`." },
];

const lifecycles: { id: Lifecycle; label: string; note: string }[] = [
  { id: "running", label: "▶ Đang chạy", note: "Ba container chung network app-net, gọi nhau bằng tên. Bấm từng thành phần để xem vai trò." },
  { id: "down", label: "💥 docker compose down", note: "Container và network bị xoá. Writable layer mất theo container. Bind mount (file trên host) và named volume vẫn còn." },
  { id: "down-volumes", label: "🧨 docker compose down -v", note: "Thêm `-v` là xoá luôn named volume → dữ liệu Postgres mất sạch. Bind mount vẫn còn vì là file của host." },
];

function survives(kind: Kind, lifecycle: Lifecycle): boolean {
  if (lifecycle === "running" || kind === "outside" || kind === "bind") return true;
  if (kind === "volume") return lifecycle === "down";
  return false;
}

export function NetworkVolumeExplorerDiagram() {
  const [lifecycle, setLifecycle] = useState<Lifecycle>("running");
  const [selectedId, setSelectedId] = useState("api");
  const selected = items.find((item) => item.id === selectedId)!;
  const current = lifecycles.find((item) => item.id === lifecycle)!;
  const running = lifecycle === "running";

  return (
    <DiagramFrame
      title="Network & storage: bấm từng thành phần, rồi thử xoá container"
      viewBox="0 0 720 330"
      controls={
        <div className="space-y-3 text-sm">
          <div className="flex flex-wrap gap-2">
            {lifecycles.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setLifecycle(option.id)}
                className={clsx(
                  "rounded-full px-3 py-1.5 font-medium",
                  lifecycle === option.id ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
          <p className="leading-relaxed text-stone-700 dark:text-stone-300">
            <InlineCodeText text={current.note} />
          </p>
          <p className="leading-relaxed text-stone-700 dark:text-stone-300">
            <span className="font-semibold">{selected.label}:</span> <InlineCodeText text={selected.info} />
          </p>
        </div>
      }
      caption="Mạng: container cùng user-defined network gọi nhau bằng tên; ra ngoài phải publish port. Lưu trữ: chỉ volume và bind mount sống sót khi container bị xoá."
    >
      <DiagramGroupBox x={156} y={8} width={556} height={314} label="Docker host" tone="slate" />
      <DiagramGroupBox x={284} y={30} width={424} height={150} label="network: app-net (bridge)" tone={running ? "blue" : "slate"} />
      <DiagramArrow from={[140, 85]} to={[166, 85]} tone="amber" animated={running} />
      <DiagramArrow from={[264, 85]} to={[298, 85]} tone="amber" animated={running} dimmed={!running} />
      <DiagramArrow from={[418, 90]} to={[438, 90]} tone="blue" dimmed={!running} />
      <DiagramArrow from={[558, 90]} to={[578, 90]} tone="blue" dimmed={!running} />
      <DiagramLabel x={496} y={150} text={running ? "web → api:3000 → db:5432 (DNS theo tên service)" : "network đã bị xoá"} size={12} tone={running ? "blue" : "rose"} />
      {items
        .filter((item) => item.kind === "bind" || item.kind === "writable" || item.kind === "volume")
        .map((item) => (
          <DiagramArrow
            key={`mount-${item.id}`}
            from={[item.x + item.width / 2, 236]}
            to={[item.x + item.width / 2, 120]}
            tone={survives(item.kind, lifecycle) ? "green" : "rose"}
            dimmed={!running}
          />
        ))}
      <DiagramLabel x={222} y={272} text="mount vào container →" size={11} />
      {items.map((item) => {
        const alive = survives(item.kind, lifecycle);
        const isStorage = item.kind === "bind" || item.kind === "writable" || item.kind === "volume";
        return (
          <DiagramNode
            key={item.id}
            x={item.x}
            y={item.y}
            width={item.width}
            height={isStorage ? 58 : 56}
            label={item.label}
            sublabel={!running && item.kind !== "outside" ? (alive ? "✅ vẫn còn" : "❌ đã mất") : item.sublabel}
            tone={!running && isStorage ? (alive ? "green" : "rose") : item.tone}
            dashed={item.kind === "container" && !running}
            state={item.id === selectedId ? "active" : alive ? "normal" : "dimmed"}
            onClick={() => setSelectedId(item.id)}
          />
        );
      })}
    </DiagramFrame>
  );
}
