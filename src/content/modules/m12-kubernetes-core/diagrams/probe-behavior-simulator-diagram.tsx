"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import { InlineCodeText } from "@/components/ui/inline-code-text";
import { DiagramArrow, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";
import type { DiagramTone } from "@/components/diagrams/diagram-tones";

type Scenario = "healthy" | "slow-start" | "db-down" | "deadlock";
type ProbeResult = "pass" | "fail" | "wait" | "off";

interface Outcome {
  startup: ProbeResult;
  readiness: ProbeResult;
  liveness: ProbeResult;
  inService: boolean;
  restarting: boolean;
  verdict: string;
  good: boolean;
}

const scenarios: { key: Scenario; label: string; toggleLabel: string }[] = [
  { key: "healthy", label: "✅ App khoẻ", toggleLabel: "Bỏ readinessProbe" },
  { key: "slow-start", label: "🐢 Khởi động mất 90s", toggleLabel: "Bỏ startupProbe (liveness chờ 10s)" },
  { key: "db-down", label: "🗄️ Database sập", toggleLabel: "Kiểm tra DB trong livenessProbe" },
  { key: "deadlock", label: "🔒 App treo (deadlock)", toggleLabel: "Bỏ livenessProbe" },
];

const outcomes: Record<Scenario, { correct: Outcome; misconfigured: Outcome }> = {
  healthy: {
    correct: { startup: "pass", readiness: "pass", liveness: "pass", inService: true, restarting: false, good: true, verdict: "Mọi probe đạt: pod nằm trong EndpointSlice và nhận traffic." },
    misconfigured: { startup: "pass", readiness: "off", liveness: "pass", inService: true, restarting: false, good: false, verdict: "Lúc này vẫn ổn, nhưng khi rolling update pod mới nhận traffic ngay khi container start — trước cả khi app nghe cổng → người dùng dính lỗi 502." },
  },
  "slow-start": {
    correct: { startup: "wait", readiness: "off", liveness: "off", inService: false, restarting: false, good: true, verdict: "startupProbe cho tối đa `failureThreshold × periodSeconds` (30 × 5s = 150s) để khởi động. Trong lúc đó liveness/readiness tạm chưa chạy. Kiên nhẫn chờ." },
    misconfigured: { startup: "off", readiness: "fail", liveness: "fail", inService: false, restarting: true, good: false, verdict: "Liveness bắt đầu kiểm tra khi app còn đang khởi động → fail → kubelet restart → app lại khởi động từ đầu… Vòng lặp vô tận: CrashLoopBackOff." },
  },
  "db-down": {
    correct: { startup: "pass", readiness: "fail", liveness: "pass", inService: false, restarting: false, good: true, verdict: "Readiness (có kiểm tra phụ thuộc) fail → pod tạm rời EndpointSlice, không restart. DB lên lại → Ready → nhận traffic tiếp. Đúng ý!" },
    misconfigured: { startup: "pass", readiness: "fail", liveness: "fail", inService: false, restarting: true, good: false, verdict: "Mọi pod API cùng fail liveness và bị restart hàng loạt — restart không sửa được DB, còn làm khi DB lên lại thì app vẫn đang khởi động. Liveness chỉ nên kiểm tra chính tiến trình." },
  },
  deadlock: {
    correct: { startup: "pass", readiness: "fail", liveness: "fail", inService: false, restarting: true, good: true, verdict: "Tiến trình còn sống nhưng không phản hồi. Liveness fail 3 lần → kubelet kill và khởi động lại container. App tự hồi phục." },
    misconfigured: { startup: "pass", readiness: "fail", liveness: "off", inService: false, restarting: false, good: false, verdict: "Readiness gỡ pod khỏi Service nhưng không ai restart nó. Pod treo mãi ở 0/1 READY, bạn chỉ còn ít replica phục vụ tới khi có người phát hiện." },
  },
};

const probeTone: Record<ProbeResult, DiagramTone> = { pass: "green", fail: "rose", wait: "amber", off: "slate" };
const probeText: Record<ProbeResult, string> = { pass: "✓ đạt", fail: "✗ fail", wait: "⏳ đang chờ app", off: "— không chạy" };

export function ProbeBehaviorSimulatorDiagram() {
  const [scenario, setScenario] = useState<Scenario>("db-down");
  const [misconfigured, setMisconfigured] = useState(false);
  const outcome = outcomes[scenario][misconfigured ? "misconfigured" : "correct"];
  const current = scenarios.find((item) => item.key === scenario)!;

  const pill = (active: boolean) =>
    clsx("rounded-full px-3 py-1.5 text-sm font-medium", active ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300");

  return (
    <DiagramFrame
      title="Mô phỏng probe — chọn tình huống, bật cấu hình sai và xem hậu quả"
      viewBox="0 0 720 300"
      controls={
        <div className="space-y-3 text-sm">
          <div className="flex flex-wrap gap-2">
            {scenarios.map((item) => (
              <button key={item.key} type="button" className={pill(item.key === scenario)} onClick={() => setScenario(item.key)}>
                {item.label}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 font-medium text-stone-700 dark:text-stone-300">
            <input type="checkbox" checked={misconfigured} onChange={() => setMisconfigured(!misconfigured)} className="size-4 accent-rose-600" />
            Cấu hình sai: {current.toggleLabel}
          </label>
          <p className={clsx("leading-relaxed", outcome.good ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300")}>
            {outcome.good ? "👍 " : "⚠️ "}
            <InlineCodeText text={outcome.verdict} />
          </p>
        </div>
      }
      caption="startup = 'đã khởi động xong chưa?', readiness = 'nhận khách được chưa?', liveness = 'còn sống không hay phải khởi động lại?'"
    >
      <DiagramNode x={10} y={110} width={130} height={80} label="kubelet" sublabel="chạy probe định kỳ" emoji="👷" tone="blue" />
      <DiagramNode x={200} y={20} width={260} height={260} label="" tone={outcome.restarting ? "rose" : outcome.inService ? "green" : "amber"} state="active" />
      <DiagramLabel x={330} y={46} text={outcome.restarting ? "Pod api — đang bị restart 🔁" : outcome.inService ? "Pod api — 1/1 READY" : "Pod api — 0/1 READY"} bold size={14} />
      {(["startup", "readiness", "liveness"] as const).map((probe, index) => (
        <DiagramNode
          key={probe}
          x={222}
          y={70 + index * 68}
          width={216}
          height={54}
          label={`${probe}Probe`}
          sublabel={probeText[outcome[probe]]}
          tone={probeTone[outcome[probe]]}
          state={outcome[probe] === "off" ? "dimmed" : "normal"}
        />
      ))}
      <DiagramArrow from={[142, 150]} to={[218, 150]} tone="blue" animated />
      <DiagramNode x={540} y={40} width={170} height={80} label="Service api" sublabel={outcome.inService ? "pod trong EndpointSlice" : "pod bị gỡ khỏi danh sách"} emoji="☎️" tone={outcome.inService ? "green" : "slate"} state={outcome.inService ? "active" : "dimmed"} />
      <DiagramArrow from={[538, 80]} to={[464, 110]} tone={outcome.inService ? "green" : "rose"} animated={outcome.inService} dimmed={!outcome.inService} label={outcome.inService ? "traffic" : "chặn"} />
      <DiagramNode x={540} y={180} width={170} height={80} label="Restart container" sublabel={outcome.restarting ? "RESTARTS tăng dần" : "không restart"} emoji="🔁" tone={outcome.restarting ? "rose" : "slate"} state={outcome.restarting ? "active" : "dimmed"} />
      <DiagramArrow from={[464, 230]} to={[538, 220]} tone="rose" animated={outcome.restarting} dimmed={!outcome.restarting} curve={-10} />
    </DiagramFrame>
  );
}
