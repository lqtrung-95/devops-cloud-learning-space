"use client";

import { DiagramArrow, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";

const LIMIT = 5;

const steps: DiagramStep[] = [
  { title: "1. Login sai #1", description: "Client gửi mật khẩu sai lần 1. Rate limit bucket theo IP cho route `/auth/login` bắt đầu đếm: 1/5 trong cửa sổ 1 phút." },
  { title: "2. Login sai #2", description: "Lần 2 — vẫn còn hạn mức, request vẫn được xử lý bình thường (trả `401`)." },
  { title: "3. Login sai #3", description: "Lần 3 — bucket gần đầy. Nếu đây là người dùng thật quên mật khẩu, họ vẫn chưa bị ảnh hưởng gì." },
  { title: "4. Login sai #4", description: "Lần 4 — chỉ còn đúng 1 lượt nữa trước khi chạm ngưỡng `max: 5`." },
  { title: "5. Login sai #5", description: "Lần 5 — chạm đúng ngưỡng. Request thứ 5 vẫn được xử lý (trả `401`), nhưng bucket đã đầy hoàn toàn." },
  {
    title: "6. Login #6 — bị chặn",
    description:
      "Request thứ 6 trong cùng cửa sổ 1 phút bị chặn ngay ở tầng rate-limit, trả `429 Too Many Requests` — server thậm chí KHÔNG chạy tới bước kiểm tra mật khẩu. Đánh đổi: nếu đây là người dùng thật gõ nhầm 6 lần, họ cũng bị khoá tạm thời y như attacker.",
  },
];

/** Xô chứa 5 "lượt" cho IP gọi /auth/login — đầy dần qua từng lần sai, lần thứ 6 bị chặn hẳn. */
export function RateLimitBucketFillingDiagram() {
  return (
    <StepDiagram title="Rate limit bucket cho /auth/login (max: 5, timeWindow: 1 phút)" viewBox="0 0 720 280" steps={steps}>
      {(step) => {
        const used = Math.min(step + 1, LIMIT);
        const blocked = step >= LIMIT;
        const slotWidth = 90;
        const slotGap = 12;
        const startX = 40;
        const slotsY = 90;

        return (
          <>
            <DiagramNode x={280} y={10} width={160} height={54} label="🥷 Client" sublabel="IP: 203.0.113.9" tone="violet" />
            <DiagramArrow from={[360, 64]} to={[360, 84]} tone="slate" />
            <DiagramLabel x={360} y={80} text="POST /auth/login" size={11} />

            {Array.from({ length: LIMIT }, (_, index) => {
              const x = startX + index * (slotWidth + slotGap);
              const filled = index < used;
              return (
                <DiagramNode
                  key={index}
                  x={x}
                  y={slotsY}
                  width={slotWidth}
                  height={60}
                  label={filled ? "✗ 401" : "trống"}
                  sublabel={`lượt ${index + 1}/${LIMIT}`}
                  tone={filled ? "amber" : "slate"}
                  state={filled && index === used - 1 && !blocked ? "active" : "normal"}
                />
              );
            })}

            {!blocked ? (
              <DiagramNode x={520} y={90} width={170} height={60} label="⏳ Bucket chưa đầy" sublabel="request vẫn được xử lý" tone="blue" />
            ) : (
              <DiagramNode
                x={220}
                y={190}
                width={280}
                height={70}
                label="🚫 429 Too Many Requests"
                sublabel="chặn trước khi chạm tới argon2.verify()"
                tone="rose"
                state="active"
              />
            )}
          </>
        );
      }}
    </StepDiagram>
  );
}
