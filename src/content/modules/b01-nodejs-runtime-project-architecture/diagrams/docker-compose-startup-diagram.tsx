"use client";

import { DiagramArrow, DiagramGroupBox, DiagramNode } from "@/components/diagrams/diagram-shapes";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";

/**
 * Walks `docker compose up -d --build` bringing up the 3 services this
 * module introduces (spec is locked in docs/backend-curriculum.md §3 —
 * ports and env vars below are copied verbatim, never improvised).
 */

const steps: DiagramStep[] = [
  { title: "docker compose up", description: "Bạn chạy `docker compose up -d --build`. Compose đọc `docker-compose.yml` và bắt đầu dựng từng service." },
  { title: "Build image api", description: "Compose build image `api` từ `Dockerfile` (multi-stage, base `node:22-slim`) — chưa start container vội." },
  { title: "postgres khởi động", description: "Container `postgres:17` start với `POSTGRES_USER=taskflow`, `POSTGRES_PASSWORD=taskflow`, `POSTGRES_DB=taskflow`. Healthcheck `pg_isready -U taskflow` bắt đầu chạy định kỳ." },
  { title: "redis khởi động", description: "Container `redis:7` start song song, expose cổng host `6380` (container vẫn là `6379`)." },
  { title: "Chờ healthy", description: "Compose chờ healthcheck của `postgres` báo `healthy` trước khi cho `api` start (nếu khai báo `depends_on: condition: service_healthy`)." },
  { title: "api kết nối", description: "Container `api` start, đọc `DATABASE_URL=postgres://taskflow:taskflow@postgres:5432/taskflow` và `REDIS_URL=redis://redis:6379` — cổng container luôn là 5432/6379, port lạ (5434/6380) chỉ dành cho host." },
  { title: "Health-check pass", description: "`curl http://localhost:3000/api/v1/health` (từ host, dùng port map 3000) trả về `{ \"status\": \"ok\" }` — cả 3 service đã chạy đúng." },
];

export function DockerComposeStartupDiagram() {
  return (
    <StepDiagram title="docker compose up -d --build — 3 service khởi động theo thứ tự nào" viewBox="0 0 720 340" steps={steps}>
      {(step) => {
        const apiState = step >= 5 ? "active" : step === 1 ? "active" : "dimmed";
        const pgState = step === 2 || step === 4 ? "active" : step >= 2 ? "normal" : "dimmed";
        const redisState = step === 3 ? "active" : step >= 3 ? "normal" : "dimmed";
        return (
          <>
            <DiagramNode x={16} y={16} width={110} height={70} label="Bạn" sublabel="docker compose" emoji="🧑‍💻" tone="violet" state={step === 0 ? "active" : "normal"} />

            <DiagramGroupBox x={170} y={10} width={534} height={200} label="taskflow-api (docker-compose.yml)" tone="slate">
              <DiagramNode x={20} y={40} width={150} height={78} label="api" sublabel="build ./Dockerfile · 3000:3000" emoji="🚀" tone="blue" state={apiState} />
              <DiagramNode x={195} y={40} width={150} height={78} label="postgres:17" sublabel="5434:5432 · pg_isready" emoji="🐘" tone="green" state={pgState} />
              <DiagramNode x={370} y={40} width={150} height={78} label="redis:7" sublabel="6380:6379" emoji="🧠" tone="amber" state={redisState} />

              <DiagramArrow from={[95, 150]} to={[95, 122]} tone="blue" curve={0} dimmed={step < 5} animated={step === 5} label="DATABASE_URL" />
              <DiagramArrow from={[270, 150]} to={[95, 122]} tone="blue" curve={-20} dimmed={step < 5} animated={step === 5} label="REDIS_URL" />
              <DiagramArrow from={[195, 79]} to={[170, 79]} tone="green" dimmed={step !== 4} animated={step === 4} label="healthy?" />
            </DiagramGroupBox>

            <DiagramArrow from={[126, 51]} to={[166, 51]} tone="violet" animated={step === 0} dimmed={step !== 0} label="up -d --build" />

            {step === 6 && (
              <text x={360} y={250} textAnchor="middle" fontSize={14} fontWeight={700} className="fill-emerald-700 dark:fill-emerald-400">
                curl http://localhost:3000/api/v1/health → {`{ "status": "ok" }`}
              </text>
            )}
            {step === 5 && (
              <text x={360} y={250} textAnchor="middle" fontSize={12.5} className="fill-stone-600 dark:fill-stone-400">
                Bên trong network Compose, service gọi nhau qua cổng container gốc (5432 / 6379) — không phải cổng host (5434 / 6380)
              </text>
            )}
          </>
        );
      }}
    </StepDiagram>
  );
}
