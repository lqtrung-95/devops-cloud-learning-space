"use client";

import { DiagramArrow, DiagramGroupBox, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";

interface PodBox {
  label: string;
  pending: boolean;
}

const podsAtStep: PodBox[][] = [
  [{ label: "p1", pending: false }, { label: "p2", pending: false }],
  [{ label: "p1", pending: false }, { label: "p2", pending: false }, { label: "p3", pending: true }, { label: "p4", pending: true }, { label: "p5", pending: true }],
  [{ label: "p1", pending: false }, { label: "p2", pending: false }, { label: "p3", pending: true }, { label: "p4", pending: true }, { label: "p5", pending: true }],
  [{ label: "p1", pending: false }, { label: "p2", pending: false }, { label: "p3", pending: false }, { label: "p4", pending: false }, { label: "p5", pending: false }],
  [{ label: "p1", pending: false }, { label: "p2", pending: false }],
];

const steps: DiagramStep[] = [
  { title: "Ổn định", description: "1 node `m5.large` (Spot) đang chạy 2 pod của Deployment `inflate`. Đủ chỗ, không ai chờ." },
  { title: "Tăng tải đột ngột", description: "`kubectl scale deployment inflate --replicas=5`. 3 pod mới không đủ chỗ trên node hiện có → Pending. Scheduler không tạo node — nó chỉ xếp chỗ có sẵn." },
  { title: "Karpenter phát hiện", description: "Karpenter watch thấy pod Pending, đọc `NodePool` (giới hạn instance family, tỉ lệ Spot/On-Demand) và `EC2NodeClass` (AMI, subnet), tính đúng loại + số lượng instance cần thêm — không cần ASG định sẵn." },
  { title: "Node mới, pod chạy", description: "Karpenter gọi EC2 RunInstances tạo 1 node `m5.xlarge` mới (thường dưới 60 giây), node Join cluster, 3 pod Pending được xếp vào ngay." },
  { title: "Consolidation", description: "`kubectl scale --replicas=2`. Karpenter thấy node mới giờ gần như trống, tự **drain và xoá** nó để gộp pod còn lại vào node ban đầu — tiết kiệm chi phí, không cần bạn tự tắt EC2." },
];

export function KarpenterScaleOutSimulatorDiagram() {
  return (
    <StepDiagram title="Karpenter: pod Pending → node mới → dọn khi hết tải" viewBox="0 0 720 320" steps={steps}>
      {(step) => {
        const pods = podsAtStep[step];
        const showNewNode = step >= 2 && step <= 3;
        const newNodeReady = step === 3;
        return (
          <>
            <DiagramGroupBox x={16} y={16} width={280} height={100} label="NodePool + EC2NodeClass" tone="violet">
              <DiagramNode x={32} y={48} width={248} height={54} label="limits.cpu: 20, spot+on-demand" sublabel={step === 2 ? "đang tính toán instance phù hợp" : "cấu hình sẵn"} tone="violet" state={step === 2 ? "active" : "normal"} />
            </DiagramGroupBox>

            <DiagramGroupBox x={16} y={140} width={310} height={160} label="Node m5.large (Spot, có sẵn)" tone="blue">
              {pods.filter((p) => !p.pending).slice(0, 3).map((pod, index) => (
                <DiagramNode key={pod.label} x={36 + index * 96} y={180} width={80} height={70} label={pod.label} sublabel="Running" tone="green" />
              ))}
            </DiagramGroupBox>

            {step === 1 && (
              <DiagramGroupBox x={350} y={140} width={230} height={160} label="Chờ chỗ (Pending)" tone="amber">
                {pods.filter((p) => p.pending).map((pod, index) => (
                  <DiagramNode key={pod.label} x={366 + (index % 2) * 100} y={180 + Math.floor(index / 2) * 76} width={84} height={62} label={pod.label} sublabel="Pending" tone="amber" dashed />
                ))}
              </DiagramGroupBox>
            )}

            {showNewNode && (
              <DiagramGroupBox x={350} y={140} width={340} height={160} label={newNodeReady ? "Node m5.xlarge mới (đã Ready)" : "Node m5.xlarge đang khởi tạo..."} tone={newNodeReady ? "green" : "amber"}>
                {newNodeReady &&
                  pods.filter((p) => !p.pending).slice(2).map((pod, index) => (
                    <DiagramNode key={pod.label} x={366 + index * 100} y={180} width={84} height={70} label={pod.label} sublabel="Running" tone="green" />
                  ))}
              </DiagramGroupBox>
            )}

            {step === 4 && (
              <>
                <DiagramNode x={400} y={190} width={260} height={60} label="Node m5.xlarge" sublabel="trống → drain & terminate" tone="rose" dashed />
                <DiagramArrow from={[400, 220]} to={[330, 220]} tone="rose" animated label="dọn node thừa" />
              </>
            )}

            <DiagramArrow from={[300, 66]} to={[350, 220]} tone="violet" dimmed={step !== 2} animated={step === 2} curve={20} />
            {step === 1 && <DiagramLabel x={465} y={130} text="⏳ scheduler: 0/1 nodes available" tone="amber" size={12} />}
            {step === 3 && <DiagramLabel x={520} y={130} text="✅ scale-out xong trong < 60s" tone="green" bold size={12} />}
          </>
        );
      }}
    </StepDiagram>
  );
}
