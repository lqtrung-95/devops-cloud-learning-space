"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramArrow, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";

type Mode = "no-fencing" | "fencing";

interface Frame extends DiagramStep {
  aState: "holds-lock" | "gc-pause" | "writes-late";
  bState: "waiting" | "holds-lock" | "wrote";
  storageValue: string;
  storageToken?: number;
  writeOutcome?: "accepted" | "rejected" | "corrupted";
}

const frames: Record<Mode, Frame[]> = {
  "no-fencing": [
    { title: "A giữ lock", description: "Client A `SET lock:doc1 A NX PX 5000` thành công — giữ lock 5 giây, chuẩn bị đọc-sửa-ghi tài liệu.", aState: "holds-lock", bState: "waiting", storageValue: "(chưa ai ghi)" },
    { title: "A bị GC pause 8s", description: "Trước khi kịp ghi, A rơi vào GC pause dài 8 giây — LÂU HƠN TTL 5 giây của lock. A hoàn toàn không biết thời gian đã trôi qua.", aState: "gc-pause", bState: "waiting", storageValue: "(chưa ai ghi)" },
    { title: "Lock hết hạn, B giành được", description: "TTL hết, Redis tự xoá `lock:doc1`. B `SET lock:doc1 B NX PX 5000` thành công — B tưởng mình đang giữ lock một mình, ĐÚNG theo góc nhìn của B.", aState: "gc-pause", bState: "holds-lock", storageValue: "(chưa ai ghi)" },
    { title: "B ghi thành công", description: "B đọc-sửa-ghi xong, gọi `POST /write { value: \"B\" }`. Storage không có cách nào biết còn ai khác đang tưởng mình giữ lock — chấp nhận ghi.", aState: "gc-pause", bState: "wrote", storageValue: "B", writeOutcome: "accepted" },
    { title: "A tỉnh dậy, ghi đè", description: "A hết GC pause, KHÔNG biết lock đã hết hạn và bị B lấy mất — vẫn tưởng mình đang giữ lock hợp lệ, gọi `POST /write { value: \"A\" }` với dữ liệu CŨ nó tính từ trước pause.", aState: "writes-late", bState: "wrote", storageValue: "A", writeOutcome: "corrupted" },
  ],
  fencing: [
    { title: "A giữ lock, nhận token=33", description: "A giành lock, đồng thời `INCR lock:doc1:fencing` trả về token TĂNG DẦN = 33. Mọi ghi sau này của A phải kèm token 33.", aState: "holds-lock", bState: "waiting", storageValue: "(chưa ai ghi)", storageToken: 0 },
    { title: "A bị GC pause 8s", description: "Giống hệt kịch bản trên: A rơi vào GC pause 8 giây, không hề hay biết.", aState: "gc-pause", bState: "waiting", storageValue: "(chưa ai ghi)", storageToken: 0 },
    { title: "B giành lock, nhận token=34", description: "Lock hết hạn, B giành được và `INCR` ra token = 34 — LỚN HƠN token cũ của A vì bộ đếm không bao giờ lùi.", aState: "gc-pause", bState: "holds-lock", storageValue: "(chưa ai ghi)", storageToken: 0 },
    { title: "B ghi kèm token=34 → chấp nhận", description: "B gọi `POST /write { value: \"B\", token: 34 }`. Storage so `34 > lastToken(0)` → CHẤP NHẬN, lưu `lastToken = 34`.", aState: "gc-pause", bState: "wrote", storageValue: "B", storageToken: 34, writeOutcome: "accepted" },
    { title: "A tỉnh dậy, ghi bị TỪ CHỐI", description: "A gọi `POST /write { value: \"A\", token: 33 }`. Storage so `33 > lastToken(34)`? SAI → TỪ CHỐI với `409 Conflict`. Dữ liệu của B được bảo vệ nguyên vẹn.", aState: "writes-late", bState: "wrote", storageValue: "B", storageToken: 34, writeOutcome: "rejected" },
  ],
};

const buttonClass = (active: boolean) =>
  clsx(
    "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
    active ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
  );

