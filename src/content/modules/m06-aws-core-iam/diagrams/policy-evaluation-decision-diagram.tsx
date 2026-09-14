"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import { DiagramArrow, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";

type ToggleKey = "explicitDeny" | "scpAllows" | "identityAllows" | "resourceAllows";
type Decision = "explicit-deny" | "implicit-deny" | "allow";

const toggles: { key: ToggleKey; label: string; hint: string }[] = [
  { key: "explicitDeny", label: "Có policy Deny s3:DeleteObject", hint: "vd: policy chặn xoá dữ liệu prod" },
  { key: "scpAllows", label: "SCP của Organization cho phép S3", hint: "guardrail ở cấp account" },
  { key: "identityAllows", label: "Identity policy của trung có Allow", hint: "gắn vào user / group / role" },
  { key: "resourceAllows", label: "Bucket policy có Allow cho trung", hint: "resource-based policy" },
];

interface Outcome {
  /** Decision box where evaluation stops: 0 deny, 1 SCP, 2 allow found, 3 no allow (default deny). */
  stage: number;
  decision: Decision;
  reason: string;
}

// Simplified same-account evaluation: explicit deny → SCP guardrail → any Allow → default implicit deny.
function evaluate(state: Record<ToggleKey, boolean>): Outcome {
  if (state.explicitDeny) return { stage: 0, decision: "explicit-deny", reason: "Có một Deny khớp → từ chối ngay, mọi Allow khác đều vô nghĩa." };
  if (!state.scpAllows) return { stage: 1, decision: "implicit-deny", reason: "SCP không cho phép → bị chặn dù user có AdministratorAccess. SCP chỉ giới hạn, không cấp quyền." };
  if (state.identityAllows || state.resourceAllows) {
    const source = state.identityAllows && state.resourceAllows ? "identity policy và bucket policy" : state.identityAllows ? "identity policy" : "bucket policy";
    return { stage: 2, decision: "allow", reason: `Không có Deny, SCP cho phép và ${source} có Allow → được phép.` };
  }
  return { stage: 3, decision: "implicit-deny", reason: "Không policy nào Allow → implicit deny. Mặc định của IAM là KHÔNG." };
}

const decisionBoxes = [
  { x: 150, label: "① Có Deny khớp?", sublabel: "trong mọi policy" },
  { x: 310, label: "② SCP cho phép?", sublabel: "Organizations" },
  { x: 470, label: "③ Có Allow?", sublabel: "identity / resource" },
];

const denyBoxes = [
  { x: 150, label: "⛔ Explicit Deny", sublabel: "thắng mọi Allow", branch: "có" },
  { x: 310, label: "🚫 Implicit Deny", sublabel: "bị SCP chặn", branch: "không" },
  { x: 470, label: "🚫 Implicit Deny", sublabel: "không ai Allow", branch: "không" },
];

export function PolicyEvaluationDecisionDiagram() {
  const [state, setState] = useState<Record<ToggleKey, boolean>>({ explicitDeny: false, scpAllows: true, identityAllows: true, resourceAllows: false });
  const outcome = evaluate(state);
  const reachedBox = (index: number) => (outcome.decision === "allow" ? true : index <= Math.min(outcome.stage, 2));
  const denyIndex = outcome.decision === "allow" ? -1 : Math.min(outcome.stage, 2);

  return (
    <DiagramFrame
      title="IAM quyết định Allow hay Deny — bật/tắt từng policy"
      viewBox="0 0 720 280"
      controls={
        <div className="space-y-3 text-sm">
          <div className="grid gap-2 sm:grid-cols-2">
            {toggles.map((toggle) => (
              <label key={toggle.key} className="flex cursor-pointer items-start gap-2 rounded-lg border border-stone-200 px-3 py-2 dark:border-stone-800">
                <input
                  type="checkbox"
                  checked={state[toggle.key]}
                  onChange={() => setState((current) => ({ ...current, [toggle.key]: !current[toggle.key] }))}
                  className="mt-0.5 size-4 accent-indigo-600"
                />
                <span>
                  <span className="font-medium text-stone-800 dark:text-stone-200">{toggle.label}</span>
                  <span className="block text-xs text-stone-500">{toggle.hint}</span>
                </span>
              </label>
            ))}
          </div>
          <p
            className={clsx(
              "font-semibold",
              outcome.decision === "allow" ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400",
            )}
          >
            {outcome.decision === "allow" ? "✅ ALLOW" : outcome.decision === "explicit-deny" ? "⛔ EXPLICIT DENY" : "🚫 IMPLICIT DENY"} — {outcome.reason}
          </p>
        </div>
      }
      caption="Sơ đồ rút gọn cho request trong CÙNG một account. Thực tế còn permissions boundary, session policy, RCP và luật riêng cho cross-account (cần Allow ở cả hai phía) — xem tài liệu policy evaluation logic."
    >
      <DiagramNode x={8} y={30} width={118} height={70} label="🙋 Request" sublabel="s3:DeleteObject" tone="violet" state="active" />
      <DiagramArrow from={[126, 65]} to={[146, 65]} tone="slate" />

      {decisionBoxes.map((box, index) => (
        <g key={box.label}>
          <DiagramNode x={box.x} y={30} width={134} height={70} label={box.label} sublabel={box.sublabel} tone="amber" state={reachedBox(index) ? (index === denyIndex ? "active" : "normal") : "dimmed"} />
          {index < decisionBoxes.length - 1 && (
            <>
              <DiagramArrow from={[box.x + 134, 65]} to={[box.x + 156, 65]} tone="green" dimmed={!reachedBox(index + 1)} animated={reachedBox(index + 1)} />
              <DiagramLabel x={box.x + 147} y={22} text={index === 0 ? "không" : "có"} size={11} tone="green" />
            </>
          )}
        </g>
      ))}

      <DiagramArrow from={[604, 65]} to={[626, 65]} tone="green" dimmed={outcome.decision !== "allow"} animated={outcome.decision === "allow"} />
      <DiagramLabel x={615} y={22} text="có" size={11} tone="green" />
      <DiagramNode x={630} y={30} width={84} height={70} label="✅ Allow" tone="green" state={outcome.decision === "allow" ? "active" : "dimmed"} />

      {denyBoxes.map((box, index) => {
        const isHit = index === denyIndex;
        return (
          <g key={box.sublabel}>
            <DiagramArrow from={[box.x + 67, 102]} to={[box.x + 67, 186]} tone="rose" label={box.branch} dimmed={!isHit} animated={isHit} />
            <DiagramNode x={box.x} y={190} width={134} height={64} label={box.label} sublabel={box.sublabel} tone="rose" state={isHit ? "active" : "dimmed"} />
          </g>
        );
      })}
    </DiagramFrame>
  );
}
