"use client";

import { DiagramArrow, DiagramNode } from "@/components/diagrams/diagram-shapes";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";

const steps: DiagramStep[] = [
  {
    title: "1. Route có organizationId",
    description:
      "`GET /api/v1/organizations/:organizationId/projects` — `organizationId` nằm sẵn trong URL, middleware dùng thẳng `request.params.organizationId`, không cần truy vấn thêm.",
  },
  {
    title: "2. Route cũ, không có organizationId",
    description:
      "`GET /api/v1/projects/:id` (đã có từ B02–B04) — URL chỉ có `id` của project, KHÔNG có `organizationId`. Phải tra ngược từ chính project đó trước khi biết nó thuộc tổ chức nào.",
  },
  {
    title: "3. Query SAI — thiếu organization_id",
    description:
      "`SELECT * FROM projects WHERE id = $1` — nếu `id` là project của tổ chức khác, câu lệnh này VẪN trả về dữ liệu vì Postgres không biết gì về 'tổ chức của người gọi'.",
  },
  {
    title: "4. Query ĐÚNG — lọc ngay trong WHERE",
    description:
      "`SELECT * FROM projects WHERE id = $1 AND organization_id = $2` — nếu project thuộc tổ chức khác, Postgres trả về 0 dòng NGAY TẠI TẦNG DỮ LIỆU, không phụ thuộc code JS có nhớ kiểm tra hay không.",
  },
  {
    title: "5. Route tasks cần JOIN",
    description:
      "`DELETE /api/v1/tasks/:id` — bảng `tasks` không có cột `organization_id`. Phải JOIN `tasks.project_id = projects.id` để lấy `projects.organization_id` rồi mới lọc theo đúng nguyên tắc ở bước 4.",
  },
];

/** So sánh route có/không có organizationId trong URL, và vì sao lọc WHERE mạnh hơn kiểm tra sau khi fetch. */
export function OrganizationScopedQueryDiagram() {
  return (
    <StepDiagram title="Lọc organization_id: trong URL, trong WHERE, hay qua JOIN" viewBox="0 0 720 320" steps={steps}>
      {(step) => (
        <>
          <DiagramNode x={16} y={20} width={150} height={64} label="Client" sublabel="token org A" emoji="💻" tone="violet" />
          <DiagramNode x={286} y={20} width={150} height={64} label="taskflow-api" sublabel="route handler" emoji="🛡️" tone="blue" />
          <DiagramNode
            x={556}
            y={20}
            width={150}
            height={64}
            label="Postgres"
            sublabel="projects / tasks"
            emoji="🗄️"
            tone="slate"
            state={step >= 2 ? "active" : "dimmed"}
          />

          {step === 0 && (
            <>
              <DiagramArrow from={[96, 90]} to={[361, 90]} tone="green" animated label="GET /organizations/:organizationId/projects" />
              <DiagramNode x={186} y={140} width={350} height={70} label="organizationId = params.organizationId" sublabel="có sẵn, không cần query thêm" tone="green" />
            </>
          )}

          {step === 1 && (
            <>
              <DiagramArrow from={[96, 90]} to={[361, 90]} tone="amber" animated label="GET /projects/:id (không có organizationId)" />
              <DiagramNode x={186} y={140} width={350} height={70} label="organizationId = ??? — chưa biết" sublabel="phải tra ngược từ project" tone="amber" />
            </>
          )}

          {step === 2 && (
            <>
              <DiagramArrow from={[361, 90]} to={[631, 90]} tone="rose" animated label="SELECT * WHERE id = $1" />
              <DiagramNode x={166} y={140} width={390} height={80} label="❌ Thiếu organization_id" sublabel="trả về project của BẤT KỲ tổ chức nào có đúng id" tone="rose" state="active" />
            </>
          )}

          {step === 3 && (
            <>
              <DiagramArrow from={[361, 90]} to={[631, 90]} tone="green" animated label="WHERE id = $1 AND organization_id = $2" />
              <DiagramNode x={166} y={140} width={390} height={80} label="✅ Lọc ngay tại DB" sublabel="tổ chức khác → 0 dòng, không lộ dữ liệu" tone="green" state="active" />
            </>
          )}

          {step === 4 && (
            <>
              <DiagramArrow from={[361, 90]} to={[631, 90]} tone="amber" animated label="JOIN tasks ON project_id = projects.id" />
              <DiagramNode x={166} y={140} width={390} height={80} label="tasks không có organization_id" sublabel="lấy qua projects.organization_id rồi mới lọc" tone="amber" state="active" />
            </>
          )}
        </>
      )}
    </StepDiagram>
  );
}
