"use client";

import { DiagramArrow, DiagramLabel, DiagramNode, MovingPacket } from "@/components/diagrams/diagram-shapes";
import { diagramToneClasses } from "@/components/diagrams/diagram-tones";
import { StepDiagram } from "@/components/diagrams/step-diagram";

/** Drivers scattered around the rider; "found" marks who gets matched once the radius reaches them. */
const DRIVERS = [
  { id: "d1", x: 260, y: 120, distance: 1.6 },
  { id: "d2", x: 470, y: 260, distance: 1.8, found: true },
  { id: "d3", x: 150, y: 220, distance: 2.6 },
  { id: "d4", x: 560, y: 90, distance: 3.1 },
];

const RIDER = { x: 360, y: 175 };

const steps = [
  {
    title: "Rider gửi yêu cầu",
    description: "Rider mở app tại vị trí (x, y). Matching service query index geospatial (bài trước) với bán kính mặc định r₁ = 1km để tìm tài xế rảnh gần nhất.",
    radius: 60,
  },
  {
    title: "Bán kính 1km: 0 tài xế rảnh",
    description: "Khu vực thưa tài xế — không ai trong 1km. Server chờ hết timeout ngắn (vài giây) thay vì trả lỗi ngay, vì tài xế liên tục di chuyển và có thể vừa vào vùng.",
    radius: 60,
  },
  {
    title: "Hết timeout → mở rộng bán kính",
    description: "Không tìm được thì tăng r lên r₂ = 2km và query lại index. Vị trí tài xế đã được cập nhật bằng ping GPS mới nhất (mỗi ~4 giây) nên kết quả phản ánh đúng hiện tại, không phải vị trí cũ.",
    radius: 130,
  },
  {
    title: "Tìm thấy tài xế, gửi lời mời",
    description: "d2 cách 1.8km lọt vào bán kính mới. Server gửi offer cho d2 (và có thể vài ứng viên khác) với thời hạn chấp nhận ngắn (~10s) — chỉ một tài xế được gán, tránh hai rider cùng nhận một tài xế bằng cùng kỹ thuật khoá có điều kiện ở bài Booking.",
    radius: 130,
  },
  {
    title: "Trip bắt đầu: vị trí update tần suất cao",
    description: "Sau khi khớp, app tài xế đẩy vị trí mỗi 2–4 giây qua WebSocket/MQTT để rider thấy xe di chuyển real-time. Ghi đè vị trí mới nhất (Redis GEO/in-memory) thay vì lưu mọi điểm vào DB chính — lịch sử đầy đủ (nếu cần) đẩy sang pipeline riêng, không chặn đường ghi nóng.",
    radius: 130,
  },
];

export function DriverMatchingRadiusDiagram() {
  return (
    <StepDiagram title="Matching tài xế: mở rộng bán kính khi chưa tìm thấy" viewBox="0 0 720 320" steps={steps}>
      {(step) => {
        const current = steps[step];
        const matched = step >= 3;
        return (
          <>
            <circle
              cx={RIDER.x}
              cy={RIDER.y}
              r={current.radius}
              fill="none"
              className={diagramToneClasses.cyan.stroke}
              strokeWidth={2}
              strokeDasharray="6 4"
            />
            <DiagramLabel x={RIDER.x} y={RIDER.y - current.radius - 10} text={step < 2 ? "r₁ = 1km" : "r₂ = 2km"} size={11} tone="cyan" />
            <DiagramNode x={RIDER.x - 30} y={RIDER.y - 24} width={60} height={48} label="Rider" emoji="🧍" tone="blue" state="active" rounded={24} />
            {DRIVERS.map((d) => {
              const withinRadius = d.distance * 60 <= current.radius;
              const isMatched = matched && d.found;
              return (
                <g key={d.id}>
                  <DiagramNode
                    x={d.x - 34}
                    y={d.y - 20}
                    width={68}
                    height={40}
                    label={`${d.id} · ${d.distance}km`}
                    emoji="🚗"
                    tone={isMatched ? "green" : withinRadius ? "amber" : "slate"}
                    state={isMatched ? "active" : withinRadius ? "normal" : "dimmed"}
                  />
                  {isMatched && step === 3 && (
                    <DiagramArrow from={[d.x, d.y]} to={[RIDER.x + 20, RIDER.y - 10]} tone="green" animated label="offer" />
                  )}
                  {isMatched && step === 4 && (
                    <MovingPacket key={`ping-${step}`} path={`M ${d.x} ${d.y} L ${RIDER.x} ${RIDER.y}`} tone="green" label="vị trí" durationSeconds={2.5} />
                  )}
                </g>
              );
            })}
            {step === 4 && <DiagramLabel x={360} y={300} text="Ghi đè vị trí mới nhất — không phải log mọi điểm vào DB chính" size={12} tone="green" bold />}
          </>
        );
      }}
    </StepDiagram>
  );
}
