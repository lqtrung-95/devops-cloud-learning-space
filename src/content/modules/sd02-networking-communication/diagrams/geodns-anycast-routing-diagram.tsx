"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import { DiagramArrow, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";

type Mechanism = "geodns" | "anycast";
type Scenario = "normal" | "sg-down";

const users = [
  { id: "hn", label: "User Hà Nội", y: 30 },
  { id: "tyo", label: "User Tokyo", y: 125 },
  { id: "fra", label: "User Frankfurt", y: 220 },
];

const sites = [
  { id: "sg", label: "Singapore", ip: "203.0.113.10", y: 30 },
  { id: "tyo", label: "Tokyo", ip: "203.0.113.20", y: 125 },
  { id: "fra", label: "Frankfurt", ip: "203.0.113.30", y: 220 },
];

const ANYCAST_IP = "198.51.100.1";
const siteY = (id: string) => sites.find((site) => site.id === id)!.y + 30;

const explanations: Record<Mechanism, Record<Scenario, string>> = {
  geodns: {
    normal: "DNS trả IP KHÁC NHAU tuỳ vị trí của resolver (hoặc subnet của client nếu có EDNS Client Subnet). Mỗi region có IP riêng; user được đưa tới region gần nhất ngay từ bước phân giải tên.",
    "sg-down": "Health check phát hiện Singapore chết ⇒ DNS thôi trả 203.0.113.10. Nhưng resolver và client đã cache IP cũ tới khi TTL hết (một số client giữ lâu hơn TTL) ⇒ trong khoảng đó user Hà Nội vẫn gọi vào region chết.",
  },
  anycast: {
    normal: "MỌI PoP quảng bá CÙNG một IP qua BGP. Router trên Internet chọn đường 'ngắn nhất' theo BGP — thường là PoP gần, nhưng không đảm bảo gần nhất về địa lý. DNS không cần biết user ở đâu.",
    "sg-down": "Singapore rút route BGP ⇒ gói tin tới cùng IP tự chảy về PoP kế tiếp (Tokyo) sau khi BGP hội tụ, thường cỡ vài giây tới vài phút tuỳ mạng. Không phụ thuộc TTL; kết nối TCP đang mở tới SG sẽ bị đứt và phải nối lại.",
  },
};

export function GeodnsAnycastRoutingDiagram() {
  const [mechanism, setMechanism] = useState<Mechanism>("geodns");
  const [scenario, setScenario] = useState<Scenario>("normal");
  const sgDown = scenario === "sg-down";
  const pill = (active: boolean) =>
    clsx("rounded-full px-3 py-1.5 text-sm font-medium", active ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300");

  return (
    <DiagramFrame
      title="Đưa user tới region gần nhất: GeoDNS vs anycast"
      viewBox="0 0 720 290"
      controls={
        <div className="space-y-2 text-sm">
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setMechanism("geodns")} className={pill(mechanism === "geodns")}>
              🗺️ GeoDNS (IP theo vùng)
            </button>
            <button type="button" onClick={() => setMechanism("anycast")} className={pill(mechanism === "anycast")}>
              📍 Anycast (1 IP mọi nơi)
            </button>
            <span className="mx-1 self-center text-stone-400">|</span>
            <button type="button" onClick={() => setScenario("normal")} className={pill(!sgDown)}>
              ✅ Bình thường
            </button>
            <button type="button" onClick={() => setScenario("sg-down")} className={pill(sgDown)}>
              💥 Singapore sập
            </button>
          </div>
          <p className="leading-relaxed text-stone-700 dark:text-stone-300">{explanations[mechanism][scenario]}</p>
        </div>
      }
      caption="Thực tế thường kết hợp: CDN/edge dùng anycast để vào PoP gần nhất, còn phía sau chọn origin region bằng GeoDNS/latency-based routing hoặc load balancer toàn cầu."
    >
      {users.map((user) => (
        <DiagramNode key={user.id} x={10} y={user.y} width={140} height={60} label={user.label} tone="violet" />
      ))}
      {sites.map((site) => {
        const down = sgDown && site.id === "sg";
        return (
          <DiagramNode
            key={site.id}
            x={560}
            y={site.y}
            width={150}
            height={60}
            label={down ? `💥 ${site.label}` : site.label}
            sublabel={mechanism === "anycast" ? ANYCAST_IP : site.ip}
            tone={down ? "rose" : mechanism === "anycast" ? "cyan" : "blue"}
            state={down ? "dimmed" : "normal"}
            dashed={down}
          />
        );
      })}

      {/* Tokyo và Frankfurt không bị ảnh hưởng */}
      <DiagramArrow from={[152, 155]} to={[556, 155]} tone="green" animated />
      <DiagramArrow from={[152, 250]} to={[556, 250]} tone="green" animated />

      {!sgDown && <DiagramArrow from={[152, 60]} to={[556, 60]} tone="green" animated label={mechanism === "geodns" ? "DNS trả 203.0.113.10" : `→ ${ANYCAST_IP} (BGP gần nhất)`} />}

      {sgDown && mechanism === "geodns" && (
        <>
          <DiagramArrow from={[152, 52]} to={[556, 52]} tone="rose" label="IP cũ còn trong cache (chờ TTL)" />
          <DiagramArrow from={[152, 72]} to={[556, siteY("tyo") - 12]} tone="amber" animated label="sau khi TTL hết" curve={-20} />
        </>
      )}
      {sgDown && mechanism === "anycast" && (
        <DiagramArrow from={[152, 66]} to={[556, siteY("tyo") - 12]} tone="green" animated label="BGP hội tụ ⇒ cùng IP, PoP Tokyo" curve={-20} />
      )}

      <DiagramLabel
        x={355}
        y={285}
        text={mechanism === "geodns" ? "Tốc độ failover bị giới hạn bởi TTL + cache của client" : "Tốc độ failover phụ thuộc BGP, không phụ thuộc TTL"}
        size={12}
        tone={mechanism === "geodns" ? "amber" : "cyan"}
        bold
      />
    </DiagramFrame>
  );
}
