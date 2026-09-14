"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramArrow, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";

type CacheScenario = "cold" | "warm";
type NodeId = "laptop" | "resolver" | "root" | "tld" | "auth";

interface DnsHop {
  from: NodeId;
  to: NodeId;
  label: string;
}

interface DnsStep extends DiagramStep {
  active: NodeId[];
  hops: DnsHop[];
  note?: string;
}

// Anchor points where arrows start/end on each node.
// The resolver has two sides: left faces the laptop, right faces the name servers.
const anchors: Record<NodeId, [number, number]> = {
  laptop: [144, 160],
  resolver: [456, 160],
  root: [556, 45],
  tld: [556, 160],
  auth: [556, 275],
};
const RESOLVER_LEFT_X = 296;

function hopPoint(id: NodeId, other: NodeId): [number, number] {
  if (id === "resolver" && other === "laptop") return [RESOLVER_LEFT_X, anchors.resolver[1]];
  return anchors[id];
}

const scenarios: Record<CacheScenario, DnsStep[]> = {
  cold: [
    { title: "Gõ URL", active: ["laptop"], hops: [], note: "cache trình duyệt / OS / /etc/hosts: trống", description: "Bạn gõ `app.example.com`. Trình duyệt và hệ điều hành xem cache của mình và `/etc/hosts` trước — lần đầu nên chưa có gì." },
    { title: "Hỏi resolver", active: ["laptop", "resolver"], hops: [{ from: "laptop", to: "resolver", label: "app.example.com A?" }], description: "Stub resolver trên máy gửi một truy vấn đệ quy (recursive) tới resolver — thường qua UDP cổng 53. Resolver là 'bưu tá' sẽ đi hỏi giùm bạn tới khi có đáp án." },
    { title: "Root", active: ["resolver", "root"], hops: [{ from: "resolver", to: "root", label: "ai quản .com?" }], description: "Resolver hỏi một root server. Root không biết IP của app, chỉ trả lời 'referral': danh sách name server của `.com` (vd `a.gtld-servers.net`)." },
    { title: "TLD .com", active: ["resolver", "tld"], hops: [{ from: "resolver", to: "tld", label: "NS example.com?" }], description: "Resolver hỏi TLD server của `.com`. Nó trả về NS record của `example.com` — tức là 'hỏi name server có thẩm quyền này nhé'." },
    { title: "Authoritative", active: ["resolver", "auth"], hops: [{ from: "resolver", to: "auth", label: "A record?" }], description: "Authoritative name server (vd Route 53, Cloudflare) giữ zone file của domain. Nó trả lời chắc chắn: `A 203.0.113.10`, `TTL 300`." },
    { title: "Trả về & cache", active: ["laptop", "resolver"], hops: [{ from: "resolver", to: "laptop", label: "203.0.113.10 · TTL 300" }], note: "resolver cache 300 giây", description: "Resolver lưu đáp án vào cache trong 300 giây (TTL) rồi trả về máy bạn. Giờ trình duyệt mới mở kết nối TCP tới `203.0.113.10:443`." },
  ],
  warm: [
    { title: "Gõ lại URL", active: ["laptop"], hops: [], note: "cache trên máy đã hết hạn", description: "Vài phút sau, một người khác cùng mạng (hoặc chính bạn sau khi cache trên máy hết hạn) truy cập `app.example.com`." },
    { title: "Cache hit", active: ["laptop", "resolver"], hops: [{ from: "laptop", to: "resolver", label: "app.example.com A?" }, { from: "resolver", to: "laptop", label: "203.0.113.10 · TTL 212" }], note: "không cần hỏi root/TLD/auth", description: "Resolver còn đáp án trong cache (TTL còn 212 giây) nên trả lời ngay, không đi hỏi root, TLD hay authoritative. Đây là lý do DNS nhanh — và cũng là lý do đổi record không có hiệu lực tức thì." },
    { title: "Hệ quả của TTL", active: ["resolver", "auth"], hops: [], note: "đổi IP ở auth ≠ mọi người thấy ngay", description: "Nếu bạn vừa đổi A record sang IP mới, resolver này vẫn trả IP cũ tới khi TTL hết. Mẹo: hạ TTL xuống (vd 60) vài giờ TRƯỚC khi migrate." },
  ],
};

export function DnsResolutionFlowDiagram() {
  const [scenario, setScenario] = useState<CacheScenario>("cold");
  const steps = scenarios[scenario];

  const nodeState = (id: NodeId, step: number) => (steps[step].active.includes(id) ? "active" : scenario === "warm" && ["root", "tld", "auth"].includes(id) ? "dimmed" : "normal");

  return (
    <div>
      <div className="not-prose -mb-4 flex flex-wrap gap-2">
        {(["cold", "warm"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setScenario(option)}
            className={clsx(
              "rounded-full px-3 py-1.5 text-sm font-medium",
              scenario === option ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
            )}
          >
            {option === "cold" ? "🧊 Lần đầu: cache trống" : "🔥 Lần sau: resolver đã cache"}
          </button>
        ))}
      </div>
      <StepDiagram key={scenario} title="DNS resolve app.example.com từng bước" viewBox="0 0 720 330" steps={steps}>
        {(step) => (
          <>
            <DiagramNode x={10} y={115} width={130} height={90} label="Laptop" sublabel="stub resolver" emoji="💻" tone="violet" state={nodeState("laptop", step)} />
            <DiagramNode x={300} y={115} width={152} height={90} label="Resolver" sublabel="1.1.1.1 / VPC DNS" emoji="📮" tone="blue" state={nodeState("resolver", step)} />
            <DiagramNode x={560} y={10} width={150} height={70} label="Root server (.)" sublabel="biết ai quản .com" tone="amber" state={nodeState("root", step)} />
            <DiagramNode x={560} y={125} width={150} height={70} label="TLD server (.com)" sublabel="biết NS của example.com" tone="cyan" state={nodeState("tld", step)} />
            <DiagramNode x={560} y={240} width={150} height={70} label="Authoritative NS" sublabel="giữ zone example.com" tone="green" state={nodeState("auth", step)} />
            {steps[step].hops.map((hop, index) => {
              const [fromX, fromY] = hopPoint(hop.from, hop.to);
              const [toX, toY] = hopPoint(hop.to, hop.from);
              const offset = steps[step].hops.length > 1 ? (index === 0 ? -14 : 14) : 0;
              return <DiagramArrow key={`${hop.from}-${hop.to}`} from={[fromX, fromY + offset]} to={[toX, toY + offset]} tone={index === 0 ? "blue" : "green"} animated label={hop.label} />;
            })}
            {steps[step].note && <DiagramLabel x={230} y={250} text={steps[step].note!} tone="slate" bold />}
          </>
        )}
      </StepDiagram>
    </div>
  );
}
