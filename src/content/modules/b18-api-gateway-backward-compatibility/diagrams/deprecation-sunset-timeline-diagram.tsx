"use client";

import { DiagramArrow, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";
import { StepDiagram } from "@/components/diagrams/step-diagram";

const steps = [
  {
    title: "Trước B18",
    description: "`v1` chạy bình thường, không có header cảnh báo nào. Client không biết `v2` sắp tồn tại.",
  },
  {
    title: "B18 ship: Deprecation xuất hiện",
    description:
      "Mọi response `v1` giờ có thêm header `Deprecation: Tue, 01 Sep 2026 00:00:00 GMT`. Hành vi và dữ liệu KHÔNG đổi — đây chỉ là lời cảnh báo, chưa phải hành động.",
  },
  {
    title: "Vùng đệm ~6 tháng",
    description:
      "Client cũ tiếp tục hoạt động bình thường trong lúc đội phát triển của họ đọc header, thấy `Sunset`, và lên kế hoạch migrate sang `v2`. Đây là khoảng thời gian header tồn tại để bảo vệ.",
  },
  {
    title: "Sunset đến: gỡ v1",
    description:
      "Đến đúng ngày ghi trong `Sunset: Mon, 01 Mar 2027 00:00:00 GMT`, `v1` mới thực sự bị gỡ. Client nào chưa migrate tới lúc này mới bị ảnh hưởng — không phải bất ngờ.",
  },
];

const markers = [
  { x: 70, label: "Hôm nay", sub: "v1 chạy bình thường" },
  { x: 260, label: "Deprecation", sub: "01/09/2026" },
  { x: 450, label: "Vùng đệm", sub: "client migrate dần" },
  { x: 640, label: "Sunset", sub: "01/03/2027 — gỡ v1" },
];

/** Timeline walkthrough: Deprecation fires well before Sunset, giving clients a real migration window. */
export function DeprecationSunsetTimelineDiagram() {
  return (
    <StepDiagram title="Deprecation báo trước, Sunset mới thật sự gỡ" viewBox="0 0 720 220" steps={steps}>
      {(step) => (
        <>
          <DiagramArrow from={[40, 130]} to={[680, 130]} tone="slate" />
          {markers.map((marker, index) => {
            const state: "normal" | "active" | "dimmed" = index < step ? "dimmed" : index === step ? "active" : "normal";
            const tone = index === step ? (index === 3 ? "rose" : index === 1 ? "amber" : "blue") : "slate";
            return (
              <DiagramNode
                key={marker.label}
                x={marker.x - 60}
                y={100}
                width={120}
                height={60}
                label={marker.label}
                sublabel={marker.sub}
                tone={tone}
                state={state}
              />
            );
          })}
          {step >= 1 && (
            <DiagramLabel x={260} y={80} text="Deprecation header" tone="amber" bold />
          )}
          {step >= 3 && <DiagramLabel x={640} y={80} text="v1 đã bị gỡ" tone="rose" bold />}
          {step === 2 && (
            <DiagramArrow from={[260, 165]} to={[640, 165]} tone="green" curve={30} label="6 tháng để migrate" />
          )}
        </>
      )}
    </StepDiagram>
  );
}
