"use client";

import { useState } from "react";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import { DiagramArrow, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";
import type { DiagramTone } from "@/components/diagrams/diagram-tones";
import { InlineCodeText } from "@/components/ui/inline-code-text";

interface Symptom {
  id: string;
  status: string;
  tone: DiagramTone;
  command: string;
  lookFor: string;
  causes: [string, string][];
  fix: string;
}

const symptoms: Symptom[] = [
  {
    id: "pending",
    status: "Pending",
    tone: "amber",
    command: "kubectl describe pod",
    lookFor: "Events: FailedScheduling",
    causes: [["Insufficient cpu/memory", "requests quá lớn"], ["untolerated taint", "thiếu toleration"], ["PVC unbound", "StorageClass sai"]],
    fix: "Pod chưa được xếp node. Đọc dòng `0/3 nodes are available: …` — nó liệt kê lý do từng node bị loại. Giảm requests, thêm node, sửa nodeSelector/toleration hoặc sửa PVC.",
  },
  {
    id: "imagepull",
    status: "ImagePullBackOff",
    tone: "rose",
    command: "kubectl describe pod",
    lookFor: "Events: Failed to pull image",
    causes: [["Sai tên / tag", "not found"], ["Registry private", "thiếu imagePullSecrets"], ["Không ra được internet", "NAT / VPC endpoint"]],
    fix: "kubelet không kéo được image. Kiểm tra chính xác tên:tag (thử `docker pull` cùng tên), quyền registry (`imagePullSecrets`, IAM cho ECR), đường mạng từ node ra registry.",
  },
  {
    id: "crashloop",
    status: "CrashLoopBackOff",
    tone: "rose",
    command: "kubectl logs --previous",
    lookFor: "stack trace, exit code",
    causes: [["App lỗi khi khởi động", "thiếu env, config sai"], ["Sai command/args", "exit code 1/127"], ["Liveness quá gắt", "restart khi đang boot"]],
    fix: "Container start rồi chết liên tục, kubelet chờ lâu dần giữa các lần restart (tối đa 5 phút). `logs --previous` xem lần chết trước; `describe` xem `Last State` và exit code (127 = không tìm thấy lệnh, 137 = bị SIGKILL).",
  },
  {
    id: "configerror",
    status: "CreateContainerConfigError",
    tone: "violet",
    command: "kubectl describe pod",
    lookFor: "secret/configmap not found",
    causes: [["Thiếu Secret", "tên sai / khác namespace"], ["Thiếu key", "key không tồn tại"], ["Thiếu ConfigMap", "chưa apply"]],
    fix: "Pod tham chiếu Secret/ConfigMap không tồn tại trong CÙNG namespace. Tạo đúng tên và key (`kubectl get secret -n <ns>`), pod sẽ tự thử lại.",
  },
  {
    id: "oomkilled",
    status: "OOMKilled (137)",
    tone: "rose",
    command: "kubectl describe pod",
    lookFor: "Last State: OOMKilled",
    causes: [["Limit quá thấp", "so với nhu cầu thật"], ["Rò rỉ bộ nhớ", "RAM tăng dần"], ["JVM/Node heap", "không biết limit"]],
    fix: "Vượt memory limit nên kernel giết container. Xem mức dùng thực tế bằng `kubectl top pod`, tăng limit hợp lý hoặc cấu hình heap theo container (ví dụ `-XX:MaxRAMPercentage`).",
  },
  {
    id: "notready",
    status: "Running, gọi không được",
    tone: "blue",
    command: "kubectl get endpointslices",
    lookFor: "danh sách IP rỗng?",
    causes: [["Selector sai", "label không khớp"], ["readiness fail", "0/1 READY"], ["targetPort sai", "connection refused"]],
    fix: "Đi từng chặng: pod Ready chưa? → EndpointSlice có IP chưa (`-l kubernetes.io/service-name=api`)? → `targetPort` đúng cổng app? → NetworkPolicy có chặn không? → thử `kubectl port-forward` thẳng vào pod.",
  },
];

export function PodTroubleshootingDecisionTreeDiagram() {
  const [selectedId, setSelectedId] = useState("crashloop");
  const selected = symptoms.find((symptom) => symptom.id === selectedId)!;
  const selectedIndex = symptoms.indexOf(selected);

  return (
    <DiagramFrame
      title="Cây chẩn đoán pod — bấm vào trạng thái bạn đang thấy"
      viewBox="0 0 720 340"
      controls={
        <p className="text-sm leading-relaxed text-stone-700 dark:text-stone-300">
          🩺 <InlineCodeText text={selected.fix} />
        </p>
      }
      caption="Quy trình chung: kubectl get pods → describe (Events) → logs (--previous) → get events --sort-by=.lastTimestamp → exec vào pod nếu cần."
    >
      {symptoms.map((symptom, index) => (
        <DiagramNode
          key={symptom.id}
          x={8}
          y={8 + index * 55}
          width={210}
          height={46}
          label={symptom.status}
          tone={symptom.tone}
          state={symptom.id === selectedId ? "active" : "normal"}
          onClick={() => setSelectedId(symptom.id)}
        />
      ))}
      <DiagramArrow from={[220, 31 + selectedIndex * 55]} to={[266, 170]} tone={selected.tone} animated />
      <DiagramNode x={270} y={128} width={200} height={84} label={selected.command} sublabel={selected.lookFor} emoji="🔎" tone="slate" state="active" />
      <DiagramLabel x={600} y={22} text="Nguyên nhân thường gặp" bold size={13} />
      {selected.causes.map(([cause, detail], index) => (
        <g key={`${selected.id}-${cause}`}>
          <DiagramArrow from={[472, 170]} to={[504, 70 + index * 100]} tone={selected.tone} />
          <DiagramNode x={508} y={40 + index * 100} width={204} height={62} label={cause} sublabel={detail} tone={selected.tone} />
        </g>
      ))}
    </DiagramFrame>
  );
}
