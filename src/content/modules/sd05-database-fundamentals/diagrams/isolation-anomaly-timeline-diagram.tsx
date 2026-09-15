"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import { DiagramArrow, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";

type Level = "read-committed" | "repeatable-read" | "serializable";

const levels: { key: Level; label: string }[] = [
  { key: "read-committed", label: "READ COMMITTED (mặc định)" },
  { key: "repeatable-read", label: "REPEATABLE READ" },
  { key: "serializable", label: "SERIALIZABLE" },
];

interface TimelineEvent {
  tx: 1 | 2;
  /** Same text for every level, or a per-level text when the outcome differs. */
  text: string | Record<Level, string>;
}

interface Scenario {
  title: string;
  events: TimelineEvent[];
  /** Whether the anomaly actually happens on PostgreSQL at each level. */
  happens: Record<Level, boolean>;
  outcome: Record<Level, string>;
}

const scenarios: Scenario[] = [
  {
    title: "Non-repeatable read",
    events: [
      { tx: 1, text: "BEGIN; SELECT balance → 100" },
      { tx: 2, text: "UPDATE balance = 70; COMMIT" },
      { tx: 1, text: { "read-committed": "SELECT balance → 70 😱", "repeatable-read": "SELECT balance → 100", serializable: "SELECT balance → 100" } },
    ],
    happens: { "read-committed": true, "repeatable-read": false, serializable: false },
    outcome: {
      "read-committed": "Mỗi câu lệnh lấy snapshot mới → hai lần đọc trong cùng transaction ra hai giá trị khác nhau.",
      "repeatable-read": "Snapshot chụp ở câu lệnh đầu tiên và giữ nguyên tới hết transaction.",
      serializable: "Cũng dùng snapshot cho cả transaction như REPEATABLE READ.",
    },
  },
  {
    title: "Phantom read",
    events: [
      { tx: 1, text: "SELECT count(*) WHERE pending → 3" },
      { tx: 2, text: "INSERT đơn pending; COMMIT" },
      { tx: 1, text: { "read-committed": "SELECT count(*) → 4 😱", "repeatable-read": "SELECT count(*) → 3", serializable: "SELECT count(*) → 3" } },
    ],
    happens: { "read-committed": true, "repeatable-read": false, serializable: false },
    outcome: {
      "read-committed": "Dòng mới do transaction khác commit 'hiện ra' ở lần đọc sau.",
      "repeatable-read": "Chuẩn SQL cho phép phantom ở mức này, nhưng snapshot của PostgreSQL không nhìn thấy dòng mới.",
      serializable: "Không có phantom.",
    },
  },
  {
    title: "Lost update",
    events: [
      { tx: 1, text: "SELECT balance → 100" },
      { tx: 2, text: "SELECT balance → 100" },
      { tx: 1, text: "UPDATE balance = 70; COMMIT" },
      { tx: 2, text: { "read-committed": "UPDATE balance = 50; COMMIT ✓", "repeatable-read": "UPDATE … → ERROR 40001", serializable: "UPDATE … → ERROR 40001" } },
    ],
    happens: { "read-committed": true, "repeatable-read": false, serializable: false },
    outcome: {
      "read-committed": "Số dư cuối = 50, lần trừ 30 của T1 biến mất (đúng ra phải là 20).",
      "repeatable-read": "PostgreSQL phát hiện dòng đã bị sửa sau snapshot: 'could not serialize access due to concurrent update' → app phải retry.",
      serializable: "Như REPEATABLE READ: T2 bị huỷ với SQLSTATE 40001, retry sẽ đọc thấy 70.",
    },
  },
  {
    title: "Write skew",
    events: [
      { tx: 1, text: "SELECT count(*) on_call → 2" },
      { tx: 2, text: "SELECT count(*) on_call → 2" },
      { tx: 1, text: "UPDATE alice SET on_call = false" },
      { tx: 2, text: "UPDATE bob SET on_call = false" },
      { tx: 1, text: "COMMIT ✓" },
      { tx: 2, text: { "read-committed": "COMMIT ✓ → 0 người trực", "repeatable-read": "COMMIT ✓ → 0 người trực", serializable: "COMMIT → ERROR 40001" } },
    ],
    happens: { "read-committed": true, "repeatable-read": true, serializable: false },
    outcome: {
      "read-committed": "Hai transaction sửa hai dòng khác nhau dựa trên cùng một điều kiện đã đọc → luật 'còn ≥ 1 người trực' bị phá.",
      "repeatable-read": "Snapshot isolation không bắt được: không có dòng nào bị ghi đồng thời bởi cả hai bên.",
      serializable: "SSI thấy vòng phụ thuộc đọc–ghi giữa T1 và T2 → huỷ một bên (có thể ở UPDATE hoặc COMMIT), app retry.",
    },
  },
];

const ROW_GAP = 42;

export function IsolationAnomalyTimelineDiagram() {
  const [level, setLevel] = useState<Level>("read-committed");
  const [scenarioIndex, setScenarioIndex] = useState(3);
  const scenario = scenarios[scenarioIndex];
  const happens = scenario.happens[level];
  const resultY = 56 + scenario.events.length * ROW_GAP + 6;

  const pill = (active: boolean) =>
    clsx("rounded-full px-3 py-1.5 font-medium", active ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300");

  return (
    <DiagramFrame
      title="Hai transaction song song trên PostgreSQL — đổi isolation level, xem anomaly"
      viewBox="0 0 720 360"
      controls={
        <div className="space-y-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">Anomaly:</span>
            {scenarios.map((item, index) => (
              <button key={item.title} type="button" onClick={() => setScenarioIndex(index)} className={pill(index === scenarioIndex)}>
                {item.title}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">Isolation:</span>
            {levels.map((item) => (
              <button key={item.key} type="button" onClick={() => setLevel(item.key)} className={pill(item.key === level)}>
                {item.label}
              </button>
            ))}
          </div>
          <p className="leading-relaxed text-stone-700 dark:text-stone-300">{scenario.outcome[level]}</p>
        </div>
      }
      caption="Hành vi theo PostgreSQL. Engine khác (MySQL InnoDB, SQL Server, Oracle) dùng cùng tên level nhưng đảm bảo khác nhau — luôn kiểm tra tài liệu của engine bạn dùng."
    >
      <DiagramLabel x={185} y={30} text="Transaction T1" size={13} bold tone="blue" />
      <DiagramLabel x={535} y={30} text="Transaction T2" size={13} bold tone="violet" />
      <DiagramArrow from={[360, 44]} to={[360, resultY - 8]} tone="slate" label="thời gian" />
      {scenario.events.map((event, index) => {
        const text = typeof event.text === "string" ? event.text : event.text[level];
        const isLast = index === scenario.events.length - 1;
        return (
          <DiagramNode
            key={`${scenario.title}-${index}`}
            x={event.tx === 1 ? 30 : 380}
            y={48 + index * ROW_GAP}
            width={310}
            height={34}
            label={text}
            rounded={8}
            tone={isLast ? (happens ? "rose" : "green") : event.tx === 1 ? "blue" : "violet"}
            state={isLast ? "active" : "normal"}
          />
        );
      })}
      <DiagramNode
        x={130}
        y={resultY}
        width={460}
        height={40}
        label={happens ? `❌ ${scenario.title} XẢY RA` : `✅ ${scenario.title} bị chặn`}
        tone={happens ? "rose" : "green"}
        state="active"
      />
    </DiagramFrame>
  );
}
