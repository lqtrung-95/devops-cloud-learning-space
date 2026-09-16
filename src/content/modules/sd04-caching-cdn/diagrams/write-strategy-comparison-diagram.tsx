"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramArrow, DiagramNode } from "@/components/diagrams/diagram-shapes";
import type { DiagramTone } from "@/components/diagrams/diagram-tones";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";

type Strategy = "cache-aside" | "read-through" | "write-through" | "write-behind";

const strategyLabels: Record<Strategy, string> = {
  "cache-aside": "Cache-aside",
  "read-through": "Read-through",
  "write-through": "Write-through",
  "write-behind": "Write-behind",
};

interface FlowStep extends DiagramStep {
  arrows: { from: [number, number]; to: [number, number]; tone: DiagramTone; label?: string; curve?: number }[];
  active: ("app" | "cache" | "db")[];
}

const scenarios: Record<Strategy, FlowStep[]> = {
  "cache-aside": [
    { title: "Đọc: hỏi tủ lạnh", description: "App tự `GET` cache trước. Đây là bài trước — nhắc lại để so sánh.", active: ["app", "cache"], arrows: [{ from: [206, 150], to: [316, 150], tone: "violet", label: "GET key" }] },
    { title: "Miss → tự đi chợ", description: "Không có → app tự query DB, rồi tự `SET` lại vào cache. **App làm cả hai việc.**", active: ["app", "db"], arrows: [{ from: [206, 160], to: [556, 160], tone: "amber", label: "SELECT", curve: 30 }, { from: [556, 140], to: [206, 140], tone: "green", label: "SET key", curve: -30 }] },
    { title: "Ghi", description: "Khi update, app tự xoá/ghi key rồi tự ghi DB. Đơn giản, phổ biến nhất — nhưng logic cache nằm rải trong code app.", active: ["app", "cache", "db"], arrows: [{ from: [206, 150], to: [556, 150], tone: "rose", label: "UPDATE" }, { from: [206, 130], to: [316, 130], tone: "rose", label: "DEL key" }] },
  ],
  "read-through": [
    { title: "App chỉ nói chuyện với cache", description: "App luôn `GET` cache; **cache tự đi lấy** dữ liệu khi miss (cần thư viện/lớp hỗ trợ, ví dụ Redis kết hợp cache library có loader).", active: ["app", "cache"], arrows: [{ from: [206, 150], to: [316, 150], tone: "violet", label: "GET key" }] },
    { title: "Cache tự đi chợ", description: "Cache thấy miss, tự gọi hàm loader để lấy từ DB, tự lưu lại, rồi mới trả cho app. App không biết có miss hay không.", active: ["cache", "db"], arrows: [{ from: [426, 160], to: [556, 160], tone: "amber", label: "loader()", curve: 20 }, { from: [556, 140], to: [426, 140], tone: "green", curve: -20 }] },
    { title: "Ghi vẫn cần chiến lược riêng", description: "Read-through chỉ nói về **đọc**. Ghi thường đi kèm write-through hoặc write-behind ở hai cột bên.", active: ["app", "db"], arrows: [{ from: [206, 150], to: [556, 150], tone: "rose", label: "UPDATE (qua cột khác)" }] },
  ],
  "write-through": [
    { title: "Ghi qua cache trước", description: "App chỉ gửi ghi tới cache; cache **đồng bộ** ghi luôn xuống DB trước khi trả 'ok' cho app.", active: ["app", "cache"], arrows: [{ from: [206, 150], to: [316, 150], tone: "violet", label: "SET key=v" }] },
    { title: "Cache ghi hộ xuống DB", description: "Cache tự `INSERT/UPDATE` DB, đợi DB xác nhận rồi mới trả 'ok'. App **không** trả lời user cho tới khi cả hai xong.", active: ["cache", "db"], arrows: [{ from: [426, 150], to: [556, 150], tone: "amber", label: "ghi DB, chờ ACK" }] },
    { title: "Đọc luôn thấy dữ liệu mới", description: "Vì cache và DB luôn đồng bộ, đọc ngay sau ghi luôn đúng. Đổi lại **mỗi lần ghi chậm bằng cả hai bước cộng lại.**", active: ["app", "cache", "db"], arrows: [{ from: [316, 200], to: [206, 200], tone: "green", label: "ok (sau khi DB ACK)" }] },
  ],
  "write-behind": [
    { title: "Ghi vào cache, trả lời ngay", description: "App `SET` vào cache; cache trả 'ok' **ngay lập tức**, không đợi DB. Ghi rất nhanh.", active: ["app", "cache"], arrows: [{ from: [206, 150], to: [316, 150], tone: "violet", label: "SET key=v" }, { from: [316, 130], to: [206, 130], tone: "green", label: "ok (chưa chạm DB)", curve: -10 }] },
    { title: "Worker gom lại, ghi dồn", description: "Một worker nền đọc hàng đợi các thay đổi, gộp và ghi xuống DB **sau đó** (ví dụ mỗi 5 giây hoặc theo batch).", active: ["cache", "db"], arrows: [{ from: [426, 160], to: [556, 160], tone: "amber", label: "flush theo batch", curve: 20 }] },
    { title: "Rủi ro nếu cache chết trước khi flush", description: "Ghi nằm trong cache chưa kịp xuống DB mà cache crash ⇒ **mất dữ liệu ghi gần nhất.** Chỉ dùng khi chấp nhận đánh đổi này (ví dụ đếm view, không phải đơn hàng).", active: ["cache"], arrows: [{ from: [426, 190], to: [556, 190], tone: "rose", label: "✗ mất nếu crash trước flush" }] },
  ],
};

export function WriteStrategyComparisonDiagram() {
  const [strategy, setStrategy] = useState<Strategy>("cache-aside");
  const steps = scenarios[strategy];

  return (
    <div>
      <div className="not-prose -mb-4 flex flex-wrap gap-2">
        {(Object.keys(strategyLabels) as Strategy[]).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setStrategy(option)}
            className={clsx("rounded-full px-3 py-1.5 text-sm font-medium", strategy === option ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300")}
          >
            {strategyLabels[option]}
          </button>
        ))}
      </div>
      <StepDiagram key={strategy} title="Ai nói chuyện với ai, và ai chờ ai?" viewBox="0 0 720 260" steps={steps}>
        {(stepIndex) => {
          const step = steps[stepIndex];
          return (
            <>
              <DiagramNode x={40} y={112} width={166} height={76} label="App" emoji="🧑‍💻" tone="violet" state={step.active.includes("app") ? "active" : "normal"} />
              <DiagramNode x={316} y={112} width={166} height={76} label="Cache (Redis)" emoji="🗂️" tone="amber" state={step.active.includes("cache") ? "active" : "normal"} />
              <DiagramNode x={556} y={112} width={150} height={76} label="Database" emoji="🐘" tone="green" state={step.active.includes("db") ? "active" : "normal"} />
              {step.arrows.map((arrow, index) => (
                <DiagramArrow key={index} {...arrow} animated />
              ))}
            </>
          );
        }}
      </StepDiagram>
    </div>
  );
}
