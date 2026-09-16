"use client";

import { useState } from "react";
import clsx from "clsx";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import { DiagramArrow, DiagramGroupBox, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";

/**
 * Lesson 1 diagram: click a conversation to see which storage shard it lands
 * on when the `messages` table is sharded by conversation_id (nod to SD06's
 * consistent hashing). Teaches: shard key choice determines whether "load one
 * conversation's history" is a single-shard read or a scatter-gather.
 */

interface ConversationSample {
  id: string;
  label: string;
  emoji: string;
  shard: 0 | 1 | 2;
}

const CONVERSATIONS: ConversationSample[] = [
  { id: "c-alice-bob", label: "Alice ↔ Bob", emoji: "🧑", shard: 0 },
  { id: "c-team-standup", label: "Nhóm Standup (12 người)", emoji: "👥", shard: 1 },
  { id: "c-carol-dave", label: "Carol ↔ Dave", emoji: "🧑", shard: 2 },
  { id: "c-family", label: "Nhóm Gia đình (6 người)", emoji: "👨‍👩‍👧", shard: 1 },
];

const SHARD_X = [110, 340, 570];
const SHARD_Y = 190;

export function ChatConversationShardingDiagram() {
  const [selected, setSelected] = useState<ConversationSample>(CONVERSATIONS[0]);
  const [shardBy, setShardBy] = useState<"conversation" | "sender">("conversation");

  // If sharded by sender_id instead, a group conversation's messages scatter
  // across shards (one per distinct sender) — the anti-pattern to teach.
  const senderShards = shardBy === "sender" ? Array.from(new Set(selected.label.includes("Nhóm") ? [0, 1, 2] : [selected.shard])) : [selected.shard];

  return (
    <DiagramFrame
      title="Chọn shard key cho bảng messages: theo conversation_id hay sender_id?"
      viewBox="0 0 720 300"
      controls={
        <div className="space-y-3 text-sm">
          <div className="flex flex-wrap gap-2">
            {CONVERSATIONS.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelected(c)}
                className={clsx(
                  "rounded-full px-3 py-1.5 font-medium",
                  c.id === selected.id ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
                )}
              >
                {c.emoji} {c.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="self-center text-xs font-semibold text-stone-500">Shard theo:</span>
            {(["conversation", "sender"] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setShardBy(key)}
                className={clsx(
                  "rounded-full px-3 py-1.5 font-medium",
                  shardBy === key ? "bg-emerald-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
                )}
              >
                {key === "conversation" ? "conversation_id" : "sender_id"}
              </button>
            ))}
          </div>
          <p className="leading-relaxed text-stone-700 dark:text-stone-300">
            {shardBy === "conversation"
              ? `Toàn bộ tin nhắn của "${selected.label}" nằm trên đúng 1 shard (Shard ${selected.shard + 1}) — đọc lịch sử chat là 1 query vào 1 shard.`
              : senderShards.length > 1
                ? `"${selected.label}" là nhóm nhiều người: mỗi sender rơi vào shard khác nhau (${senderShards.map((s) => s + 1).join(", ")}) — đọc lịch sử phải scatter-gather từ ${senderShards.length} shard rồi merge lại theo thời gian.`
                : `Với chat 1-1, sender_id cũng tình cờ gom vào 1 shard — nhưng đây là may mắn, không phải thiết kế đúng cho group.`}
          </p>
        </div>
      }
      caption="conversation_id giữ cả cuộc trò chuyện trên cùng shard (giống consistent hashing ở SD06); sender_id làm nhóm đông người bị rải tin nhắn khắp nơi."
    >
      <DiagramNode x={20} y={30} width={140} height={44} label={selected.emoji + " " + selected.label} tone="violet" state="active" />
      <DiagramGroupBox x={40} y={110} width={640} height={160} label="Message store (partition theo conversation_id, wide-column ở quy mô lớn)" tone="slate">
        {SHARD_X.map((x, i) => (
          <DiagramNode
            key={i}
            x={x - 70}
            y={SHARD_Y - 30}
            width={140}
            height={60}
            label={`Shard ${i + 1}`}
            sublabel="messages"
            tone={shardBy === "conversation" ? (i === selected.shard ? "green" : "slate") : senderShards.includes(i) ? "amber" : "slate"}
            state={shardBy === "conversation" ? (i === selected.shard ? "active" : "dimmed") : senderShards.includes(i) ? "active" : "dimmed"}
          />
        ))}
      </DiagramGroupBox>

      {shardBy === "conversation" ? (
        <DiagramArrow from={[90, 74]} to={[SHARD_X[selected.shard], SHARD_Y - 30]} tone="green" animated />
      ) : (
        senderShards.map((s) => <DiagramArrow key={s} from={[90, 74]} to={[SHARD_X[s], SHARD_Y - 30]} tone="amber" animated />)
      )}

      <DiagramLabel x={360} y={295} text="Hash(shard key) mod N → chọn shard, giống consistent hashing (SD06)" size={11} />
    </DiagramFrame>
  );
}
