"use client";

import { DiagramArrow, DiagramGroupBox, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";

const steps: DiagramStep[] = [
  { title: "Ổn định", description: "Application `shop-api-prod` đang `Synced` + `Healthy`. Argo CD lưu trạng thái mong muốn từ Git (commit `a1b2c3d`, replicas: 3) và trạng thái thực tế trên cluster — hai bên khớp nhau." },
  { title: "Commit mới", description: "Bạn merge PR đổi `replicas: 3` → `replicas: 5` trong config repo. Git đổi sang commit `f7e8d9c`, nhưng cluster CHƯA đổi gì — Argo CD chưa kịp poll." },
  { title: "Phát hiện OutOfSync", description: "Trong chu kỳ poll tiếp theo (mặc định 3 phút, hoặc ngay lập tức nếu có webhook), Argo CD so sánh Git (`f7e8d9c`, replicas: 5) với cluster (replicas: 3) → đánh dấu `OutOfSync`." },
  { title: "Tự động sync", description: "`syncPolicy.automated` bật → Argo CD tự chạy tương đương `kubectl apply` để đưa cluster khớp Git. Trạng thái chuyển `Synced`, `Progressing` trong lúc pod mới khởi động." },
  { title: "Ai đó sửa tay (drift)", description: "Một kỹ sư `kubectl scale --replicas=10` trực tiếp trên cluster (không qua Git). Cluster giờ có 10 pod nhưng Git vẫn ghi 5 — `OutOfSync` lần nữa, lần này do drift chứ không phải Git thay đổi." },
  { title: "selfHeal tự sửa", description: "Với `selfHeal: true`, Argo CD không chờ ai — nó lập tức apply lại theo Git, kéo replicas về đúng 5. Cluster luôn phản ánh đúng Git, không phụ thuộc ai đó có nhớ sửa lại tay hay không." },
];

export function ArgocdReconcileDriftSelfhealDiagram() {
  return (
    <StepDiagram title="Vòng lặp reconcile của Argo CD" viewBox="0 0 720 300" steps={steps}>
      {(step) => {
        const gitReplicas = step >= 1 ? 5 : 3;
        const clusterReplicas = step === 0 ? 3 : step === 1 ? 3 : step === 2 ? 3 : step === 3 ? 5 : step === 4 ? 10 : 5;
        const synced = gitReplicas === clusterReplicas;
        const status = step === 3 || step === 5 ? "Progressing → Synced" : synced ? "Synced" : "OutOfSync";
        return (
          <>
            <DiagramGroupBox x={16} y={16} width={220} height={110} label="Config repo (Git)" tone="violet">
              <DiagramNode x={32} y={56} width={190} height={54} label={`replicas: ${gitReplicas}`} sublabel={step >= 1 ? "commit f7e8d9c" : "commit a1b2c3d"} tone="violet" state={step === 1 ? "active" : "normal"} />
            </DiagramGroupBox>

            <DiagramNode x={270} y={40} width={190} height={64} label="Argo CD controller" sublabel={step === 2 || step === 5 ? "đang so sánh..." : "watch loop mỗi 3 phút"} tone="blue" state={step === 2 || step === 5 ? "active" : "normal"} />
            <DiagramArrow from={[238, 71]} to={[266, 71]} tone="violet" animated={step === 2 || step === 5} />

            <DiagramGroupBox x={490} y={16} width={214} height={110} label="Cluster (thực tế)" tone={synced ? "green" : "rose"}>
              <DiagramNode x={506} y={56} width={182} height={54} label={`replicas: ${clusterReplicas}`} sublabel={step === 4 ? "🖐️ sửa tay!" : "áp dụng bởi Argo CD"} tone={step === 4 ? "rose" : "green"} state={step === 3 || step === 4 || step === 5 ? "active" : "normal"} />
            </DiagramGroupBox>
            <DiagramArrow from={[464, 71]} to={[486, 71]} tone={synced ? "green" : "rose"} animated={step === 3 || step === 5} bidirectional={step === 0} />

            <DiagramNode x={200} y={160} width={320} height={54} label={`Sync status: ${status}`} tone={status === "Synced" ? "green" : status.includes("OutOfSync") ? "rose" : "amber"} state="active" />

            {step === 4 && <DiagramLabel x={597} y={140} text="Cluster lệch khỏi Git — cần selfHeal để tự sửa" tone="rose" size={12} />}
            {step === 5 && <DiagramLabel x={360} y={230} text="✅ selfHeal: true → Argo CD tự apply lại theo Git, không cần ai bấm nút" tone="green" bold size={12} />}
            {step === 3 && <DiagramLabel x={360} y={230} text="syncPolicy.automated đưa cluster khớp Git mới" tone="blue" size={12} />}
          </>
        );
      }}
    </StepDiagram>
  );
}
