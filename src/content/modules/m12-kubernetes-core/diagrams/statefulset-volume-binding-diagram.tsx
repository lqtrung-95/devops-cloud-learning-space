"use client";

import { DiagramArrow, DiagramGroupBox, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";

const steps: DiagramStep[] = [
  { title: "StatefulSet tạo PVC", description: "StatefulSet `postgres` có `volumeClaimTemplates` tên `data` → tạo PVC `data-postgres-0` và pod `postgres-0`. PVC đang `Pending` — như phiếu xin tủ đồ chưa được cấp." },
  { title: "Scheduler chọn node", description: "StorageClass dùng `volumeBindingMode: WaitForFirstConsumer`, nên đĩa chưa được tạo cho tới khi scheduler chọn node (xét requests, taints, affinity). Pod được xếp vào `worker-2`, zone a." },
  { title: "Cấp phát PV", description: "Provisioner của StorageClass (EBS CSI trên AWS, local-path trên kind) tạo ổ đĩa thật ở đúng zone đó, sinh object PV và gắn với PVC → `Bound`." },
  { title: "Mount & ghi dữ liệu", description: "kubelet gắn đĩa vào container tại `/var/lib/postgresql/data`. Postgres ghi dữ liệu lên đĩa — không phải lên filesystem tạm của container." },
  { title: "Pod chết, dữ liệu còn", description: "Xoá `postgres-0`: StatefulSet tạo lại pod CÙNG TÊN `postgres-0`, và nó gắn lại đúng PVC `data-postgres-0`. Phòng khách sạn số cố định, tủ đồ vẫn nguyên." },
];

export function StatefulsetVolumeBindingDiagram() {
  return (
    <StepDiagram title="StatefulSet + PVC: dữ liệu sống sót khi pod chết" viewBox="0 0 720 320" steps={steps}>
      {(step) => {
        const scheduled = step >= 1;
        const bound = step >= 2;
        const recreated = step === 4;
        return (
          <>
            <DiagramNode x={16} y={16} width={200} height={60} label="StatefulSet postgres" sublabel="volumeClaimTemplates: data" tone="violet" state={step === 0 ? "active" : "normal"} />
            <DiagramNode
              x={260}
              y={16}
              width={200}
              height={60}
              label="PVC data-postgres-0"
              sublabel={bound ? "Bound · 10Gi · RWO" : "Pending"}
              tone={bound ? "green" : "amber"}
              state={step === 0 || step === 2 || recreated ? "active" : "normal"}
            />
            <DiagramNode x={504} y={16} width={200} height={60} label="StorageClass" sublabel="WaitForFirstConsumer" tone="cyan" state={step === 2 ? "active" : step === 1 ? "normal" : "dimmed"} />
            <DiagramArrow from={[218, 46]} to={[256, 46]} tone="violet" animated={step === 0} />
            <DiagramArrow from={[502, 46]} to={[464, 46]} tone="cyan" animated={step === 2} dimmed={step < 2} label="cấp phát" />

            <DiagramGroupBox x={250} y={112} width={460} height={196} label="Node worker-2 · zone a" tone={scheduled ? "green" : "slate"} />
            <DiagramNode
              x={scheduled ? 280 : 16}
              y={180}
              width={180}
              height={80}
              label={recreated ? "postgres-0 (mới)" : "postgres-0"}
              sublabel={scheduled ? (recreated ? "cùng tên, cùng PVC" : "Running") : "Pending · chưa có node"}
              emoji="🐘"
              tone={recreated ? "amber" : scheduled ? "blue" : "slate"}
              state={step === 1 || step === 3 || recreated ? "active" : "normal"}
              dashed={!scheduled}
            />
            <DiagramNode
              x={510}
              y={180}
              width={180}
              height={80}
              label="PV pvc-7f3a…"
              sublabel={step >= 3 ? "shop.orders: 12.408 dòng" : "ổ đĩa 10Gi"}
              emoji="💽"
              tone="green"
              state={bound ? (step === 2 ? "active" : "normal") : "dimmed"}
            />
            {scheduled && !bound && <DiagramLabel x={480} y={290} text="⏳ đã có node → bây giờ mới tạo đĩa đúng zone" tone="amber" size={12} />}
            {bound && <DiagramArrow from={[462, 220]} to={[506, 220]} tone="green" animated={step >= 3} bidirectional label="mount" />}
            <DiagramArrow from={[360, 78]} to={[600, 176]} tone="green" dimmed={!bound} curve={-30} />
            {recreated && <DiagramLabel x={125} y={200} text="💥 pod cũ đã bị xoá" tone="rose" bold />}
          </>
        );
      }}
    </StepDiagram>
  );
}
