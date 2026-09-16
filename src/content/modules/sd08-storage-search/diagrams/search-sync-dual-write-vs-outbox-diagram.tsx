"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramArrow, DiagramGroupBox, DiagramLabel, DiagramNode, MovingPacket } from "@/components/diagrams/diagram-shapes";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";

type Scenario = "dual-write" | "outbox";

const scenarios: Record<Scenario, { button: string; steps: DiagramStep[] }> = {
  "dual-write": {
    button: "❌ Dual write (ghi Postgres rồi tự gọi OpenSearch)",
    steps: [
      { title: "Sửa giá", description: "App chạy `UPDATE products SET price = 120000 WHERE id = 'p1'` và `COMMIT` — Postgres đã có giá mới." },
      { title: "App crash", description: "Pod bị restart/OOM-kill ngay trước khi kịp gọi `opensearchClient.index('p1', ...)`. Hai hệ thống không chung transaction." },
      { title: "Lệch dữ liệu vĩnh viễn", description: "Postgres có giá mới, OpenSearch vẫn giữ giá cũ — và không có cơ chế nào tự phát hiện hay sửa lại. Khách tìm kiếm thấy giá sai cho tới khi có người vô tình sửa lại sản phẩm đó." },
    ],
  },
  outbox: {
    button: "✅ Outbox + relay (tái dùng từ SD07)",
    steps: [
      { title: "1 transaction", description: "Trong CÙNG transaction: `UPDATE products` và `INSERT INTO outbox (aggregate_id, type, payload)`. Commit thì có cả hai." },
      { title: "Relay poll", description: "Relay (đã dựng ở SD07) `SELECT ... WHERE published_at IS NULL FOR UPDATE SKIP LOCKED` lấy event `ProductUpdated`." },
      { title: "Upsert OpenSearch", description: "Relay gọi `PUT /products/_doc/p1` — upsert theo id, ghi đè toàn bộ document. Đánh dấu `published_at = now()`." },
      { title: "Relay crash giữa chừng", description: "Relay chết SAU khi PUT thành công nhưng TRƯỚC khi commit `UPDATE outbox SET published_at`. Dòng outbox vẫn là chưa gửi." },
      { title: "Gửi lại — vô hại", description: "Relay khởi động lại, thấy event p1 chưa publish → PUT lại `products/_doc/p1` lần nữa. Vì là upsert theo cùng id, ghi đè lần 2 cho ra kết quả giống hệt lần 1 — không có gì hỏng." },
      { title: "Search khớp DB", description: "OpenSearch cuối cùng khớp Postgres. Độ trễ giữa COMMIT và lúc search thấy giá mới là vài trăm ms tới vài giây (chu kỳ poll của relay) — đây là eventual consistency, không phải bug." },
    ],
  },
};

export function SearchSyncDualWriteVsOutboxDiagram() {
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
      <StepDiagram key={scenario} title="Đồng bộ products → OpenSearch: dual write vs outbox" viewBox="0 0 720 320" steps={scenarios[scenario].steps}>
        {(step) => {
          const appCrashed = !isOutbox && step >= 1;
          const relayCrashed = isOutbox && step === 3;
          const priceInSearch = isOutbox ? (step >= 2 ? "120.000 (mới)" : "100.000 (cũ)") : step >= 2 ? "100.000 (cũ) — SAI" : "100.000 (cũ)";

          return (
            <>
              <DiagramNode x={10} y={120} width={130} height={80} label="Order API" sublabel={appCrashed ? "⚡ crash" : "sửa giá p1"} emoji="🏷️" tone={appCrashed ? "rose" : "violet"} state={step === 0 || appCrashed ? "active" : "normal"} />

              <DiagramGroupBox x={170} y={20} width={230} height={270} label="Postgres">
                <DiagramNode x={190} y={55} width={190} height={70} label="products p1" sublabel="price = 120.000 · đã commit" tone="blue" state={step === 0 ? "active" : "normal"} />
                <DiagramNode
                  x={190}
                  y={160}
                  width={190}
                  height={90}
                  label="outbox: ProductUpdated"
                  sublabel={isOutbox ? (step >= 4 ? "published_at: now()" : step >= 1 ? "published_at: NULL" : "vừa insert · NULL") : "không dùng"}
                  tone={isOutbox ? "amber" : "slate"}
                  state={!isOutbox ? "dimmed" : step === 0 || step === 3 ? "active" : "normal"}
                  dashed={!isOutbox}
                />
              </DiagramGroupBox>
              <DiagramArrow from={[142, 150]} to={[186, 90]} tone="blue" dimmed={step > 0} label="COMMIT" />
              {isOutbox && <DiagramArrow from={[142, 170]} to={[186, 200]} tone="amber" dimmed={step > 0} />}

              <DiagramNode x={430} y={165} width={120} height={80} label="Relay" sublabel={relayCrashed ? "⚡ crash" : step >= 4 ? "restart" : "poll"} emoji="🏃" tone={relayCrashed ? "rose" : "cyan"} state={!isOutbox ? "dimmed" : [1, 2, 4].includes(step) ? "active" : "normal"} />
              {isOutbox && <DiagramArrow from={[426, 205]} to={[384, 205]} tone="cyan" dimmed={step !== 1} label="SELECT" />}

              <DiagramNode
                x={580}
                y={165}
                width={130}
                height={90}
                label="OpenSearch"
                sublabel={`price: ${priceInSearch}`}
                emoji="🔎"
                tone={!isOutbox && step >= 2 ? "rose" : "green"}
                state={step === 2 || step === 4 || step === 5 ? "active" : "normal"}
              />
              {isOutbox && [2, 4].includes(step) && <MovingPacket key={`put-${step}`} path="M 490 205 L 645 205" durationSeconds={1.2} repeat={false} tone="amber" label="PUT" />}
              {!isOutbox && <DiagramArrow from={[142, 135]} to={[576, 195]} tone="rose" dimmed curve={-60} label="opensearchClient.index() — chưa kịp" />}

              {relayCrashed && <DiagramLabel x={490} y={280} text="UPDATE published_at chưa commit" tone="rose" bold />}
              {!isOutbox && step === 2 && <DiagramLabel x={400} y={280} text="Không ai phát hiện — lệch vĩnh viễn" tone="rose" bold />}
            </>
          );
        }}
      </StepDiagram>
    </div>
  );
}
