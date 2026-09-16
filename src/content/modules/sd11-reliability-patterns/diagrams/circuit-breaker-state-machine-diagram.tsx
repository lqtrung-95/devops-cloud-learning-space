"use client";

import { DiagramArrow, DiagramGroupBox, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";
import type { DiagramTone } from "@/components/diagrams/diagram-tones";

type StateKey = "closed-healthy" | "closed-tripping" | "open" | "half-open-ok" | "half-open-fail";

interface StateInfo {
  active: "closed" | "open" | "half-open";
  tone: DiagramTone;
  callLabel: string;
}

const info: Record<StateKey, StateInfo> = {
  "closed-healthy": { active: "closed", tone: "green", callLabel: "Gọi thẳng nhà cung cấp — request đi qua bình thường" },
  "closed-tripping": { active: "closed", tone: "amber", callLabel: "Lỗi thứ 6/10 trong cửa sổ trượt — chạm ngưỡng, chuẩn bị trip" },
  open: { active: "open", tone: "rose", callLabel: "Từ chối ngay tại chỗ (fail fast) — không gọi nhà cung cấp nữa" },
  "half-open-ok": { active: "half-open", tone: "blue", callLabel: "Cho 1 request thử — thành công → đóng lại (Closed)" },
  "half-open-fail": { active: "half-open", tone: "rose", callLabel: "Request thử vẫn lỗi → mở lại (Open), chờ thêm resetTimeout" },
};

const steps: DiagramStep[] = [
  {
    title: "Closed — khoẻ mạnh",
    description:
      "Bình thường breaker ở trạng thái `closed`: mọi request đi thẳng tới nhà cung cấp. Breaker chỉ đếm tỉ lệ lỗi trong một cửa sổ trượt (vd 10 request gần nhất), chưa làm gì khác.",
  },
  {
    title: "Closed — chạm ngưỡng lỗi",
    description:
      "Nhà cung cấp bắt đầu lỗi liên tục (timeout, 500...). Khi tỉ lệ lỗi vượt ngưỡng đã cấu hình (vd ≥50% trong 10 request gần nhất, đủ volume tối thiểu) — breaker quyết định trip sang `open`.",
  },
  {
    title: "Open — từ chối nhanh",
    description:
      "Ở trạng thái `open`, breaker không gọi nhà cung cấp nữa — trả lỗi (hoặc fallback) ngay lập tức, cực rẻ. Đây là điểm khác biệt cốt lõi với timeout đơn thuần: không tốn thread/connection chờ một dependency đang chết. Sau `resetTimeout` (vd 30s), breaker chuyển sang `half-open`.",
  },
  {
    title: "Half-open — thử dò đường",
    description:
      "Breaker cho đúng một (hoặc rất ít) request thử đi qua để dò xem nhà cung cấp đã hồi phục chưa, các request khác vẫn bị chặn. Nếu request thử **thành công** → về `closed`.",
  },
  {
    title: "Half-open — vẫn còn lỗi",
    description:
      "Nếu request thử ở `half-open` **vẫn lỗi** → breaker quay lại `open` ngay, chờ thêm một `resetTimeout` nữa rồi mới thử lại. Chu trình lặp cho tới khi nhà cung cấp thật sự khoẻ.",
  },
];

const stateKeyByStep: StateKey[] = ["closed-healthy", "closed-tripping", "open", "half-open-ok", "half-open-fail"];

function nodeState(current: "closed" | "open" | "half-open", target: "closed" | "open" | "half-open") {
  return current === target ? "active" : "dimmed";
}

export function CircuitBreakerStateMachineDiagram() {
  return (
    <StepDiagram title="Vòng đời circuit breaker: closed → open → half-open" viewBox="0 0 720 300" steps={steps}>
      {(step) => {
        const key = stateKeyByStep[step];
        const { active, tone, callLabel } = info[key];

        return (
          <g>
            <DiagramNode x={40} y={40} width={170} height={80} label="CLOSED" sublabel="đếm tỉ lệ lỗi" emoji="✅" tone="green" state={nodeState(active, "closed")} rounded={14} />
            <DiagramNode x={470} y={40} width={170} height={80} label="OPEN" sublabel="fail fast" emoji="🚫" tone="rose" state={nodeState(active, "open")} rounded={14} />
            <DiagramNode x={255} y={180} width={210} height={80} label="HALF-OPEN" sublabel="thử 1 request" emoji="🔍" tone="blue" state={nodeState(active, "half-open")} rounded={14} />

            <DiagramArrow from={[210, 70]} to={[470, 70]} label="lỗi vượt ngưỡng" tone={active === "closed" ? "amber" : "slate"} dimmed={active !== "closed"} curve={-30} />
            <DiagramArrow from={[555, 120]} to={[400, 180]} label="hết resetTimeout" tone={active === "open" ? "rose" : "slate"} dimmed={active !== "open"} />
            <DiagramArrow from={[330, 180]} to={[125, 120]} label="thử thành công" tone={key === "half-open-ok" ? "green" : "slate"} dimmed={key !== "half-open-ok"} curve={20} />
            <DiagramArrow from={[420, 180]} to={[540, 120]} label="thử vẫn lỗi" tone={key === "half-open-fail" ? "rose" : "slate"} dimmed={key !== "half-open-fail"} curve={-20} />

            <DiagramGroupBox x={40} y={250} width={600} height={40} label="" tone={tone}>
              <DiagramLabel x={340} y={275} text={callLabel} size={13} tone={tone} bold />
            </DiagramGroupBox>
          </g>
        );
      }}
    </StepDiagram>
  );
}
