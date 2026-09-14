"use client";

import { DiagramArrow, DiagramGroupBox, DiagramNode } from "@/components/diagrams/diagram-shapes";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";

const steps: DiagramStep[] = [
  {
    title: "Nguồn dữ liệu",
    description: "EC2/RDS/ALB/Lambda tự động gửi metric (CPUUtilization, DatabaseConnections, Latency...) vào CloudWatch mỗi 1–5 phút. App của bạn cũng có thể gửi log và custom metric.",
  },
  {
    title: "Metric lưu theo thời gian",
    description: "CloudWatch lưu metric dạng time series. Bạn xem trên dashboard, hoặc query bằng CloudWatch Logs Insights nếu là log.",
  },
  {
    title: "Alarm theo dõi ngưỡng",
    description: "Một CloudWatch Alarm gắn vào 1 metric, vd `CPUUtilization > 80% trong 3 chu kỳ liên tiếp (15 phút)`. Alarm có 3 trạng thái: OK, ALARM, INSUFFICIENT_DATA.",
  },
  {
    title: "Vượt ngưỡng → chuyển ALARM",
    description: "CPU vượt 80% đủ lâu, alarm chuyển từ OK sang ALARM. Đây là lúc hệ thống 'biết' có vấn đề — trước khi user kịp phàn nàn.",
  },
  {
    title: "Hành động tự động",
    description: "Alarm gọi SNS topic → vừa gửi email/Slack cho on-call, vừa có thể trigger Auto Scaling policy để thêm instance. Không cần người thức dậy mới xử lý được sự cố tải cao.",
  },
];

export function CloudwatchMetricsAlarmFlowDiagram() {
  return (
    <StepDiagram title="Từ metric tới hành động tự động" viewBox="0 0 720 260" steps={steps}>
      {(step) => (
        <>
          <DiagramGroupBox x={20} y={20} width={220} height={100} label="Nguồn" tone="slate" />
          <DiagramNode x={35} y={50} width={190} height={54} label="EC2 / RDS / ALB / Lambda" sublabel="metric mỗi 1–5 phút" emoji="📊" tone="slate" state={step === 0 ? "active" : "normal"} />

          <DiagramNode x={280} y={35} width={170} height={80} label="CloudWatch" sublabel={step === 2 ? "Alarm: theo dõi" : "Metrics · Logs"} emoji="📈" tone="blue" state={[1, 2].includes(step) ? "active" : "normal"} />

          <DiagramNode
            x={280}
            y={150}
            width={170}
            height={70}
            label={step >= 3 ? "🚨 ALARM" : "✅ OK"}
            sublabel="CPUUtilization > 80%"
            tone={step >= 3 ? "rose" : "green"}
            state={step >= 3 ? "active" : "normal"}
          />

          <DiagramNode x={500} y={35} width={190} height={70} label="SNS → Email/Slack" sublabel="báo on-call" emoji="📣" tone="amber" state={step === 4 ? "active" : "dimmed"} />
          <DiagramNode x={500} y={150} width={190} height={70} label="Auto Scaling" sublabel="thêm instance" emoji="⚙️" tone="green" state={step === 4 ? "active" : "dimmed"} />

          {step >= 1 && <DiagramArrow from={[226, 77]} to={[276, 70]} tone="slate" animated={step === 1} />}
          {step >= 2 && <DiagramArrow from={[365, 116]} to={[365, 146]} tone="blue" label="theo dõi" animated={step === 2} />}
          {step >= 4 && (
            <>
              <DiagramArrow from={[451, 170]} to={[496, 70]} tone="amber" animated label="notify" />
              <DiagramArrow from={[451, 195]} to={[496, 185]} tone="green" animated label="scale-out" />
            </>
          )}
        </>
      )}
    </StepDiagram>
  );
}
