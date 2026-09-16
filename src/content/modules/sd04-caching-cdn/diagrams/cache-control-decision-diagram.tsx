"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import { DiagramNode } from "@/components/diagrams/diagram-shapes";
import type { DiagramTone } from "@/components/diagrams/diagram-tones";

type ResourceKind = "hashed-asset" | "public-api" | "private-api" | "html-page";

interface ResourceProfile {
  label: string;
  emoji: string;
  header: string;
  tone: DiagramTone;
  cdnBrowser: string;
  cdnEdge: string;
  reasoning: string;
}

const profiles: Record<ResourceKind, ResourceProfile> = {
  "hashed-asset": {
    label: "app.3f9a1c.js (tên có hash)",
    emoji: "📦",
    header: "Cache-Control: public, max-age=31536000, immutable",
    tone: "green",
    cdnBrowser: "Lưu 1 năm, không hỏi lại",
    cdnEdge: "Lưu 1 năm ở edge",
    reasoning: "Nội dung đổi ⇒ tên file đổi (hash khác). Cùng một tên luôn cùng một nội dung mãi mãi ⇒ cache dài nhất có thể, `immutable` bỏ luôn việc revalidate.",
  },
  "public-api": {
    label: "GET /api/products/:id",
    emoji: "🛒",
    header: "Cache-Control: public, max-age=30, stale-while-revalidate=60",
    tone: "amber",
    cdnBrowser: "Lưu 30s trên máy user",
    cdnEdge: "Lưu 30s ở edge, dùng chung cho mọi user",
    reasoning: "Public: mọi user thấy cùng giá nên CDN được lưu chung. max-age ngắn vì giá có thể đổi. stale-while-revalidate: hết hạn vẫn trả bản cũ ngay rồi âm thầm làm mới ở nền.",
  },
  "private-api": {
    label: "GET /api/me, GET /api/cart",
    emoji: "🔒",
    header: "Cache-Control: private, no-store",
    tone: "rose",
    cdnBrowser: "Không lưu ở đâu cả",
    cdnEdge: "CDN/proxy KHÔNG được lưu",
    reasoning: "Dữ liệu riêng của từng user. `private` cấm cache dùng chung (CDN, proxy) lưu; `no-store` cấm lưu ở bất cứ đâu kể cả disk cache của trình duyệt.",
  },
  "html-page": {
    label: "GET / (trang chủ, SSR)",
    emoji: "📄",
    header: "Cache-Control: public, max-age=0, must-revalidate",
    tone: "blue",
    cdnBrowser: "Luôn hỏi lại server trước khi dùng",
    cdnEdge: "Có thể cache ở edge nếu dùng ETag + revalidate (304)",
    reasoning: "Trang HTML đổi thường xuyên (tin tức, tồn kho). max-age=0 buộc revalidate mỗi lần, nhưng ETag/Last-Modified giúp trả 304 nhẹ thay vì tải lại toàn bộ.",
  },
};

export function CacheControlDecisionDiagram() {
  const [kind, setKind] = useState<ResourceKind>("hashed-asset");
  const profile = profiles[kind];

  const controls = (
    <div className="flex flex-wrap gap-2 text-sm">
      {(Object.keys(profiles) as ResourceKind[]).map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => setKind(option)}
          className={clsx("rounded-full px-3 py-1.5 font-medium", kind === option ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300")}
        >
          {profiles[option].emoji} {option === "hashed-asset" ? "Static (hash)" : option === "public-api" ? "API public" : option === "private-api" ? "API riêng tư" : "Trang HTML"}
        </button>
      ))}
    </div>
  );

  return (
    <DiagramFrame title="Chọn Cache-Control cho đúng loại tài nguyên" viewBox="0 0 720 260" controls={controls} caption={profile.reasoning}>
      <DiagramNode x={16} y={20} width={300} height={64} label={profile.label} emoji={profile.emoji} tone={profile.tone} state="active" />
      <rect x={16} y={96} width={688} height={40} rx={8} className="fill-stone-900 dark:fill-stone-100" />
      <text x={30} y={121} fontFamily="monospace" fontSize={13} className="fill-emerald-400 dark:fill-emerald-700">
        {profile.header}
      </text>
      <DiagramNode x={16} y={152} width={330} height={92} label="Browser" sublabel={profile.cdnBrowser} emoji="🧑‍💻" tone="violet" />
      <DiagramNode x={374} y={152} width={330} height={92} label="CDN edge" sublabel={profile.cdnEdge} emoji="🌏" tone="cyan" />
    </DiagramFrame>
  );
}
