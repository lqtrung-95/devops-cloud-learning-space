"use client";

import { StepDiagram } from "@/components/diagrams/step-diagram";
import { DiagramArrow, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";

/**
 * Applies the SD01 four-step framework to this specific case: URL shortener, 100M link/tháng.
 * Each step shows the concrete artifact produced at that step, with real (hedged) numbers.
 */
const steps = [
  {
    title: "Yêu cầu",
    description:
      "Functional: tạo short link (tuỳ chọn custom alias), redirect, xem thống kê click. Non-functional: redirect p99 < 20ms, availability 99,99%, short code không được đoán được liên tiếp. Out of scope: phân tích chi tiết theo vùng địa lý, custom domain riêng cho mỗi user.",
  },
  {
    title: "Ước lượng",
    description:
      "Giả định 100 triệu short link mới/tháng, read:write cỡ 100:1. Write ≈ 100.000.000 / (30×10⁵s) ≈ 33 QPS trung bình (~70–100 QPS đỉnh). Read (redirect) ≈ 3.300 QPS trung bình (~7.000–10.000 QPS đỉnh). Storage 5 năm (6 tỷ link × ~500 byte) ≈ cỡ 3TB thô, ×3 nếu replicate.",
  },
  {
    title: "API",
    description:
      "`POST /api/shorten { longUrl, alias? }` → `{ shortCode, shortUrl }`. `GET /:code` → redirect (301/302). API tối giản vì phần khó nằm ở sinh code và cache, không nằm ở số lượng endpoint.",
  },
  {
    title: "Data model (preview)",
    description:
      "Bảng `urls(short_code PK, long_url, created_at, expires_at, click_count)` trên Postgres — quan hệ đơn giản, không cần join, mọi truy vấn đều theo `short_code`. Đây là lý do một key-value dạng bảng đơn là đủ, chưa cần NoSQL.",
  },
] as const;

export function FourStepFrameworkUrlShortenerDiagram() {
  return (
    <StepDiagram title="Áp dụng framework 4 bước cho URL shortener (100M link/tháng)" viewBox="0 0 720 230" steps={[...steps]}>
      {(step) => (
        <>
          {steps.map((item, index) => {
            const x = 40 + index * 165;
            const isActive = index === step;
            const isPast = index < step;
            return (
              <g key={item.title}>
                <DiagramNode
                  x={x}
                  y={70}
                  width={140}
                  height={70}
                  label={`${index + 1}. ${item.title}`}
                  tone={isActive ? "violet" : isPast ? "green" : "slate"}
                  state={isActive ? "active" : isPast ? "normal" : "dimmed"}
                />
                {index < steps.length - 1 && (
                  <DiagramArrow
                    from={[x + 140, 105]}
                    to={[x + 165, 105]}
                    tone={isPast ? "green" : "slate"}
                    dimmed={!isPast && !isActive}
                  />
                )}
              </g>
            );
          })}
          <DiagramLabel x={360} y={190} text="Không vẽ kiến trúc trước khi xong bước 1 và 2" size={12} tone="slate" />
        </>
      )}
    </StepDiagram>
  );
}
