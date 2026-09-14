"use client";

import { DiagramArrow, DiagramGroupBox, DiagramLabel, DiagramNode, MovingPacket } from "@/components/diagrams/diagram-shapes";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";

const steps: DiagramStep[] = [
  { title: "Vào cổng", description: "Trình duyệt gửi `GET http://shop.local/api/orders` tới IP của Gateway (một Service type LoadBalancer do Gateway controller tạo). Gateway là cổng toà nhà." },
  { title: "HTTPRoute khớp", description: "HTTPRoute có rule `PathPrefix: /api` → `backendRefs: api:80`. Giống bảng chỉ dẫn ở sảnh: 'phòng API tầng 2'." },
  { title: "Service chọn pod", description: "Service `api` không phải một máy — nó là tên + IP ảo cố định. EndpointSlice liệt kê IP các pod `app: api` đang Ready; request đi tới một trong số đó." },
  { title: "Pod đổi, địa chỉ không đổi", description: "Pod `api-2` chết, Deployment tạo `api-3` với IP mới. EndpointSlice controller cập nhật danh sách trong vài giây — client vẫn gọi đúng tên `api`, không cần biết gì." },
  { title: "Route khác", description: "Request `GET /` không khớp `/api` nên rơi vào rule `PathPrefix: /` → Service `frontend`. Một Gateway, nhiều đường đi." },
];

export function ServiceGatewayTrafficRoutingDiagram() {
  return (
    <StepDiagram title="Traffic đi từ người dùng tới pod đang thay đổi" viewBox="0 0 720 320" steps={steps}>
      {(step) => {
        const toApi = step <= 3;
        const podTwo = step >= 3 ? { label: "api-3", sublabel: "10.244.2.9 (mới)" } : { label: "api-2", sublabel: "10.244.2.7" };
        const packetPath = [
          "M 112 162 L 138 162",
          "M 262 162 L 288 162",
          "M 412 150 L 448 92",
          "M 572 88 L 598 88",
          "M 112 162 L 412 176 L 448 236 L 598 244",
        ][step];
        return (
          <>
            <DiagramGroupBox x={128} y={6} width={586} height={296} label="Cluster" tone="slate" />
            <DiagramNode x={8} y={130} width={104} height={64} label="Người dùng" sublabel={step === 4 ? "GET /" : "GET /api"} emoji="🧑" tone="slate" />
            <DiagramNode x={140} y={130} width={122} height={64} label="Gateway" sublabel="listener :80" tone="violet" state={step === 0 ? "active" : "normal"} />
            <DiagramNode x={290} y={122} width={122} height={80} label="HTTPRoute" sublabel={step === 4 ? "/ → frontend" : "/api → api"} tone="amber" state={step === 1 || step === 4 ? "active" : "normal"} />
            <DiagramNode x={450} y={60} width={122} height={58} label="Service api" sublabel="ClusterIP 10.96.4.10" tone="blue" state={step === 2 ? "active" : toApi ? "normal" : "dimmed"} />
            <DiagramNode x={450} y={210} width={122} height={58} label="Service frontend" sublabel="ClusterIP" tone="cyan" state={step === 4 ? "active" : "dimmed"} />

            <DiagramNode x={600} y={30} width={108} height={46} label="api-1" sublabel="10.244.1.5" tone="green" state={toApi ? "normal" : "dimmed"} />
            <DiagramNode
              x={600}
              y={88}
              width={108}
              height={46}
              label={podTwo.label}
              sublabel={podTwo.sublabel}
              tone={step === 3 ? "amber" : "green"}
              state={step === 3 ? "active" : toApi ? "normal" : "dimmed"}
            />
            <DiagramNode x={600} y={222} width={108} height={46} label="frontend-1" sublabel="10.244.1.8" tone="green" state={step === 4 ? "active" : "dimmed"} />

            <DiagramArrow from={[114, 162]} to={[137, 162]} tone="violet" dimmed={step > 1 && step < 4} />
            <DiagramArrow from={[264, 162]} to={[287, 162]} tone="amber" dimmed={step > 1 && step < 4} />
            <DiagramArrow from={[414, 146]} to={[448, 96]} tone="blue" dimmed={step === 4} />
            <DiagramArrow from={[414, 180]} to={[448, 232]} tone="cyan" dimmed={step !== 4} />
            <DiagramArrow from={[574, 80]} to={[598, 56]} tone="green" dimmed={step === 4} />
            <DiagramArrow from={[574, 96]} to={[598, 108]} tone="green" dimmed={step === 4} />
            <DiagramArrow from={[574, 240]} to={[598, 244]} tone="green" dimmed={step !== 4} />

            {step === 3 && <DiagramLabel x={654} y={160} text="💥 api-2 đã bị thay" tone="rose" bold />}
            <DiagramLabel x={520} y={188} text={step >= 2 && step <= 3 ? "EndpointSlice: chỉ pod Ready" : "DNS: api.shop.svc.cluster.local"} tone="slate" size={11} />
            <MovingPacket key={`packet-${step}`} path={packetPath} durationSeconds={1.4} tone="amber" />
          </>
        );
      }}
    </StepDiagram>
  );
}
