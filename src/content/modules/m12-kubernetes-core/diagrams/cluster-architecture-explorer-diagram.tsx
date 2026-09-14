"use client";

import { useState } from "react";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import { DiagramArrow, DiagramGroupBox, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";
import type { DiagramTone } from "@/components/diagrams/diagram-tones";

interface ComponentInfo {
  id: string;
  label: string;
  sublabel: string;
  emoji: string;
  tone: DiagramTone;
  box: [number, number, number, number];
  analogy: string;
  role: string;
  ifDown: string;
}

const components: ComponentInfo[] = [
  { id: "apiserver", label: "kube-apiserver", sublabel: "cửa ngõ duy nhất", emoji: "🛎️", tone: "violet", box: [145, 40, 240, 62], analogy: "Quầy lễ tân của ban quản lý cảng: mọi yêu cầu đều phải qua đây, được kiểm tra giấy tờ rồi mới ghi sổ.", role: "REST API của cluster. Xác thực (authn), phân quyền (RBAC), admission, rồi đọc/ghi etcd. Mọi thành phần khác đều 'watch' API server.", ifDown: "Không `kubectl` được, không ai tạo/sửa được gì. Nhưng pod đang chạy trên node VẪN chạy tiếp." },
  { id: "etcd", label: "etcd", sublabel: "sổ cái", emoji: "📚", tone: "amber", box: [145, 122, 112, 64], analogy: "Cuốn sổ cái của cảng: ghi toàn bộ kế hoạch và trạng thái. Chỉ lễ tân được mở sổ.", role: "Key-value store phân tán (Raft). Lưu mọi object: Deployment, Pod, Secret… Cần backup định kỳ (`etcdctl snapshot save`).", ifDown: "Mất etcd mà không có backup = mất 'trí nhớ' của cả cluster. Đây là thứ phải backup đầu tiên." },
  { id: "scheduler", label: "scheduler", sublabel: "xếp chỗ", emoji: "🧩", tone: "cyan", box: [273, 122, 112, 64], analogy: "Nhân viên xếp bến: thấy thùng hàng mới chưa có chỗ, chọn cầu tàu còn đủ chỗ và phù hợp yêu cầu.", role: "Theo dõi pod chưa có `nodeName`, lọc node (requests, taints, affinity…) rồi chấm điểm và gán node. Không tự chạy container.", ifDown: "Pod đang chạy không sao, nhưng pod mới nằm mãi ở `Pending`." },
  { id: "controller", label: "controller-manager", sublabel: "các vòng lặp reconcile", emoji: "🔁", tone: "blue", box: [145, 206, 240, 62], analogy: "Đội giám sát đi tuần: so kế hoạch trong sổ với thực tế ngoài bến, thiếu thì bổ sung, thừa thì bớt.", role: "Chạy nhiều controller: Deployment, ReplicaSet, Node, Job, EndpointSlice… Mỗi controller là một vòng lặp đưa thực tế về trạng thái mong muốn.", ifDown: "Pod chết không được thay, rolling update đứng yên, Service không cập nhật endpoints." },
  { id: "kubelet", label: "kubelet", sublabel: "đốc công node", emoji: "👷", tone: "green", box: [450, 40, 118, 62], analogy: "Đốc công ở từng cầu tàu: nhận lệnh từ lễ tân, bảo công nhân xếp thùng, báo cáo tình trạng về.", role: "Agent trên mỗi node. Watch pod được gán cho node mình, gọi container runtime qua CRI, chạy probes, báo status về API server.", ifDown: "Node chuyển `NotReady`; sau một thời gian pod trên đó bị đánh dấu và được tạo lại ở node khác (nếu có controller quản lý)." },
  { id: "kubeproxy", label: "kube-proxy", sublabel: "luật mạng Service", emoji: "🔀", tone: "cyan", box: [582, 40, 118, 62], analogy: "Người cắm biển chỉ đường trong cảng: 'hàng gửi quầy api → đi tới một trong các thùng này'.", role: "Lập trình iptables/nftables/IPVS để IP ảo của Service chuyển tới pod IP. Một số CNI (vd Cilium) có thể thay thế kube-proxy.", ifDown: "Gọi Service bằng ClusterIP có thể lỗi trên node đó, dù gọi thẳng pod IP vẫn được." },
  { id: "runtime", label: "container runtime", sublabel: "containerd · CRI", emoji: "📦", tone: "slate", box: [450, 122, 250, 58], analogy: "Công nhân bốc xếp: kéo image về, mở thùng, chạy container.", role: "containerd hoặc CRI-O (dockershim đã bị gỡ từ v1.24). Pull image, tạo namespace/cgroup cho container.", ifDown: "Không tạo được container mới; pod báo lỗi kiểu `ContainerCreating` kéo dài." },
  { id: "pods", label: "Pods", sublabel: "app của bạn", emoji: "🚢", tone: "rose", box: [450, 200, 250, 68], analogy: "Những thùng hàng đang hoạt động — thứ khách hàng thực sự cần.", role: "Đơn vị nhỏ nhất Kubernetes quản lý: 1+ container chung IP và volume. Pod có thể chết bất cứ lúc nào — đó là thiết kế, không phải lỗi.", ifDown: "Controller (Deployment/StatefulSet…) tạo pod thay thế. Pod 'trần' không có controller thì mất luôn." },
];

export function ClusterArchitectureExplorerDiagram() {
  const [selectedId, setSelectedId] = useState("apiserver");
  const selected = components.find((component) => component.id === selectedId)!;
  const isActive = (...ids: string[]) => ids.includes(selectedId);

  return (
    <DiagramFrame
      title="Kiến trúc cluster — bấm vào từng thành phần"
      viewBox="0 0 720 330"
      controls={
        <div className="flex items-start gap-3 text-sm leading-relaxed">
          <span className="text-3xl" aria-hidden>
            {selected.emoji}
          </span>
          <div className="space-y-1">
            <p className="font-mono font-bold text-indigo-700 dark:text-indigo-300">{selected.label}</p>
            <p className="text-stone-700 dark:text-stone-300">🧒 {selected.analogy}</p>
            <p className="text-stone-700 dark:text-stone-300">⚙️ {selected.role}</p>
            <p className="text-rose-700 dark:text-rose-300">💥 Nếu nó chết: {selected.ifDown}</p>
          </div>
        </div>
      }
      caption="Control plane ra quyết định, worker node thực thi. Mọi mũi tên đều đi qua kube-apiserver — không thành phần nào nói chuyện trực tiếp với etcd ngoài nó."
    >
      <DiagramGroupBox x={130} y={10} width={270} height={272} label="Control plane" tone="violet" />
      <DiagramGroupBox x={435} y={10} width={280} height={272} label="Worker node (×N)" tone="green" />
      <DiagramNode x={8} y={40} width={100} height={62} label="kubectl" sublabel="bạn / CI" emoji="🧑‍💻" tone="slate" />

      <DiagramArrow from={[110, 71]} to={[142, 71]} tone="violet" animated={isActive("apiserver")} />
      <DiagramArrow from={[200, 104]} to={[200, 119]} tone="amber" bidirectional animated={isActive("etcd", "apiserver")} />
      <DiagramArrow from={[329, 120]} to={[329, 105]} tone="cyan" animated={isActive("scheduler")} />
      <DiagramArrow from={[265, 204]} to={[265, 105]} tone="blue" animated={isActive("controller")} curve={0} />
      <DiagramArrow from={[448, 60]} to={[388, 60]} tone="green" label="watch" animated={isActive("kubelet")} />
      <DiagramArrow from={[509, 104]} to={[509, 119]} tone="slate" animated={isActive("kubelet", "runtime")} />
      <DiagramArrow from={[575, 182]} to={[575, 197]} tone="slate" animated={isActive("runtime", "pods")} />

      {components.map((component) => (
        <DiagramNode
          key={component.id}
          x={component.box[0]}
          y={component.box[1]}
          width={component.box[2]}
          height={component.box[3]}
          label={component.label}
          sublabel={component.sublabel}
          tone={component.tone}
          state={component.id === selectedId ? "active" : "normal"}
          onClick={() => setSelectedId(component.id)}
        />
      ))}
      <DiagramLabel x={360} y={312} text="👆 Bấm một ô để xem vai trò, phép so sánh và điều gì xảy ra khi nó hỏng" size={12} tone="slate" />
    </DiagramFrame>
  );
}
