"use client";

import { DiagramArrow, DiagramGroupBox, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";

const steps: DiagramStep[] = [
  {
    title: "1 database chung",
    description: "Monolith: bảng `orders`, `inventory`, `payments` nằm chung 1 Postgres. Muốn báo cáo? Cứ `JOIN` thẳng — nhanh, nhưng bất kỳ service nào cũng có thể đọc/sửa bảng của service khác.",
  },
  {
    title: "Vẽ ranh giới theo domain",
    description: "Nhóm bảng theo bounded context: Order sở hữu `orders`, Inventory sở hữu `inventory`, Payment sở hữu `payments`. Mỗi context sẽ thành 1 service với 1 database riêng.",
  },
  {
    title: "Tách database",
    description: "Mỗi service có Postgres/schema riêng, chỉ chính service đó được ghi. `orders` không còn nằm cùng ổ đĩa với `inventory` — hết khả năng JOIN chéo.",
  },
  {
    title: "Thử JOIN chéo — thất bại",
    description: "Order service chạy `SELECT * FROM orders o JOIN inventory i ON o.sku = i.sku` — lỗi `relation \"inventory\" does not exist`. Đây là hệ quả CHỦ Ý của database-per-service, không phải lỗi cấu hình.",
  },
  {
    title: "Thay JOIN bằng API hoặc bản sao cục bộ",
    description: "Order service gọi `GET /inventory/{sku}` (đồng bộ, chịu thêm latency + khả năng lỗi mạng) hoặc giữ 1 bảng cache `sku_snapshot` được đồng bộ qua event từ Inventory (bất đồng bộ, có độ trễ nhưng không phụ thuộc Inventory lúc đọc).",
  },
];

export function ServiceBoundaryDataOwnershipDiagram() {
  return (
    <StepDiagram title="Từ 1 database chung tới database-per-service" viewBox="0 0 720 320" steps={steps}>
      {(step) => {
        const split = step >= 2;
        const joinFails = step === 3;
        const usesApi = step === 4;
        return (
          <>
            {!split ? (
              <DiagramGroupBox x={230} y={30} width={260} height={230} label="1 Postgres" tone="blue">
                <DiagramNode x={250} y={60} width={220} height={55} label="orders" tone={step >= 1 ? "violet" : "blue"} state={step === 0 ? "active" : "normal"} />
                <DiagramNode x={250} y={130} width={220} height={55} label="inventory" tone={step >= 1 ? "amber" : "blue"} state={step === 0 ? "active" : "normal"} />
                <DiagramNode x={250} y={200} width={220} height={40} label="payments" tone={step >= 1 ? "cyan" : "blue"} state="normal" />
                {step === 0 && <DiagramLabel x={360} y={280} text="JOIN thoải mái — nhưng ai cũng đụng được bảng của ai" size={11} />}
              </DiagramGroupBox>
            ) : (
              <>
                <DiagramGroupBox x={40} y={30} width={190} height={110} label="Order DB" tone="violet">
                  <DiagramNode x={55} y={60} width={160} height={65} label="orders" tone="violet" state={step !== 3 ? "active" : "normal"} />
                </DiagramGroupBox>
                <DiagramGroupBox x={265} y={30} width={190} height={110} label="Inventory DB" tone="amber">
                  <DiagramNode x={280} y={60} width={160} height={65} label="inventory" tone="amber" state={joinFails || usesApi ? "active" : "normal"} dashed={joinFails} />
                </DiagramGroupBox>
                <DiagramGroupBox x={490} y={30} width={190} height={110} label="Payment DB" tone="cyan">
                  <DiagramNode x={505} y={60} width={160} height={65} label="payments" tone="cyan" />
                </DiagramGroupBox>

                {joinFails && (
                  <>
                    <DiagramArrow from={[230, 90]} to={[265, 90]} tone="rose" label="JOIN ✗" />
                    <DiagramLabel x={360} y={175} text='relation "inventory" does not exist — DB khác, không JOIN được' tone="rose" bold size={12} />
                  </>
                )}

                {usesApi && (
                  <>
                    <DiagramArrow from={[230, 90]} to={[265, 90]} tone="green" label="GET /inventory/{sku}" curve={-30} />
                    <DiagramLabel x={360} y={175} text="Đổi JOIN lấy 1 network call — hoặc giữ bản sao đồng bộ qua event" tone="green" bold size={12} />
                  </>
                )}

                {!joinFails && !usesApi && (
                  <DiagramLabel x={360} y={175} text="3 service, 3 database — mỗi bảng chỉ 1 service được ghi" size={12} />
                )}
              </>
            )}

            <DiagramNode
              x={300}
              y={250}
              width={120}
              height={50}
              label="Order svc"
              sublabel={step === 0 ? "code trong monolith" : "service riêng"}
              tone={step >= 1 ? "violet" : "slate"}
              state={step >= 1 ? "active" : "normal"}
            />
          </>
        );
      }}
    </StepDiagram>
  );
}
