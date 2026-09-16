"use client";

import { DiagramArrow, DiagramNode } from "@/components/diagrams/diagram-shapes";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";

const steps: DiagramStep[] = [
  { title: "1. Login", description: "`POST /api/v1/auth/login` đúng mật khẩu. Server ký access token JWT (15 phút, chứa `sub: userId`) và sinh refresh token ngẫu nhiên (7 ngày) — hash refresh token rồi lưu vào bảng `refresh_tokens`." },
  { title: "2. Gọi API (còn hạn)", description: "Client gắn access token vào header `Authorization: Bearer <jwt>`. Server chỉ verify chữ ký + `exp` — KHÔNG query DB — nên rất nhanh. Hợp lệ → `200`." },
  { title: "3. 16 phút sau — hết hạn", description: "Access token đã qua mốc `exp`. Cùng request y hệt, nhưng `request.jwtVerify()` ném lỗi hết hạn → server trả `401`. Đây là hành vi ĐÚNG, không phải bug." },
  { title: "4. Gọi /auth/refresh", description: "Client gửi refresh token (trong cookie httpOnly) tới `POST /api/v1/auth/refresh`. Server hash chuỗi nhận được, tra `refresh_tokens` theo `token_hash`, kiểm tra `revoked_at IS NULL` và `expires_at > now()`." },
  { title: "5. Cấp access token mới", description: "Refresh token hợp lệ → server ký access token JWT mới (lại 15 phút) và trả về. Refresh token có thể được xoay vòng (revoke cũ, phát mới) để giới hạn thời gian sống nếu bị lộ." },
  { title: "6. Request gốc đi tiếp", description: "Client dùng access token mới, gọi lại đúng request ban đầu — lần này thành công. Toàn bộ quá trình xảy ra trong suốt với người dùng, không cần đăng nhập lại." },
];

export function JwtTokenLifecycleDiagram() {
  return (
    <StepDiagram title="Access + refresh token qua nhiều request" viewBox="0 0 720 320" steps={steps}>
      {(step) => (
        <>
          <DiagramNode x={16} y={30} width={160} height={70} label="Client" sublabel="browser / app" emoji="💻" tone="violet" state="normal" />
          <DiagramNode x={280} y={30} width={160} height={70} label="taskflow-api" sublabel="Fastify" emoji="🛡️" tone="blue" state="normal" />
          <DiagramNode x={544} y={30} width={160} height={70} label="refresh_tokens" sublabel="Postgres" emoji="🗄️" tone="slate" state={step === 0 || step >= 3 ? "active" : "dimmed"} />

          {/* Step 0: login issues both tokens */}
          {step === 0 && (
            <>
              <DiagramArrow from={[96, 100]} to={[360, 100]} tone="violet" label="POST /auth/login" />
              <DiagramArrow from={[360, 130]} to={[624, 130]} tone="amber" label="insert hash(refresh)" />
              <DiagramNode x={230} y={150} width={260} height={54} label="🎫 access (15p) + 🔁 refresh (7d)" sublabel="trả về client" tone="green" state="active" />
            </>
          )}

          {/* Step 1: valid access token call */}
          {step === 1 && (
            <>
              <DiagramArrow from={[96, 100]} to={[360, 100]} tone="green" animated label="Authorization: Bearer <jwt>" />
              <DiagramNode x={230} y={150} width={260} height={54} label="verify chữ ký + exp → OK" sublabel="không query DB" tone="green" state="active" />
              <DiagramArrow from={[360, 190]} to={[96, 190]} tone="green" label="200 OK" />
            </>
          )}

          {/* Step 2: expired token */}
          {step === 2 && (
            <>
              <DiagramArrow from={[96, 100]} to={[360, 100]} tone="rose" animated label="Bearer <jwt hết hạn>" />
              <DiagramNode x={230} y={150} width={260} height={54} label="exp đã qua → verify fail" sublabel="jwtVerify() throw" tone="rose" state="active" />
              <DiagramArrow from={[360, 190]} to={[96, 190]} tone="rose" label="401 Unauthorized" />
            </>
          )}

          {/* Step 3: refresh call, DB lookup */}
          {step === 3 && (
            <>
              <DiagramArrow from={[96, 100]} to={[360, 100]} tone="amber" animated label="POST /auth/refresh (cookie)" />
              <DiagramArrow from={[360, 130]} to={[624, 130]} tone="amber" animated label="SELECT WHERE token_hash=…" />
              <DiagramNode x={230} y={150} width={260} height={54} label="revoked_at IS NULL & còn hạn?" sublabel="kiểm tra trong DB" tone="amber" state="active" />
            </>
          )}

          {/* Step 4: new access token issued */}
          {step === 4 && (
            <>
              <DiagramArrow from={[624, 130]} to={[360, 130]} tone="green" label="hợp lệ ✅" />
              <DiagramNode x={230} y={150} width={260} height={54} label="ký 🎫 access token mới (15p)" sublabel="+ xoay vòng refresh token" tone="green" state="active" />
              <DiagramArrow from={[360, 200]} to={[96, 200]} tone="green" label="access token mới" />
            </>
          )}

          {/* Step 5: retry original request */}
          {step === 5 && (
            <>
              <DiagramArrow from={[96, 100]} to={[360, 100]} tone="green" animated label="request gốc, Bearer <jwt mới>" />
              <DiagramNode x={230} y={150} width={260} height={54} label="verify OK → 200" sublabel="người dùng không nhận ra gì" tone="green" state="active" />
            </>
          )}
        </>
      )}
    </StepDiagram>
  );
}
