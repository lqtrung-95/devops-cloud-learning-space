"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramArrow, DiagramGroupBox, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";

type Scenario = "orchestration-ok" | "orchestration-fail" | "choreography";

const scenarios: Record<Scenario, { button: string; steps: DiagramStep[] }> = {
  "orchestration-ok": {
    button: "✅ Orchestration — thành công",
    steps: [
      { title: "Order tạo", description: "Orchestrator tạo state `order-1: CREATED` và ra lệnh `ReserveInventory`." },
      { title: "Inventory OK", description: "Inventory giữ hàng, báo `InventoryReserved`. Orchestrator cập nhật state `INVENTORY_RESERVED`, ra lệnh `ChargePayment`." },
      { title: "Payment OK", description: "Payment trừ tiền thành công, báo `PaymentCharged`. Orchestrator cập nhật `PAYMENT_CHARGED`, ra lệnh `ShipOrder`." },
      { title: "Shipping OK", description: "Shipping xác nhận `Shipped`. Orchestrator đóng saga: `order-1: SHIPPED`. Mọi bước đi đúng 1 chiều, không cần compensation." },
    ],
  },
  "orchestration-fail": {
    button: "❌ Orchestration — lỗi ở Payment",
    steps: [
      { title: "Order tạo", description: "Orchestrator tạo state `order-1: CREATED`, ra lệnh `ReserveInventory`." },
      { title: "Inventory OK", description: "Inventory giữ hàng, báo `InventoryReserved`. State: `INVENTORY_RESERVED`. Orchestrator ra lệnh `ChargePayment`." },
      { title: "Payment LỖI", description: "Payment trả lỗi (thẻ bị từ chối). Orchestrator biết ngay vì nó đang chờ đúng sự kiện này — không cần service khác đoán." },
      { title: "Compensation: ReleaseInventory", description: "Orchestrator ra lệnh compensating transaction `ReleaseInventory` — KHÔNG rollback DB, mà là 1 transaction bù trừ mới trả hàng đã giữ về kho." },
      { title: "Saga kết thúc: COMPENSATED", description: "State cuối `order-1: COMPENSATED`. Shipping không bao giờ được gọi. Dữ liệu nhất quán: không hàng bị giữ treo, không tiền bị trừ." },
    ],
  },
  choreography: {
    button: "🔀 Choreography (so sánh)",
    steps: [
      { title: "Order publish event", description: "Order service tự publish `OrderCreated` lên broker — không gọi ai, không biết ai sẽ nghe." },
      { title: "Inventory tự phản ứng", description: "Inventory nghe `OrderCreated`, tự giữ hàng, publish `InventoryReserved`. Order KHÔNG biết Inventory đã xong hay chưa trừ khi tự nghe event này." },
      { title: "Payment tự phản ứng, rồi lỗi", description: "Payment nghe `InventoryReserved`, cố trừ tiền, thất bại, tự publish `PaymentFailed`." },
      { title: "Inventory tự nghe & tự bù trừ", description: "Inventory phải TỰ đăng ký nghe `PaymentFailed` để biết mà gọi `ReleaseInventory` — không có ai 'nhắc'. Muốn biết toàn cảnh 1 đơn đang ở đâu, phải lần theo log của cả 3 service." },
    ],
  },
};