/**
 * Classic Kleppmann "how to do distributed locking" failure: a lease alone can't stop
 * a paused holder's late write. Toggle shows the same GC-pause timeline with and
 * without a monotonically increasing fencing token checked at the storage layer.
 */
export function LockFencingTokenDiagram() {
  const [mode, setMode] = useState<Mode>("no-fencing");
  const steps = frames[mode];

  return (
    <div>
      <div className="not-prose -mb-4 flex flex-wrap gap-2">
        {(["no-fencing", "fencing"] as const).map((option) => (
          <button key={option} type="button" onClick={() => setMode(option)} className={buttonClass(mode === option)}>
            {option === "no-fencing" ? "Chỉ có lease (không fencing token)" : "Có fencing token"}
          </button>
        ))}
      </div>
      <StepDiagram key={mode} title="Lock hết hạn khi holder bị pause — ai được ghi cuối cùng?" viewBox="0 0 720 280" steps={steps}>
        {(step) => {
          const frame = steps[step];
          return (
            <>
              <DiagramNode
                x={30}
                y={30}
                width={160}
                height={72}
                emoji={frame.aState === "gc-pause" ? "😴" : "🧑‍💻"}
                label="Client A"
                sublabel={frame.aState === "holds-lock" ? "giữ lock" : frame.aState === "gc-pause" ? "GC pause 8s" : "vừa tỉnh, ghi trễ"}
                tone={frame.aState === "gc-pause" ? "amber" : frame.writeOutcome === "corrupted" ? "rose" : "blue"}
                state={frame.aState !== "gc-pause" ? "active" : "normal"}
              />
              <DiagramNode
                x={530}
                y={30}
                width={160}
                height={72}
                emoji="🧑‍💻"
                label="Client B"
                sublabel={frame.bState === "waiting" ? "chờ lock" : frame.bState === "holds-lock" ? "giữ lock" : "đã ghi"}
                tone={frame.bState === "waiting" ? "slate" : "green"}
                state={frame.bState !== "waiting" ? "active" : "normal"}
              />

              <DiagramNode
                x={280}
                y={140}
                width={160}
                height={80}
                emoji="🗄️"
                label="Storage"
                sublabel={mode === "fencing" ? `value=${frame.storageValue} · lastToken=${frame.storageToken}` : `value=${frame.storageValue}`}
                tone={frame.writeOutcome === "corrupted" ? "rose" : frame.writeOutcome === "rejected" ? "green" : frame.writeOutcome === "accepted" ? "blue" : "slate"}
                state="active"
              />

              {(frame.aState === "writes-late" || frame.aState === "holds-lock") && (
                <DiagramArrow
                  from={[110, 102]}
                  to={[330, 140]}
                  tone={frame.writeOutcome === "corrupted" ? "rose" : frame.aState === "writes-late" ? "green" : "slate"}
                  animated={frame.aState === "writes-late"}
                  dimmed={frame.aState !== "writes-late"}
                  label={frame.aState === "writes-late" ? (mode === "fencing" ? "write token=33" : "write (ghi đè!)") : ""}
                />
              )}
              {(frame.bState === "wrote" || frame.bState === "holds-lock") && (
                <DiagramArrow
                  from={[610, 102]}
                  to={[420, 140]}
                  tone="green"
                  animated={frame.bState === "wrote"}
                  dimmed={frame.bState !== "wrote"}
                  label={frame.bState === "wrote" ? (mode === "fencing" ? "write token=34" : "write") : ""}
                />
              )}

              <DiagramLabel
                x={360}
                y={250}
                text={
                  frame.writeOutcome === "corrupted"
                    ? "❌ Ghi của B bị A ghi đè âm thầm — mất dữ liệu, storage không hề biết"
                    : frame.writeOutcome === "rejected"
                      ? "✅ Ghi trễ của A bị storage từ chối nhờ token cũ hơn — dữ liệu của B an toàn"
                      : "Đang diễn ra…"
                }
                size={13}
                bold
                tone={frame.writeOutcome === "corrupted" ? "rose" : frame.writeOutcome === "rejected" ? "green" : "slate"}
              />
            </>
          );
        }}
      </StepDiagram>
    </div>
  );
}
