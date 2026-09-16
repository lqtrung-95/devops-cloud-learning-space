"use client";

import { useState } from "react";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import { DiagramArrow, DiagramGroupBox, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";

// Illustrative assumptions (must be benchmarked for a real system).
const TARGET_RPS = 5000;
const RPS_PER_INSTANCE = 400;
const POOL_PER_INSTANCE = 10;
const PG_MAX_CONNECTIONS = 100;
const PG_MAX_QPS = 3600;
const BOUNCER_SERVER_CONNECTIONS = 40;
const CACHE_DB_FRACTION = 0.2; // 80% cache hit ⇒ only 20% of requests query Postgres

function formatThousands(value: number): string {
  return String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function simulate(instances: number, bouncer: boolean, cache: boolean) {
  const dbFraction = cache ? CACHE_DB_FRACTION : 1;
  const workingInstances = bouncer ? instances : Math.min(instances, Math.floor(PG_MAX_CONNECTIONS / POOL_PER_INSTANCE));
  const appCapacity = workingInstances * RPS_PER_INSTANCE;
  const dbCapacity = PG_MAX_QPS / dbFraction;
  const served = Math.min(TARGET_RPS, appCapacity, dbCapacity);
  const errorRate = (instances - workingInstances) / instances;
  const pgConnections = bouncer ? Math.min(instances * POOL_PER_INSTANCE, BOUNCER_SERVER_CONNECTIONS) : Math.min(instances * POOL_PER_INSTANCE, PG_MAX_CONNECTIONS);
  const dbCpu = Math.round(((served * dbFraction) / PG_MAX_QPS) * 100);
  let bottleneck = "CPU app — thêm instance còn giúp";
  if (errorRate > 0) bottleneck = "connection DB (max_connections)";
  else if (served >= TARGET_RPS) bottleneck = "không nghẽn — đủ tải mục tiêu";
  else if (dbCapacity < appCapacity) bottleneck = "CPU Postgres — thêm app vô ích";
  return { workingInstances, served, errorRate, pgConnections, dbCpu, bottleneck, wantedConnections: instances * POOL_PER_INSTANCE };
}

export function AutoscalingBottleneckSliderDiagram() {
  const [instances, setInstances] = useState(4);
  const [bouncer, setBouncer] = useState(false);
  const [cache, setCache] = useState(false);
  const result = simulate(instances, bouncer, cache);
  const bottleneckTone = result.served >= TARGET_RPS && result.errorRate === 0 ? "green" : "rose";

  const controls = (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-stone-700 dark:text-stone-300">
      <label className="flex items-center gap-3">
        <span className="font-medium">Số instance app: {instances}</span>
        <input type="range" min={1} max={12} value={instances} onChange={(event) => setInstances(Number(event.target.value))} className="w-40 accent-indigo-600" />
      </label>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={bouncer} onChange={() => setBouncer(!bouncer)} className="size-4 accent-indigo-600" />
        PgBouncer (pool {BOUNCER_SERVER_CONNECTIONS} kết nối tới Postgres)
      </label>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={cache} onChange={() => setCache(!cache)} className="size-4 accent-indigo-600" />
        Cache Redis, hit 80% (SD04)
      </label>
    </div>
  );

  return (
    <DiagramFrame
      title="Kéo số instance — bottleneck chạy đi đâu?"
      viewBox="0 0 720 300"
      controls={controls}
      caption={`Giả định minh hoạ: mỗi instance cỡ ${RPS_PER_INSTANCE} RPS, pool ${POOL_PER_INSTANCE} kết nối/instance, Postgres max_connections ${PG_MAX_CONNECTIONS} và chịu cỡ ${PG_MAX_QPS} query/s. Mô hình đơn giản hoá: instance không lấy được kết nối DB thì request của nó lỗi. Số thật phải đo bằng k6.`}
    >
      <DiagramNode x={8} y={108} width={112} height={84} label="k6" sublabel={`muốn ${TARGET_RPS} RPS`} emoji="📈" tone="violet" />
      <DiagramArrow from={[122, 150]} to={[142, 150]} tone="violet" />
      <DiagramNode x={144} y={108} width={100} height={84} label="Nginx" sublabel="LB" emoji="⚖️" tone="blue" />
      <DiagramArrow from={[246, 150]} to={[266, 150]} tone="blue" />
      <DiagramGroupBox x={268} y={16} width={214} height={262} label={`app × ${instances}`} tone="cyan">
        {Array.from({ length: 12 }, (_, index) => {
          const exists = index < instances;
          const working = index < result.workingInstances;
          return (
            <DiagramNode
              key={index}
              x={282 + (index % 3) * 66}
              y={40 + Math.floor(index / 3) * 58}
              width={56}
              height={46}
              rounded={8}
              label={exists ? (working ? "✓" : "✗") : "·"}
              sublabel={exists ? `#${index + 1}` : undefined}
              tone={working ? "cyan" : exists ? "rose" : "slate"}
              state={exists ? "normal" : "dimmed"}
              dashed={!exists}
            />
          );
        })}
      </DiagramGroupBox>
      <DiagramArrow from={[484, 150]} to={[596, 150]} tone={result.errorRate > 0 ? "rose" : "slate"} label={`${result.wantedConnections} kết nối`} />
      <DiagramNode x={506} y={30} width={96} height={56} label="PgBouncer" sublabel={bouncer ? "đang bật" : "tắt"} tone="amber" state={bouncer ? "active" : "dimmed"} />
      <DiagramNode
        x={598}
        y={108}
        width={114}
        height={84}
        label="Postgres"
        sublabel={`CPU ~${result.dbCpu}%`}
        emoji="🐘"
        tone={result.dbCpu >= 100 || result.errorRate > 0 ? "rose" : "green"}
        state="active"
      />
      <DiagramLabel x={500} y={220} text={`Kết nối Postgres: ${result.pgConnections}/${PG_MAX_CONNECTIONS}`} anchor="start" size={12.5} tone={result.errorRate > 0 ? "rose" : "slate"} />
      <DiagramLabel x={500} y={242} text={`Phục vụ ~${formatThousands(result.served)} RPS · lỗi ${Math.round(result.errorRate * 100)}%`} anchor="start" size={12.5} bold />
      <DiagramLabel x={500} y={266} text="Nghẽn:" anchor="start" size={12.5} bold tone={bottleneckTone} />
      <DiagramLabel x={500} y={286} text={result.bottleneck} anchor="start" size={11.5} bold tone={bottleneckTone} />
    </DiagramFrame>
  );
}
