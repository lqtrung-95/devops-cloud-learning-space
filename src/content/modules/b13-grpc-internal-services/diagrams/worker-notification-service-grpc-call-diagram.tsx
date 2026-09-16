"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramArrow, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";

type Scenario = "up" | "down";

const copy: Record<
  Scenario,
  { title: string; tone: "green" | "rose"; verdict: string }
> = {
  up: {
    title: "notification-service đang sống — SendNotification thành công",
    tone: "green",
    verdict:
      "`worker` ghi `notifications` vào Postgres (vẫn là chủ của bảng này), rồi gọi `client.SendNotification(...)` qua gRPC để notification-service thực hiện phần \"gửi thật\" (side effect gửi đi, không đụng DB). notification-service trả `{ delivered: true }`, job coi như hoàn tất.",
  },
  down: {
    title: "notification-service đang tắt (deploy/crash) — gRPC call thất bại",
    tone: "rose",
    verdict:
      "Bản ghi `notifications` VẪN đã nằm trong Postgres — không mất dữ liệu nghiệp vụ. Nhưng lệnh gọi gRPC ném lỗi `UNAVAILABLE`, job của worker fail và bị BullMQ retry (đã học ở B09). Đây chính là điểm yếu của gọi trực tiếp (request/response): worker phải tự lo retry, và notification vẫn có thể chưa được gửi. B14 sẽ thay bằng outbox + queue để không phụ thuộc notification-service phải luôn online tại đúng thời điểm gọi.",
  },
};

/** Scenario toggle: what happens to the SendNotification gRPC call when notification-service is up vs down. */
export function WorkerNotificationServiceGrpcCallDiagram() {
  const [scenario, setScenario] = useState<Scenario>("up");
  const info = copy[scenario];

  return (
    <div>
      <div className="not-prose -mb-4 flex flex-wrap gap-2">
        {(["up", "down"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setScenario(option)}
            className={clsx(
              "rounded-full px-3 py-1.5 text-sm font-medium",
              scenario === option ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
            )}
          >
            {option === "up" ? "notification-service đang chạy" : "notification-service đang tắt"}
          </button>
        ))}
      </div>
      <DiagramFrame title={info.title} viewBox="0 0 720 300" caption={info.verdict}>
        <DiagramNode x={16} y={110} width={150} height={70} label="worker" sublabel="BullMQ job processor" emoji="🧑‍🍳" tone="blue" state="active" />
        <DiagramNode x={280} y={20} width={160} height={60} label="Postgres" sublabel="INSERT notifications" tone="blue" />
        <DiagramNode
          x={540}
          y={110}
          width={160}
          height={70}
          label="notification-service"
          sublabel={scenario === "up" ? "gRPC server :50051" : "container đã dừng"}
          emoji={scenario === "up" ? "📨" : "💤"}
          tone={scenario === "up" ? "violet" : "slate"}
          dashed={scenario === "down"}
        />

        <DiagramArrow from={[172, 130]} to={[278, 55]} tone="blue" label="1. ghi notification" />
        <DiagramArrow from={[172, 160]} to={[538, 155]} tone={info.tone} animated={scenario === "up"} label="2. gRPC SendNotification()" />

        {scenario === "up" ? (
          <DiagramArrow from={[538, 190]} to={[172, 190]} tone="green" animated label="3. { delivered: true }" />
        ) : (
          <>
            <DiagramArrow from={[538, 190]} to={[172, 190]} tone="rose" label="3. lỗi: UNAVAILABLE" />
            <DiagramLabel x={360} y={250} text="worker.on('failed') → BullMQ retry job này (như B09), không tự ý xoá notification đã ghi." size={11.5} />
          </>
        )}
      </DiagramFrame>
    </div>
  );
}
