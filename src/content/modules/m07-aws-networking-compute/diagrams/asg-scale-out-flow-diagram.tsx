"use client";

import { DiagramArrow, DiagramGroupBox, DiagramNode } from "@/components/diagrams/diagram-shapes";
import type { DiagramTone } from "@/components/diagrams/diagram-tones";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";

type InstanceState = "in-service" | "pending" | "warming" | "terminating" | "empty";

interface ScaleSnapshot {
  cpu: number;
  desired: number;
  alarm: boolean;
  instances: InstanceState[];
}

const steps: (DiagramStep & ScaleSnapshot)[] = [
  { title: "Bình thường", cpu: 35, desired: 2, alarm: false, instances: ["in-service", "in-service", "empty", "empty"], description: "ASG `web-asg`: min 2 / desired 2 / max 6, trải 2 AZ. Target tracking policy giữ CPU trung bình quanh 50%." },
  { title: "Tải tăng", cpu: 82, desired: 2, alarm: false, instances: ["in-service", "in-service", "empty", "empty"], description: "Load test bằng k6 đẩy nhiều request qua ALB. CPU trung bình của ASG lên 82% — CloudWatch nhận metric này." },
  { title: "Alarm kích hoạt", cpu: 82, desired: 2, alarm: true, instances: ["in-service", "in-service", "empty", "empty"], description: "CloudWatch alarm (do target tracking tự tạo) chuyển sang ALARM sau vài chu kỳ vượt ngưỡng. Policy ước lượng cần khoảng 2 × 82/50 ≈ 3,3 máy → làm tròn lên desired = 4." },
  { title: "Launch instance", cpu: 80, desired: 4, alarm: true, instances: ["in-service", "in-service", "pending", "pending"], description: "ASG đặt desired = 4 và tạo 2 instance từ launch template, chia đều cho các AZ (AZ rebalancing)." },
  { title: "Khởi động", cpu: 76, desired: 4, alarm: true, instances: ["in-service", "in-service", "warming", "warming"], description: "User data cài app; instance đăng ký vào target group. Health check grace period / instance warmup giúp ASG không vội đánh giá instance mới." },
  { title: "Nhận traffic", cpu: 45, desired: 4, alarm: false, instances: ["in-service", "in-service", "in-service", "in-service"], description: "Target group báo healthy → ALB chia tải cho 4 instance. CPU trung bình về 45%, alarm trở lại OK." },
  { title: "Scale-in", cpu: 20, desired: 2, alarm: false, instances: ["in-service", "in-service", "terminating", "terminating"], description: "Hết load test, CPU thấp kéo dài. Target tracking scale-in thận trọng hơn scale-out; ASG deregister (connection draining) rồi terminate 2 instance, vẫn giữ cân bằng AZ và không xuống dưới min." },
];

const stateView: Record<InstanceState, { sublabel: string; tone: DiagramTone; dimmed: boolean }> = {
  "in-service": { sublabel: "InService", tone: "green", dimmed: false },
  pending: { sublabel: "Pending", tone: "amber", dimmed: false },
  warming: { sublabel: "đang warm-up", tone: "amber", dimmed: false },
  terminating: { sublabel: "Terminating", tone: "rose", dimmed: true },
  empty: { sublabel: "(trống)", tone: "slate", dimmed: true },
};

export function AsgScaleOutFlowDiagram() {
  return (
    <StepDiagram title="Auto Scaling Group scale-out rồi scale-in" viewBox="0 0 720 310" steps={steps} autoPlayMs={3000}>
      {(step) => {
        const snapshot = steps[step];
        const cpuTone: DiagramTone = snapshot.cpu > 60 ? "rose" : snapshot.cpu < 30 ? "cyan" : "green";
        return (
          <>
            <DiagramNode x={10} y={20} width={180} height={76} label="📈 CloudWatch" sublabel={`CPU trung bình ${snapshot.cpu}%`} tone={cpuTone} state={step === 1 ? "active" : "normal"} />
            <DiagramArrow from={[100, 98]} to={[100, 136]} tone={snapshot.alarm ? "rose" : "slate"} animated={snapshot.alarm} />
            <DiagramNode
              x={10}
              y={140}
              width={180}
              height={76}
              label="🎯 Target tracking"
              sublabel={snapshot.alarm ? "ALARM → tăng desired" : "OK · mục tiêu 50%"}
              tone={snapshot.alarm ? "rose" : "blue"}
              state={step === 2 ? "active" : "normal"}
            />
            <DiagramArrow from={[192, 178]} to={[216, 150]} tone={snapshot.alarm ? "rose" : "slate"} animated={step === 2 || step === 3} />

            <DiagramGroupBox x={220} y={10} width={490} height={210} label={`web-asg · min 2 / desired ${snapshot.desired} / max 6`} tone="blue" />
            {snapshot.instances.map((instanceState, index) => {
              const view = stateView[instanceState];
              return (
                <DiagramNode
                  key={index}
                  x={236 + index * 118}
                  y={64}
                  width={106}
                  height={84}
                  label={instanceState === "empty" ? "·" : `🖥️ web-${index + 1}`}
                  sublabel={`${index % 2 === 0 ? "AZ a" : "AZ b"} · ${view.sublabel}`}
                  tone={view.tone}
                  state={view.dimmed ? "dimmed" : [3, 4].includes(step) && index >= 2 ? "active" : "normal"}
                  dashed={instanceState === "empty"}
                />
              );
            })}
            <DiagramNode x={236} y={166} width={458} height={40} rounded={8} label="📋 Launch template: AMI · t3.small · SG · instance profile · user data" tone="slate" state={step === 3 ? "active" : "dimmed"} />

            <DiagramNode x={330} y={246} width={280} height={54} label="⚖️ ALB → target group" sublabel={`${snapshot.instances.filter((item) => item === "in-service").length} target healthy nhận traffic`} tone="violet" state={step === 5 ? "active" : "normal"} />
            <DiagramArrow from={[470, 244]} to={[470, 222]} tone="violet" animated={step >= 5} bidirectional />
          </>
        );
      }}
    </StepDiagram>
  );
}
