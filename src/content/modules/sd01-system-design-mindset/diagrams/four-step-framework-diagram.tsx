"use client";

import { DiagramArrow, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";
import type { DiagramTone } from "@/components/diagrams/diagram-tones";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";

interface FrameworkStage {
  label: string;
  sublabel: string;
  minutes: number;
  tone: DiagramTone;
  example: string;
}

const stages: FrameworkStage[] = [
  { label: "① Yêu cầu", sublabel: "functional + NFR", minutes: 7, tone: "violet", example: "Rút gọn URL, redirect · 100M link/tháng · p99 redirect ~50ms" },
  { label: "② Ước lượng", sublabel: "QPS, storage", minutes: 5, tone: "amber", example: "~40 QPS ghi, ~4.000 QPS đọc · ~6 TB/5 năm (giả định ~1 KB/link)" },
  { label: "③ High-level", sublabel: "API, data, hộp", minutes: 13, tone: "blue", example: "API POST /urls, GET /:code · LB → app → cache → DB" },
  { label: "④ Đào sâu", sublabel: "trade-off", minutes: 20, tone: "green", example: "Sinh short code thế nào? Cache invalidation? 301 hay 302?" },
];

const steps: DiagramStep[] = [
  {
    title: "Làm rõ yêu cầu",
    description:
      "Hỏi trước khi vẽ: tính năng nào là cốt lõi, ai dùng, bao nhiêu user, cần nhanh/bền/nhất quán tới mức nào, cái gì *không* làm. Với URL shortener: tạo link + redirect; analytics để out of scope.",
  },
  {
    title: "Ước lượng",
    description:
      "Biến 'nhiều user' thành con số: QPS đọc/ghi, storage theo năm. Chỉ tính những số làm thay đổi quyết định — ví dụ read:write ~100:1 ⇒ đường đọc là trọng tâm.",
  },
  {
    title: "High-level design",
    description:
      "Chốt API và data model, rồi vẽ các khối chính cho luồng quan trọng nhất. Mục tiêu: một thiết kế *chạy được* từ đầu tới cuối, chưa cần tối ưu.",
  },
  {
    title: "Đào sâu & trade-off",
    description:
      "Chọn 2–3 điểm khó nhất (thường do interviewer gợi ý hoặc do NFR khắt khe) và so sánh phương án: chọn gì, bỏ gì, khi nào đổi ý. Đây là phần phân biệt mid với senior.",
  },
  {
    title: "Quay lại khi số đổi",
    description:
      "Framework không phải thác nước một chiều: đào sâu phát hiện hot key hay NFR mới ⇒ quay lại sửa ước lượng và high-level. Nói to điều này trong phỏng vấn là điểm cộng.",
  },
];

const BOX_WIDTH = 150;
const GAP = 30;
const TOTAL_MINUTES = stages.reduce((sum, stage) => sum + stage.minutes, 0);

export function FourStepFrameworkDiagram() {
  return (
    <StepDiagram title="Framework 4 bước — áp dụng cho URL shortener" viewBox="0 0 720 300" steps={steps}>
      {(step) => {
        const activeIndex = Math.min(step, stages.length - 1);
        return (
          <>
            {stages.map((stage, index) => {
              const x = 20 + index * (BOX_WIDTH + GAP);
              const state = step === 4 ? "normal" : index === activeIndex ? "active" : index < activeIndex ? "normal" : "dimmed";
              return (
                <g key={stage.label}>
                  <DiagramNode x={x} y={30} width={BOX_WIDTH} height={70} label={stage.label} sublabel={stage.sublabel} tone={stage.tone} state={state} />
                  {index < stages.length - 1 && <DiagramArrow from={[x + BOX_WIDTH + 2, 65]} to={[x + BOX_WIDTH + GAP - 2, 65]} dimmed={index >= activeIndex && step < 4} />}
                </g>
              );
            })}

            {step === 4 && <DiagramArrow from={[640, 104]} to={[110, 104]} tone="rose" curve={-40} animated label="phát hiện vấn đề ⇒ quay lại" />}

            <DiagramLabel x={20} y={172} text="Phân bổ 45 phút phỏng vấn (tham khảo, linh hoạt theo interviewer):" anchor="start" size={12} bold />
            {stages.map((stage, index) => {
              const offset = stages.slice(0, index).reduce((sum, item) => sum + item.minutes, 0);
              const x = 20 + (offset / TOTAL_MINUTES) * 680;
              const width = (stage.minutes / TOTAL_MINUTES) * 680 - 4;
              return (
                <DiagramNode
                  key={`bar-${stage.label}`}
                  x={x}
                  y={184}
                  width={width}
                  height={36}
                  rounded={6}
                  label={`~${stage.minutes}'`}
                  tone={stage.tone}
                  state={step === 4 || index === activeIndex ? "active" : "dimmed"}
                />
              );
            })}

            <DiagramNode
              x={20}
              y={236}
              width={680}
              height={50}
              rounded={10}
              label={step === 4 ? "Thiết kế tốt = vòng lặp có chủ đích, không phải vẽ một lần" : stages[activeIndex].example}
              sublabel={step === 4 ? undefined : "ví dụ URL shortener"}
              tone="slate"
              dashed
            />
          </>
        );
      }}
    </StepDiagram>
  );
}
