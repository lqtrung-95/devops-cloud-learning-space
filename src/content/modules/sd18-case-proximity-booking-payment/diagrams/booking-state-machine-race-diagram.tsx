"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramArrow, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";
import { StepDiagram } from "@/components/diagrams/step-diagram";

type Mode = "buggy" | "fixed";

interface Event {
  actor: 1 | 2 | "system";
  title: string;
  description: string;
  seatState: "available" | "held" | "booked" | "sold-twice";
  seatLabel: string;
}

const modes: { key: Mode; label: string }[] = [
  { key: "buggy", label: "Buggy: check-then-write ở app" },
  { key: "fixed", label: "Fixed: conditional update + TTL hold" },
];

const scenarios: Record<Mode, Event[]> = {
  buggy: [
    { actor: 1, title: "T1 đọc trạng thái", description: "App của T1 gọi `SELECT status FROM seats WHERE id = 42` → thấy 'available'. Quyết định đặt được sẽ tính ở tầng app.", seatState: "available", seatLabel: "available" },
    { actor: 2, title: "T2 đọc trạng thái", description: "Đúng lúc đó T2 cũng SELECT và cũng thấy 'available' — chưa ai ghi gì nên không có gì ngăn cả hai đi tiếp.", seatState: "available", seatLabel: "available" },
    { actor: 1, title: "T1 ghi 'booked'", description: "`UPDATE seats SET status = 'booked' WHERE id = 42` — không điều kiện theo trạng thái cũ. Thành công, T1 nghĩ mình đã giữ được ghế.", seatState: "booked", seatLabel: "booked (T1)" },
    { actor: 2, title: "T2 cũng ghi 'booked'", description: "T2 chạy cùng câu UPDATE, cũng thành công vì không có điều kiện nào chặn — ghi đè lên bản ghi của T1. Cả hai vé đều được phát hành cho MỘT ghế.", seatState: "sold-twice", seatLabel: "❌ 2 vé / 1 ghế" },
  ],
  fixed: [
    { actor: 1, title: "T1 giữ chỗ có điều kiện", description: "`UPDATE seats SET status='held', held_by='T1', hold_expires_at=now()+120s WHERE id=42 AND status='available'` → khớp 1 dòng → chuyển sang 'held'.", seatState: "held", seatLabel: "held (T1, TTL 120s)" },
    { actor: 2, title: "T2 thử giữ, thất bại ngay", description: "T2 chạy cùng câu UPDATE với điều kiện `status='available'` → 0 dòng khớp (đã là 'held') → app trả 409 ngay lập tức, không cần chờ lock.", seatState: "held", seatLabel: "held (T1, TTL 120s)" },
    { actor: 1, title: "T1 thanh toán trong TTL", description: "T1 hoàn tất thanh toán trước khi hết hạn: `UPDATE seats SET status='booked' WHERE id=42 AND status='held' AND held_by='T1'` → chốt ghế, chỉ 1 vé được phát hành.", seatState: "booked", seatLabel: "✅ booked (T1)" },
    { actor: "system", title: "TTL sweeper (kịch bản khác)", description: "Nếu T1 bỏ ngang, một job nền quét `WHERE status='held' AND hold_expires_at < now()` và trả ghế về 'available' — không khoá vĩnh viễn ghế của người bỏ cuộc.", seatState: "available", seatLabel: "available (đã hết hạn giữ)" },
  ],
};

export function BookingStateMachineRaceDiagram() {
  const [mode, setMode] = useState<Mode>("buggy");
  const events = scenarios[mode];

  return (
    <div>
      <div className="not-prose -mb-4 flex flex-wrap gap-2">
        {modes.map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => setMode(option.key)}
            className={clsx(
              "rounded-full px-3 py-1.5 text-sm font-medium",
              mode === option.key ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
      <StepDiagram
        key={mode}
        title="Ghế 42 — 1000 request tranh nhau, chỉ theo dõi T1 và T2"
        viewBox="0 0 720 300"
        steps={events.map((e) => ({ title: e.title, description: e.description }))}
      >
        {(step) => {
          const current = events[step];
          const bad = current.seatState === "sold-twice";
          const good = current.seatState === "booked";
          return (
            <>
              <DiagramLabel x={125} y={24} text="T1" size={13} bold tone="blue" />
              <DiagramLabel x={595} y={24} text="T2" size={13} bold tone="violet" />
              {events.map((event, index) => (
                <DiagramNode
                  key={index}
                  x={event.actor === 1 ? 10 : event.actor === 2 ? 460 : 235}
                  y={38 + (event.actor === "system" ? index * 50 + 20 : index * 50)}
                  width={event.actor === "system" ? 250 : 250}
                  height={40}
                  label={event.title}
                  rounded={8}
                  tone={event.actor === 1 ? "blue" : event.actor === 2 ? "violet" : "cyan"}
                  state={index === step ? "active" : index < step ? "normal" : "dimmed"}
                />
              ))}
              <DiagramArrow
                from={current.actor === 1 ? [262, 58 + step * 50] : current.actor === 2 ? [458, 58 + step * 50] : [360, 58 + step * 50]}
                to={[360, 220]}
                tone={current.actor === 1 ? "blue" : current.actor === 2 ? "violet" : "cyan"}
                animated
              />
              <DiagramNode
                x={280}
                y={180}
                width={160}
                height={72}
                emoji={current.seatState === "held" ? "⏳" : current.seatState === "booked" ? "🎟️" : bad ? "💥" : "💺"}
                label="Ghế 42"
                sublabel={current.seatLabel}
                tone={bad ? "rose" : good ? "green" : current.seatState === "held" ? "amber" : "slate"}
                state="active"
              />
              {step === events.length - 1 && (
                <DiagramLabel
                  x={360}
                  y={280}
                  text={bad ? "❌ Double-booking: app-level check không atomic" : "✅ Atomic conditional update + TTL chặn được race"}
                  size={13}
                  bold
                  tone={bad ? "rose" : "green"}
                />
              )}
            </>
          );
        }}
      </StepDiagram>
    </div>
  );
}
