"use client";

import { DiagramArrow, DiagramNode } from "@/components/diagrams/diagram-shapes";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";

const steps: DiagramStep[] = [
  {
    title: "1. Request tới",
    description: "`DELETE /api/v1/projects/:id` kèm `Authorization: Bearer <access token>`. Ba hook sẽ chạy TUẦN TỰ trước khi tới handler thật sự.",
  },
  {
    title: "2. Hook authenticate",
    description: "`request.jwtVerify()` (từ B05) kiểm tra chữ ký + `exp`. Hợp lệ → gắn `request.userId`. Sai thì dừng ở đây với `401`, các hook sau không chạy.",
  },
  {
    title: "3. Hook resolveOrganizationFromProjectId",
    description: "Tra `SELECT organization_id FROM projects WHERE id = $1`. Không có project → `404` dừng ngay. Có project → tiếp tục tra `memberships(userId, organizationId)`.",
  },
  {
    title: "4. Không có membership",
    description: "`memberships` không có row cho `(userId, organizationId)` này → trả `404` — với người này, project coi như không tồn tại (không xác nhận nó thuộc tổ chức nào).",
  },
  {
    title: "5. Có membership → hook requireRole",
    description: "Có row → gắn `request.organizationId` và `request.membershipRole`. `requireRole('owner', 'admin')` kiểm tra role có nằm trong danh sách cho phép.",
  },
  {
    title: "6a. Role không đủ",
    description: "`membershipRole = 'member'` không nằm trong `['owner', 'admin']` → trả `403 Forbidden` — đã xác nhận có mặt trong tổ chức, chỉ là không đủ quyền xoá.",
  },
  {
    title: "6b. Role đủ quyền",
    description: "`membershipRole = 'admin'` → hook cho qua, handler chạy `DELETE FROM projects WHERE id = $1 AND organization_id = $2` → `204 No Content`.",
  },
];

/** Bước qua từng preHandler hook: authenticate → resolveOrganizationContext → requireRole → allow/deny. */
export function RequireRoleMiddlewarePipelineDiagram() {
  return (
    <StepDiagram title="Chain hook: authenticate → resolveOrganizationContext → requireRole" viewBox="0 0 720 340" steps={steps}>
      {(step) => {
        const hookState = (hookStep: number) => (step === hookStep ? "active" : step > hookStep ? "normal" : "dimmed");
        return (
          <>
            <DiagramNode x={16} y={20} width={120} height={56} label="Client" emoji="💻" tone="violet" state={step === 0 ? "active" : "normal"} />
            <DiagramNode x={186} y={20} width={150} height={56} label="authenticate" sublabel="verify JWT" emoji="🪪" tone="blue" state={hookState(1)} />
            <DiagramNode x={366} y={20} width={190} height={56} label="resolveOrganizationContext" sublabel="tra org + role" emoji="🏢" tone="amber" state={hookState(2)} />
            <DiagramNode x={586} y={20} width={118} height={56} label="requireRole" sublabel="check role" emoji="🛂" tone="cyan" state={step >= 4 ? "active" : "dimmed"} />

            {step >= 1 && step <= 2 && <DiagramArrow from={[136, 48]} to={[186, 48]} tone="blue" animated={step === 1} />}
            {step >= 2 && <DiagramArrow from={[336, 48]} to={[366, 48]} tone="amber" animated={step === 2} />}
            {step >= 4 && <DiagramArrow from={[556, 48]} to={[586, 48]} tone="cyan" animated={step === 4} />}

            {step === 0 && (
              <DiagramNode x={186} y={140} width={350} height={70} label="Bearer <access token>" sublabel="chưa hook nào chạy" tone="slate" />
            )}

            {step === 1 && (
              <DiagramNode x={186} y={140} width={350} height={70} label="Chữ ký + exp hợp lệ" sublabel="gắn request.userId" tone="blue" state="active" />
            )}

            {step === 2 && (
              <DiagramNode x={160} y={140} width={400} height={90} label="SELECT organization_id FROM projects WHERE id=$1" sublabel="rồi tra memberships(userId, organizationId)" tone="amber" state="active" />
            )}

            {step === 3 && (
              <DiagramNode x={186} y={140} width={350} height={80} label="❌ Không có membership" sublabel="404 Not Found — dừng chain ngay" tone="rose" state="active" />
            )}

            {step === 4 && (
              <DiagramNode x={186} y={140} width={350} height={80} label="✅ Có membership" sublabel="gắn organizationId + membershipRole" tone="green" state="active" />
            )}

            {step === 5 && (
              <DiagramNode x={186} y={140} width={350} height={80} label="🙅 role = member" sublabel="403 Forbidden — có mặt nhưng không đủ quyền" tone="rose" state="active" />
            )}

            {step === 6 && (
              <DiagramNode x={186} y={140} width={350} height={80} label="🙆 role = admin" sublabel="handler chạy → DELETE ... AND organization_id=$2 → 204" tone="green" state="active" />
            )}
          </>
        );
      }}
    </StepDiagram>
  );
}
