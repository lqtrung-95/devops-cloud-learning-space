"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import { DiagramArrow, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";
import { diagramToneClasses } from "@/components/diagrams/diagram-tones";

type Algorithm = "round-robin" | "least-conn" | "weighted" | "ip-hash";

const algorithmLabels: Record<Algorithm, string> = {
  "round-robin": "Round robin",
  "least-conn": "least_conn",
  weighted: "Weighted 2:1:1",
  "ip-hash": "ip_hash",
};

const SERVERS = [
  { name: "A", tone: "blue", weight: 2 },
  { name: "B", tone: "green", weight: 1 },
  { name: "C", tone: "violet", weight: 1 },
] as const;

// Every third request is a slow report export (10 ticks); the rest finish in 1 tick.
const CLIENTS = ["K1", "K2", "K1", "K3", "K1", "K1", "K2", "K1", "K3", "K1", "K1", "K2"];
const REQUESTS = CLIENTS.map((client, index) => ({ client, duration: index % 3 === 0 ? 10 : 1 }));
const CLIENT_HASH: Record<string, number> = { K1: 0, K2: 1, K3: 2 };

function activeCounts(assigned: number[], time: number): number[] {
  const counts = [0, 0, 0];
  assigned.forEach((server, index) => {
    if (index <= time && index + REQUESTS[index].duration > time) counts[server] += 1;
  });
  return counts;
}

/** Replays the first `count` arrivals (one per tick) and returns the chosen server index for each. */
function assignRequests(algorithm: Algorithm, count: number): number[] {
  const assigned: number[] = [];
  const smoothWeights = [0, 0, 0];
  const totalWeight = SERVERS.reduce((sum, server) => sum + server.weight, 0);
  let pointer = 0;
  for (let index = 0; index < count; index += 1) {
    let server = index % 3;
    if (algorithm === "least-conn") {
      const active = activeCounts(assigned, index);
      const fewest = Math.min(...active);
      server = [0, 1, 2].map((offset) => (pointer + offset) % 3).find((candidate) => active[candidate] === fewest) ?? 0;
      pointer = (server + 1) % 3;
    } else if (algorithm === "weighted") {
      // Smooth weighted round robin, the same idea nginx uses for `weight=`.
      SERVERS.forEach((item, serverIndex) => (smoothWeights[serverIndex] += item.weight));
      server = smoothWeights.indexOf(Math.max(...smoothWeights));
      smoothWeights[server] -= totalWeight;
    } else if (algorithm === "ip-hash") {
      server = CLIENT_HASH[REQUESTS[index].client];
    }
    assigned.push(server);
  }
  return assigned;
}

export function LoadBalancingAlgorithmSimulatorDiagram() {
  const [algorithm, setAlgorithm] = useState<Algorithm>("round-robin");
  const [arrived, setArrived] = useState(0);

  const assigned = assignRequests(algorithm, arrived);
  const active = arrived === 0 ? [0, 0, 0] : activeCounts(assigned, arrived - 1);
  const peaks = [0, 1, 2].map((server) => Math.max(0, ...assigned.map((_, time) => activeCounts(assigned, time)[server])));
  const lastServer = assigned[arrived - 1];

  const button = "rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-100 disabled:opacity-40 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800";
  const controls = (
    <div className="space-y-3 text-sm">
      <div className="flex flex-wrap gap-2">
        {(Object.keys(algorithmLabels) as Algorithm[]).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setAlgorithm(option)}
            className={clsx("rounded-full px-3 py-1.5 font-medium", algorithm === option ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300")}
          >
            {algorithmLabels[option]}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={button} disabled={arrived >= REQUESTS.length} onClick={() => setArrived(arrived + 1)}>
          Gửi request tiếp →
        </button>
        <button type="button" className={button} onClick={() => setArrived(REQUESTS.length)}>
          Gửi hết 12
        </button>
        <button type="button" className={button} onClick={() => setArrived(0)}>
          Reset
        </button>
        <span className="ml-auto text-stone-600 dark:text-stone-400">
          Đỉnh đồng thời: A={peaks[0]} · B={peaks[1]} · C={peaks[2]}
        </span>
      </div>
    </div>
  );

  return (
    <DiagramFrame
      title="Mô phỏng: cùng 12 request, 4 thuật toán"
      viewBox="0 0 720 360"
      controls={controls}
      caption="🐢 = export báo cáo (10 nhịp), ⚡ = request nhanh (1 nhịp). Mỗi lần bấm, một request mới đến và các request cũ chạy thêm 1 nhịp. So sánh cột 'đỉnh đồng thời' giữa các thuật toán."
    >
      <DiagramNode x={16} y={130} width={130} height={80} label="Nginx" sublabel={algorithmLabels[algorithm]} emoji="⚖️" tone="slate" state="active" />
      {SERVERS.map((server, index) => {
        const y = 20 + index * 100;
        const tones = diagramToneClasses[server.tone];
        return (
          <g key={server.name}>
            <DiagramArrow from={[148, 170]} to={[238, y + 38]} tone={lastServer === index ? server.tone : "slate"} animated={lastServer === index} dimmed={lastServer !== index} />
            <DiagramNode
              x={240}
              y={y}
              width={160}
              height={76}
              label={`Server ${server.name}`}
              sublabel={algorithm === "weighted" ? `weight=${server.weight} · đang xử lý ${active[index]}` : `đang xử lý ${active[index]}`}
              tone={server.tone}
              state={lastServer === index ? "active" : "normal"}
            />
            <rect x={420} y={y + 24} width={260} height={28} rx={8} className="fill-stone-100 dark:fill-stone-900" />
            <rect x={420} y={y + 24} width={Math.min(260, active[index] * 52)} height={28} rx={8} className={clsx(tones.fill, "transition-all duration-300")} />
            <DiagramLabel x={690} y={y + 43} text={String(active[index])} anchor="end" bold size={13} tone={server.tone} />
          </g>
        );
      })}
      {REQUESTS.map((request, index) => {
        const server = assigned[index];
        return (
          <DiagramNode
            key={index}
            x={12 + index * 58}
            y={310}
            width={52}
            height={42}
            rounded={8}
            label={request.duration > 1 ? "🐢" : "⚡"}
            sublabel={server === undefined ? request.client : `${algorithm === "ip-hash" ? request.client : ""}→${SERVERS[server].name}`}
            tone={server === undefined ? "slate" : SERVERS[server].tone}
            state={server === undefined ? "dimmed" : index === arrived - 1 ? "active" : "normal"}
          />
        );
      })}
    </DiagramFrame>
  );
}
