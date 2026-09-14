"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import { DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";

// Layers ordered from "closest to your business" (top) to the physical building (bottom).
const layers = [
  { label: "Dữ liệu & quyền truy cập", sublabel: "ai được xem gì, bật mã hoá" },
  { label: "Code ứng dụng", sublabel: "logic nghiệp vụ, thư viện" },
  { label: "Runtime & scaling", sublabel: "Node/Java/Python, số lượng máy" },
  { label: "Hệ điều hành", sublabel: "vá lỗi OS, cài package" },
  { label: "Ảo hoá", sublabel: "hypervisor chia máy thật thành VM" },
  { label: "Phần cứng & mạng vật lý", sublabel: "server, ổ đĩa, switch" },
  { label: "Datacenter", sublabel: "điện, làm mát, bảo vệ, cửa ra vào" },
];

interface ServiceModel {
  key: string;
  name: string;
  emoji: string;
  /** How many layers (counted from the bottom) the provider manages. */
  providerLayers: number;
  pho: string;
  examples: string;
}

const models: ServiceModel[] = [
  { key: "onprem", name: "On-premises", emoji: "🏠", providerLayers: 0, pho: "Tự nấu phở ở nhà: tự mua bếp, mua xương, ninh nước dùng, rửa bát.", examples: "Server đặt trong phòng máy của công ty" },
  { key: "iaas", name: "IaaS", emoji: "🧰", providerLayers: 3, pho: "Thuê một gian bếp có sẵn bếp ga, nồi niêu — nhưng nấu gì, nêm ra sao vẫn là bạn.", examples: "Amazon EC2, EBS, VPC" },
  { key: "paas", name: "PaaS", emoji: "🥡", providerLayers: 5, pho: "Mua bộ phở làm sẵn: nước dùng đã ninh xong, bạn chỉ trụng bánh, thêm rau theo ý mình.", examples: "Elastic Beanstalk, Amazon RDS" },
  { key: "faas", name: "FaaS", emoji: "⚡", providerLayers: 5, pho: "Gọi từng bát phở giao tận nơi, ăn bát nào trả bát đó — không có nồi nào để trông.", examples: "AWS Lambda" },
  { key: "saas", name: "SaaS", emoji: "🍜", providerLayers: 6, pho: "Ra quán ăn phở: chỉ việc ăn. Nhưng giữ ví và chọn ai ngồi cùng bàn vẫn là việc của bạn.", examples: "Gmail, Slack, Jira Cloud" },
];

export function ServiceModelResponsibilityDiagram() {
  const [modelKey, setModelKey] = useState("iaas");
  const model = models.find((item) => item.key === modelKey) ?? models[1];
  const firstProviderLayer = layers.length - model.providerLayers;

  return (
    <DiagramFrame
      title="Ai lo tầng nào? Bấm đổi mô hình dịch vụ"
      viewBox="0 0 720 332"
      controls={
        <div className="space-y-3 text-sm">
          <div className="flex flex-wrap gap-2">
            {models.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setModelKey(item.key)}
                className={clsx(
                  "rounded-full px-3 py-1.5 font-medium",
                  item.key === modelKey ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
                )}
              >
                {item.emoji} {item.name}
              </button>
            ))}
          </div>
          <p className="leading-relaxed text-stone-700 dark:text-stone-300">
            <strong>🍜 Ví dụ phở:</strong> {model.pho}
          </p>
          <p className="text-stone-600 dark:text-stone-400">
            <strong>Trên thực tế:</strong> {model.examples} · Bạn lo <strong>{layers.length - model.providerLayers}</strong> tầng, nhà cung cấp lo{" "}
            <strong>{model.providerLayers}</strong> tầng.
          </p>
        </div>
      }
      caption="Dù dùng mô hình nào, tầng trên cùng (dữ liệu & ai được truy cập) LUÔN là trách nhiệm của bạn — đó là cốt lõi của shared responsibility model."
    >
      <text x={80} y={140} textAnchor="middle" fontSize={44}>
        {model.emoji}
      </text>
      <DiagramLabel x={80} y={180} text={model.name} size={18} bold tone="violet" />
      <DiagramLabel x={80} y={202} text={model.examples.split(",")[0]} size={11.5} />

      {layers.map((layer, index) => {
        const byProvider = index >= firstProviderLayer;
        const y = 12 + index * 44;
        return (
          <g key={layer.label}>
            <DiagramNode
              x={170}
              y={y}
              width={390}
              height={40}
              rounded={8}
              label={layer.label}
              sublabel={layer.sublabel}
              tone={byProvider ? "blue" : "amber"}
              state={index === firstProviderLayer ? "active" : "normal"}
            />
            <DiagramLabel x={578} y={y + 25} anchor="start" text={byProvider ? "☁️ Nhà cung cấp" : "🙋 Bạn"} tone={byProvider ? "blue" : "amber"} bold />
          </g>
        );
      })}
    </DiagramFrame>
  );
}
