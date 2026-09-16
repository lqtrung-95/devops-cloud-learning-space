"use client";

import { useState } from "react";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import { DiagramArrow, DiagramNode } from "@/components/diagrams/diagram-shapes";

type ClaimKey = "valid" | "oversized" | "disallowedMime" | "lyingClient";

interface Claim {
  key: ClaimKey;
  label: string;
  emoji: string;
  filename: string;
  mimeType: string;
  sizeBytes: string;
  sizeOk: boolean;
  mimeOk: boolean;
  note: string;
}

const claims: Claim[] = [
  { key: "valid", label: "Khai báo hợp lệ", emoji: "✅", filename: "report.pdf", mimeType: "application/pdf", sizeBytes: "2 MB", sizeOk: true, mimeOk: true, note: "Qua cả 2 điều kiện → server ký presigned URL." },
  { key: "oversized", label: "Khai quá lớn", emoji: "📦", filename: "video.pdf", mimeType: "application/pdf", sizeBytes: "40 MB", sizeOk: false, mimeOk: true, note: "sizeBytes > 15 MB → 400 VALIDATION_ERROR, dừng trước khi ký." },
  { key: "disallowedMime", label: "Type không cho phép", emoji: "🚫", filename: "installer.exe", mimeType: "application/x-msdownload", sizeBytes: "1 MB", sizeOk: true, mimeOk: false, note: "mimeType không nằm trong allowlist → 400 VALIDATION_ERROR." },
  { key: "lyingClient", label: "Client khai đúng, PUT khác", emoji: "🕵️", filename: "avatar.png", mimeType: "image/png", sizeBytes: "500 KB", sizeOk: true, mimeOk: true, note: "Presign PASS vì lời khai hợp lệ — nhưng lúc PUT thật, client vẫn có thể gửi 40MB file khác kèm Content-Type khác. Validate ở bước này không chặn được điều đó." },
];

/**
 * Toggle between 4 client-declared scenarios and watch which branch of the
 * presign validation decision tree fires — including the "client lies at PUT
 * time" case, which the size/type check at presign time cannot catch.
 */
export function SizeTypeValidationDecisionTreeDiagram() {
  const [selected, setSelected] = useState<ClaimKey>("valid");
  const claim = claims.find((item) => item.key === selected) ?? claims[0];
  const rejected = !claim.sizeOk || !claim.mimeOk;

  return (
    <DiagramFrame
      title="Cây quyết định: có cấp presigned URL hay không?"
      viewBox="0 0 720 300"
      controls={
        <div className="flex flex-wrap gap-2">
          {claims.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setSelected(item.key)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                selected === item.key
                  ? "bg-indigo-600 text-white"
                  : "bg-stone-100 text-stone-700 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700"
              }`}
            >
              {item.emoji} {item.label}
            </button>
          ))}
        </div>
      }
      caption={claim.note}
    >
      <DiagramNode
        x={16}
        y={120}
        width={190}
        height={72}
        label={claim.filename}
        sublabel={`${claim.mimeType} · ${claim.sizeBytes}`}
        emoji="📝"
        tone="violet"
      />

      <DiagramArrow from={[206, 156]} to={[290, 90]} tone="slate" label="sizeBytes ≤ 15MB?" />
      <DiagramNode x={294} y={58} width={150} height={54} label={claim.sizeOk ? "✅ Đạt" : "❌ Vượt"} tone={claim.sizeOk ? "green" : "rose"} state="active" />

      <DiagramArrow from={[206, 176]} to={[290, 220]} tone="slate" label="mimeType hợp lệ?" />
      <DiagramNode x={294} y={196} width={150} height={54} label={claim.mimeOk ? "✅ Đạt" : "❌ Không nằm trong allowlist"} tone={claim.mimeOk ? "green" : "rose"} state="active" />

      <DiagramArrow from={[444, 90]} to={[556, 150]} tone={rejected ? "rose" : "slate"} dimmed={rejected} />
      <DiagramArrow from={[444, 220]} to={[556, 160]} tone={rejected ? "rose" : "slate"} dimmed={rejected} />

      <DiagramNode
        x={558}
        y={120}
        width={148}
        height={72}
        label={rejected ? "400 VALIDATION_ERROR" : "200 + presigned URL"}
        sublabel={rejected ? "không gọi S3, không ký gì cả" : "ký PUT cho đúng key, 300s"}
        emoji={rejected ? "🛑" : "🔑"}
        tone={rejected ? "rose" : "green"}
        state="active"
      />

      {selected === "lyingClient" && (
        <DiagramNode
          x={294}
          y={260}
          width={412}
          height={34}
          label="⚠️ URL đã ký vẫn chỉ giới hạn ở KEY này — nhưng không kiểm soát được byte thật lúc PUT"
          tone="amber"
          state="active"
        />
      )}
    </DiagramFrame>
  );
}
