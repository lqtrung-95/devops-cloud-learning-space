"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramArrow, DiagramNode } from "@/components/diagrams/diagram-shapes";
import type { DiagramTone } from "@/components/diagrams/diagram-tones";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";

type Scenario = "allowed" | "blocked" | "wildcard-credentials";

const nodes: Record<string, { x: number; y: number; width: number; label: string; sublabel: string; tone: DiagramTone }> = {
  browser: { x: 10, y: 130, width: 150, label: "🌐 Browser", sublabel: "trang chạy ở origin X", tone: "violet" },
  preflight: { x: 210, y: 20, width: 200, label: "🔎 OPTIONS preflight", sublabel: "Origin: X, Access-Control-Request-Method", tone: "blue" },
  check: { x: 460, y: 20, width: 220, label: "🛡️ Server kiểm tra allowlist", sublabel: "origin X có trong ALLOWED_ORIGINS?", tone: "amber" },
  allow: { x: 460, y: 130, width: 220, label: "✅ Cho phép", sublabel: "Allow-Origin: X, Allow-Credentials: true", tone: "green" },
  deny: { x: 460, y: 240, width: 220, label: "🚫 Không thêm CORS header", sublabel: "origin X không nằm trong allowlist", tone: "rose" },
  sent: { x: 210, y: 130, width: 200, label: "📨 Request thật được gửi", sublabel: "DELETE/POST... chạm tới route handler", tone: "green" },
  blockedByBrowser: { x: 210, y: 240, width: 200, label: "❌ Browser chặn request thật", sublabel: "lỗi CORS trong console, handler không chạy", tone: "rose" },
  invalidCombo: { x: 210, y: 240, width: 200, label: "❌ Kết hợp không hợp lệ", sublabel: "origin: '*' + credentials: true vi phạm CORS spec", tone: "rose" },
};

const scenarios: Record<Scenario, { label: string; path: string[]; steps: DiagramStep[] }> = {
  allowed: {
    label: "Origin trong allowlist",
    path: ["browser", "preflight", "check", "allow", "sent"],
    steps: [
      { title: "Preflight", description: "Browser tự gửi `OPTIONS` kèm header `Origin` trước khi gửi request thật (vì đây là request \"không đơn giản\": method DELETE/POST, có custom header...)." },
      { title: "Server kiểm tra", description: "Server so origin trong header với `ALLOWED_ORIGINS` đọc từ biến môi trường — origin này CÓ trong allowlist." },
      { title: "Cho phép", description: "Server trả `Access-Control-Allow-Origin: <origin>` (đúng origin, không phải `*`) và `Access-Control-Allow-Credentials: true` vì request có cookie." },
      { title: "Request thật", description: "Browser thấy header hợp lệ, tiếp tục gửi request thật (`DELETE`, `POST`...) kèm cookie — route handler chạy bình thường." },
    ],
  },
  blocked: {
    label: "Origin ngoài allowlist",
    path: ["browser", "preflight", "check", "deny", "blockedByBrowser"],
    steps: [
      { title: "Preflight", description: "Một trang lạ (`http://evil.example`) thử gọi API bằng `fetch` kèm `credentials: 'include'`." },
      { title: "Server kiểm tra", description: "Server so origin với `ALLOWED_ORIGINS` — origin này KHÔNG có trong danh sách." },
      { title: "Không thêm header", description: "Server không trả `Access-Control-Allow-Origin` khớp origin đó (hoặc bỏ qua hoàn toàn header CORS)." },
      { title: "Browser tự chặn", description: "Vì thiếu header cho phép, browser chặn response ở phía CLIENT — request thật (nếu có gửi) coi như vô nghĩa, JavaScript không đọc được response." },
    ],
  },
  "wildcard-credentials": {
    label: "CORS \"*\" + credentials (sai)",
    path: ["browser", "preflight", "check", "invalidCombo"],
    steps: [
      { title: "Preflight", description: "Client gửi request kèm cookie (`credentials: 'include'`)." },
      { title: "Server cấu hình sai", description: "Server (cấu hình sai) trả `Access-Control-Allow-Origin: '*'` VÀ `Access-Control-Allow-Credentials: true` cùng lúc." },
      { title: "Vi phạm spec", description: "CORS spec cấm kết hợp `*` với `credentials: true` — dù server có trả cả hai header, browser vẫn coi đây là response không hợp lệ cho request có credentials." },
      { title: "Bị chặn", description: "Browser từ chối cho JavaScript đọc response. Sửa đúng: thay `'*'` bằng origin cụ thể lấy từ allowlist, giữ `credentials: true`." },
    ],
  },
};

export function CorsPreflightDecisionTreeDiagram() {
  const [scenario, setScenario] = useState<Scenario>("allowed");
  const { path, steps } = scenarios[scenario];

  return (
    <div>
      <div className="not-prose -mb-4 flex flex-wrap gap-2">
        {(Object.keys(scenarios) as Scenario[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setScenario(key)}
            className={clsx(
              "rounded-full px-3 py-1.5 text-sm font-medium",
              scenario === key ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
            )}
          >
            {scenarios[key].label}
          </button>
        ))}
      </div>
      <StepDiagram key={scenario} title="CORS preflight: origin allowed / blocked / credentialed sai" viewBox="0 0 720 330" steps={steps}>
        {(step) => (
          <>
            <DiagramArrow from={[160, 150]} to={[205, 100]} tone="slate" dimmed={step < 0 || !path.includes("preflight")} />
            <DiagramArrow from={[410, 60]} to={[455, 60]} tone="slate" dimmed={step < 1} />
            {scenario === "allowed" && (
              <>
                <DiagramArrow from={[570, 80]} to={[570, 125]} tone="green" dimmed={step < 2} label="cho phép" />
                <DiagramArrow from={[460, 165]} to={[410, 165]} tone="green" dimmed={step < 3} label="gửi request thật" />
              </>
            )}
            {scenario === "blocked" && (
              <>
                <DiagramArrow from={[570, 80]} to={[570, 235]} tone="rose" dimmed={step < 2} label="không cho phép" />
                <DiagramArrow from={[460, 275]} to={[410, 275]} tone="rose" dimmed={step < 3} label="chặn ở browser" />
              </>
            )}
            {scenario === "wildcard-credentials" && (
              <DiagramArrow from={[460, 60]} to={[315, 235]} tone="rose" dimmed={step < 2} curve={40} label="'*' + credentials" />
            )}
            {path.map((id, index) => {
              const node = nodes[id];
              const state = index === step ? "active" : index < step ? "normal" : "dimmed";
              return <DiagramNode key={id} x={node.x} y={node.y} width={node.width} height={60} label={node.label} sublabel={node.sublabel} tone={node.tone} state={state} />;
            })}
          </>
        )}
      </StepDiagram>
    </div>
  );
}