export function SagaOrchestrationCompensationDiagram() {
  const [scenario, setScenario] = useState<Scenario>("orchestration-fail");

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
      <StepDiagram key={scenario} title="Saga: đặt hàng → giữ hàng → trừ tiền → giao hàng" viewBox="0 0 720 320" steps={scenarios[scenario].steps}>
        {(step) => {
          const isChoreo = scenario === "choreography";
          const isFail = scenario === "orchestration-fail";
          const paymentFailed = isFail && step >= 2;
          const compensating = isFail && step >= 3;
          const done = isFail ? step >= 4 : step >= 3;

          return (
            <>
              {!isChoreo && (
                <DiagramGroupBox x={270} y={10} width={180} height={70} label="" tone="violet">
                  <DiagramNode
                    x={280}
                    y={18}
                    width={160}
                    height={55}
                    label="Saga orchestrator"
                    sublabel={`order-1: ${["CREATED", "INVENTORY_RESERVED", isFail ? "PAYMENT_FAILED" : "PAYMENT_CHARGED", isFail ? "COMPENSATED" : "SHIPPED"][Math.min(step, 3)]}`}
                    emoji="🧑‍✈️"
                    tone="violet"
                    state="active"
                  />
                </DiagramGroupBox>
              )}
              {isChoreo && (
                <DiagramNode x={300} y={20} width={120} height={55} label="Event broker" sublabel="Redpanda" emoji="📒" tone="cyan" state="active" />
              )}

              <DiagramNode x={40} y={130} width={130} height={80} label="Order" emoji="🧾" tone="violet" state={step === 0 ? "active" : "normal"} />
              <DiagramNode
                x={220}
                y={130}
                width={130}
                height={80}
                label="Inventory"
                sublabel={compensating ? "trả hàng lại" : step >= 1 ? "đã giữ hàng" : "chờ"}
                emoji="📦"
                tone={compensating ? "amber" : "blue"}
                state={step === 1 || compensating ? "active" : "normal"}
              />
              <DiagramNode
                x={400}
                y={130}
                width={130}
                height={80}
                label="Payment"
                sublabel={paymentFailed ? "⚡ từ chối thẻ" : step >= 2 ? "đã trừ tiền" : "chờ"}
                emoji="💳"
                tone={paymentFailed ? "rose" : "green"}
                state={step === 2 ? "active" : "normal"}
              />
              <DiagramNode
                x={580}
                y={130}
                width={120}
                height={80}
                label="Shipping"
                sublabel={isFail ? "không bao giờ gọi" : step >= 3 ? "đã giao" : "chờ"}
                emoji="🚚"
                tone={isFail ? "slate" : "green"}
                state={!isFail && step === 3 ? "active" : "normal"}
                dashed={isFail}
              />

              {!isChoreo ? (
                <>
                  <DiagramArrow from={[105, 130]} to={[335, 82]} tone="violet" dimmed={step > 0} curve={40} label="ReserveInventory" />
                  <DiagramArrow from={[285, 130]} to={[335, 82]} tone="blue" dimmed={step !== 1} curve={-30} label="OK" />
                  <DiagramArrow from={[335, 82]} to={[465, 130]} tone="violet" dimmed={step !== 1} curve={-40} label="ChargePayment" />
                  {paymentFailed && <DiagramArrow from={[465, 130]} to={[335, 82]} tone="rose" curve={30} label="Failed" />}
                  {compensating && <DiagramArrow from={[335, 82]} to={[285, 130]} tone="amber" curve={40} label="ReleaseInventory" />}
                  {!isFail && step >= 2 && <DiagramArrow from={[335, 82]} to={[640, 130]} tone="green" dimmed={step !== 2} curve={-60} label="ShipOrder" />}
                </>
              ) : (
                <>
                  <DiagramArrow from={[105, 130]} to={[360, 75]} tone="violet" dimmed={step > 0} label="publish" />
                  <DiagramArrow from={[360, 75]} to={[285, 130]} tone="blue" dimmed={step !== 1} label="nghe" />
                  <DiagramArrow from={[285, 130]} to={[360, 75]} tone="blue" dimmed={step < 1} label="publish" />
                  <DiagramArrow from={[360, 75]} to={[465, 130]} tone="green" dimmed={step !== 2} label="nghe" />
                  <DiagramArrow from={[465, 130]} to={[360, 75]} tone="rose" dimmed={step < 2} label="PaymentFailed" />
                  <DiagramArrow from={[360, 75]} to={[285, 130]} tone="amber" dimmed={step !== 3} label="Inventory tự nghe" curve={60} />
                </>
              )}

              {done && (
                <DiagramLabel
                  x={360}
                  y={250}
                  text={isFail ? "Dữ liệu nhất quán: hàng đã trả, tiền không mất — nhờ compensation" : isChoreo ? "Không ai thấy toàn cảnh — phải lần theo log 3 service" : "Saga hoàn tất, mọi service đồng ý trạng thái cuối"}
                  bold
                  size={13}
                  tone={isFail ? "amber" : isChoreo ? "rose" : "green"}
                />
              )}
            </>
          );
        }}
      </StepDiagram>
    </div>
  );
}
