"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import { DiagramArrow, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";
import type { DiagramTone } from "@/components/diagrams/diagram-tones";
import { InlineCodeText } from "@/components/ui/inline-code-text";

const hops: { label: string; sublabel: string; emoji: string; layer: string; tone: DiagramTone }[] = [
  { label: "curl", sublabel: "laptop", emoji: "💻", layer: "bắt đầu", tone: "violet" },
  { label: "DNS", sublabel: "tên → IP", emoji: "📮", layer: "DNS", tone: "blue" },
  { label: "Firewall", sublabel: "ufw / SG", emoji: "🧱", layer: "L3–L4", tone: "amber" },
  { label: "Nginx :443", sublabel: "TCP + TLS", emoji: "🔐", layer: "L4 + TLS", tone: "cyan" },
  { label: "App :3000", sublabel: "upstream", emoji: "⚙️", layer: "L7 HTTP", tone: "green" },
];

interface Scenario {
  id: string;
  button: string;
  /** Index of the hop where the request dies; null = success. */
  breakAt: number | null;
  failText: string;
  curlOutput: string;
  debugCommand: string;
  debugOutput: string;
  meaning: string;
}

const scenarios: Scenario[] = [
  { id: "ok", button: "✅ 200 OK", breakAt: null, failText: "", curlOutput: "< HTTP/2 200\n< content-type: text/html", debugCommand: "curl -sv -o /dev/null https://app.example.com 2>&1 | grep -E '^(\\*|<) '", debugOutput: "* Connected to app.example.com (203.0.113.10) port 443\n* SSL certificate verify ok.\n< HTTP/2 200", meaning: "Cả chuỗi thông suốt: DNS ra IP, firewall cho qua, Nginx bắt tay TLS, app trả lời." },
  { id: "dns", button: "Could not resolve host", breakAt: 1, failText: "❌ Không ra IP", curlOutput: "curl: (6) Could not resolve host: app.example.com", debugCommand: "dig app.example.com", debugOutput: ";; ->>HEADER<<- opcode: QUERY, status: NXDOMAIN, id: 4121", meaning: "Chết ngay ở bước tra địa chỉ. Kiểm tra record đã tạo chưa, gõ đúng tên chưa, resolver nào đang dùng (`resolvectl status`)." },
  { id: "timeout", button: "Timeout", breakAt: 2, failText: "❌ Gói bị DROP", curlOutput: "curl: (28) Failed to connect to app.example.com port 443 after 10002 ms: Timeout was reached", debugCommand: "nc -vz -w 5 203.0.113.10 443", debugOutput: "nc: connect to 203.0.113.10 port 443 (tcp) timed out: Operation now in progress", meaning: "Gửi SYN đi mà không ai trả lời — thường là firewall/Security Group lặng lẽ DROP, sai route, hoặc máy đã tắt. Timeout = im lặng." },
  { id: "refused", button: "Connection refused", breakAt: 3, failText: "❌ Không ai nghe :443", curlOutput: "curl: (7) Failed to connect to app.example.com port 443 after 35 ms: Couldn't connect to server", debugCommand: "sudo ss -tlnp | grep ':443'", debugOutput: "(không có dòng nào — chưa process nào LISTEN cổng 443)", meaning: "Gói tới được máy nhưng không có process nào nghe cổng đó, kernel trả RST ngay (rất nhanh, vài ms). Refused = có người nhà nhưng đóng cửa. Bản curl cũ in `Connection refused`." },
  { id: "tls", button: "SSL certificate problem", breakAt: 3, failText: "❌ Cert hết hạn", curlOutput: "curl: (60) SSL certificate problem: certificate has expired", debugCommand: "echo | openssl s_client -connect app.example.com:443 -servername app.example.com 2>/dev/null | openssl x509 -noout -dates", debugOutput: "notBefore=Jun  1 00:00:00 2026 GMT\nnotAfter=Aug 30 23:59:59 2026 GMT", meaning: "TCP đã thông, nhưng bước TLS thất bại: cert hết hạn, sai tên miền, hoặc thiếu intermediate. Kiểm tra `certbot renew` và file fullchain." },
  { id: "bad-gateway", button: "502 Bad Gateway", breakAt: 4, failText: "❌ Upstream chết", curlOutput: "< HTTP/2 502\n<center>nginx</center>", debugCommand: "sudo tail -n 1 /var/log/nginx/error.log", debugOutput: "connect() failed (111: Connection refused) while connecting to upstream, upstream: \"http://127.0.0.1:3000/\"", meaning: "Mạng từ bạn tới Nginx hoàn toàn ổn — 502 là Nginx nói 'tôi không gọi được app phía sau'. Xem `systemctl status app` và `journalctl -u app`." },
];

