"use client";

import { useState } from "react";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import { DiagramArrow, DiagramGroupBox, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";
import type { DiagramTone } from "@/components/diagrams/diagram-tones";

type PillarKey = "metrics" | "logs" | "traces";

interface Pillar {
  label: string;
  emoji: string;
  tone: DiagramTone;
  analogy: string;
  question: string;
  sample: string;
  tools: string;
  weakness: string;
  y: number;
}

const pillars: Record<PillarKey, Pillar> = {
  metrics: {
    label: "Metrics",
    emoji: "📊",
    tone: "blue",
    y: 20,
    analogy: "Đồng hồ táp-lô xe: tốc độ, nhiệt độ máy, mức xăng — những con số đo liên tục theo thời gian.",
    question: "Hệ thống có đang ổn không? Xu hướng tăng hay giảm?",
    sample: 'http_requests_total{service="checkout",code="500"} 1027',
    tools: "Prometheus, CloudWatch Metrics, Datadog",
    weakness: "Rẻ và nhanh nhưng đã gộp số — không cho biết request cụ thể nào bị lỗi.",
  },
  logs: {
    label: "Logs",
    emoji: "📒",
    tone: "amber",
    y: 118,
    analogy: "Sổ nhật ký chuyến đi: '10:02 dừng đổ xăng, 10:40 đèn check engine sáng' — sự kiện rời rạc có chi tiết.",
    question: "Chính xác chuyện gì đã xảy ra lúc đó, thông báo lỗi là gì?",
    sample: '{"level":"error","msg":"card declined","order_id":"A91","trace_id":"4bf9..."}',
    tools: "Loki, CloudWatch Logs, Elasticsearch/OpenSearch",
    weakness: "Nhiều chi tiết nhưng tốn dung lượng; khó thấy bức tranh toàn cảnh qua nhiều service.",
  },
  traces: {
    label: "Traces",
    emoji: "🗺️",
    tone: "violet",
    y: 216,
    analogy: "Bản đồ GPS lộ trình: request đi qua những 'thành phố' (service) nào, dừng ở đâu bao lâu.",
    question: "Request này chậm/lỗi ở service nào, bước nào?",
    sample: "trace 4bf9… : gateway 820ms → orders 790ms → payments 760ms",
    tools: "OpenTelemetry + Tempo/Jaeger, AWS X-Ray",
    weakness: "Thường phải sampling (lấy mẫu) vì lưu mọi trace rất đắt.",
  },
};

export function ThreePillarsExplorerDiagram() {
  const [selected, setSelected] = useState<PillarKey>("traces");
  const pillar = pillars[selected];

  return (
    <DiagramFrame
      title="Ba trụ cột observability — bấm vào từng trụ cột"
      viewBox="0 0 720 310"
      controls={
        <div className="flex items-start gap-3 text-sm leading-relaxed">
          <span className="text-3xl" aria-hidden>
            {pillar.emoji}
          </span>
          <div className="space-y-1">
            <p className="font-bold text-indigo-700 dark:text-indigo-300">{pillar.label}</p>
            <p className="text-stone-700 dark:text-stone-300">{pillar.analogy}</p>
            <p className="text-stone-700 dark:text-stone-300">
              <span className="font-semibold">Trả lời câu hỏi:</span> {pillar.question}
            </p>
            <p className="font-mono text-[12px] text-stone-600 dark:text-stone-400">{pillar.sample}</p>
            <p className="text-stone-500">
              <span className="font-semibold">Công cụ:</span> {pillar.tools} · <span className="font-semibold">Hạn chế:</span> {pillar.weakness}
            </p>
          </div>
        </div>
      }
      caption="Không trụ cột nào đủ một mình: metrics báo 'có chuyện', traces chỉ 'ở đâu', logs kể 'chuyện gì'. Trace ID là sợi dây nối chúng lại."
    >
      <DiagramGroupBox x={8} y={8} width={220} height={292} label="Ứng dụng của bạn" tone="slate">
        <DiagramNode x={34} y={110} width={170} height={84} label="checkout-api" sublabel="đã instrument" emoji="🛒" tone="green" />
      </DiagramGroupBox>
      {(Object.keys(pillars) as PillarKey[]).map((key) => {
        const item = pillars[key];
        const active = key === selected;
        return (
          <g key={key}>
            <DiagramArrow from={[206, 152]} to={[296, item.y + 38]} tone={item.tone} animated={active} dimmed={!active} />
            <DiagramNode
              x={300}
              y={item.y}
              width={180}
              height={76}
              label={item.label}
              emoji={item.emoji}
              tone={item.tone}
              state={active ? "active" : "normal"}
              onClick={() => setSelected(key)}
            />
          </g>
        );
      })}
      <DiagramNode x={560} y={110} width={150} height={84} label="Grafana" sublabel="một nơi để xem" emoji="🔭" tone="cyan" />
      {(Object.keys(pillars) as PillarKey[]).map((key) => (
        <DiagramArrow key={`out-${key}`} from={[482, pillars[key].y + 38]} to={[556, 152]} tone="cyan" dimmed={key !== selected} />
      ))}
      <DiagramLabel x={635} y={225} text="trace_id nối 3 loại" tone="violet" bold />
    </DiagramFrame>
  );
}
