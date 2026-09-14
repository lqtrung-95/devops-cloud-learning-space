"use client";

import { useState } from "react";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import { DiagramArrow, DiagramNode } from "@/components/diagrams/diagram-shapes";
import { InlineCodeText } from "@/components/ui/inline-code-text";

type ControlKey = "rootMfa" | "noRootKeys" | "identityCenter" | "budgets" | "cloudtrail";

const controls: { key: ControlKey; label: string; detail: string }[] = [
  { key: "rootMfa", label: "🔐 MFA cho root", detail: "Root có toàn quyền, kể cả đóng account. MFA biến 'lộ mật khẩu' thành 'chưa đủ để vào'." },
  { key: "noRootKeys", label: "🗝️ Root: 0 access key", detail: "Access key của root = chìa vạn năng dạng text. Không tạo, nếu có thì xoá. Kiểm tra bằng `aws iam get-account-summary` (AccountAccessKeysPresent = 0)." },
  { key: "identityCenter", label: "🪪 Identity Center", detail: "Người dùng đăng nhập qua portal SSO + MFA, nhận credential tạm thời. Không còn IAM user với access key dài hạn nằm trong `~/.aws/credentials`." },
  { key: "budgets", label: "💰 AWS Budgets", detail: "Gửi email khi chi phí thực tế hoặc dự báo vượt ngưỡng. Chỉ CẢNH BÁO, không tự tắt resource (trừ khi cấu hình Budget actions)." },
  { key: "cloudtrail", label: "🕵️ CloudTrail trail", detail: "Ghi lại ai gọi API nào, lúc nào, từ IP nào. Event history có sẵn ~90 ngày; tạo trail để lưu lâu dài vào S3." },
];

const threats: { label: string; sublabel: string; mitigatedBy: ControlKey[] }[] = [
  { label: "Lộ mật khẩu root", sublabel: "phishing, dùng lại mật khẩu", mitigatedBy: ["rootMfa"] },
  { label: "Access key lộ lên GitHub", sublabel: "bot quét repo trong vài phút", mitigatedBy: ["noRootKeys", "identityCenter"] },
  { label: "Hoá đơn tăng vọt", sublabel: "đào coin, quên tắt NAT/EKS", mitigatedBy: ["budgets"] },
  { label: "Không biết ai xoá gì", sublabel: "sự cố không có dấu vết", mitigatedBy: ["cloudtrail"] },
];

const CONTROL_Y = (index: number) => 14 + index * 56;
const THREAT_Y = (index: number) => 16 + index * 70;

export function AccountSecurityControlsDiagram() {
  const [enabled, setEnabled] = useState<Record<ControlKey, boolean>>({ rootMfa: false, noRootKeys: false, identityCenter: false, budgets: false, cloudtrail: false });
  const [lastKey, setLastKey] = useState<ControlKey>("rootMfa");
  const enabledCount = Object.values(enabled).filter(Boolean).length;
  const last = controls.find((control) => control.key === lastKey) ?? controls[0];

  const toggle = (key: ControlKey) => {
    setEnabled((current) => ({ ...current, [key]: !current[key] }));
    setLastKey(key);
  };

  return (
    <DiagramFrame
      title="Khoá tài khoản AWS — bấm bật từng biện pháp"
      viewBox="0 0 720 300"
      controls={
        <div className="space-y-2 text-sm leading-relaxed">
          <p className="font-semibold text-indigo-700 dark:text-indigo-300">
            Đã bật {enabledCount}/{controls.length} biện pháp · {last.label} {enabled[last.key] ? "(đang bật)" : "(đang tắt)"}
          </p>
          <p className="text-stone-700 dark:text-stone-300">
            <InlineCodeText text={last.detail} />
          </p>
        </div>
      }
      caption="Không biện pháp nào đủ một mình: MFA chặn đăng nhập trái phép, bỏ access key dài hạn chặn lộ key, Budgets phát hiện chi phí bất thường, CloudTrail cho bạn điều tra sau sự cố."
    >
      {controls.map((control, index) => {
        const y = CONTROL_Y(index);
        return (
          <g key={control.key}>
            {threats.map((threat, threatIndex) =>
              threat.mitigatedBy.includes(control.key) ? (
                <DiagramArrow
                  key={threat.label}
                  from={[242, y + 23]}
                  to={[466, THREAT_Y(threatIndex) + 28]}
                  tone={enabled[control.key] ? "green" : "slate"}
                  dimmed={!enabled[control.key]}
                  animated={enabled[control.key]}
                />
              ) : null,
            )}
            <DiagramNode
              x={20}
              y={y}
              width={220}
              height={46}
              label={control.label}
              tone={enabled[control.key] ? "green" : "slate"}
              state={control.key === lastKey ? "active" : "normal"}
              dashed={!enabled[control.key]}
              onClick={() => toggle(control.key)}
            />
          </g>
        );
      })}

      {threats.map((threat, index) => {
        const isMitigated = threat.mitigatedBy.every((key) => enabled[key]);
        return (
          <DiagramNode
            key={threat.label}
            x={470}
            y={THREAT_Y(index)}
            width={236}
            height={56}
            label={`${isMitigated ? "🛡️" : "⚠️"} ${threat.label}`}
            sublabel={threat.sublabel}
            tone={isMitigated ? "green" : "rose"}
          />
        );
      })}
    </DiagramFrame>
  );
}
