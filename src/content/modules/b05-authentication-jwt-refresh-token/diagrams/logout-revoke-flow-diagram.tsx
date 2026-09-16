"use client";

import { DiagramArrow, DiagramNode } from "@/components/diagrams/diagram-shapes";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";

const steps: DiagramStep[] = [
  { title: "1. Trạng thái ban đầu", description: "Row trong `refresh_tokens` của An: `token_hash = 7a2f…`, `revoked_at = NULL`. Token còn dùng được để refresh." },
  { title: "2. Gọi /auth/logout", description: "Client gửi `POST /api/v1/auth/logout` kèm refresh token (từ cookie). Server hash chuỗi nhận được để tìm đúng row — KHÔNG so sánh chuỗi thô." },
  { title: "3. Revoke trong DB", description: "Server chạy `UPDATE refresh_tokens SET revoked_at = now() WHERE token_hash = $1`. Đây là bước quan trọng nhất — logout thật sự xảy ra ở đây, trong DB." },
  { title: "4. Xoá cookie ở response", description: "Sau khi DB đã revoke, server mới `reply.clearCookie('refreshToken')`. Thứ tự này không quan trọng cho bảo mật (row đã revoke là đủ) nhưng dọn sạch phía client." },
  { title: "5. Attacker vẫn giữ token cũ?", description: "Giả sử trước đó attacker đã sao chép được refresh token gốc (qua log, XSS...). Họ gọi `/auth/refresh` bằng đúng chuỗi đó." },
  { title: "6. Bị từ chối", description: "Server hash chuỗi, tìm đúng row — nhưng `revoked_at` không còn NULL. Trả `401`. Nếu chỉ xoá cookie mà không revoke DB, bước này sẽ SAI: attacker vẫn refresh được." },
];

export function LogoutRevokeFlowDiagram() {
  return (
    <StepDiagram title="Logout: revoke trong DB, không chỉ xoá cookie" viewBox="0 0 720 300" steps={steps}>
      {(step) => (
        <>
          <DiagramNode x={16} y={30} width={160} height={64} label="Client (An)" sublabel="có cookie refresh" emoji="🧑" tone="violet" state={step <= 3 ? "active" : "dimmed"} />
          <DiagramNode x={16} y={200} width={160} height={64} label="Attacker" sublabel="đã sao chép token cũ" emoji="🦹" tone="rose" state={step >= 4 ? "active" : "dimmed"} />

          <DiagramNode x={280} y={110} width={160} height={70} label="taskflow-api" sublabel="/auth/logout · /auth/refresh" emoji="🛡️" tone="blue" />

          <DiagramNode
            x={534}
            y={90}
            width={170}
            height={110}
            label="refresh_tokens"
            sublabel="row: token_hash 7a2f…"
            emoji="🗄️"
            tone={step >= 2 ? "rose" : "green"}
            state="active"
          />
          <DiagramNode
            x={548}
            y={166}
            width={140}
            height={26}
            label={step >= 2 ? "revoked_at: 09:14:02" : "revoked_at: NULL"}
            tone={step >= 2 ? "rose" : "green"}
            state="active"
          />

          {step === 1 && <DiagramArrow from={[176, 62]} to={[278, 130]} tone="violet" animated label="POST /auth/logout" />}
          {step === 2 && <DiagramArrow from={[440, 145]} to={[532, 145]} tone="rose" animated label="UPDATE … revoked_at=now()" />}
          {step === 3 && <DiagramArrow from={[278, 150]} to={[176, 80]} tone="slate" label="clearCookie()" />}
          {step === 4 && <DiagramArrow from={[176, 232]} to={[278, 165]} tone="rose" animated label="POST /auth/refresh (token cũ)" />}
          {step === 5 && (
            <>
              <DiagramArrow from={[440, 145]} to={[532, 145]} tone="slate" label="SELECT … token_hash=…" />
              <DiagramArrow from={[278, 190]} to={[176, 250]} tone="rose" label="401: đã revoke" />
            </>
          )}
        </>
      )}
    </StepDiagram>
  );
}
