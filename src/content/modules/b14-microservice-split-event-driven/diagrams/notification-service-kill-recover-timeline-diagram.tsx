"use client";

import { DiagramArrow, DiagramGroupBox, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";

const steps: DiagramStep[] = [
  {
    title: "t=0s khoẻ mạnh",
    description: "`notification-service` chạy bình thường. Relay poll `outbox`, thấy trống hoặc gửi ngay các dòng mới — `published_at` được cập nhật gần như tức thời.",
  },
  {
    title: "t=5s kill service",
    description: "`docker compose stop notification-service`. Service có DB/read model riêng của nó (không chia sẻ Postgres với `taskflow-api`) — việc nó chết không ảnh hưởng gì tới khả năng ghi comment của `api`.",
  },
  {
    title: "t=5–30s vẫn có traffic",
    description: "User tiếp tục tạo comment. Mỗi lần, `api` vẫn insert `comments` + `outbox` thành công (transaction chỉ chạm Postgres của `taskflow-api`). Relay cố gọi gRPC, thất bại, để nguyên `published_at = NULL` và thử lại ở lần poll sau — outbox tích tụ các dòng chưa gửi.",
  },
  {
    title: "t=30s bật lại",
    description: "`docker compose start notification-service`. Service khởi động lại với dữ liệu/trạng thái riêng của nó — không cần đồng bộ gì với `taskflow-api` vì trước giờ nó chưa từng đọc thẳng Postgres của `api`.",
  },
  {
    title: "t=30–36s drain hết",
    description: "Vài chu kỳ poll tiếp theo (mỗi ~2s), relay lần lượt gọi lại đúng những dòng còn `published_at = NULL`, theo thứ tự `id ASC`. Từng dòng thành công thì được đánh dấu ngay.",
  },
  {
    title: "Kết quả: 0 mất · rủi ro duplicate còn sót",
    description:
      "Mọi dòng `outbox` tạo trong lúc down cuối cùng đều có `published_at`. Trong vận hành bình thường mỗi dòng chỉ gửi đúng 1 lần — nhưng nếu relay crash đúng giữa lúc gọi thành công và lúc `UPDATE published_at`, dòng đó có thể bị gửi lại lần nữa ở lần poll sau. Đây là rủi ro at-least-once đã biết, không phải bug.",
  },
];

export function NotificationServiceKillRecoverTimelineDiagram() {
  return (
    <StepDiagram title="Kill & recover: notification-service down 30 giây giữa lúc có traffic" viewBox="0 0 720 320" steps={steps}>
      {(step) => (
        <>
          <DiagramLabel x={20} y={16} text="thời gian →" anchor="start" size={11} />
          <DiagramArrow from={[20, 26]} to={[700, 26]} tone="slate" dimmed />

          <DiagramGroupBox x={16} y={40} width={220} height={110} label="taskflow-api (Postgres riêng)" tone="blue">
            <DiagramNode x={30} y={64} width={190} height={35} label="comments + outbox" sublabel="luôn ghi được" tone="blue" state={step >= 2 ? "active" : "normal"} />
            <DiagramNode x={30} y={105} width={190} height={35} label={`outbox chưa gửi: ${step === 0 ? "0" : step <= 2 ? "tăng dần" : step <= 4 ? "giảm dần" : "0"}`} tone="amber" state={step >= 2 && step <= 4 ? "active" : "dimmed"} />
          </DiagramGroupBox>

          <DiagramNode x={280} y={70} width={150} height={55} label="🚚 relay" sublabel="poll ~2s/lần" tone="amber" state={step === 4 ? "active" : "normal"} />

          <DiagramGroupBox x={470} y={40} width={230} height={110} label="notification-service (DB riêng)" tone={step === 1 || step === 2 ? "rose" : "green"}>
            <DiagramNode
              x={485}
              y={70}
              width={200}
              height={60}
              label={step === 0 ? "🟢 đang chạy" : step === 1 || step === 2 ? "🔴 đã tắt (stop)" : step === 3 ? "🟡 vừa start lại" : "🟢 đang chạy, đang nhận bù"}
              sublabel="read model riêng, không đọc Postgres của api"
              tone={step === 1 || step === 2 ? "rose" : "green"}
              state="active"
            />
          </DiagramGroupBox>

          <DiagramArrow from={[236, 90]} to={[278, 90]} tone="blue" dimmed={step < 2} animated={step >= 2 && step <= 4} label="SELECT WHERE published_at IS NULL" />
          <DiagramArrow
            from={[430, 95]}
            to={[468, 95]}
            tone={step === 1 || step === 2 ? "rose" : "green"}
            dimmed={step === 0}
            animated={step >= 3}
            label={step === 1 || step === 2 ? "gọi thất bại, thử lại sau" : "SendNotification OK"}
          />

          <DiagramNode x={220} y={220} width={280} height={70} label="Kết quả cuối" sublabel={step === 5 ? "0 dòng outbox còn NULL — không mất" : "đang chờ drain..."} tone={step === 5 ? "green" : "slate"} state={step === 5 ? "active" : "dimmed"} dashed={step !== 5} />
        </>
      )}
    </StepDiagram>
  );
}