const HOP_WIDTH = 124;
const hopX = (index: number) => 10 + index * (HOP_WIDTH + 20);

export function NetworkDebuggingScenariosDiagram() {
  const [scenarioId, setScenarioId] = useState("timeout");
  const scenario = scenarios.find((item) => item.id === scenarioId) ?? scenarios[0];
  const breakAt = scenario.breakAt ?? hops.length;

  return (
    <DiagramFrame
      title="Request chết ở đâu? Chọn thông báo lỗi để khoanh vùng"
      viewBox="0 0 720 250"
      controls={
        <div className="space-y-3 text-sm">
          <div className="flex flex-wrap gap-2">
            {scenarios.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setScenarioId(item.id)}
                className={clsx("rounded-full px-3 py-1 font-mono text-[12.5px]", item.id === scenarioId ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300")}
              >
                {item.button}
              </button>
            ))}
          </div>
          <div className="space-y-2 overflow-x-auto rounded-xl bg-stone-900 px-4 py-3 font-mono text-[12.5px] leading-relaxed whitespace-pre text-stone-100">
            <div>
              <span className="text-emerald-400">$</span> curl -v https://app.example.com
            </div>
            <div className="text-rose-300">{scenario.curlOutput}</div>
            <div className="text-stone-500"># Công cụ khoanh vùng:</div>
            <div>
              <span className="text-emerald-400">$</span> {scenario.debugCommand}
            </div>
            <div className="text-amber-200">{scenario.debugOutput}</div>
          </div>
        </div>
      }
      caption={<InlineCodeText text={scenario.meaning} />}
    >
      {hops.map((hop, index) => {
        const failed = index === scenario.breakAt;
        const reached = index <= breakAt;
        return (
          <g key={hop.label}>
            {index > 0 && <DiagramArrow from={[hopX(index) - 18, 90]} to={[hopX(index) - 3, 90]} tone={reached ? (failed ? "rose" : "green") : "slate"} dimmed={!reached} />}
            <DiagramNode
              x={hopX(index)}
              y={40}
              width={HOP_WIDTH}
              height={100}
              label={hop.label}
              sublabel={hop.sublabel}
              emoji={failed ? "💥" : hop.emoji}
              tone={failed ? "rose" : hop.tone}
              state={failed ? "active" : reached ? "normal" : "dimmed"}
            />
            <DiagramLabel x={hopX(index) + HOP_WIDTH / 2} y={24} text={hop.layer} size={11.5} tone="slate" />
            {failed && <DiagramLabel x={hopX(index) + HOP_WIDTH / 2} y={166} text={scenario.failText} tone="rose" bold />}
          </g>
        );
      })}
      <DiagramLabel
        x={360}
        y={220}
        text={scenario.breakAt === null ? "✅ Request đi hết đường và quay về" : `Mọi thứ bên trái ${hops[scenario.breakAt].label} đã ổn → chỉ cần điều tra từ đây trở đi`}
        tone={scenario.breakAt === null ? "green" : "amber"}
        bold
        size={13}
      />
    </DiagramFrame>
  );
}
