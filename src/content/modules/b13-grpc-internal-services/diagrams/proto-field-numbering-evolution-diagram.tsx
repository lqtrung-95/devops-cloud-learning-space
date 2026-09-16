"use client";

import { DiagramArrow, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";

const steps: DiagramStep[] = [
  {
    title: "v1 — cả hai phía cùng bản proto",
    description:
      "`SendNotificationRequest` có 4 field: `1 notification_id`, `2 user_id`, `3 type`, `4 payload_json`. `worker` (client) và `notification-service` (server) dùng đúng cùng file `.proto` này để sinh code.",
  },
  {
    title: "Thêm field mới — số 5, chưa ai dùng",
    description:
      "Muốn thêm `priority` để đánh dấu độ khẩn cấp. Vì `5` chưa từng được dùng, thêm `optional string priority = 5;` an toàn tuyệt đối — không đụng tới 4 field cũ.",
  },
  {
    title: "Deploy notification-service trước — client cũ vẫn gọi được",
    description:
      "`notification-service` (server) lên bản v2 trước. `worker` (client) vẫn chạy code sinh từ `.proto` v1 (chưa biết field `5`). Client v1 gửi request KHÔNG có field `5` — server v2 chỉ thấy field đó rỗng/mặc định, không lỗi, không crash.",
  },
  {
    title: "Deploy client sau — không cần đồng bộ thời điểm",
    description:
      "Khi `worker` cũng lên v2, nó bắt đầu gửi field `5`. Vì field number không đổi và chỉ THÊM field mới (không đổi kiểu, không đổi số của field cũ), hai phía có thể deploy lệch thời điểm nhau mà không có phút nào bị vỡ giao tiếp — đây là lý do `.proto` được coi là 'hợp đồng' đáng tin.",
  },
  {
    title: "Thay đổi PHÁ VỠ (để so sánh, đừng làm vậy)",
    description:
      "Nếu thay vì thêm field mới, ai đó xoá `2 user_id` rồi sau này lại dùng lại số `2` cho một field kiểu khác (`int32` thay vì `string`) — client cũ vẫn gửi field `2` dạng string cũ, server mới decode nhầm nó thành số. Đây là lý do: field đã xoá phải `reserved 2;`, không bao giờ tái sử dụng số đó.",
  },
];

export function ProtoFieldNumberingEvolutionDiagram() {
  return (
    <StepDiagram title="Tiến hoá .proto an toàn: field NUMBER là thứ nằm trên dây, không phải tên" viewBox="0 0 720 300" steps={steps}>
      {(step) => (
        <>
          <DiagramNode
            x={20}
            y={30}
            width={310}
            height={100}
            label="SendNotificationRequest (client thấy)"
            sublabel={step < 2 ? "1 notification_id · 2 user_id · 3 type · 4 payload_json" : "1 notification_id · 2 user_id · 3 type · 4 payload_json (v1 client không biết field 5)"}
            tone={step === 4 ? "rose" : "blue"}
            state={step <= 3 ? "active" : "normal"}
          />
          <DiagramNode
            x={390}
            y={30}
            width={310}
            height={100}
            label="SendNotificationRequest (server thấy)"
            sublabel={
              step === 0
                ? "1 notification_id · 2 user_id · 3 type · 4 payload_json"
                : step < 4
                  ? "... 4 payload_json · 5 priority (optional, mới)"
                  : "field 2 bị TÁI SỬ DỤNG cho kiểu khác — decode sai giá trị cũ"
            }
            tone={step === 4 ? "rose" : "green"}
            state={step >= 1 ? "active" : "dimmed"}
          />

          <DiagramArrow from={[330, 80]} to={[388, 80]} tone={step === 4 ? "rose" : "green"} animated={step >= 2} label={step >= 1 ? "cùng .proto tiến hoá" : "cùng .proto v1"} />

          <DiagramNode x={20} y={175} width={330} height={70} label="worker (client)" sublabel={step < 3 ? "vẫn chạy stub sinh từ v1" : "đã lên stub v2"} emoji="🧑‍🍳" tone="blue" state={step >= 2 && step < 4 ? "active" : "normal"} />
          <DiagramNode x={390} y={175} width={310} height={70} label="notification-service" sublabel={step >= 1 && step < 4 ? "đã lên v2, deploy trước client" : step === 4 ? "bị vỡ vì tái dùng field number" : "đang chạy v1"} emoji="📨" tone={step === 4 ? "rose" : "violet"} state={step >= 1 ? "active" : "normal"} />

          <DiagramArrow from={[350, 210]} to={[388, 210]} tone={step === 4 ? "rose" : "amber"} animated={step === 2 || step === 3} label={step >= 1 ? "gọi được dù lệch version" : ""} />

          <DiagramLabel x={360} y={280} text="Quy tắc: chỉ THÊM field number mới; field đã xoá phải khai reserved, không bao giờ tái sử dụng." size={11.5} bold />
        </>
      )}
    </StepDiagram>
  );
}
