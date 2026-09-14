"use client";

import { DiagramArrow, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";

const steps: DiagramStep[] = [
  { title: "Build image", description: "CI build image từ Dockerfile đã qua SAST/SCA (bài trước). Image chưa có 'nhãn thành phần' hay 'tem niêm phong' nào cả." },
  { title: "Syft sinh SBOM", description: "`syft checkout:sha -o cyclonedx-json=sbom.json` đọc mọi layer, liệt kê đúng package + version đã cài — như in ra nhãn thành phần đầy đủ dán lên thùng hàng." },
  { title: "cosign ký keyless qua OIDC", description: "CI (GitHub Actions) có `id-token: write`, lấy OIDC token ngắn hạn từ GitHub, cosign dùng token đó xin Fulcio (CA của Sigstore) cấp chứng chỉ tạm thời rồi ký digest image — không cần quản lý private key nào." },
  { title: "Chữ ký & SBOM lên Rekor", description: "Chữ ký, chứng chỉ và (tuỳ cấu hình) SBOM được ghi vào Rekor — sổ cái minh bạch công khai, không thể sửa/xoá. Ai cũng kiểm tra lại được 'image này thật sự được ký lúc nào, bởi workflow nào'." },
  { title: "Push image lên registry", description: "Image (kèm digest sha256) và chữ ký được đẩy lên ECR/registry. Digest là 'vân tay' duy nhất — không đổi dù ai đó gắn thêm tag khác." },
  { title: "Kyverno xác minh trước khi chạy", description: "Khi Kubernetes nhận request tạo Pod, Kyverno admission controller gọi cosign verify: đúng chữ ký, đúng danh tính (workflow repo khớp), đúng Rekor entry → cho chạy. Sai bất kỳ điều kiện nào → từ chối." },
];

export function SbomCosignSlsaPipelineDiagram() {
  return (
    <StepDiagram title="Từ image build tới image được xác minh trước khi chạy" viewBox="0 0 720 300" steps={steps}>
      {(step) => (
        <>
          <DiagramNode x={10} y={110} width={110} height={80} label="Docker build" emoji="🐳" tone="slate" state={step === 0 ? "active" : "normal"} />
          <DiagramNode x={150} y={30} width={120} height={80} label="Syft" sublabel="sinh SBOM" emoji="📋" tone="blue" state={step === 1 ? "active" : "normal"} />
          <DiagramNode x={150} y={190} width={120} height={80} label="cosign sign" sublabel="keyless OIDC" emoji="✍️" tone="violet" state={step === 2 ? "active" : "normal"} />
          <DiagramNode x={320} y={110} width={130} height={80} label="Rekor" sublabel="sổ cái minh bạch" emoji="📖" tone="amber" state={step === 3 ? "active" : "normal"} />
          <DiagramNode x={490} y={110} width={110} height={80} label="ECR" sublabel="registry" emoji="📦" tone="cyan" state={step === 4 ? "active" : "normal"} />
          <DiagramNode x={630} y={40} width={82} height={70} label="Kyverno" emoji="🛡️" tone="green" state={step === 5 ? "active" : "normal"} />
          <DiagramNode x={630} y={180} width={82} height={70} label="Pod chạy" emoji="✅" tone="green" state={step === 5 ? "active" : "normal"} />

          <DiagramArrow from={[120, 130]} to={[146, 70]} tone="blue" dimmed={step !== 1} animated={step === 1} />
          <DiagramArrow from={[120, 165]} to={[146, 230]} tone="violet" dimmed={step !== 2} animated={step === 2} />
          <DiagramArrow from={[270, 70]} to={[316, 130]} tone="amber" dimmed={step !== 3} animated={step === 3} />
          <DiagramArrow from={[270, 230]} to={[316, 160]} tone="amber" dimmed={step !== 3} animated={step === 3} />
          <DiagramArrow from={[450, 145]} to={[486, 145]} tone="cyan" dimmed={step !== 4} animated={step === 4} />
          <DiagramArrow from={[600, 140]} to={[626, 80]} tone="green" dimmed={step !== 5} animated={step === 5} label="verify" />
          <DiagramArrow from={[671, 110]} to={[671, 176]} tone="green" dimmed={step !== 5} animated={step === 5} />

          {step === 5 && <DiagramLabel x={670} y={266} text="Sai chữ ký/danh tính → ❌ admission denied" tone="rose" bold size={11} />}
        </>
      )}
    </StepDiagram>
  );
}
