"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import { DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";
import type { DiagramTone } from "@/components/diagrams/diagram-tones";

type SystemKey = "shortener" | "transfer" | "chat";
type NfrKey = "latency" | "availability" | "consistency" | "durability" | "cost";

interface NfrDetail {
  /** 1 = nice to have, 3 = must have. */
  priority: 1 | 2 | 3;
  requirement: string;
  consequence: string;
}

const nfrLabels: Record<NfrKey, string> = {
  latency: "⚡ Latency",
  availability: "🟢 Availability",
  consistency: "🎯 Consistency",
  durability: "💾 Durability",
  cost: "💸 Cost",
};

const systems: Record<SystemKey, { label: string; ratio: string; nfrs: Record<NfrKey, NfrDetail> }> = {
  shortener: {
    label: "🔗 URL shortener",
    ratio: "read:write ≈ 100:1",
    nfrs: {
      latency: { priority: 3, requirement: "p99 redirect ~50ms", consequence: "Cache mapping code → URL (Redis/CDN), tránh query DB mỗi lần." },
      availability: { priority: 3, requirement: "99,99% cho redirect", consequence: "Nhiều instance sau LB; link chết là lỗi mọi nơi đã chia sẻ link." },
      consistency: { priority: 1, requirement: "Eventual OK: link mới trễ ~1s vẫn chấp nhận", consequence: "Đọc được từ replica/cache, không cần transaction phức tạp." },
      durability: { priority: 2, requirement: "Không mất link đã tạo", consequence: "DB có replication + backup; cache chỉ là bản sao." },
      cost: { priority: 2, requirement: "Storage rẻ, dữ liệu nhỏ", consequence: "Bản ghi vài trăm byte — storage không phải nỗi lo chính." },
    },
  },
  transfer: {
    label: "🏦 Chuyển tiền",
    ratio: "read:write ≈ 5:1",
    nfrs: {
      latency: { priority: 1, requirement: "p99 ~1–2s chấp nhận được", consequence: "Được phép chậm hơn để kiểm tra, khoá, ghi ledger đúng." },
      availability: { priority: 2, requirement: "99,95%, lỗi thì báo rõ", consequence: "Thà từ chối giao dịch còn hơn trả kết quả sai." },
      consistency: { priority: 3, requirement: "Strong: số dư không bao giờ âm/sai", consequence: "Transaction ACID, lock hoặc optimistic version; không đọc số dư từ cache." },
      durability: { priority: 3, requirement: "Giao dịch đã xác nhận không được mất", consequence: "Ghi đồng bộ, replication có xác nhận, idempotency key cho retry." },
      cost: { priority: 1, requirement: "Đúng quan trọng hơn rẻ", consequence: "Chấp nhận hạ tầng đắt hơn cho audit và đối soát." },
    },
  },
  chat: {
    label: "💬 Chat 1-1",
    ratio: "read:write ≈ 1:1",
    nfrs: {
      latency: { priority: 3, requirement: "Tin tới người nhận ~vài trăm ms", consequence: "Kết nối lâu dài (WebSocket), không polling." },
      availability: { priority: 3, requirement: "99,9%+, mất kết nối thì tự nối lại", consequence: "Gateway nhiều instance, client reconnect + đồng bộ lại tin." },
      consistency: { priority: 2, requirement: "Đúng thứ tự trong 1 cuộc trò chuyện", consequence: "Sequence theo conversation; không cần thứ tự toàn cục." },
      durability: { priority: 3, requirement: "Tin đã báo 'đã gửi' không được mất", consequence: "Lưu DB trước khi ack cho người gửi." },
      cost: { priority: 2, requirement: "Tin nhắn tích luỹ nhiều năm", consequence: "Ghi nhiều ⇒ chọn storage ghi rẻ, tách dữ liệu nóng/lạnh." },
    },
  },
};

const priorityTone: Record<1 | 2 | 3, DiagramTone> = { 1: "slate", 2: "amber", 3: "rose" };
const priorityText: Record<1 | 2 | 3, string> = { 1: "thấp", 2: "vừa", 3: "sống còn" };

export function NfrScenarioPriorityDiagram() {
  const [systemKey, setSystemKey] = useState<SystemKey>("shortener");
  const [nfrKey, setNfrKey] = useState<NfrKey>("latency");
  const system = systems[systemKey];
  const selected = system.nfrs[nfrKey];

  return (
    <DiagramFrame
      title="Cùng 5 NFR, mỗi hệ thống ưu tiên khác nhau — chọn hệ thống, bấm vào từng NFR"
      viewBox="0 0 720 300"
      controls={
        <div className="space-y-3 text-sm">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(systems) as SystemKey[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setSystemKey(key)}
                className={clsx(
                  "rounded-full px-3 py-1.5 font-medium",
                  key === systemKey ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
                )}
              >
                {systems[key].label}
              </button>
            ))}
          </div>
          <p className="leading-relaxed text-stone-700 dark:text-stone-300">
            <span className="font-semibold">{nfrLabels[nfrKey]}:</span> {selected.requirement}
            <br />
            <span className="font-semibold">⇒ Hệ quả kiến trúc:</span> {selected.consequence}
          </p>
        </div>
      }
      caption="NFR không phải danh sách 'càng cao càng tốt'. Mỗi hệ thống chọn 1–2 thứ sống còn và chấp nhận nới lỏng phần còn lại — đó chính là trade-off."
    >
      <DiagramNode x={20} y={20} width={200} height={70} label={system.label} sublabel={system.ratio} tone="violet" />
      <DiagramLabel x={250} y={40} text="Mức ưu tiên" anchor="start" size={12} bold />
      {(Object.keys(nfrLabels) as NfrKey[]).map((key, index) => {
        const detail = system.nfrs[key];
        const y = 56 + index * 46;
        const barWidth = 90 + detail.priority * 110;
        return (
          <g key={key}>
            <DiagramNode
              x={250}
              y={y}
              width={barWidth}
              height={38}
              rounded={8}
              label={`${nfrLabels[key]} · ${priorityText[detail.priority]}`}
              tone={priorityTone[detail.priority]}
              state={key === nfrKey ? "active" : "normal"}
              onClick={() => setNfrKey(key)}
            />
          </g>
        );
      })}
      <DiagramLabel x={20} y={130} text="Cùng câu hỏi 'nhanh, bền, đúng, rẻ?'" anchor="start" size={12} />
      <DiagramLabel x={20} y={150} text="nhưng câu trả lời khác nhau" anchor="start" size={12} />
      <DiagramLabel x={20} y={170} text="⇒ kiến trúc khác nhau." anchor="start" size={12} bold />
    </DiagramFrame>
  );
}
