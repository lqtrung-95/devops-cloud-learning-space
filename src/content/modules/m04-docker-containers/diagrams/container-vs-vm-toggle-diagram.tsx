"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import { DiagramGroupBox, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";
import type { DiagramTone } from "@/components/diagrams/diagram-tones";

type Mode = "vm" | "container";

interface Layer {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  tone: DiagramTone;
  info: string;
}

const COLUMN_X = [20, 198, 376];
const COLUMN_WIDTH = 164;

const sharedLayers: Layer[] = [
  { id: "hardware", x: 20, y: 272, width: 520, height: 38, label: "🖥️ Phần cứng (CPU, RAM, disk)", tone: "slate", info: "Mảnh đất thật: CPU, RAM, ổ đĩa, card mạng. Cả hai mô hình đều chạy trên đây." },
  { id: "host-os", x: 20, y: 226, width: 520, height: 40, label: "🐧 Host OS + kernel Linux", tone: "blue", info: "Hệ điều hành của máy chủ. Với container, đây là kernel DUY NHẤT — mọi container dùng chung nó (chung móng nhà)." },
];

function buildLayers(mode: Mode): Layer[] {
  const middle: Layer =
    mode === "vm"
      ? { id: "hypervisor", x: 20, y: 180, width: 520, height: 40, label: "Hypervisor (KVM, Nitro, VMware…)", tone: "violet", info: "Hypervisor chia phần cứng thành nhiều máy ảo, giả lập CPU/RAM/disk cho từng VM. Mỗi VM tưởng mình có máy riêng." }
      : { id: "runtime", x: 20, y: 180, width: 520, height: 40, label: "Container runtime (dockerd → containerd → runc)", tone: "cyan", info: "Runtime nhờ kernel tạo namespaces (che tầm nhìn) và cgroups (giới hạn tài nguyên) cho từng tiến trình. Không giả lập phần cứng nào cả." };

  const columns = COLUMN_X.flatMap((x, index): Layer[] => {
    const app: Layer = { id: `app-${index}`, x, y: mode === "vm" ? 34 : 76, width: COLUMN_WIDTH, height: 36, label: `📦 App ${"ABC"[index]}`, tone: "green", info: "Ứng dụng của bạn — giống nhau ở cả hai mô hình." };
    const libs: Layer = { id: `libs-${index}`, x, y: mode === "vm" ? 76 : 118, width: COLUMN_WIDTH, height: 36, label: "Thư viện / runtime", tone: "amber", info: "Node, Python, glibc/musl… đóng gói kèm app. Đây là lý do 'chạy trên máy tôi được' thành 'chạy ở đâu cũng được'." };
    if (mode === "container") return [app, libs];
    const guest: Layer = { id: `guest-${index}`, x, y: 118, width: COLUMN_WIDTH, height: 52, label: "Guest OS + kernel", tone: "rose", info: "Mỗi VM có nguyên một hệ điều hành và kernel riêng: tốn vài GB, boot mất cả chục giây tới vài phút — nhưng cách ly rất mạnh." };
    return [app, libs, guest];
  });

  return [...sharedLayers, middle, ...columns];
}

const stats: Record<Mode, { label: string; value: string }[]> = {
  vm: [
    { label: "⏱ Khởi động", value: "vài chục giây – phút" },
    { label: "💾 Dung lượng", value: "GB mỗi VM" },
    { label: "🛡️ Cách ly", value: "mạnh: kernel riêng" },
  ],
  container: [
    { label: "⏱ Khởi động", value: "thường dưới 1 giây" },
    { label: "💾 Dung lượng", value: "MB – vài trăm MB" },
    { label: "🛡️ Cách ly", value: "vừa: chung kernel" },
  ],
};

export function ContainerVsVmToggleDiagram() {
  const [mode, setMode] = useState<Mode>("container");
  const [selectedId, setSelectedId] = useState("runtime");
  const layers = buildLayers(mode);
  const selected = layers.find((layer) => layer.id === selectedId) ?? layers[2];

  return (
    <DiagramFrame
      title="VM hay container? Bật qua lại và bấm vào từng lớp"
      viewBox="0 0 720 320"
      controls={
        <div className="space-y-3 text-sm">
          <div className="flex flex-wrap gap-2">
            {(["vm", "container"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setMode(option)}
                className={clsx(
                  "rounded-full px-3 py-1.5 font-medium",
                  mode === option ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
                )}
              >
                {option === "vm" ? "🏠 Virtual Machine" : "🏢 Container"}
              </button>
            ))}
          </div>
          <p className="leading-relaxed text-stone-700 dark:text-stone-300">
            <span className="font-semibold">{selected.label}:</span> {selected.info}
          </p>
        </div>
      }
      caption="Khác biệt cốt lõi: VM giả lập cả phần cứng và mang theo kernel riêng; container chỉ là tiến trình được kernel host 'nhốt' lại bằng namespaces + cgroups."
    >
      {COLUMN_X.map((x, index) => (
        <DiagramGroupBox
          key={`box-${x}`}
          x={x - 6}
          y={mode === "vm" ? 4 : 50}
          width={COLUMN_WIDTH + 12}
          height={mode === "vm" ? 170 : 124}
          label={mode === "vm" ? `VM ${index + 1}` : `Container ${index + 1}`}
          tone={mode === "vm" ? "rose" : "cyan"}
        />
      ))}
      {mode === "container" && <DiagramLabel x={280} y={30} text="Không có Guest OS — cả 3 dùng chung 1 kernel" tone="cyan" bold size={13} />}
      {layers.map((layer) => (
        <DiagramNode
          key={layer.id}
          x={layer.x}
          y={layer.y}
          width={layer.width}
          height={layer.height}
          label={layer.label}
          tone={layer.tone}
          rounded={8}
          state={layer.id === selected.id ? "active" : "normal"}
          onClick={() => setSelectedId(layer.id)}
        />
      ))}
      {stats[mode].map((stat, index) => (
        <DiagramNode
          key={stat.label}
          x={560}
          y={20 + index * 98}
          width={150}
          height={80}
          label={stat.label}
          sublabel={stat.value}
          tone={mode === "vm" ? "rose" : "green"}
        />
      ))}
    </DiagramFrame>
  );
}
