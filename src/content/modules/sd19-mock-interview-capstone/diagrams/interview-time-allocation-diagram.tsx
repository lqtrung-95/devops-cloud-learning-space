"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramNode } from "@/components/diagrams/diagram-shapes";
import type { DiagramTone } from "@/components/diagrams/diagram-tones";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";

/**
 * 5 pha của một buổi phỏng vấn system design 45 phút, so sánh phân bổ thời gian
 * "tốt" (cân đối, còn dư thời gian) với "tệ" (dồn gần hết vào vẽ high-level).
 */

type Scenario = "good" | "bad";

interface Phase {
  label: string;
  tone: DiagramTone;
}

const phases: Phase[] = [
  { label: "① Làm rõ", tone: "violet" },
  { label: "② Ước lượng", tone: "amber" },
  { label: "③ High-level", tone: "blue" },
  { label: "④ Đào sâu", tone: "green" },
  { label: "⑤ Wrap-up", tone: "cyan" },
];

const scenarios: Record<Scenario, { minutes: number[]; outcome: string; outcomeTone: DiagramTone; steps: DiagramStep[] }> = {
  good: {
    minutes: [5, 5, 15, 15, 5],
    outcome: "✅ Xong đủ 4 bước, còn ~2 phút hỏi ngược interviewer",
    outcomeTone: "green",
    steps: [
      { title: "① Làm rõ (5')", description: "Hỏi tính năng cốt lõi, quy mô, out of scope trước khi vẽ gì cả — đúng 5 phút, không hơn." },
      { title: "② Ước lượng (5')", description: "Nhẩm QPS đọc/ghi và storage bằng con số vừa hỏi được — chỉ đủ để quyết định kiến trúc, không cần chính xác tuyệt đối." },
      { title: "③ High-level (15')", description: "Chốt API, data model, vẽ khối chính cho luồng quan trọng nhất — dừng lại khi luồng đã chạy được từ đầu tới cuối." },
      { title: "④ Đào sâu (15')", description: "Chọn 2–3 điểm khó nhất, nói trade-off có số liệu — phần này quyết định phần lớn điểm, luôn giữ đủ thời gian cho nó." },
      { title: "⑤ Wrap-up (5')", description: "Tóm tắt lại thiết kế, nêu bottleneck còn lại, chủ động hỏi interviewer có muốn đào sâu thêm phần nào không." },
    ],
  },
  bad: {
    minutes: [1, 1, 35, 7, 1],
    outcome: "❌ Bị cắt ngang giữa chừng — chưa kịp nói trade-off nào ra hồn",
    outcomeTone: "rose",
    steps: [
      { title: "① Làm rõ (1')", description: "Nghe đề xong vẽ ngay — bỏ qua câu hỏi quan trọng nhất: quy mô bao nhiêu, đọc hay ghi nhiều." },
      { title: "② Ước lượng (bỏ qua)", description: "Không ước lượng gì cả nên mọi lựa chọn sau đó (cache? shard?) đều không có căn cứ số liệu." },
      { title: "③ High-level (35')", description: "Vẽ mọi chi tiết nhỏ — kể cả những phần không ai hỏi — vì chưa biết đâu là trọng tâm khi không hỏi yêu cầu." },
      { title: "④ Đào sâu (7', vội)", description: "Chỉ còn 7 phút cho phần quan trọng nhất; trả lời trade-off hời hợt, không kịp so sánh phương án." },
      { title: "⑤ Hết giờ", description: "Interviewer phải cắt ngang. Không còn thời gian tóm tắt hay nêu bottleneck — điểm giao tiếp có cấu trúc bị trừ nặng." },
    ],
  },
};

const BOX_WIDTH = 126;
const GAP = 12;
const BAR_TOTAL_WIDTH = 680;
const TOTAL_MINUTES = 45;

export function InterviewTimeAllocationDiagram() {
  const [scenario, setScenario] = useState<Scenario>("good");
  const data = scenarios[scenario];

  return (
    <div>
      <div className="not-prose -mb-4 flex flex-wrap gap-2">
        {(["good", "bad"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setScenario(option)}
            className={clsx(
              "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
              scenario === option ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
            )}
          >
            {option === "good" ? "Kịch bản: phân bổ tốt" : "Kịch bản: phân bổ tệ"}
          </button>
        ))}
      </div>
      <StepDiagram key={scenario} title="Phân bổ 45 phút phỏng vấn" viewBox="0 0 720 260" steps={data.steps}>
        {(step) => {
          const lastStep = data.steps.length - 1;
          return (
            <>
              {phases.map((phase, index) => {
                const x = 20 + index * (BOX_WIDTH + GAP);
                const state = index === step ? "active" : index < step ? "normal" : "dimmed";
                return <DiagramNode key={phase.label} x={x} y={20} width={BOX_WIDTH} height={54} label={phase.label} sublabel={`${data.minutes[index]}'`} tone={phase.tone} state={state} />;
              })}

              {phases.map((phase, index) => {
                const offset = data.minutes.slice(0, index).reduce((sum, value) => sum + value, 0);
                const x = 20 + (offset / TOTAL_MINUTES) * BAR_TOTAL_WIDTH;
                const width = Math.max((data.minutes[index] / TOTAL_MINUTES) * BAR_TOTAL_WIDTH - 3, 4);
                return (
                  <DiagramNode
                    key={`bar-${phase.label}`}
                    x={x}
                    y={100}
                    width={width}
                    height={34}
                    rounded={6}
                    label={data.minutes[index] > 0 ? `${data.minutes[index]}'` : "0'"}
                    tone={phase.tone}
                    state={index === step ? "active" : index < step ? "normal" : "dimmed"}
                  />
                );
              })}

              <DiagramNode
                x={20}
                y={160}
                width={680}
                height={80}
                rounded={12}
                label={step === lastStep ? data.outcome : data.steps[step].title}
                sublabel={step === lastStep ? "kết quả cuối buổi" : "đang ở pha này"}
                tone={step === lastStep ? data.outcomeTone : phases[step].tone}
                dashed={step !== lastStep}
              />
            </>
          );
        }}
      </StepDiagram>
    </div>
  );
}
