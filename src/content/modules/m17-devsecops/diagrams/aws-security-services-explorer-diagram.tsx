"use client";

import { useState } from "react";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import { DiagramArrow, DiagramGroupBox, DiagramNode } from "@/components/diagrams/diagram-shapes";
import type { DiagramTone } from "@/components/diagrams/diagram-tones";

type ServiceKey = "waf" | "guardduty" | "kms" | "securityhub";

interface ServiceInfo {
  label: string;
  emoji: string;
  tone: DiagramTone;
  analogy: string;
  role: string;
  x: number;
  y: number;
}

const services: Record<ServiceKey, ServiceInfo> = {
  waf: {
    label: "WAF",
    emoji: "🚪",
    tone: "blue",
    x: 20,
    y: 40,
    analogy: "Bảo vệ đứng ở cổng chính, chặn khách khả nghi trước khi vào toà nhà.",
    role: "Web Application Firewall: chặn SQL injection, XSS, bot xấu ở lớp HTTP trước khi request tới ALB/CloudFront/API Gateway. Rule managed sẵn (AWS Managed Rules) hoặc tự viết.",
  },
  guardduty: {
    label: "GuardDuty",
    emoji: "📹",
    tone: "amber",
    x: 380,
    y: 40,
    analogy: "Camera an ninh và AI phân tích hành vi lạ khắp toà nhà: phòng nào có người đi lại bất thường lúc 3 giờ sáng.",
    role: "Threat detection dùng machine learning trên CloudTrail, VPC Flow Logs, DNS logs: phát hiện instance quét cổng, IAM credential bị dùng từ IP lạ, truy vấn DNS tới domain độc hại.",
  },
  kms: {
    label: "KMS",
    emoji: "🔑",
    tone: "violet",
    x: 20,
    y: 190,
    analogy: "Két sắt trung tâm giữ chìa khoá — mọi phòng mã hoá dữ liệu đều mượn chìa từ đây, không tự chế chìa riêng.",
    role: "Key Management Service: quản lý encryption key cho S3, EBS, RDS, Secrets Manager. Hỗ trợ key rotation, audit mọi lần dùng key qua CloudTrail.",
  },
  securityhub: {
    label: "Security Hub",
    emoji: "🖥️",
    tone: "green",
    x: 380,
    y: 190,
    analogy: "Phòng điều hành trung tâm nhận báo cáo từ mọi camera, bảo vệ, cảm biến — xếp hạng cái nào cần xử lý trước.",
    role: "Tổng hợp findings từ GuardDuty, Inspector, Config, IAM Access Analyzer, kể cả 3rd-party; chấm điểm theo chuẩn CIS AWS Foundations Benchmark, cho một dashboard tổng.",
  },
};

export function AwsSecurityServicesExplorerDiagram() {
  const [selected, setSelected] = useState<ServiceKey>("guardduty");
  const info = services[selected];

  return (
    <DiagramFrame
      title="4 dịch vụ bảo mật AWS — bấm để xem vai trò"
      viewBox="0 0 720 300"
      controls={
        <div className="space-y-2 text-sm">
          <p className="font-semibold">
            {info.emoji} {info.label}
          </p>
          <p className="leading-relaxed text-stone-700 dark:text-stone-300">{info.analogy}</p>
          <p className="text-stone-600 dark:text-stone-400">{info.role}</p>
        </div>
      }
      caption="4 dịch vụ này bổ trợ nhau: WAF chặn ở biên, GuardDuty phát hiện hành vi lạ bên trong, KMS bảo vệ dữ liệu nghỉ, Security Hub tổng hợp mọi cảnh báo vào một nơi."
    >
      <DiagramGroupBox x={4} y={4} width={712} height={292} label="AWS Account" tone="slate">
        {(Object.keys(services) as ServiceKey[]).map((key) => {
          const service = services[key];
          return (
            <DiagramNode
              key={key}
              x={service.x}
              y={service.y}
              width={300}
              height={90}
              label={service.label}
              emoji={service.emoji}
              tone={service.tone}
              state={selected === key ? "active" : "normal"}
              onClick={() => setSelected(key)}
            />
          );
        })}
        <DiagramArrow from={[320, 85]} to={[380, 85]} tone="rose" dimmed={selected !== "waf" && selected !== "guardduty"} />
        <DiagramArrow from={[170, 130]} to={[170, 186]} tone="violet" dimmed={selected !== "kms"} />
        <DiagramArrow from={[380, 130]} to={[380, 186]} tone="green" dimmed={selected !== "guardduty" && selected !== "securityhub"} animated={selected === "securityhub"} />
        <DiagramArrow from={[320, 235]} to={[380, 235]} tone="green" dimmed={selected !== "securityhub"} />
      </DiagramGroupBox>
    </DiagramFrame>
  );
}
