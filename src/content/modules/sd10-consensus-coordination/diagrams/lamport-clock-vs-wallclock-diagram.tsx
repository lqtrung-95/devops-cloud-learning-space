"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramArrow, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";

type Mode = "wallclock" | "lamport";

interface Frame extends DiagramStep {
  aClock: string;
  bClock: string;
  messageInFlight: boolean;
  messageLabel?: string;
  verdict?: string;
  verdictOk?: boolean;
}

const frames: Record<Mode, Frame[]> = {
  wallclock: [
    { title: "A có sự kiện cục bộ", description: "Đồng hồ treo tường của A chạy NHANH hơn giờ thực 20ms (NTP lệch, chuyện bình thường). Đồng hồ A hiện `10:00:00.050`.", aClock: "10:00:00.050", bClock: "10:00:00.000", messageInFlight: false },
    { title: "A gửi tin, đóng dấu giờ tường", description: "A gửi tin nhắn cho B, đóng dấu timestamp theo đồng hồ CỦA CHÍNH A: `10:00:00.050`.", aClock: "10:00:00.050", bClock: "10:00:00.000", messageInFlight: true, messageLabel: "gửi lúc 10:00:00.050" },
    { title: "B nhận tin, đóng dấu giờ tường của B", description: "5ms sau (network latency), tin tới B. Đồng hồ B CHÍNH XÁC hơn, chỉ mới `10:00:00.015` — B đóng dấu nhận lúc `10:00:00.015`, SỚM HƠN dấu gửi của A.", aClock: "10:00:00.050", bClock: "10:00:00.015", messageInFlight: false, messageLabel: "nhận lúc 10:00:00.015" },
    { title: "Sắp theo giờ tường → SAI", description: "Nếu sắp thứ tự sự kiện chỉ bằng cách so sánh timestamp, ta kết luận 'B nhận (10:00:00.015) xảy ra TRƯỚC A gửi (10:00:00.050)' — vô lý, vì nhận luôn phải sau gửi. Clock skew giữa các máy làm timestamp tường không dùng được để so thứ tự.", aClock: "10:00:00.050", bClock: "10:00:00.015", messageInFlight: false, verdict: "❌ Kết luận sai: 'nhận trước gửi'", verdictOk: false },
  ],
  lamport: [
    { title: "A có sự kiện cục bộ", description: "A giữ một bộ đếm logic riêng, bắt đầu ở 0. Có sự kiện cục bộ → A tăng bộ đếm: `L_A = 1`. Không liên quan gì tới đồng hồ vật lý.", aClock: "L_A = 1", bClock: "L_B = 0", messageInFlight: false },
    { title: "A gửi tin, đính kèm bộ đếm", description: "A gửi tin nhắn cho B, đính kèm giá trị bộ đếm hiện tại: `L_A = 1`.", aClock: "L_A = 1", bClock: "L_B = 0", messageInFlight: true, messageLabel: "gửi kèm L=1" },
    { title: "B nhận, cập nhật theo luật Lamport", description: "B nhận tin có `L=1`, áp dụng luật: `L_B = max(L_B, L_nhận) + 1 = max(0, 1) + 1 = 2`. Bộ đếm của B LUÔN LỚN HƠN bộ đếm gửi kèm.", aClock: "L_A = 1", bClock: "L_B = 2", messageInFlight: false, messageLabel: "nhận, cập nhật L=2" },
    { title: "Sắp theo Lamport → ĐÚNG", description: "So `L_A(gửi)=1 < L_B(nhận)=2` — luôn đúng thứ tự nhân-quả (happens-before) dù đồng hồ vật lý lệch bao nhiêu. Đánh đổi: Lamport KHÔNG cho biết B nhận lúc mấy giờ thực, chỉ cho biết thứ tự trước-sau.", aClock: "L_A = 1", bClock: "L_B = 2", messageInFlight: false, verdict: "✅ Kết luận đúng: gửi luôn có L nhỏ hơn nhận", verdictOk: true },
  ],
};

const buttonClass = (active: boolean) =>
  clsx(
    "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
    active ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
  );

/**
 * Same send/receive timeline told twice: physical wall-clock timestamps (skewed by
 * NTP drift) can invert cause and effect; Lamport logical counters never do, at the
 * cost of not knowing real elapsed time.
 */
export function LamportClockVsWallclockDiagram() {
  const [mode, setMode] = useState<Mode>("wallclock");
  const steps = frames[mode];

  return (
    <div>
      <div className="not-prose -mb-4 flex flex-wrap gap-2">
        {(["wallclock", "lamport"] as const).map((option) => (
          <button key={option} type="button" onClick={() => setMode(option)} className={buttonClass(mode === option)}>
            {option === "wallclock" ? "Đồng hồ vật lý (wall-clock, NTP)" : "Đồng hồ logic (Lamport)"}
          </button>
        ))}
      </div>
      <StepDiagram key={mode} title="A gửi tin cho B — thứ tự sự kiện đọc được thế nào?" viewBox="0 0 720 260" steps={steps}>
        {(step) => {
          const frame = steps[step];
          return (
            <>
              <DiagramNode x={40} y={40} width={180} height={80} emoji="🅰️" label="Node A" sublabel={frame.aClock} tone="blue" state="active" />
              <DiagramNode x={500} y={40} width={180} height={80} emoji="🅱️" label="Node B" sublabel={frame.bClock} tone="violet" state="active" />

              <DiagramArrow
                from={[220, 80]}
                to={[500, 80]}
                tone={frame.messageInFlight ? "amber" : "slate"}
                animated={frame.messageInFlight}
                dimmed={!frame.messageInFlight && !frame.messageLabel}
                label={frame.messageLabel ?? "tin nhắn"}
              />

              {frame.verdict && <DiagramLabel x={360} y={190} text={frame.verdict} size={14} bold tone={frame.verdictOk ? "green" : "rose"} />}
              <DiagramLabel
                x={360}
                y={220}
                text={mode === "wallclock" ? "Clock skew (NTP) là thật: vài ms tới hàng trăm ms tuỳ chất lượng đồng bộ." : "Lamport chỉ đảm bảo thứ tự, không đảm bảo khoảng cách thời gian thực."}
                size={12}
              />
            </>
          );
        }}
      </StepDiagram>
    </div>
  );
}
