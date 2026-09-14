"use client";

import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import { DiagramArrow, DiagramNode } from "@/components/diagrams/diagram-shapes";
import type { DiagramTone } from "@/components/diagrams/diagram-tones";
import { useState } from "react";
import { InlineCodeText } from "@/components/ui/inline-code-text";

interface Scanner {
  id: string;
  label: string;
  emoji: string;
  tone: DiagramTone;
  tool: string;
  catches: string;
  command: string;
}

const scanners: Scanner[] = [
  { id: "secret", label: "Secret scan", emoji: "🔑", tone: "rose", tool: "gitleaks", catches: "API key, private key, password bị commit nhầm — kể cả trong lịch sử Git cũ.", command: "gitleaks detect --source . --no-git -v" },
  { id: "sast", label: "SAST", emoji: "🔍", tone: "blue", tool: "Semgrep / CodeQL", catches: "Lỗi trong CHÍNH code bạn viết: SQL injection, hardcoded secret, logic auth sai.", command: "semgrep --config auto --error" },
  { id: "sca", label: "SCA", emoji: "📦", tone: "amber", tool: "Trivy / Dependabot", catches: "CVE đã biết trong thư viện bên thứ ba (dependency).", command: "trivy fs --severity CRITICAL,HIGH --exit-code 1 ." },
  { id: "iac", label: "IaC scan", emoji: "🏗️", tone: "violet", tool: "Checkov / Trivy config", catches: "Cấu hình sai trong Terraform: security group mở 0.0.0.0/0, S3 bucket public, thiếu encryption.", command: "checkov -d infra/ --compact" },
  { id: "image", label: "Image scan", emoji: "🐳", tone: "cyan", tool: "Trivy image", catches: "CVE trong base image và OS packages đã build vào container.", command: "trivy image --severity CRITICAL --exit-code 1 checkout:sha" },
  { id: "dast", label: "DAST", emoji: "🕷️", tone: "green", tool: "OWASP ZAP", catches: "Lỗi chỉ lộ ra khi app ĐANG CHẠY: XSS phản hồi, header bảo mật thiếu, endpoint không xác thực.", command: "zap-baseline.py -t https://staging.example.com" },
];

export function PipelineScannerStagesDiagram() {
  const [selectedId, setSelectedId] = useState("sast");
  const selected = scanners.find((scanner) => scanner.id === selectedId)!;

  return (
    <DiagramFrame
      title="5 trạm kiểm tra trong pipeline — bấm để xem từng trạm bắt lỗi gì"
      viewBox="0 0 720 280"
      controls={
        <div className="space-y-2 text-sm">
          <p className="font-semibold">
            {selected.emoji} {selected.label} · <span className="font-mono text-[13px] font-normal">{selected.tool}</span>
          </p>
          <p className="leading-relaxed text-stone-700 dark:text-stone-300">
            <InlineCodeText text={selected.catches} />
          </p>
          <p className="overflow-x-auto rounded-xl bg-stone-900 px-4 py-2 font-mono text-[12px] text-emerald-400">{selected.command}</p>
        </div>
      }
      caption="Mỗi trạm bắt một loại lỗi khác nhau — không trạm nào thay thế được trạm khác. Pipeline nên fail (exit code khác 0) khi có phát hiện CRITICAL."
    >
      <DiagramNode x={4} y={110} width={80} height={70} label="git push" emoji="👨‍💻" tone="slate" />
      {scanners.map((scanner, index) => {
        const x = 100 + index * 100;
        return (
          <g key={scanner.id}>
            <DiagramArrow from={[x - 16, 145]} to={[x + 4, 145]} tone="slate" dimmed={selectedId !== scanner.id} />
            <DiagramNode
              x={x + 6}
              y={100}
              width={92}
              height={90}
              label={scanner.label}
              emoji={scanner.emoji}
              tone={scanner.tone}
              state={selectedId === scanner.id ? "active" : "normal"}
              onClick={() => setSelectedId(scanner.id)}
            />
          </g>
        );
      })}
      <DiagramArrow from={[700, 145]} to={[712, 145]} tone="green" dimmed />
      <text x={640} y={40} textAnchor="middle" fontSize={12} fontWeight={700} className="fill-emerald-700 dark:fill-emerald-300">
        ✅ Build & Deploy
      </text>
      <text x={360} y={250} textAnchor="middle" fontSize={12} className="fill-stone-600 dark:fill-stone-400">
        Bất kỳ trạm nào phát hiện CRITICAL → pipeline dừng, không tới được production
      </text>
    </DiagramFrame>
  );
}
