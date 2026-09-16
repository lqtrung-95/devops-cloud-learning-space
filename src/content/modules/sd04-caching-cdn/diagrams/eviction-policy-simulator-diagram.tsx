"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import { DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";
import type { DiagramTone } from "@/components/diagrams/diagram-tones";

type Policy = "lru" | "lfu";

interface Item {
  key: string;
  emoji: string;
  lastUsed: number; // higher = more recent
  frequency: number;
}

const INITIAL_ITEMS: Item[] = [
  { key: "product:1 (bán chạy)", emoji: "🔥", lastUsed: 1, frequency: 40 },
  { key: "product:2", emoji: "📦", lastUsed: 2, frequency: 3 },
  { key: "product:3", emoji: "📦", lastUsed: 3, frequency: 2 },
  { key: "product:4 (job quét)", emoji: "🧹", lastUsed: 5, frequency: 1 },
];
const CAPACITY = 4;

export function EvictionPolicySimulatorDiagram() {
  const [policy, setPolicy] = useState<Policy>("lru");
  const [items, setItems] = useState<Item[]>(INITIAL_ITEMS);
  const [clock, setClock] = useState(6);
  const [evicted, setEvicted] = useState<string | null>(null);

  const touch = (key: string) => {
    setItems((current) => current.map((item) => (item.key === key ? { ...item, lastUsed: clock, frequency: item.frequency + 1 } : item)));
    setClock(clock + 1);
    setEvicted(null);
  };

  const addNewKey = () => {
    const victim = [...items].sort((a, b) => (policy === "lru" ? a.lastUsed - b.lastUsed : a.frequency - b.frequency))[0];
    setItems((current) => [...current.filter((item) => item.key !== victim.key), { key: `product:${clock} (mới)`, emoji: "🆕", lastUsed: clock, frequency: 1 }]);
    setEvicted(victim.key);
    setClock(clock + 1);
  };

  const reset = () => {
    setItems(INITIAL_ITEMS);
    setClock(6);
    setEvicted(null);
  };

  const sortValue = (item: Item) => (policy === "lru" ? item.lastUsed : item.frequency);
  const victimNow = [...items].sort((a, b) => sortValue(a) - sortValue(b))[0];

  const button = "rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800";
  const controls = (
    <div className="space-y-3 text-sm">
      <div className="flex flex-wrap gap-2">
        {(["lru", "lfu"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => {
              setPolicy(option);
              setEvicted(null);
            }}
            className={clsx("rounded-full px-3 py-1.5 font-medium", policy === option ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300")}
          >
            {option === "lru" ? "allkeys-lru" : "allkeys-lfu"}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-stone-600 dark:text-stone-400">Đụng vào (đọc lại) một key:</span>
        {items.map((item) => (
          <button key={item.key} type="button" className={button} onClick={() => touch(item.key)}>
            {item.emoji} {item.key.split(" ")[0]}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={clsx(button, "border-rose-400 text-rose-600 dark:text-rose-300")} onClick={addNewKey}>
          + Thêm key mới (cache đầy → phải đuổi 1)
        </button>
        <button type="button" className={button} onClick={reset}>
          Reset
        </button>
      </div>
    </div>
  );

  return (
    <DiagramFrame
      title="Tủ đầy — bỏ món nào?"
      viewBox="0 0 720 220"
      controls={controls}
      caption={
        policy === "lru"
          ? "allkeys-lru đuổi món LÂU NHẤT chưa đụng tới — job quét đêm 'chạm' vào mọi key một lần rồi không quay lại, dễ đẩy món hay dùng ra ngoài ngay sau đó."
          : "allkeys-lfu đuổi món ÍT LẦN dùng nhất — bền hơn trước job quét, nhưng món mới thêm vào luôn có nguy cơ bị đuổi ngay vì tần suất còn thấp (Redis có cơ chế giảm dần bộ đếm để tránh kẹt vĩnh viễn)."
      }
    >
      <DiagramLabel x={16} y={24} text={`Cache đầy (dung lượng ${CAPACITY}/${CAPACITY}). Món sắp bị đuổi nếu thêm mới:`} anchor="start" size={12.5} bold />
      {items.map((item, index) => {
        const isVictim = item.key === victimNow.key;
        const wasEvicted = item.key === evicted;
        const tone: DiagramTone = wasEvicted ? "rose" : isVictim ? "amber" : "cyan";
        return (
          <DiagramNode
            key={item.key}
            x={16 + index * 176}
            y={50}
            width={160}
            height={100}
            label={`${item.emoji} ${item.key.split(" ")[0]}`}
            sublabel={policy === "lru" ? `dùng gần đây: t=${item.lastUsed}` : `số lần dùng: ${item.frequency}`}
            tone={tone}
            state={isVictim ? "active" : "normal"}
          />
        );
      })}
      {evicted && <DiagramLabel x={360} y={196} text={`Đã đuổi: ${evicted}`} tone="rose" bold size={13} />}
    </DiagramFrame>
  );
}
