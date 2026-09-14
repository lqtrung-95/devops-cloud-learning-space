"use client";

import { DiagramArrow, DiagramGroupBox, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";

const steps: DiagramStep[] = [
  { title: "Code thay đổi", description: "Developer merge PR vào `shop-api` (app repo). CI build image, chạy test, push `ghcr.io/acme/shop-api:a1b2c3d` lên registry (M05)." },
  { title: "Auto-commit vào dev", description: "Bước cuối của CI (không phải deploy trực tiếp!) tự commit sửa `overlays/dev/kustomization.yaml` trong `shop-config` (config repo) với tag mới. Argo CD Application `shop-api-dev` tự sync." },
  { title: "Kiểm tra ở dev", description: "QA/dev team test trên môi trường dev. Ổn → tạo Pull Request từ `overlays/dev` sang `overlays/staging` (thường bằng công cụ như PR tự động hoặc thao tác tay có review)." },
  { title: "Promote lên staging", description: "PR được review và merge — đây là điểm KIỂM SOÁT chính: ai duyệt PR quyết định ai được đẩy build này lên staging. Argo CD Application `shop-api-staging` tự sync theo commit mới." },
  { title: "Promote lên prod", description: "Sau khi staging pass, tạo PR tương tự cho `overlays/prod`. PR này có thể yêu cầu thêm approval (CODEOWNERS). Merge xong, Argo CD `shop-api-prod` tự sync — CÙNG một image tag đã test ở dev và staging, không build lại." },
];

export function PromotionPipelineDiagram() {
  return (
    <StepDiagram title="Một image tag, promote qua 3 môi trường bằng Pull Request" viewBox="0 0 720 320" steps={steps}>
      {(step) => (
        <>
          <DiagramGroupBox x={16} y={16} width={200} height={90} label="shop-api (app repo)" tone="blue">
            <DiagramNode x={32} y={54} width={168} height={40} label="build image" sublabel={step === 0 ? "a1b2c3d" : "—"} tone="blue" state={step === 0 ? "active" : "normal"} />
          </DiagramGroupBox>

          <DiagramArrow from={[220, 61]} to={[264, 61]} tone="blue" animated={step === 1} dimmed={step < 1} />

          <DiagramGroupBox x={270} y={16} width={430} height={280} label="shop-config (config repo)" tone="violet" />

          <DiagramNode x={290} y={44} width={130} height={56} label="overlays/dev" sublabel={step >= 1 ? "tag: a1b2c3d" : "tag: cũ"} tone="green" state={step === 1 || step === 2 ? "active" : "normal"} />
          <DiagramArrow from={[355, 100]} to={[355, 130]} tone="amber" animated={step === 2 || step === 3} dimmed={step < 2} label="PR review" />
          <DiagramNode x={290} y={134} width={130} height={56} label="overlays/staging" sublabel={step >= 3 ? "tag: a1b2c3d" : "tag: cũ"} tone="amber" state={step === 3 || step === 4 ? "active" : "normal"} />
          <DiagramArrow from={[355, 190]} to={[355, 220]} tone="rose" animated={step === 4} dimmed={step < 4} label="PR + CODEOWNERS" />
          <DiagramNode x={290} y={224} width={130} height={56} label="overlays/prod" sublabel={step >= 4 ? "tag: a1b2c3d" : "tag: cũ"} tone="rose" state={step === 4 ? "active" : "normal"} />

          <DiagramNode x={470} y={44} width={200} height={56} label="Application dev" sublabel="Argo CD auto-sync" tone="green" state={step === 1 ? "active" : "normal"} />
          <DiagramNode x={470} y={134} width={200} height={56} label="Application staging" sublabel="Argo CD auto-sync" tone="amber" state={step === 3 ? "active" : "normal"} />
          <DiagramNode x={470} y={224} width={200} height={56} label="Application prod" sublabel="Argo CD auto-sync" tone="rose" state={step === 4 ? "active" : "normal"} />

          <DiagramArrow from={[422, 72]} to={[466, 72]} tone="green" animated={step === 1} />
          <DiagramArrow from={[422, 162]} to={[466, 162]} tone="amber" animated={step === 3} />
          <DiagramArrow from={[422, 252]} to={[466, 252]} tone="rose" animated={step === 4} />

          {step === 4 && <DiagramLabel x={355} y={310} text="Cùng 1 image tag a1b2c3d chạy ở cả 3 môi trường — không build lại" tone="green" bold size={12} />}
        </>
      )}
    </StepDiagram>
  );
}
