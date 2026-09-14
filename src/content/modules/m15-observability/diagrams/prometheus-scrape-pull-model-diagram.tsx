"use client";

import { DiagramArrow, DiagramGroupBox, DiagramLabel, DiagramNode, MovingPacket } from "@/components/diagrams/diagram-shapes";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";

const steps: DiagramStep[] = [
  {
    title: "App expose /metrics",
    description: "App dùng thư viện client (vd `prom-client`) giữ counter `http_requests_total` trong RAM và trả về dạng text tại `/metrics`. App KHÔNG gửi đi đâu cả — như công-tơ điện gắn ở mỗi nhà.",
  },
  {
    title: "ServiceMonitor khai báo",
    description: "Bạn tạo `ServiceMonitor` (label `release: monitoring`). Prometheus Operator đọc nó và sinh cấu hình scrape: 'cứ 30 giây vào Service checkout, port http, path /metrics'.",
  },
  {
    title: "Prometheus đi scrape",
    description: "Prometheus chủ động gọi HTTP GET tới từng pod — như nhân viên điện lực đi ghi số công-tơ từng nhà. Pod không trả lời → metric `up` = 0.",
  },
  {
    title: "Lưu vào TSDB",
    description: "Mỗi lần scrape tạo một sample (timestamp, giá trị) cho mỗi time series. Series = tên metric + bộ label. Nhiều label giá trị lạ (user_id) = bùng nổ cardinality.",
  },
  {
    title: "rate() tính tốc độ",
    description: "Counter chỉ tăng: 1000 → 1750 → 2500. `rate(http_requests_total[5m])` lấy độ tăng trong cửa sổ 5 phút chia cho số giây → ~5 req/s. Pod restart làm counter về 0, rate() tự nhận ra và bù.",
  },
  {
    title: "Grafana & rules dùng lại",
    description: "Grafana gửi PromQL tới Prometheus để vẽ. Recording rule tính sẵn truy vấn nặng (`job:http_requests:rate5m`); alerting rule đánh giá điều kiện rồi đẩy alert sang Alertmanager.",
  },
];

const samples = [
  { t: "t0", v: 1000 },
  { t: "+150s", v: 1750 },
  { t: "+300s", v: 2500 },
];

export function PrometheusScrapePullModelDiagram() {
  return (
    <StepDiagram title="Prometheus pull model — từ /metrics tới biểu đồ" viewBox="0 0 720 320" steps={steps}>
      {(step) => (
        <>
          <DiagramGroupBox x={8} y={8} width={230} height={300} label="Namespace shop" tone="slate">
            <DiagramNode x={30} y={44} width={186} height={70} label="checkout pod" sublabel="GET /metrics" emoji="🛒" tone="green" state={step === 0 || step === 2 ? "active" : "normal"} />
            <DiagramNode x={30} y={134} width={186} height={62} label="checkout pod #2" sublabel="GET /metrics" tone="green" state={step === 2 ? "active" : "normal"} />
            <DiagramNode x={30} y={220} width={186} height={70} label="ServiceMonitor" sublabel="release: monitoring" emoji="📋" tone="violet" state={step === 1 ? "active" : step < 1 ? "dimmed" : "normal"} />
          </DiagramGroupBox>

          <DiagramNode x={300} y={40} width={180} height={90} label="Prometheus" sublabel="scrape mỗi 30s" emoji="🔥" tone="amber" state={step >= 2 && step <= 4 ? "active" : "normal"} />
          <DiagramNode x={300} y={200} width={180} height={80} label="TSDB" sublabel="samples theo series" emoji="🗄️" tone="cyan" state={step === 3 || step === 4 ? "active" : step < 3 ? "dimmed" : "normal"} />
          <DiagramNode x={540} y={40} width={170} height={90} label="Grafana" sublabel="PromQL query" emoji="📈" tone="blue" state={step === 5 ? "active" : step < 5 ? "dimmed" : "normal"} />
          <DiagramNode x={540} y={200} width={170} height={80} label="Alertmanager" sublabel="nhận alert" emoji="🚨" tone="rose" state={step === 5 ? "active" : "dimmed"} />

          <DiagramArrow from={[218, 255]} to={[296, 110]} tone="violet" label="config" dimmed={step !== 1} animated={step === 1} curve={-30} />
          <DiagramArrow from={[296, 80]} to={[220, 80]} tone="amber" label="pull" dimmed={step !== 2} animated={step === 2} />
          <DiagramArrow from={[296, 100]} to={[220, 164]} tone="amber" dimmed={step !== 2} animated={step === 2} />
          <DiagramArrow from={[390, 132]} to={[390, 196]} tone="cyan" dimmed={step < 3} animated={step === 3} />
          <DiagramArrow from={[536, 85]} to={[484, 85]} tone="blue" label="query" dimmed={step !== 5} animated={step === 5} />
          <DiagramArrow from={[484, 240]} to={[536, 240]} tone="rose" label="alerts" dimmed={step !== 5} animated={step === 5} />

          {step === 2 && <MovingPacket key="scrape" path="M 220 80 L 296 80" durationSeconds={1.2} tone="amber" label="samples" />}
          {step === 4 &&
            samples.map((sample, index) => (
              <DiagramLabel key={sample.t} x={500 + index * 72} y={170} text={`${sample.t}: ${sample.v}`} tone="cyan" size={11} />
            ))}
          {step === 4 && <DiagramLabel x={612} y={300} text="(2500−1000)/300s = 5 req/s" tone="cyan" bold size={12} />}
        </>
      )}
    </StepDiagram>
  );
}
