"use client";

import { useState } from "react";
import clsx from "clsx";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import { DiagramArrow, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";

/**
 * Lesson 4 diagram: presence state machine (online → away → offline) driven
 * by heartbeat + TTL. Toggle between "no coalescing" (fan-out every
 * heartbeat) and "coalesced" (only fan-out on real state transitions) to see
 * the difference in outbound events for a user's contact list.
 */

type PresenceState = "online" | "away" | "offline";

const POSITIONS: Record<PresenceState, { x: number; y: number }> = {
  online: { x: 120, y: 70 },
  away: { x: 380, y: 70 },
  offline: { x: 620, y: 70 },
};

const HEARTBEAT_TICKS = 8; // simulate 8 heartbeat ticks of 15s each = 120s
const CONTACTS = 150;

export function PresenceHeartbeatStateMachineDiagram() {
  const [state, setState] = useState<PresenceState>("online");
  const [coalesced, setCoalesced] = useState(true);

  // Simple model: without coalescing, every heartbeat while online re-announces
  // "online" to every contact. With coalescing, only the 3 real transitions
  // (start online, → away, → offline) get announced.
  const eventsWithoutCoalescing = HEARTBEAT_TICKS * CONTACTS;
  const eventsWithCoalescing = 3 * CONTACTS;

  return (
    <DiagramFrame
      title="Presence: online → away → offline, và cái giá của việc không coalesce"
      viewBox="0 0 720 260"
      controls={
        <div className="space-y-3 text-sm">
          <div className="flex flex-wrap gap-2">
            {(["online", "away", "offline"] as PresenceState[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setState(s)}
                className={clsx(
                  "rounded-full px-3 py-1.5 font-medium capitalize",
                  s === state ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
                )}
              >
                {s === "online" ? "🟢 online" : s === "away" ? "🟡 away" : "⚪ offline"}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 font-medium">
            <input type="checkbox" checked={coalesced} onChange={(e) => setCoalesced(e.target.checked)} className="h-4 w-4" />
            Coalesce: chỉ fan-out khi trạng thái thực sự đổi
          </label>
          <p className="leading-relaxed text-stone-700 dark:text-stone-300">
            Giả định: user có {CONTACTS} liên hệ, phiên online kéo dài {HEARTBEAT_TICKS} nhịp heartbeat (15s/nhịp ≈ 2 phút).{" "}
            {coalesced ? (
              <>Chỉ <strong className="text-emerald-700 dark:text-emerald-300">{eventsWithCoalescing}</strong> sự kiện fan-out cho cả phiên (3 lần đổi trạng thái × {CONTACTS} liên hệ).</>
            ) : (
              <>
                <strong className="text-rose-700 dark:text-rose-300">{eventsWithoutCoalescing}</strong> sự kiện fan-out — mỗi nhịp heartbeat 15s đều publish lại &quot;online&quot; tới cả {CONTACTS} liên hệ, dù trạng thái không đổi.
              </>
            )}
          </p>
        </div>
      }
      caption="TTL nên lớn hơn chu kỳ heartbeat (ví dụ TTL 30s cho heartbeat 15s) để tránh nhấp nháy online/offline giả khi có độ trễ mạng."
    >
      {(["online", "away", "offline"] as PresenceState[]).map((s) => (
        <DiagramNode
          key={s}
          x={POSITIONS[s].x - 65}
          y={POSITIONS[s].y - 28}
          width={130}
          height={56}
          label={s === "online" ? "🟢 Online" : s === "away" ? "🟡 Away" : "⚪ Offline"}
          sublabel={s === "online" ? "heartbeat mỗi 15s" : s === "away" ? "không tương tác 60s" : "TTL Redis hết hạn"}
          tone={s === "online" ? "green" : s === "away" ? "amber" : "slate"}
          state={s === state ? "active" : "dimmed"}
        />
      ))}

      <DiagramArrow from={[POSITIONS.online.x + 65, POSITIONS.online.y]} to={[POSITIONS.away.x - 65, POSITIONS.away.y]} tone="amber" label="hết hạn nhẹ" />
      <DiagramArrow from={[POSITIONS.away.x + 65, POSITIONS.away.y]} to={[POSITIONS.offline.x - 65, POSITIONS.offline.y]} tone="slate" label="TTL hết hạn hoàn toàn" />
      <DiagramArrow from={[POSITIONS.offline.x - 65, POSITIONS.offline.y + 30]} to={[POSITIONS.online.x + 65, POSITIONS.online.y + 30]} tone="green" curve={40} label="heartbeat mới → SET presence EX 30" />

      <DiagramLabel x={360} y={175} text="Chỉ publish presence-changed khi mũi tên trên được đi qua — không phải mỗi heartbeat" size={11.5} />
    </DiagramFrame>
  );
}
