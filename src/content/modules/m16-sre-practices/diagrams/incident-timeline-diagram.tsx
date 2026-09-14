"use client";

import { DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";

const steps: DiagramStep[] = [
  { title: "Phát hiện", description: "Alert `CheckoutErrorBudgetBurnFast` firing lúc 09:41. On-call nhận page qua PagerDuty. Đây là lúc timeline bắt đầu — mọi mốc sau đều tính từ đây." },
  { title: "Xác nhận & phân loại", description: "On-call mở dashboard, xác nhận ảnh hưởng thật (không phải false positive), gán mức độ SEV1 (ảnh hưởng doanh thu, nhiều khách hàng)." },
  { title: "Chỉ định Incident Commander", description: "Với SEV1, on-call tự phong hoặc gọi thêm một Incident Commander (IC). IC không tự sửa lỗi — IC điều phối: ai debug, ai thông báo khách hàng, ai cập nhật status page." },
  { title: "Giảm thiểu (mitigate)", description: "Theo runbook: kiểm tra deploy gần nhất → rollback bằng `kubectl rollout undo`. Mục tiêu là NGỪNG tác động trước, tìm nguyên nhân gốc sau." },
  { title: "Xác nhận hồi phục", description: "Dashboard RED trở lại bình thường, burn rate về dưới ngưỡng, alert resolved. IC tuyên bố kết thúc giai đoạn khẩn cấp, thông báo status page 'đã khắc phục'." },
  { title: "Blameless postmortem", description: "Trong 48 giờ: viết timeline chi tiết, nguyên nhân gốc (5 Whys), điều làm tốt/chưa tốt, action items có OWNER và HẠN cụ thể. Không nêu tên để đổ lỗi — tập trung vào hệ thống." },
];

export function IncidentTimelineDiagram() {
  return (
    <StepDiagram title="Vòng đời một sự cố SEV1" viewBox="0 0 720 260" steps={steps}>
      {(step) => (
        <>
          <line x1={40} y1={130} x2={680} y2={130} className="stroke-stone-300 dark:stroke-stone-700" strokeWidth={2} />
          {steps.map((item, index) => {
            const x = 60 + index * 120;
            const active = index === step;
            const passed = index < step;
            return (
              <g key={item.title}>
                <circle cx={x} cy={130} r={10} className={active ? "fill-indigo-600" : passed ? "fill-emerald-500" : "fill-stone-300 dark:fill-stone-600"} />
                <DiagramLabel x={x} y={index % 2 === 0 ? 108 : 168} text={item.title} size={11} bold={active} tone={active ? "violet" : "slate"} />
              </g>
            );
          })}
          <DiagramNode
            x={210}
            y={190}
            width={300}
            height={60}
            label={step <= 2 ? "🚨 Giai đoạn phát hiện" : step <= 4 ? "🛠️ Giai đoạn xử lý" : "📝 Giai đoạn học hỏi"}
            tone={step <= 2 ? "rose" : step <= 4 ? "amber" : "green"}
            state="active"
          />
        </>
      )}
    </StepDiagram>
  );
}
