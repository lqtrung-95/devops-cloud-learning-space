"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramArrow, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";

type Mode = "async" | "sync";

interface Frame extends DiagramStep {
  primary: "up" | "down" | "zombie";
  replicaRole: "replica" | "promoting" | "primary";
  replicaOrders: string;
  appTarget: "old" | "new";
  result?: { text: string; ok: boolean };
}

const frames: Record<Mode, Frame[]> = {
  async: [
    { title: "Đặt đơn", description: "Khách đặt đơn #1042. Primary ghi WAL, trả `COMMIT OK`, app báo khách 'đặt thành công'.", primary: "up", replicaRole: "replica", replicaOrders: "…1040, 1041", appTarget: "old" },
    { title: "Replica trễ", description: "Async: WAL của #1042 vẫn đang trên đường (lag cỡ 200ms lúc cao điểm). Replica mới có tới #1041.", primary: "up", replicaRole: "replica", replicaOrders: "…1040, 1041", appTarget: "old" },
    { title: "Primary chết", description: "Máy primary mất điện. WAL chứa #1042 nằm trên đĩa của nó, chưa từng tới replica.", primary: "down", replicaRole: "replica", replicaOrders: "…1040, 1041", appTarget: "old" },
    { title: "Promote", description: "Công cụ HA (Patroni, RDS Multi-AZ…) phát hiện qua health check sau vài giây tới vài chục giây, rồi promote replica (`pg_promote()`).", primary: "down", replicaRole: "promoting", replicaOrders: "…1040, 1041", appTarget: "old" },
    { title: "App trỏ sang", description: "App ghi/đọc vào primary mới. Đơn #1042 không tồn tại — dữ liệu đã báo thành công cho khách bị MẤT. Lượng mất ≈ lag lúc sự cố (RPO > 0).", primary: "down", replicaRole: "primary", replicaOrders: "…1040, 1041", appTarget: "new", result: { text: "❌ #1042 mất", ok: false } },
    { title: "Primary cũ sống lại", description: "Nếu primary cũ khởi động lại và vẫn nhận ghi → split brain: hai nơi cùng nhận ghi. Phải fencing (chặn hẳn node cũ) rồi dựng lại nó thành replica bằng `pg_rewind` hoặc `pg_basebackup`.", primary: "zombie", replicaRole: "primary", replicaOrders: "…1040, 1041, 1043", appTarget: "new", result: { text: "⚠️ cần fencing", ok: false } },
  ],
  sync: [
    { title: "Đặt đơn", description: "Khách đặt đơn #1042. Primary ghi WAL rồi ĐỢI replica sync xác nhận flush.", primary: "up", replicaRole: "replica", replicaOrders: "…1041, 1042", appTarget: "old" },
    { title: "Replica xác nhận", description: "Replica đã flush WAL của #1042 xuống đĩa → lúc này primary mới trả `COMMIT OK` cho app.", primary: "up", replicaRole: "replica", replicaOrders: "…1041, 1042", appTarget: "old" },
    { title: "Primary chết", description: "Primary mất điện, giống hệt kịch bản async.", primary: "down", replicaRole: "replica", replicaOrders: "…1041, 1042", appTarget: "old" },
    { title: "Promote", description: "Replica được promote. Nó replay nốt WAL đã flush trước khi nhận ghi.", primary: "down", replicaRole: "promoting", replicaOrders: "…1041, 1042", appTarget: "old" },
    { title: "App trỏ sang", description: "Đơn #1042 còn nguyên: mọi commit đã báo OK đều có trên replica sync (RPO = 0). Transaction đang dở dang lúc sự cố vẫn thất bại — client cần retry an toàn.", primary: "down", replicaRole: "primary", replicaOrders: "…1041, 1042", appTarget: "new", result: { text: "✅ #1042 còn", ok: true } },
    { title: "Cái giá", description: "Mỗi lần ghi thêm một round trip; nếu replica sync duy nhất chết hoặc chậm, ghi trên primary bị treo. Vì thế thường chạy ≥2 replica với `ANY 1 (r1, r2)`.", primary: "down", replicaRole: "primary", replicaOrders: "…1041, 1042", appTarget: "new", result: { text: "💸 +latency ghi", ok: true } },
  ],
};

export function AsyncFailoverDataLossDiagram() {
  const [mode, setMode] = useState<Mode>("async");
  const steps = frames[mode];

  return (
    <div>
      <div className="not-prose -mb-4 flex flex-wrap gap-2">
        {(["async", "sync"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setMode(option)}
            className={clsx(
              "rounded-full px-3 py-1.5 text-sm font-medium",
              mode === option ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
            )}
          >
            {option === "async" ? "Failover với async replica" : "Failover với sync replica"}
          </button>
        ))}
      </div>
      <StepDiagram key={mode} title="Primary chết giữa giờ cao điểm — mất gì?" viewBox="0 0 720 320" steps={steps}>
        {(step) => {
          const frame = steps[step];
          const primaryDown = frame.primary !== "up";
          return (
            <>
              <DiagramNode x={20} y={128} width={150} height={64} label="🧑‍💻 app" sublabel="đặt đơn #1042" tone="violet" />
              <DiagramNode
                x={300}
                y={24}
                width={220}
                height={84}
                label={frame.primary === "zombie" ? "🧟 Primary cũ" : primaryDown ? "💥 Primary (chết)" : "🗄️ Primary"}
                sublabel="đơn: …1041, 1042"
                tone={frame.primary === "up" ? "blue" : "rose"}
                state={frame.primary === "down" ? "dimmed" : step === 2 ? "active" : "normal"}
                dashed={frame.primary === "zombie"}
              />
              <DiagramNode
                x={300}
                y={212}
                width={220}
                height={84}
                label={frame.replicaRole === "primary" ? "👑 Primary mới" : frame.replicaRole === "promoting" ? "⏫ Đang promote" : "📚 Replica"}
                sublabel={`đơn: ${frame.replicaOrders}`}
                tone={frame.replicaRole === "replica" ? "slate" : "green"}
                state={frame.replicaRole === "promoting" ? "active" : "normal"}
              />

              <DiagramArrow from={[172, 150]} to={[296, 72]} label="ghi" tone="violet" animated={frame.appTarget === "old" && !primaryDown} dimmed={frame.appTarget !== "old" || primaryDown} />
              <DiagramArrow from={[172, 172]} to={[296, 250]} label="ghi" tone="green" animated={frame.appTarget === "new"} dimmed={frame.appTarget !== "new"} />
              <DiagramArrow
                from={[410, 110]}
                to={[410, 208]}
                label={mode === "async" ? "WAL (async, trễ)" : "WAL + chờ flush"}
                tone={mode === "async" ? "amber" : "blue"}
                animated={!primaryDown}
                dimmed={primaryDown}
              />

              <DiagramLabel x={625} y={60} text={mode === "async" ? "OK trước, chép sau" : "chép xong mới OK"} tone={mode === "async" ? "amber" : "blue"} bold />
              <DiagramLabel x={625} y={82} text={mode === "async" ? "RPO > 0" : "RPO = 0"} size={12} />
              {frame.result && (
                <DiagramNode x={550} y={220} width={160} height={64} label={frame.result.text} sublabel="sau failover" tone={frame.result.ok ? "green" : "rose"} state="active" />
              )}
            </>
          );
        }}
      </StepDiagram>
    </div>
  );
}
