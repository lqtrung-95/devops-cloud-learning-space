"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import { DiagramArrow, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";

type Strategy = "counter" | "hash" | "pregenerated";

const strategyLabels: Record<Strategy, string> = {
  counter: "Counter + base62",
  hash: "Hash + collision retry",
  pregenerated: "Pre-generated key pool",
};

/** 4-step pipeline; step 2 (index 2) is where each strategy's collision behaviour differs. */
const stepTitlesByStrategy: Record<Strategy, string[]> = {
  counter: ["Request tạo link", "counter++ → base62(id)", "Không cần kiểm tra trùng", "Lưu (short_code, long_url)"],
  hash: ["Request tạo link", "SHA-256(long_url) → 7 ký tự base62 đầu", "Kiểm tra trùng trong DB…", "Lưu nếu trống, ngược lại thử lại"],
  pregenerated: ["Request tạo link", "Lấy 1 code rảnh từ pool đã sinh sẵn", "Đánh dấu code = used (atomic)", "Lưu (short_code, long_url)"],
};

const noteByStrategy: Record<Strategy, string> = {
  counter:
    "Một counter dùng chung (DB sequence, hoặc chia range cho từng instance) đảm bảo mỗi id là duy nhất tuyệt đối → base62(id) không bao giờ trùng, không cần bước kiểm tra. Đánh đổi: counter tập trung là điểm nghẽn/single point nếu không chia range; code sinh ra có thể đoán được thứ tự (lộ tổng số link đã tạo).",
  hash:
    "Băm nội dung rồi lấy N ký tự đầu là ngẫu nhiên-hoá tốt, nhưng N càng ngắn xác suất trùng (collision) càng cao ở quy mô lớn (bài toán sinh nhật). Khi trùng: thử lại với salt/offset khác rồi kiểm tra lại — vòng lặp có thể tốn thêm round-trip DB nếu tải cao.",
  pregenerated:
    "Một worker nền sinh sẵn hàng loạt code ngẫu nhiên chưa dùng, để trong một pool (bảng hoặc Redis set). Request chỉ cần lấy 1 code rảnh và đánh dấu atomic — nhanh, không cần tính hash lúc request, nhưng cần vận hành thêm worker sinh pool và theo dõi pool sắp cạn.",
};

const collisionAtStep: Record<Strategy, number | null> = {
  counter: null,
  hash: 2,
  pregenerated: null,
};

export function ShortCodeGenerationStrategyDiagram() {
  const [strategy, setStrategy] = useState<Strategy>("counter");
  const [step, setStep] = useState(0);
  const titles = stepTitlesByStrategy[strategy];
  const lastStep = titles.length - 1;
  const hasCollisionHere = collisionAtStep[strategy] === step;

  const selectStrategy = (next: Strategy) => {
    setStrategy(next);
    setStep(0);
  };

  return (
    <DiagramFrame
      title="Sinh short code: 3 chiến lược, cùng một pipeline 4 bước"
      viewBox="0 0 720 260"
      controls={
        <div className="space-y-3 text-sm">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(strategyLabels) as Strategy[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => selectStrategy(key)}
                className={clsx(
                  "rounded-full px-3 py-1.5 font-medium",
                  strategy === key ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
                )}
              >
                {strategyLabels[key]}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setStep((current) => Math.max(0, current - 1))}
              disabled={step === 0}
              className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-stone-700 dark:text-stone-300"
            >
              ← Trước
            </button>
            <button
              type="button"
              onClick={() => setStep((current) => Math.min(lastStep, current + 1))}
              disabled={step === lastStep}
              className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-stone-700 dark:text-stone-300"
            >
              Tiếp →
            </button>
            <span className="ml-auto text-xs font-medium text-stone-500">
              Bước {step + 1}/{titles.length}
            </span>
          </div>
          <p className="text-stone-700 dark:text-stone-300">{noteByStrategy[strategy]}</p>
        </div>
      }
      caption="Bước 3 (kiểm tra trùng) là chỗ 3 chiến lược khác nhau nhiều nhất: bỏ qua hẳn, phải thử lại, hay đã giải quyết trước bằng pool."
    >
      {titles.map((label, index) => {
        const x = 30 + index * 168;
        const isActive = index === step;
        const isPast = index < step;
        const isCollision = hasCollisionHere && index === step;
        return (
          <g key={label}>
            <DiagramNode
              x={x}
              y={90}
              width={148}
              height={80}
              label={label}
              tone={isCollision ? "rose" : isActive ? "violet" : isPast ? "green" : "slate"}
              state={isActive ? "active" : isPast ? "normal" : "dimmed"}
            />
            {index < titles.length - 1 && (
              <DiagramArrow from={[x + 148, 130]} to={[x + 168, 130]} tone={isPast ? "green" : "slate"} dimmed={!isPast && !isActive} />
            )}
          </g>
        );
      })}
      {hasCollisionHere && <DiagramLabel x={360} y={210} text="⚠️ Trùng code — quay lại bước 2 với salt/offset khác" tone="rose" bold />}
    </DiagramFrame>
  );
}
