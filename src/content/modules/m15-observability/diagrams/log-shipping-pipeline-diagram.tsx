"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramArrow, DiagramGroupBox, DiagramLabel, DiagramNode, MovingPacket } from "@/components/diagrams/diagram-shapes";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";

type Backend = "loki" | "cloudwatch";

const backends: Record<Backend, { agent: string; agentSub: string; store: string; storeSub: string; query: string; querySub: string; steps: DiagramStep[] }> = {
  loki: {
    agent: "Grafana Alloy",
    agentSub: "DaemonSet",
    store: "Loki",
    storeSub: "index label + chunks S3",
    query: "Grafana",
    querySub: "LogQL",
    steps: [
      { title: "App in ra stdout", description: "App chỉ việc in log JSON ra stdout/stderr — không tự ghi file, không tự gửi đi. Như nhân viên chỉ việc bỏ thư vào hộp thư ở tầng." },
      { title: "Node lưu file", description: "Container runtime ghi stdout vào `/var/log/pods/<namespace>_<pod>_<uid>/<container>/0.log` trên node. Pod bị xoá thì file cũng mất sau một thời gian." },
      { title: "Agent đọc & gắn nhãn", description: "Alloy chạy dạng DaemonSet (mỗi node một bản), tail các file log và gắn label từ Kubernetes API: `namespace`, `app`, `pod`. Như bưu tá đi gom thư và dán mã bưu chính." },
      { title: "Loki lưu trữ", description: "Loki chỉ đánh index cho label, nội dung log nén thành chunk đặt trên S3 — rẻ hơn nhiều so với index toàn văn. Đổi lại, truy vấn phải chọn label trước." },
      { title: "Truy vấn LogQL", description: "Grafana → Explore: `{namespace=\"shop\", app=\"payments\"} |= \"timeout\" | json | level=\"error\"`. Chọn stream bằng label, rồi lọc nội dung." },
    ],
  },
  cloudwatch: {
    agent: "Fluent Bit",
    agentSub: "DaemonSet",
    store: "CloudWatch Logs",
    storeSub: "log group / stream",
    query: "Logs Insights",
    querySub: "fields | filter",
    steps: [
      { title: "App in ra stdout", description: "Giống hệt: app in log JSON ra stdout. Nhờ vậy đổi backend không phải sửa code." },
      { title: "Node lưu file", description: "Log nằm ở `/var/log/containers/*.log` (symlink tới `/var/log/pods`) trên mỗi node EKS." },
      { title: "Fluent Bit gửi đi", description: "Fluent Bit (thường cài qua add-on `amazon-cloudwatch-observability` — Container Insights) đọc file, thêm metadata Kubernetes, gửi bằng output `cloudwatch_logs`. Quyền IAM cấp qua Pod Identity/IRSA." },
      { title: "CloudWatch lưu", description: "Log vào log group (vd `/aws/containerinsights/<cluster>/application`). Tính phí theo GB ingest + lưu trữ — nhớ đặt retention." },
      { title: "Logs Insights", description: "Truy vấn: `fields @timestamp, log | filter log like /timeout/ | sort @timestamp desc | limit 20`. Tính phí theo GB dữ liệu được quét." },
    ],
  },
};

export function LogShippingPipelineDiagram() {
  const [backend, setBackend] = useState<Backend>("loki");
  const config = backends[backend];

  return (
    <div>
      <div className="not-prose -mb-4 flex flex-wrap gap-2">
        {(["loki", "cloudwatch"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setBackend(option)}
            className={clsx(
              "rounded-full px-3 py-1.5 text-sm font-medium",
              backend === option ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
            )}
          >
            {option === "loki" ? "Tự host: Alloy → Loki" : "AWS: Fluent Bit → CloudWatch"}
          </button>
        ))}
      </div>
      <StepDiagram key={backend} title="Đường đi của một dòng log trên Kubernetes" viewBox="0 0 720 300" steps={config.steps}>
        {(step) => {
          const state = (index: number) => (index === step ? "active" : index < step ? "normal" : "dimmed");
          return (
            <>
              <DiagramGroupBox x={8} y={8} width={340} height={284} label="Node (EC2 worker)" tone="slate">
                <DiagramNode x={28} y={44} width={140} height={84} label="payments pod" sublabel="stdout JSON" emoji="💳" tone="green" state={state(0)} />
                <DiagramNode x={28} y={180} width={140} height={84} label="/var/log/pods" sublabel="file trên node" emoji="📁" tone="amber" state={state(1)} />
                <DiagramNode x={196} y={110} width={136} height={90} label={config.agent} sublabel={config.agentSub} emoji="🚚" tone="violet" state={state(2)} />
              </DiagramGroupBox>
              <DiagramNode x={396} y={100} width={150} height={100} label={config.store} sublabel={config.storeSub} emoji="🗄️" tone="cyan" state={state(3)} />
              <DiagramNode x={580} y={100} width={132} height={100} label={config.query} sublabel={config.querySub} emoji="🔎" tone="blue" state={state(4)} />

              <DiagramArrow from={[98, 130]} to={[98, 176]} tone="amber" dimmed={step < 1} animated={step === 1} />
              <DiagramArrow from={[170, 215]} to={[210, 196]} tone="violet" label="tail" dimmed={step < 2} animated={step === 2} />
              <DiagramArrow from={[334, 150]} to={[392, 150]} tone="cyan" label="push" dimmed={step < 3} animated={step === 3} />
              <DiagramArrow from={[576, 150]} to={[548, 150]} tone="blue" dimmed={step < 4} animated={step === 4} />

              {step === 2 && <MovingPacket key={`${backend}-ship`} path="M 170 215 L 264 155" durationSeconds={1.4} tone="violet" label="+labels" />}
              {step === 3 && <MovingPacket key={`${backend}-push`} path="M 334 150 L 396 150" durationSeconds={1.2} tone="cyan" />}
              {step >= 2 && <DiagramLabel x={264} y={228} text='app="payments"' tone="violet" size={11} />}
            </>
          );
        }}
      </StepDiagram>
    </div>
  );
}
