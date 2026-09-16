"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import { DiagramArrow, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";

type CacheState = "hit" | "miss";
type RedirectType = "301" | "302";

const cacheNote: Record<CacheState, string> = {
  hit: "Cache hit: App hỏi Redis, có sẵn `long_url` → trả redirect ngay, không chạm Postgres. Đường đi ngắn nhất, đúng như kỳ vọng cho hệ thống read-heavy 100:1.",
  miss: "Cache miss (link mới hoặc bị evict): App hỏi Redis trước (trống), phải query Postgres, rồi SET lại vào Redis (thường kèm TTL) trước khi trả redirect — request này chậm hơn nhưng các lần sau cùng code sẽ hit cache.",
};

const redirectNote: Record<RedirectType, string> = {
  "301": "301 Moved Permanently: trình duyệt được phép LƯU redirect này. Lần truy cập tiếp theo, trình duyệt tự nhảy thẳng tới `long_url` — không gọi lại server. Nhanh cho user, nhưng server mất luôn cơ hội đếm click chính xác cho các lần sau, và nếu cần đổi đích thì cache trình duyệt cũ vẫn trỏ sai.",
  "302": "302 Found (tạm thời): trình duyệt KHÔNG cache, luôn gọi lại server ở lần sau. Chậm hơn một chút mỗi lần, nhưng server thấy được mọi lượt click → analytics/click-count chính xác, và đổi đích link có hiệu lực ngay.",
};

export function ReadPathCacheRedirectDiagram() {
  const [cache, setCache] = useState<CacheState>("hit");
  const [redirect, setRedirect] = useState<RedirectType>("302");

  return (
    <DiagramFrame
      title="Read path: cache hit/miss & lựa chọn mã redirect 301 vs 302"
      viewBox="0 0 720 320"
      controls={
        <div className="space-y-3 text-sm">
          <div className="flex flex-wrap gap-4">
            <div className="flex gap-2">
              <span className="self-center text-xs font-semibold text-stone-500">Cache:</span>
              {(["hit", "miss"] as CacheState[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setCache(key)}
                  className={clsx(
                    "rounded-full px-3 py-1.5 font-medium",
                    cache === key ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
                  )}
                >
                  {key === "hit" ? "Cache hit" : "Cache miss"}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <span className="self-center text-xs font-semibold text-stone-500">Redirect:</span>
              {(["301", "302"] as RedirectType[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setRedirect(key)}
                  className={clsx(
                    "rounded-full px-3 py-1.5 font-medium",
                    redirect === key ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
                  )}
                >
                  {key}
                </button>
              ))}
            </div>
          </div>
          <p className="text-stone-700 dark:text-stone-300">{cacheNote[cache]}</p>
          <p className="text-stone-700 dark:text-stone-300">{redirectNote[redirect]}</p>
        </div>
      }
      caption="Hàng trên: đường đi của MỘT request redirect. Hàng dưới: chuyện gì xảy ra ở LẦN TRUY CẬP TIẾP THEO, tuỳ mã redirect đã chọn."
    >
      {/* Row 1: request path */}
      <DiagramNode x={20} y={30} width={100} height={60} label="Client" emoji="🧑" tone="slate" />
      <DiagramNode x={160} y={30} width={100} height={60} label="Nginx" emoji="🚪" tone="slate" />
      <DiagramNode x={300} y={30} width={110} height={60} label="App" emoji="⚙️" tone="blue" />
      <DiagramNode
        x={460} y={0} width={110} height={50}
        label="Redis"
        sublabel={cache === "hit" ? "HIT" : "miss"}
        tone={cache === "hit" ? "green" : "slate"}
        state={cache === "hit" ? "active" : "normal"}
      />
      <DiagramNode
        x={460} y={70} width={110} height={50}
        label="Postgres"
        sublabel={cache === "miss" ? "query + fill cache" : "không chạm"}
        tone={cache === "miss" ? "amber" : "slate"}
        state={cache === "miss" ? "active" : "dimmed"}
      />

      <DiagramArrow from={[120, 60]} to={[160, 60]} />
      <DiagramArrow from={[260, 60]} to={[300, 60]} />
      <DiagramArrow from={[410, 55]} to={[460, 25]} tone={cache === "hit" ? "green" : "slate"} animated={cache === "hit"} />
      <DiagramArrow from={[410, 65]} to={[460, 95]} tone={cache === "miss" ? "amber" : "slate"} animated={cache === "miss"} />
      <DiagramArrow
        from={[300, 20]}
        to={[120, 20]}
        tone={cache === "hit" ? "green" : "amber"}
        curve={-30}
        label={`redirect ${redirect}`}
      />

      {/* Row 2: next visit, depends on redirect type */}
      <DiagramLabel x={20} y={150} text="Lần truy cập tiếp theo:" anchor="start" size={12.5} bold />

      {redirect === "301" ? (
        <>
          <DiagramNode x={20} y={170} width={130} height={60} label="Client" sublabel="đã lưu redirect" emoji="🧑" tone="green" state="active" />
          <DiagramNode x={300} y={170} width={130} height={60} label="long_url đích" emoji="🎯" tone="green" />
          <DiagramArrow from={[150, 200]} to={[300, 200]} tone="green" label="nhảy thẳng, KHÔNG qua server" curve={-20} />
          <DiagramNode x={460} y={170} width={130} height={60} label="Server" sublabel="không nhận được request này" tone="slate" state="dimmed" />
        </>
      ) : (
        <>
          <DiagramNode x={20} y={170} width={130} height={60} label="Client" sublabel="không cache" emoji="🧑" tone="slate" />
          <DiagramNode x={300} y={170} width={130} height={60} label="Nginx → App → Redis" emoji="⚙️" tone="amber" state="active" />
          <DiagramNode x={460} y={170} width={130} height={60} label="long_url đích" emoji="🎯" tone="amber" />
          <DiagramArrow from={[150, 200]} to={[300, 200]} tone="amber" />
          <DiagramArrow from={[430, 200]} to={[460, 200]} tone="amber" />
        </>
      )}
    </DiagramFrame>
  );
}
