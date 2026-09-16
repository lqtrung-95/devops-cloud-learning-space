"use client";

import { StepDiagram } from "@/components/diagrams/step-diagram";
import { DiagramArrow, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";

/**
 * Lesson 3 diagram: sequence numbers scoped to one conversation, and what
 * happens when Bob's client goes offline mid-conversation then reconnects
 * and resyncs using "give me everything after my last seq".
 */

type Msg = { seq: number; from: "Alice" | "Bob"; delivered: boolean };

const TIMELINE: Msg[][] = [
  [{ seq: 1, from: "Alice", delivered: true }],
  [
    { seq: 1, from: "Alice", delivered: true },
    { seq: 2, from: "Bob", delivered: true },
  ],
  [
    { seq: 1, from: "Alice", delivered: true },
    { seq: 2, from: "Bob", delivered: true },
    { seq: 3, from: "Alice", delivered: false },
  ],
  [
    { seq: 1, from: "Alice", delivered: true },
    { seq: 2, from: "Bob", delivered: true },
    { seq: 3, from: "Alice", delivered: false },
    { seq: 4, from: "Alice", delivered: false },
  ],
  [
    { seq: 1, from: "Alice", delivered: true },
    { seq: 2, from: "Bob", delivered: true },
    { seq: 3, from: "Alice", delivered: true },
    { seq: 4, from: "Alice", delivered: true },
  ],
];

const CELL_W = 100;
const START_X = 90;
const ROW_Y = 90;

export function MessageOrderingReconnectResyncDiagram() {
  return (
    <StepDiagram
      title="Sequence theo conversation + reconnect: Bob mất mạng ở seq 2, resync khi quay lại"
      viewBox="0 0 720 260"
      steps={[
        { title: "seq=1", description: "Alice gửi tin đầu tiên trong conversation này. Server gán `seq=1` — bộ đếm này chỉ thuộc về conversation Alice↔Bob, không liên quan tới bất kỳ conversation nào khác." },
        { title: "seq=2, Bob online", description: "Bob trả lời, được gán `seq=2`. Cả hai đều thấy đúng thứ tự 1 → 2 vì client render theo `seq` tăng dần, không theo thời điểm nhận gói." },
        { title: "Bob mất kết nối", description: "Mạng của Bob rớt. Alice gửi tiếp `seq=3` — server vẫn ghi vào DB và tăng bộ đếm bình thường, nhưng không đẩy được qua WebSocket vì Bob không còn connection nào." },
        { title: "Alice gửi thêm khi Bob vẫn offline", description: "`seq=4` cũng được ghi vào inbox bền vững của Bob. Đây là lý do DB (không phải WebSocket) phải là nguồn sự thật — nếu chỉ dựa vào 'gửi qua socket', seq 3 và 4 sẽ biến mất vĩnh viễn." },
        { title: "Bob reconnect & resync", description: "Bob mở lại app, gửi `GET /conversations/:id/messages?afterSeq=2`. Server trả về seq 3 và 4 theo đúng thứ tự — Bob thấy hội thoại liền mạch, không lặp, không thiếu." },
      ]}
    >
      {(step) => {
        const msgs = TIMELINE[step];
        return (
          <>
            <DiagramNode x={10} y={20} width={70} height={36} label="Alice" tone="violet" />
            <DiagramNode x={10} y={ROW_Y * 2 - 10} width={70} height={36} label="Bob" tone="violet" state={step === 2 || step === 3 ? "dimmed" : "normal"} />
            {(step === 2 || step === 3) && <DiagramLabel x={45} y={ROW_Y * 2 + 40} text="📴 mất kết nối" size={11} tone="rose" bold />}
            {step === 4 && <DiagramLabel x={45} y={ROW_Y * 2 + 40} text="🔌 reconnect" size={11} tone="green" bold />}

            <line x1={START_X} y1={38} x2={START_X + CELL_W * 4} y2={38} strokeWidth={2} className="stroke-stone-300 dark:stroke-stone-700" />

            {msgs.map((m) => {
              const cx = START_X + (m.seq - 1) * CELL_W + CELL_W / 2;
              return (
                <g key={m.seq}>
                  <DiagramArrow from={[cx, 38]} to={[cx, m.delivered ? 150 : 118]} tone={m.from === "Alice" ? "violet" : "cyan"} dimmed={!m.delivered} />
                  <circle cx={cx} cy={38} r={9} className="fill-amber-500 dark:fill-amber-400" />
                  <DiagramLabel x={cx} y={34} text={`seq=${m.seq}`} size={10.5} bold />
                  <DiagramLabel x={cx} y={60} text={m.from} size={10.5} tone={m.from === "Alice" ? "violet" : "cyan"} />
                  {!m.delivered && <DiagramLabel x={cx} y={132} text="⏳ chờ ở inbox" size={10} tone="rose" />}
                </g>
              );
            })}

            {step === 4 && (
              <DiagramArrow from={[45, 150]} to={[START_X + 2.5 * CELL_W, 150]} tone="green" animated label="afterSeq=2 → trả seq 3, 4" />
            )}
          </>
        );
      }}
    </StepDiagram>
  );
}
