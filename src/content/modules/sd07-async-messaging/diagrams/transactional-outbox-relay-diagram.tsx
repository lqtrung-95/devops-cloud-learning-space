"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramArrow, DiagramGroupBox, DiagramLabel, DiagramNode, MovingPacket } from "@/components/diagrams/diagram-shapes";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";

type Scenario = "dual-write" | "outbox";

const scenarios: Record<Scenario, { button: string; steps: DiagramStep[] }> = {
  "dual-write": {
    button: "❌ Dual write (ghi DB rồi tự gửi Kafka)",
    steps: [
      { title: "Ghi DB", description: "App chạy `INSERT INTO orders ...` rồi `COMMIT`. Đơn #1001 đã nằm trong Postgres." },
      { title: "App crash", description: "Pod bị OOM-kill ngay trước `producer.send()`. Hai hệ thống (Postgres, Redpanda) không chung một transaction nên không ai 'rollback' giùm." },
      { title: "Event mất", description: "Đơn tồn tại nhưng event `OrderPlaced` không bao giờ tới topic → khách không nhận email, kho không trừ hàng. Đảo thứ tự (gửi trước, ghi DB sau) thì lỗi ngược lại: event 'ma' cho một đơn đã rollback." },
    ],
  },
  outbox: {
    button: "✅ Transactional outbox + relay",
    steps: [
      { title: "1 transaction", description: "Trong CÙNG transaction: `INSERT INTO orders` và `INSERT INTO outbox (aggregate_id, type, payload)`. Commit thì có cả hai, rollback thì mất cả hai — như viết phiếu bằng giấy than." },
      { title: "Relay poll", description: "Relay chạy `SELECT ... FROM outbox WHERE published_at IS NULL ORDER BY id LIMIT 100 FOR UPDATE SKIP LOCKED`." },
      { title: "Gửi Redpanda", description: "Relay gửi event (key = `aggregate_id`, header `event-id` = `outbox.id`) và nhận ack từ broker." },
      { title: "Relay crash", description: "Relay chết TRƯỚC khi `UPDATE outbox SET published_at = now()` được commit. Dòng outbox vẫn là `published_at IS NULL`." },
      { title: "Gửi lại", description: "Relay khởi động lại, thấy dòng 42 chưa publish → gửi lần nữa, lần này kịp `UPDATE published_at`. Topic giờ có 2 bản event-id 42. Không mất, nhưng trùng: outbox là at-least-once." },
      { title: "Consumer dedup", description: "Email consumer thấy event-id 42 đã có trong bảng `processed_messages` → bỏ qua. Kết quả: đúng 1 email." },
    ],
  },
};

export function TransactionalOutboxRelayDiagram() {
  const [scenario, setScenario] = useState<Scenario>("outbox");
  const isOutbox = scenario === "outbox";

  return (
    <div>
      <div className="not-prose -mb-4 flex flex-wrap gap-2">
        {(Object.keys(scenarios) as Scenario[]).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setScenario(option)}
            className={clsx(
              "rounded-full px-3 py-1.5 text-sm font-medium",
              scenario === option ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
            )}
          >
            {scenarios[option].button}
          </button>
        ))}
      </div>
      <StepDiagram key={scenario} title="Đặt hàng → gửi email: dual write vs outbox" viewBox="0 0 720 320" steps={scenarios[scenario].steps}>
        {(step) => {
          const appCrashed = !isOutbox && step >= 1;
          const relayCrashed = isOutbox && step === 3;
          const publishedMark = isOutbox ? (step >= 4 ? "published_at: now()" : step >= 1 ? "published_at: NULL" : "vừa insert · NULL") : "không dùng";
          const topicLabel = isOutbox ? (step >= 4 ? "event 42 × 2" : step >= 2 ? "event 42" : "trống") : step >= 2 ? "trống — mất!" : "trống";
          return (
            <>
              <DiagramNode x={10} y={120} width={130} height={80} label="Order API" sublabel={appCrashed ? "⚡ crash" : "đặt đơn #1001"} emoji="🧾" tone={appCrashed ? "rose" : "violet"} state={step === 0 || appCrashed ? "active" : "normal"} />

              <DiagramGroupBox x={170} y={20} width={230} height={270} label="Postgres (1 database)" tone="blue">
                <DiagramNode x={190} y={55} width={190} height={70} label="orders" sublabel="#1001 · đã commit" tone="blue" state={step === 0 ? "active" : "normal"} />
                <DiagramNode
                  x={190}
                  y={160}
                  width={190}
                  height={90}
                  label="outbox #42"
                  sublabel={publishedMark}
                  tone={isOutbox ? "amber" : "slate"}
                  state={!isOutbox ? "dimmed" : step === 0 || step === 3 ? "active" : "normal"}
                  dashed={!isOutbox}
                />
              </DiagramGroupBox>
              <DiagramArrow from={[142, 150]} to={[186, 90]} tone="blue" dimmed={step > 0} label="COMMIT" />
              {isOutbox && <DiagramArrow from={[142, 170]} to={[186, 200]} tone="amber" dimmed={step > 0} />}

              <DiagramNode x={430} y={165} width={120} height={80} label="Relay" sublabel={relayCrashed ? "⚡ crash" : step >= 4 ? "restart" : "poll"} emoji="🏃" tone={relayCrashed ? "rose" : "cyan"} state={!isOutbox ? "dimmed" : [1, 2, 4].includes(step) ? "active" : "normal"} />
              {isOutbox && <DiagramArrow from={[426, 205]} to={[384, 205]} tone="cyan" dimmed={step !== 1} label="SELECT" />}

              <DiagramNode x={580} y={165} width={130} height={80} label="Redpanda" sublabel={topicLabel} emoji="📒" tone={!isOutbox && step >= 2 ? "rose" : "amber"} state={step === 2 || step === 4 ? "active" : "normal"} />
              {isOutbox && (step === 2 || step === 4) && <MovingPacket key={`send-${step}`} path="M 490 205 L 645 205" durationSeconds={1.2} repeat={false} tone="amber" label="42" />}
              {!isOutbox && <DiagramArrow from={[142, 135]} to={[576, 190]} tone="rose" dimmed curve={-60} label="producer.send() — chưa kịp" />}

              <DiagramNode
                x={580}
                y={30}
                width={130}
                height={80}
                label="Email consumer"
                sublabel={isOutbox ? (step === 5 ? "42 đã xử lý → skip" : step >= 2 ? "gửi 1 email" : "chờ") : step >= 2 ? "không có gì" : "chờ"}
                emoji="📧"
                tone={isOutbox ? "green" : step >= 2 ? "rose" : "slate"}
                state={step === 5 || (!isOutbox && step === 2) ? "active" : "normal"}
              />
              <DiagramArrow from={[645, 162]} to={[645, 114]} tone="green" dimmed={!isOutbox || step < 2} />

              {relayCrashed && <DiagramLabel x={490} y={270} text="UPDATE published_at chưa commit" tone="rose" bold />}
            </>
          );
        }}
      </StepDiagram>
    </div>
  );
}
