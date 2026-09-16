"use client";

import { DiagramArrow, DiagramNode } from "@/components/diagrams/diagram-shapes";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";

/**
 * Walks a single GET /api/v1/health request through the layered folder
 * structure (routes/ -> services/ -> db/) that every later bXX module keeps
 * extending. B01 only has a trivial health-check — no domain schema yet
 * (that's B04) — so the db/ layer is shown as "chưa dùng tới" here.
 */

const steps: DiagramStep[] = [
  { title: "Client gửi request", description: "Client gọi `GET /api/v1/health`. Fastify instance ở `src/app.ts` nhận request đầu tiên." },
  { title: "routes/ nhận HTTP", description: "`src/routes/health.ts` khai báo route — lớp này CHỈ lo việc HTTP: đọc params/query, gọi đúng service, trả response. Không chứa logic nghiệp vụ." },
  { title: "services/ xử lý logic", description: "Route gọi `src/services/health-service.ts` — nơi chứa logic thật. Ở B01 logic chỉ là trả trạng thái tĩnh; từ B04 trở đi, service sẽ gọi xuống db/." },
  { title: "db/ — chưa dùng tới", description: "`src/db/client.ts` đã có sẵn (kết nối `postgres` driver) nhưng health-check B01 chưa cần đọc DB thật — domain schema (`organizations`, `projects`...) tới B04 mới có." },
  { title: "Trả response", description: "Service trả `{ status: \"ok\" }` ngược lên route, route serialize thành JSON, Fastify gửi HTTP 200 về client." },
];

export function LayeredRequestFlowDiagram() {
  return (
    <StepDiagram title="Một request đi qua routes → services → db như thế nào" viewBox="0 0 720 300" steps={steps}>
      {(step) => (
        <>
          <DiagramNode x={12} y={110} width={110} height={80} label="Client" emoji="🧑‍💻" tone="violet" state={step === 0 ? "active" : "normal"} />

          <DiagramNode
            x={170}
            y={110}
            width={130}
            height={80}
            label="routes/"
            sublabel="health.ts"
            emoji="🚪"
            tone="blue"
            state={step === 1 ? "active" : step > 1 || step === 4 ? "normal" : "dimmed"}
          />
          <DiagramNode
            x={340}
            y={110}
            width={140}
            height={80}
            label="services/"
            sublabel="health-service.ts"
            emoji="🧠"
            tone="green"
            state={step === 2 ? "active" : step > 2 ? "normal" : "dimmed"}
          />
          <DiagramNode
            x={520}
            y={110}
            width={140}
            height={80}
            label="db/"
            sublabel={step === 3 ? "chưa gọi ở B01" : "client.ts"}
            emoji="🗄️"
            tone={step === 3 ? "amber" : "slate"}
            state={step === 3 ? "active" : "dimmed"}
            dashed={step !== 3}
          />

          <DiagramArrow from={[124, 150]} to={[166, 150]} tone="violet" animated={step === 0} dimmed={step !== 0} label="HTTP GET" />
          <DiagramArrow from={[302, 145]} to={[336, 145]} tone="blue" animated={step === 1} dimmed={step !== 1} label="gọi service" />
          <DiagramArrow from={[482, 150]} to={[516, 150]} tone="green" animated={step === 2 || step === 3} dimmed={step !== 2 && step !== 3} label={step === 3 ? "(bỏ qua)" : "cần dữ liệu?"} />
          <DiagramArrow from={[340, 190]} to={[124, 190]} tone="amber" curve={-24} animated={step === 4} dimmed={step !== 4} label="{ status: 'ok' }" />

          {step === 4 && (
            <text x={360} y={250} textAnchor="middle" fontSize={13} fontWeight={600} className="fill-emerald-700 dark:fill-emerald-400">
              200 OK — route mỏng, service chứa logic, db tách riêng để dễ test từng lớp
            </text>
          )}
        </>
      )}
    </StepDiagram>
  );
}
