"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramArrow, DiagramNode } from "@/components/diagrams/diagram-shapes";
import type { DiagramTone } from "@/components/diagrams/diagram-tones";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";

type Scenario = "clean" | "nested-gotcha";

const cleanSteps: DiagramStep[] = [
  { title: "beforeEach: BEGIN", description: "Mở một transaction mới trên connection dành riêng cho test (`max: 1`) — chưa có gì thay đổi trong DB." },
  { title: "Test chạy", description: "Test insert `users`, `projects`, `tasks`... Mọi thay đổi chỉ tồn tại BÊN TRONG transaction này, connection khác chưa thấy được." },
  { title: "Assertion", description: "Test query lại và thấy đúng dữ liệu vừa ghi — vì Postgres cho chính transaction đó nhìn thấy thay đổi chưa commit của nó." },
  { title: "afterEach: ROLLBACK", description: "Mọi thay đổi trong transaction bị huỷ sạch. Postgres quay lại đúng trạng thái trước khi test bắt đầu." },
  { title: "Test kế tiếp", description: "`beforeEach` mở transaction MỚI — hoàn toàn sạch, không thấy bất kỳ dấu vết nào từ test trước, dù trước đó test insert bao nhiêu bảng." },
];

const gotchaSteps: DiagramStep[] = [
  { title: "beforeEach: BEGIN", description: "Giống hệt kịch bản bình thường — transaction ngoài cùng của test được mở." },
  { title: "Code gọi transaction riêng", description: "Route tạo task (từ B04) tự gọi `db.transaction()` để ghi `tasks` + `activity_logs` cùng lúc. Bên trong một transaction đã mở, Postgres thường chỉ tạo SAVEPOINT — vẫn ổn." },
  { title: "⚠ COMMIT sớm ngoài ý muốn", description: "NHƯNG nếu code có `COMMIT` tường minh, hoặc một constraint `DEFERRABLE INITIALLY DEFERRED` kích hoạt hành vi khi commit — transaction NGOÀI CÙNG của test bị commit thật, sớm hơn dự kiến." },
  { title: "afterEach: ROLLBACK 'suông'", description: "`ROLLBACK` vẫn chạy nhưng không còn transaction nào để rollback — dữ liệu test đã được ghi thật vào `taskflow_test`, rò rỉ sang test sau." },
  { title: "Cách phòng", description: "Tránh code/thư viện tự ý COMMIT bên trong luồng đang test; nếu bắt buộc, tách riêng test đó ra một schema được reset thủ công thay vì dựa vào rollback-per-test." },
];

const scenarios: Record<Scenario, { steps: DiagramStep[]; toneStart: DiagramTone; toneEnd: DiagramTone; endLabel: string }> = {
  clean: { steps: cleanSteps, toneStart: "violet", toneEnd: "green", endLabel: "✅ DB sạch" },
  "nested-gotcha": { steps: gotchaSteps, toneStart: "violet", toneEnd: "rose", endLabel: "🚨 DB còn rác" },
};

export function TransactionRollbackLifecycleDiagram() {
  const [scenario, setScenario] = useState<Scenario>("clean");
  const { steps, endLabel, toneEnd } = scenarios[scenario];

  return (
    <div>
      <div className="not-prose -mb-4 flex flex-wrap gap-2">
        {(["clean", "nested-gotcha"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setScenario(option)}
            className={clsx(
              "rounded-full px-3 py-1.5 text-sm font-medium",
              scenario === option ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
            )}
          >
            {option === "clean" ? "Kịch bản: bình thường" : "Kịch bản: transaction lồng ngoài ý muốn"}
          </button>
        ))}
      </div>
      <StepDiagram key={scenario} title="Vòng đời transaction rollback-per-test" viewBox="0 0 720 260" steps={steps}>
        {(step) => (
          <>
            <DiagramNode x={10} y={95} width={130} height={64} label="beforeEach" sublabel="BEGIN" tone="violet" state={step === 0 ? "active" : "normal"} />
            <DiagramNode x={185} y={95} width={150} height={64} label="Test chạy" sublabel="insert/query" tone="blue" state={step === 1 || step === 2 ? "active" : step > 2 ? "normal" : "dimmed"} />
            <DiagramNode
              x={380}
              y={95}
              width={150}
              height={64}
              label={step >= 2 && scenario === "nested-gotcha" ? "⚠ COMMIT sớm" : "assertion"}
              sublabel={step >= 2 && scenario === "nested-gotcha" ? "transaction ngoài bị đóng" : "đọc trong transaction"}
              tone={step >= 2 && scenario === "nested-gotcha" ? "rose" : "cyan"}
              state={step === 2 ? "active" : step > 2 ? "normal" : "dimmed"}
            />
            <DiagramNode x={575} y={95} width={135} height={64} label="afterEach" sublabel="ROLLBACK" tone="amber" state={step === 3 ? "active" : step > 3 ? "normal" : "dimmed"} />

            <DiagramArrow from={[140, 127]} to={[181, 127]} tone="slate" dimmed={step < 1} />
            <DiagramArrow from={[335, 127]} to={[376, 127]} tone="slate" dimmed={step < 2} />
            <DiagramArrow from={[530, 127]} to={[571, 127]} tone="slate" dimmed={step < 3} />

            <DiagramNode x={290} y={196} width={160} height={50} label={endLabel} tone={toneEnd} state={step === 4 ? "active" : "dimmed"} />
            {step === 4 && <DiagramArrow from={[642, 159]} to={[380, 198]} tone={toneEnd} curve={40} label="test kế tiếp" />}
          </>
        )}
      </StepDiagram>
    </div>
  );
}
