"use client";

import { DiagramArrow, DiagramGroupBox, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";

const steps: DiagramStep[] = [
  { title: "Bạn tạo Ingress", description: "`kubectl apply` một Ingress `host: shop.example.com` với annotation `alb.ingress.kubernetes.io/scheme: internet-facing`. Chỉ là một object YAML — chưa có gì ngoài internet biết tới nó." },
  { title: "ALB Controller tạo ALB", description: "AWS Load Balancer Controller (watch API server) thấy Ingress mới, gọi AWS API tạo một **Application Load Balancer** thật trong subnet có tag `kubernetes.io/role/elb`, và đăng ký target là IP của các pod (`target-type: ip`)." },
  { title: "ExternalDNS tạo bản ghi", description: "ExternalDNS cũng watch Ingress, thấy `host: shop.example.com`, tự tạo bản ghi **A/ALIAS** trong Route 53 trỏ về DNS name của ALB. Không ai phải vào console tự thêm DNS." },
  { title: "cert-manager xin chứng chỉ", description: "cert-manager thấy `tls.secretName` trên Ingress, tạo `Certificate` → `CertificateRequest` → giải quyết thử thách **DNS-01** với Let's Encrypt bằng cách tự thêm bản ghi TXT (qua Route 53), rồi lưu chứng chỉ vào một Secret Kubernetes." },
  { title: "HTTPS chạy được", description: "ALB dùng chứng chỉ đó cho listener 443. Người dùng gõ `https://shop.example.com` → Route 53 trả IP ALB → ALB termination TLS → forward HTTP tới pod. Ba controller làm việc độc lập, chỉ cần bạn viết đúng 1 Ingress." },
];

export function IngressToHttpsPipelineDiagram() {
  return (
    <StepDiagram title="Một Ingress, ba controller tự động hoàn tất" viewBox="0 0 720 320" steps={steps}>
      {(step) => (
        <>
          <DiagramNode x={16} y={130} width={140} height={64} label="Ingress" sublabel="host + tls" tone="violet" state={step === 0 ? "active" : "normal"} />

          <DiagramGroupBox x={190} y={10} width={200} height={80} label="" tone="blue" />
          <DiagramNode x={200} y={20} width={180} height={60} label="ALB Controller" sublabel="tạo ALB + target group" tone="blue" state={step === 1 ? "active" : "normal"} />

          <DiagramGroupBox x={190} y={120} width={200} height={80} label="" tone="cyan" />
          <DiagramNode x={200} y={130} width={180} height={60} label="ExternalDNS" sublabel="tạo bản ghi Route 53" tone="cyan" state={step === 2 ? "active" : "normal"} />

          <DiagramGroupBox x={190} y={230} width={200} height={80} label="" tone="amber" />
          <DiagramNode x={200} y={240} width={180} height={60} label="cert-manager" sublabel="xin chứng chỉ Let's Encrypt" tone="amber" state={step === 3 ? "active" : "normal"} />

          <DiagramArrow from={[156, 155]} to={[196, 55]} tone="blue" dimmed={step !== 1} animated={step === 1} />
          <DiagramArrow from={[156, 162]} to={[196, 162]} tone="cyan" dimmed={step !== 2} animated={step === 2} />
          <DiagramArrow from={[156, 170]} to={[196, 270]} tone="amber" dimmed={step !== 3} animated={step === 3} />

          <DiagramNode x={470} y={20} width={230} height={54} label="Application Load Balancer" sublabel={step >= 1 ? "shop-lab-alb-123.elb...amazonaws.com" : "chưa tạo"} tone={step >= 1 ? "green" : "slate"} state={step === 1 || step === 4 ? "active" : "normal"} />
          <DiagramNode x={470} y={130} width={230} height={54} label="Route 53" sublabel={step >= 2 ? "shop.example.com → ALB" : "chưa có bản ghi"} tone={step >= 2 ? "green" : "slate"} state={step === 2 || step === 4 ? "active" : "normal"} />
          <DiagramNode x={470} y={240} width={230} height={54} label="TLS Secret" sublabel={step >= 3 ? "cert Let's Encrypt hợp lệ" : "chưa có chứng chỉ"} tone={step >= 3 ? "green" : "slate"} state={step === 3 || step === 4 ? "active" : "normal"} />

          <DiagramArrow from={[380, 47]} to={[466, 47]} tone="blue" dimmed={step < 1} />
          <DiagramArrow from={[380, 160]} to={[466, 160]} tone="cyan" dimmed={step < 2} />
          <DiagramArrow from={[380, 270]} to={[466, 270]} tone="amber" dimmed={step < 3} />

          {step === 4 && <DiagramLabel x={585} y={310} text="🔒 https://shop.example.com hoạt động" tone="green" bold size={13} />}
        </>
      )}
    </StepDiagram>
  );
}
