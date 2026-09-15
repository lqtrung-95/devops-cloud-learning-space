"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramArrow, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";
import { StepDiagram } from "@/components/diagrams/step-diagram";

type Strategy = "no-lock" | "pessimistic" | "optimistic";

interface LockEvent {
  tx: 1 | 2;
  label: string;
  title: string;
  description: string;
  /** Row state in the database right after this event. */
  balance: number;
  version: number;
  lockHolder?: "T1" | "T2";
  waiting?: boolean;
}

const strategies: { key: Strategy; label: string }[] = [
  { key: "no-lock", label: "Không khoá (lost update)" },
  { key: "pessimistic", label: "Pessimistic: FOR UPDATE" },
  { key: "optimistic", label: "Optimistic: version" },
];

const scenarios: Record<Strategy, LockEvent[]> = {
  "no-lock": [
    { tx: 1, label: "SELECT balance → 100", title: "T1 đọc", description: "T1 (rút 30) đọc số dư 100 lên app.", balance: 100, version: 1 },
    { tx: 2, label: "SELECT balance → 100", title: "T2 đọc", description: "T2 (rút 50) cũng đọc 100 — chưa ai ghi gì.", balance: 100, version: 1 },
    { tx: 1, label: "UPDATE balance = 70; COMMIT", title: "T1 ghi", description: "App tính 100 − 30 = 70 rồi ghi giá trị tuyệt đối 70.", balance: 70, version: 1 },
    { tx: 2, label: "UPDATE balance = 50; COMMIT", title: "T2 ghi đè", description: "App của T2 vẫn tính từ 100: 100 − 50 = 50 và ghi đè. Số dư đúng phải là 20 — lần rút 30 đã 'biến mất'. READ COMMITTED không chặn chuyện này.", balance: 50, version: 1 },
  ],
  pessimistic: [
    { tx: 1, label: "SELECT … FOR UPDATE → 100", title: "T1 khoá", description: "T1 đọc và giữ row lock trên dòng id = 1 tới khi COMMIT/ROLLBACK.", balance: 100, version: 1, lockHolder: "T1" },
    { tx: 2, label: "SELECT … FOR UPDATE ⏳ chờ", title: "T2 chờ", description: "T2 cũng muốn khoá dòng đó nên bị treo. (Một SELECT thường không có FOR UPDATE thì vẫn đọc được ngay.)", balance: 100, version: 1, lockHolder: "T1", waiting: true },
    { tx: 1, label: "UPDATE balance = 70; COMMIT", title: "T1 xong", description: "T1 ghi 70 và COMMIT → nhả lock.", balance: 70, version: 1, lockHolder: "T2" },
    { tx: 2, label: "…nhận lock → đọc 70", title: "T2 đọc lại", description: "Ở READ COMMITTED, câu `FOR UPDATE` đang chờ sẽ trả về phiên bản mới nhất của dòng: 70. (Ở REPEATABLE READ/SERIALIZABLE, T2 sẽ nhận lỗi 40001 thay vì đọc lại.)", balance: 70, version: 1, lockHolder: "T2" },
    { tx: 2, label: "UPDATE balance = 20; COMMIT", title: "T2 ghi", description: "T2 tính 70 − 50 = 20. Đúng. Cái giá: T2 phải chờ, và nếu T1 giữ lock lâu thì cả hàng đợi bị kẹt.", balance: 20, version: 1 },
  ],
  optimistic: [
    { tx: 1, label: "SELECT balance, version → 100, v1", title: "T1 đọc", description: "Không khoá gì. T1 nhớ version = 1.", balance: 100, version: 1 },
    { tx: 2, label: "SELECT balance, version → 100, v1", title: "T2 đọc", description: "T2 cũng nhớ version = 1.", balance: 100, version: 1 },
    { tx: 1, label: "UPDATE … WHERE version = 1 → UPDATE 1", title: "T1 thắng", description: "`UPDATE accounts SET balance = 70, version = version + 1 WHERE id = 1 AND version = 1` khớp 1 dòng → version thành 2.", balance: 70, version: 2 },
    { tx: 2, label: "UPDATE … WHERE version = 1 → UPDATE 0", title: "T2 thua", description: "Điều kiện `version = 1` không còn đúng → 0 dòng bị sửa. App phát hiện xung đột qua row count, không ghi đè ai.", balance: 70, version: 2 },
    { tx: 2, label: "retry: đọc 70, v2 → UPDATE 1", title: "T2 retry", description: "T2 đọc lại (70, v2), tính 20 và ghi với `WHERE version = 2` → thành công. Xung đột càng nhiều thì retry càng nhiều — khi đó pessimistic lại hợp hơn.", balance: 20, version: 3 },
  ],
};

export function LockingStrategiesScenarioDiagram() {
  const [strategy, setStrategy] = useState<Strategy>("no-lock");
  const events = scenarios[strategy];

  return (
    <div>
      <div className="not-prose -mb-4 flex flex-wrap gap-2">
        {strategies.map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => setStrategy(option.key)}
            className={clsx(
              "rounded-full px-3 py-1.5 text-sm font-medium",
              strategy === option.key ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
      <StepDiagram
        key={strategy}
        title="Hai request cùng rút tiền từ tài khoản 100 (T1 rút 30, T2 rút 50)"
        viewBox="0 0 720 300"
        steps={events.map((event) => ({ title: event.title, description: event.description }))}
      >
        {(step) => {
          const current = events[step];
          const finalWrong = strategy === "no-lock" && step === events.length - 1;
          return (
            <>
              <DiagramLabel x={125} y={24} text="T1 — rút 30" size={13} bold tone="blue" />
              <DiagramLabel x={595} y={24} text="T2 — rút 50" size={13} bold tone="violet" />
              {events.map((event, index) => (
                <DiagramNode
                  key={`${strategy}-${index}`}
                  x={event.tx === 1 ? 10 : 460}
                  y={38 + index * 50}
                  width={250}
                  height={40}
                  label={event.label}
                  rounded={8}
                  tone={event.waiting ? "amber" : event.tx === 1 ? "blue" : "violet"}
                  state={index === step ? "active" : index < step ? "normal" : "dimmed"}
                />
              ))}
              <DiagramArrow
                from={current.tx === 1 ? [262, 58 + step * 50] : [458, 58 + step * 50]}
                to={current.tx === 1 ? [288, 150] : [432, 150]}
                tone={current.tx === 1 ? "blue" : "violet"}
                animated
              />
              <DiagramNode
                x={290}
                y={110}
                width={140}
                height={80}
                emoji={current.lockHolder ? "🔒" : "🗄️"}
                label={`balance = ${current.balance}`}
                sublabel={strategy === "optimistic" ? `version = ${current.version}` : current.lockHolder ? `lock: ${current.lockHolder}` : "không có lock"}
                tone={finalWrong ? "rose" : step === events.length - 1 ? "green" : "slate"}
                state="active"
              />
              <DiagramLabel x={360} y={214} text="accounts id = 1" size={12} />
              {step === events.length - 1 && (
                <DiagramLabel
                  x={360}
                  y={290}
                  text={finalWrong ? "❌ Kết quả 50 — mất lần rút 30" : "✅ Kết quả 20 — đúng"}
                  size={14}
                  bold
                  tone={finalWrong ? "rose" : "green"}
                />
              )}
            </>
          );
        }}
      </StepDiagram>
    </div>
  );
}
