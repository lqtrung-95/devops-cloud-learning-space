"use client";

import { DiagramArrow, DiagramGroupBox, DiagramNode } from "@/components/diagrams/diagram-shapes";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";

const steps: DiagramStep[] = [
  {
    title: "1. Attacker đăng nhập hợp lệ",
    description: "Attacker có tài khoản thật trong **Tổ chức A**, đăng nhập bình thường qua `/auth/login` (B05) — access token có chữ ký đúng, chưa hết hạn. Không có gì bất thường ở tầng authentication.",
  },
  {
    title: "2. Biết được id của Tổ chức B",
    description: "Attacker thấy `id` của một project thuộc **Tổ chức B** — qua log lỗi, response cũ, hoặc đơn giản là UUID bị lộ ở đâu đó. UUID khó đoán nhưng không phải bí mật cần bảo vệ (khoá bảo vệ phải là kiểm tra quyền, không phải độ khó đoán của id).",
  },
  {
    title: "3. Gọi API bằng token org A, id org B",
    description: "`DELETE /api/v1/projects/:idThuocOrgB` — header vẫn là access token thật của attacker (Tổ chức A). Đây chính là IDOR: Insecure Direct Object Reference — dùng một tham chiếu (id) mà không được xác minh có thuộc về mình hay không.",
  },
  {
    title: "4. Phiên bản THIẾU kiểm tra",
    description: "Nếu handler chỉ chạy `DELETE FROM projects WHERE id = $1` — KHÔNG có `organization_id` — Postgres xoá thẳng project của Tổ chức B. Token đúng, chữ ký đúng, nhưng dữ liệu SAI tổ chức đã bị xoá.",
  },
  {
    title: "5. Phiên bản ĐÃ SỬA — không có membership",
    description: "`resolveOrganizationFromProjectId` tra ra project thuộc Tổ chức B, rồi tra `memberships(attacker, orgB)` → không có row → `404 Not Found`. Attacker không biết được project này có tồn tại hay không.",
  },
  {
    title: "6. So sánh: có membership nhưng sai role",
    description: "Nếu attacker từng là `member` trong Tổ chức B (ví dụ cựu nhân viên chưa bị gỡ), middleware tìm thấy membership → `requireRole('owner','admin')` chặn ở bước sau → `403 Forbidden`, khác `404` vì lần này họ đã được xác nhận có mặt trong tổ chức.",
  },
];

/** Token thật, chữ ký đúng — nhưng thiếu organization_id trong WHERE là đủ để rò rỉ chéo tổ chức. */
export function IdorAttackScenarioDiagram() {
  return (
    <StepDiagram title="IDOR: token org A, resource org B" viewBox="0 0 720 340" steps={steps}>
      {(step) => (
        <>
          <DiagramNode x={16} y={16} width={150} height={60} label="🥷 Attacker" sublabel="thuộc Tổ chức A" tone="rose" state={step <= 2 ? "active" : "normal"} />
          <DiagramNode x={280} y={16} width={160} height={60} label="taskflow-api" sublabel="DELETE /projects/:id" emoji="🛡️" tone="blue" />

          <DiagramGroupBox x={548} y={4} width={156} height={150} label="Tổ chức B" tone="slate">
            <DiagramNode x={556} y={30} width={140} height={56} label="project X" sublabel="không phải của attacker" tone="slate" />
          </DiagramGroupBox>

          {step === 0 && (
            <>
              <DiagramArrow from={[176, 90]} to={[280, 60]} tone="green" label="POST /auth/login (thật)" />
              <DiagramNode x={186} y={150} width={350} height={70} label="✅ Token hợp lệ, chữ ký đúng" sublabel="authentication không phát hiện gì sai" tone="green" />
            </>
          )}

          {step === 1 && (
            <DiagramNode x={90} y={150} width={520} height={70} label="👀 Attacker biết id project X (org B)" sublabel="UUID lộ qua log/response — không nên coi đó là lớp bảo vệ" tone="amber" />
          )}

          {step === 2 && (
            <DiagramArrow from={[91, 46]} to={[624, 100]} tone="rose" animated curve={-40} label="DELETE /projects/idX — Bearer <token org A>" />
          )}

          {step === 3 && (
            <>
              <DiagramArrow from={[440, 46]} to={[624, 100]} tone="rose" animated label="DELETE WHERE id=$1 (thiếu org_id)" />
              <DiagramNode x={166} y={150} width={390} height={80} label="❌ Xoá thành công dữ liệu tổ chức khác" sublabel="token đúng nhưng thiếu điều kiện organization_id" tone="rose" state="active" />
            </>
          )}

          {step === 4 && (
            <DiagramNode x={140} y={150} width={440} height={90} label="✅ 404 Not Found" sublabel="resolveOrganizationFromProjectId thấy org B, nhưng attacker không có membership ở org B" tone="green" state="active" />
          )}

          {step === 5 && (
            <DiagramNode x={130} y={150} width={460} height={90} label="⚖️ 403 Forbidden (nếu CÓ membership sai role)" sublabel="khác 404 — lần này attacker đã được xác nhận có mặt trong tổ chức" tone="amber" state="active" />
          )}
        </>
      )}
    </StepDiagram>
  );
}
