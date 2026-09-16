"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramArrow, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";
import { StepDiagram } from "@/components/diagrams/step-diagram";

type Strategy = "lww" | "version-vector" | "crdt";

interface ConflictEvent {
  title: string;
  description: string;
  a: string;
  b: string;
  merged: string;
  mergedTone: "rose" | "amber" | "green";
}

const strategies: { key: Strategy; label: string }[] = [
  { key: "lww", label: "Last-write-wins" },
  { key: "version-vector", label: "Version vector" },
  { key: "crdt", label: "CRDT (OR-Set)" },
];

const scenarios: Record<Strategy, ConflictEvent[]> = {
  lww: [
    { title: "Offline", description: "Hai replica mất kết nối nhau, mỗi bên vẫn nhận ghi từ user riêng.", a: "email = a@x.com (t=10, đồng hồ đúng)", b: "email = b@x.com (t=12 thật, nhưng đồng hồ B chạy nhanh 5s → ghi timestamp 17)", merged: "chưa merge", mergedTone: "amber" },
    { title: "Reconnect", description: "Hai replica nối lại, so sánh timestamp để chọn 'người thắng'.", a: "email = a@x.com, ts=10", b: "email = b@x.com, ts=17 (do lệch đồng hồ)", merged: "so sánh: 17 > 10 → B thắng", mergedTone: "amber" },
    { title: "Kết quả", description: "LWW chọn B vì timestamp lớn hơn — dù thực tế A ghi gần với thời điểm merge hơn nếu đồng hồ đúng. Giá trị của A biến mất, không ai được báo.", a: "bị ghi đè", b: "b@x.com (giữ)", merged: "❌ Mất update của A do clock skew, không cảnh báo", mergedTone: "rose" },
  ],
  "version-vector": [
    { title: "Offline", description: "Mỗi replica gắn version vector riêng khi ghi: {A:1} hoặc {B:1}.", a: "email = a@x.com, vector {A:1, B:0}", b: "email = b@x.com, vector {A:0, B:1}", merged: "chưa merge", mergedTone: "amber" },
    { title: "So sánh vector", description: "So {A:1,B:0} với {A:0,B:1}: không bên nào ≥ bên kia ở mọi chiều → đây là ghi CONCURRENT thật sự, không phải một ghi đè bản cũ.", a: "{A:1, B:0}", b: "{A:0, B:1}", merged: "không so sánh được ⇒ xung đột thật", mergedTone: "amber" },
    { title: "Kết quả", description: "Thay vì âm thầm chọn một bên, hệ thống giữ CẢ HAI giá trị và trả về cho tầng ứng dụng (hoặc người dùng) tự quyết định — không mất dữ liệu, nhưng cần code xử lý xung đột.", a: "a@x.com", b: "b@x.com", merged: "⚠️ Giữ cả hai, chờ app/user chọn", mergedTone: "amber" },
  ],
  crdt: [
    { title: "Offline", description: "Trường `tags` dùng OR-Set: mỗi lần add gắn kèm ID duy nhất; remove chỉ xoá được add đã thấy.", a: "add(\"vip\", id=x1)", b: "remove(\"new\", biết add(\"new\", id=y1) trước đó)", merged: "chưa merge", mergedTone: "amber" },
    { title: "Merge", description: "Hợp hai tập theo luật OR-Set: union các add còn sống, trừ các remove đã thấy đúng add tương ứng. Thứ tự merge không quan trọng (commutative).", a: "tags: {new(y1), vip(x1)}", b: "tags: {} (đã xoá new)", merged: "union rồi trừ remove đã thấy", mergedTone: "amber" },
    { title: "Kết quả", description: "Kết quả hội tụ đúng mà KHÔNG cần trọng tài: add(\"vip\") không mất vì B không hề biết tới nó; remove(\"new\") vẫn có hiệu lực vì đúng add nó nhắm tới.", a: "vip có mặt", b: "new bị xoá", merged: "✅ {vip} — tự hội tụ, không mất add nào", mergedTone: "green" },
  ],
};

export function ConflictResolutionStrategyDiagram() {
  const [strategy, setStrategy] = useState<Strategy>("lww");
  const events = scenarios[strategy];

  return (
    <div>
      <div className="not-prose -mb-4 flex flex-wrap gap-2">
        {strategies.map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => setStrategy(option.key)}
            className={clsx(
              "rounded-full px-3 py-1.5 text-sm font-medium",
              strategy === option.key ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
      <StepDiagram
        key={strategy}
        title="Replica A và B offline, cùng sửa một record, rồi reconnect"
        viewBox="0 0 720 260"
        steps={events.map((event) => ({ title: event.title, description: event.description }))}
      >
        {(step) => {
          const current = events[step];
          return (
            <>
              <DiagramNode x={20} y={30} width={220} height={70} emoji="💻" label="Replica A" sublabel={current.a} tone="blue" state="active" rounded={10} />
              <DiagramNode x={480} y={30} width={220} height={70} emoji="💻" label="Replica B" sublabel={current.b} tone="violet" state="active" rounded={10} />
              <DiagramArrow from={[130, 100]} to={[300, 160]} tone="blue" animated={step > 0} dimmed={step === 0} />
              <DiagramArrow from={[590, 100]} to={[420, 160]} tone="violet" animated={step > 0} dimmed={step === 0} />
              <DiagramNode
                x={260}
                y={165}
                width={200}
                height={70}
                emoji={current.mergedTone === "green" ? "✅" : current.mergedTone === "rose" ? "❌" : "🔀"}
                label="Merge"
                sublabel={current.merged}
                tone={current.mergedTone}
                state="active"
                rounded={10}
              />
              <DiagramLabel x={360} y={20} text="Mất kết nối giữa A và B" size={12} tone="rose" />
            </>
          );
        }}
      </StepDiagram>
    </div>
  );
}
