"use client";

import { DiagramArrow, DiagramLabel, DiagramNode, MovingPacket } from "@/components/diagrams/diagram-shapes";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";

const steps: DiagramStep[] = [
  { title: "Chọn AMI", description: "AMI là 'khuôn đúc' máy: OS + phần mềm cài sẵn. Lấy AMI Amazon Linux 2023 mới nhất qua SSM Parameter `/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64`." },
  { title: "Loại máy & mạng", description: "Chọn instance type (vd `t3.small`), đặt vào PRIVATE subnet, Security Group không mở cổng 22. Bật IMDSv2 (`HttpTokens=required`)." },
  { title: "Gắn role", description: "Instance profile mang role có policy `AmazonSSMManagedInstanceCore`. Credential tạm thời được cấp qua metadata service — không có key nào trên máy." },
  { title: "Boot + EBS", description: "Instance khởi động từ EBS root volume (vd gp3). EBS nằm trong MỘT AZ, sống độc lập với instance (tuỳ `DeleteOnTermination`)." },
  { title: "User data", description: "cloud-init chạy script user data bằng quyền root ở LẦN BOOT ĐẦU: cài nginx, kéo code, bật service. Log ở `/var/log/cloud-init-output.log`." },
  { title: "SSM Agent đăng ký", description: "SSM Agent (có sẵn trên Amazon Linux 2023) gọi RA endpoint Systems Manager qua HTTPS 443 — qua NAT Gateway hoặc VPC interface endpoint. Không cần kết nối chiều vào." },
  { title: "Mở phiên", description: "Laptop chạy `aws ssm start-session --target i-0abc...`. IAM kiểm tra quyền, phiên đi qua kênh agent đã mở sẵn. Không port 22, không SSH key, có log audit." },
];

export function Ec2LaunchToSsmSessionDiagram() {
  return (
    <StepDiagram title="Từ AMI tới phiên SSM Session Manager (không mở port 22)" viewBox="0 0 720 300" steps={steps}>
      {(step) => {
        const ec2Sublabel = step === 0 ? "đang tạo…" : step < 3 ? "t3.small · private subnet" : step < 5 ? "running · cloud-init" : "running · SSM Online";
        return (
          <>
            <DiagramNode x={10} y={20} width={170} height={70} label="💿 AMI" sublabel="al2023 x86_64" tone="violet" state={step === 0 ? "active" : "normal"} />
            <DiagramNode x={10} y={120} width={170} height={80} label="📜 User data" sublabel="#!/bin/bash · lần boot đầu" tone="amber" state={step === 4 ? "active" : step < 4 ? "dimmed" : "normal"} />
            <DiagramNode x={270} y={16} width={180} height={64} label="🎭 Instance profile" sublabel="role: SSM core" tone="green" state={step === 2 ? "active" : step < 2 ? "dimmed" : "normal"} />
            <DiagramNode x={270} y={112} width={180} height={92} label="🖥️ EC2" sublabel={ec2Sublabel} tone="blue" state={step === 1 ? "active" : "normal"} />
            <DiagramNode x={270} y={232} width={180} height={56} label="💾 EBS gp3" sublabel="root volume · 1 AZ" tone="cyan" state={step === 3 ? "active" : step < 3 ? "dimmed" : "normal"} />
            <DiagramNode x={540} y={20} width={170} height={76} label="☁️ Systems Manager" sublabel="ssm · ssmmessages" tone="slate" state={step === 5 ? "active" : step < 5 ? "dimmed" : "normal"} />
            <DiagramNode x={540} y={200} width={170} height={80} label="💻 Laptop" sublabel="aws ssm start-session" tone="violet" state={step === 6 ? "active" : step < 6 ? "dimmed" : "normal"} />

            <DiagramArrow from={[182, 55]} to={[266, 140]} tone="violet" dimmed={step !== 0} animated={step === 0} label="khuôn" />
            <DiagramArrow from={[360, 82]} to={[360, 108]} tone="green" dimmed={step < 2} animated={step === 2} />
            <DiagramArrow from={[360, 228]} to={[360, 208]} tone="cyan" dimmed={step < 3} animated={step === 3} />
            <DiagramArrow from={[182, 160]} to={[266, 160]} tone="amber" dimmed={step < 4} animated={step === 4} />
            <DiagramArrow from={[452, 130]} to={[536, 70]} tone="slate" dimmed={step < 5} animated={step >= 5} label="HTTPS 443 ra" />
            {step === 6 && (
              <>
                <DiagramArrow from={[625, 196]} to={[625, 100]} tone="violet" animated label="IAM ✓" />
                <MovingPacket key="session" path="M 625 196 L 625 100 L 452 150" durationSeconds={2} tone="violet" label="shell" />
                <DiagramLabel x={186} y={222} text="🚫 SG: port 22 đóng" anchor="start" size={11} tone="rose" bold />
              </>
            )}
          </>
        );
      }}
    </StepDiagram>
  );
}

