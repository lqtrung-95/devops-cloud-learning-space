"use client";

import { useState } from "react";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import { DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";

type SegmentId = "sign" | "timestamp" | "worker" | "sequence";

const SEGMENTS: { id: SegmentId; bits: number; label: string; sublabel: string; tone: "slate" | "blue" | "violet" | "amber"; detail: string }[] = [
  { id: "sign", bits: 1, label: "1 bit", sublabel: "dấu", tone: "slate", detail: "Luôn bằng 0 để ID là số nguyên KHÔNG ÂM (an toàn khi dùng ở ngôn ngữ/DB coi số nguyên là signed 64-bit)." },
  {
    id: "timestamp",
    bits: 41,
    label: "41 bit",
    sublabel: "timestamp (ms)",
    tone: "blue",
    detail: "Số mili-giây kể từ một custom epoch tự chọn (vd 2024-01-01), KHÔNG phải Unix epoch — dồn epoch lên gần đây để 41 bit đủ dùng khoảng 69 năm (2^41 ms ≈ 69,7 năm). Đây là phần khiến ID roughly time-sortable: ID sinh sau luôn có phần timestamp lớn hơn hoặc bằng.",
  },
  {
    id: "worker",
    bits: 10,
    label: "10 bit",
    sublabel: "worker id",
    tone: "violet",
    detail: "Định danh máy/process sinh ID, cấp phát tĩnh (vd từ số thứ tự pod, hoặc đăng ký qua ZooKeeper/etcd lúc khởi động). 10 bit ⇒ tối đa 1024 worker chạy đồng thời không đụng nhau.",
  },
  {
    id: "sequence",
    bits: 12,
    label: "12 bit",
    sublabel: "sequence",
    tone: "amber",
    detail: "Bộ đếm CỤC BỘ trong cùng một worker, reset về 0 mỗi khi timestamp (ms) đổi. 12 bit ⇒ tối đa 4096 ID/ms/worker. Sinh ID thứ 4097 trong cùng 1ms phải ĐỢI sang ms tiếp theo.",
  },
];

const EXAMPLE = { ts: 123456789, worker: 5, seq: 10, id: "517815303950346" };

/**
 * Clickable Snowflake-style 64-bit ID layout: click a segment to see what it encodes
 * and why, plus a worked example decoding one real ID back into its three parts.
 */
export function SnowflakeIdBitLayoutDiagram() {
  const [selected, setSelected] = useState<SegmentId>("timestamp");
  const active = SEGMENTS.find((s) => s.id === selected)!;

  const totalBits = 64;
  const chartWidth = 640;
  const layout = SEGMENTS.reduce<{ x: number; width: number }[]>((acc, seg) => {
    const previous = acc[acc.length - 1];
    const x = previous ? previous.x + previous.width : 20;
    const width = (seg.bits / totalBits) * chartWidth;
    return [...acc, { x, width }];
  }, []);

  return (
    <DiagramFrame
      title="ID 64-bit = dấu + timestamp + worker id + sequence — bấm vào từng phần"
      viewBox="0 0 720 260"
      caption={
        <>
          <strong>{active.sublabel}</strong> ({active.bits} bit): {active.detail}
        </>
      }
    >
      {SEGMENTS.map((seg, i) => {
        const { x, width } = layout[i];
        return (
          <DiagramNode
            key={seg.id}
            x={x}
            y={60}
            width={Math.max(width - 4, 30)}
            height={80}
            label={seg.label}
            sublabel={seg.sublabel}
            tone={seg.tone}
            state={selected === seg.id ? "active" : "normal"}
            onClick={() => setSelected(seg.id)}
          />
        );
      })}

      <DiagramLabel x={360} y={30} text="Bấm một khối để xem giải thích bên dưới" size={12} />

      <DiagramLabel x={360} y={170} text={`Ví dụ: worker=${EXAMPLE.worker} sinh ID lúc timestamp=${EXAMPLE.ts}ms, sequence=${EXAMPLE.seq}`} size={12.5} bold />
      <DiagramLabel x={360} y={192} text={`⇒ id = ${EXAMPLE.id}  (giải mã ngược lại đúng: timestamp=${EXAMPLE.ts}, worker=${EXAMPLE.worker}, seq=${EXAMPLE.seq})`} size={12} tone="green" />
      <DiagramLabel
        x={360}
        y={220}
        text="'Roughly' time-sortable: đúng thứ tự CHUNG theo ms, nhưng trong cùng 1ms, thứ tự giữa các worker khác nhau chỉ do worker id quyết định, không phải thứ tự sinh ra thực tế."
        size={11.5}
      />
    </DiagramFrame>
  );
}
