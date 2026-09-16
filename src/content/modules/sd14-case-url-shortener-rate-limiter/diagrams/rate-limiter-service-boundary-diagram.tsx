"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import { DiagramArrow, DiagramGroupBox, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";

type Policy = "fail-open" | "fail-closed";

const policyNote: Record<Policy, string> = {
  "fail-open":
    "Fail-open: nếu Rate limiter service không trả lời kịp (down, timeout), Shorten service coi như CHO QUA — vẫn nhận request tạo link. Ưu tiên vẫn phục vụ được user thật khi hạ tầng phụ trợ gặp sự cố, đổi lại mất bảo vệ đúng lúc rủi ro cao nhất (limiter down thường vì đang bị tấn công/quá tải).",
  "fail-closed":
    "Fail-closed: nếu Rate limiter service không trả lời kịp, Shorten service TỪ CHỐI request (503). An toàn tuyệt đối cho hệ thống phía sau, nhưng một sự cố ở service dùng chung này giờ làm sập luôn khả năng tạo link — một single point of failure ảnh hưởng tới tất cả ~50 service dùng chung nó.",
};

export function RateLimiterServiceBoundaryDiagram() {
  const [policy, setPolicy] = useState<Policy>("fail-open");
  const [limiterDown, setLimiterDown] = useState(false);

  const blocked = limiterDown && policy === "fail-closed";
  const admitted = !limiterDown || policy === "fail-open";

  return (
    <DiagramFrame
      title="Rate limiter như một service dùng chung — đặt ở biên nào, và điều gì xảy ra khi nó sập"
      viewBox="0 0 720 300"
      controls={
        <div className="space-y-3 text-sm">
          <div className="flex flex-wrap gap-4">
            <div className="flex gap-2">
              <span className="self-center text-xs font-semibold text-stone-500">Chính sách:</span>
              {(["fail-open", "fail-closed"] as Policy[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setPolicy(key)}
                  className={clsx(
                    "rounded-full px-3 py-1.5 font-medium",
                    policy === key ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
                  )}
                >
                  {key}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 self-center text-sm font-medium">
              <input type="checkbox" checked={limiterDown} onChange={(event) => setLimiterDown(event.target.checked)} className="size-4 accent-indigo-600" />
              Rate limiter service đang down
            </label>
          </div>
          <p className="text-stone-700 dark:text-stone-300">{policyNote[policy]}</p>
        </div>
      }
      caption="Rate limiter tách thành service riêng (không nhúng vào từng service) để ~50 service nội bộ dùng chung một chỗ định nghĩa luật — nhưng đổi lại thêm một network hop và một điểm có thể sập."
    >
      <DiagramNode x={20} y={110} width={100} height={60} label="Client" emoji="🧑" tone="slate" />
      <DiagramArrow from={[120, 140]} to={[170, 140]} />
      <DiagramNode x={170} y={110} width={130} height={60} label="Shorten service" sublabel="POST /api/shorten" emoji="🔗" tone="blue" />

      <DiagramGroupBox x={340} y={20} width={200} height={260} label="Rate limiter service (chung ~50 service)" tone="violet">
        <DiagramNode
          x={365}
          y={70}
          width={150}
          height={60}
          label="Redis"
          sublabel="token bucket theo IP"
          emoji={limiterDown ? "💥" : "🪣"}
          tone={limiterDown ? "rose" : "green"}
          state={limiterDown ? "active" : "normal"}
        />
        <DiagramLabel x={440} y={180} text="check(ip, limit)" size={11.5} />
      </DiagramGroupBox>

      <DiagramArrow
        from={[300, 130]}
        to={[365, 100]}
        tone={limiterDown ? "rose" : "slate"}
        label={limiterDown ? "timeout" : "check"}
      />
      <DiagramArrow
        from={[365, 115]}
        to={[300, 145]}
        tone={admitted ? "green" : "rose"}
        curve={20}
        label={admitted ? "cho qua" : "429/503"}
      />

      <DiagramNode
        x={580}
        y={110}
        width={110}
        height={60}
        label={blocked ? "Từ chối" : "Tạo link"}
        emoji={blocked ? "🚫" : "✅"}
        tone={blocked ? "rose" : "green"}
        state="active"
      />
      <DiagramArrow from={[300, 130]} to={[580, blocked ? 130 : 130]} tone={blocked ? "rose" : "green"} curve={-40} dimmed={false} />
    </DiagramFrame>
  );
}
