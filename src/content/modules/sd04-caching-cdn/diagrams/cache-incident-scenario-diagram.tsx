"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramArrow, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";
import type { DiagramTone } from "@/components/diagrams/diagram-tones";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";

type Incident = "stampede" | "penetration" | "hot-key";
type Fix = "off" | "on";

interface IncidentStep extends DiagramStep {
  requestsToDb: number;
  dbState: "ok" | "overload";
}

const incidentLabels: Record<Incident, string> = {
  stampede: "Cache stampede",
  penetration: "Cache penetration",
  "hot-key": "Hot key",
};

const scenarios: Record<Incident, Record<Fix, IncidentStep[]>> = {
  stampede: {
    off: [
      { title: "Key nóng còn sống", description: "1.000 request/giây đọc `homepage:feed`, tất cả đều HIT. Postgres rảnh.", requestsToDb: 2, dbState: "ok" },
      { title: "Key hết hạn", description: "TTL hết đúng lúc tải cao. Cache trống cho key này.", requestsToDb: 2, dbState: "ok" },
      { title: "Cả nghìn request cùng miss", description: "Không có lock — MỌI request đang chờ đều tự query DB cùng lúc để nạp lại cùng một key.", requestsToDb: 900, dbState: "overload" },
    ],
    on: [
      { title: "Key hết hạn", description: "Vẫn 1.000 request/giây, key vừa hết hạn.", requestsToDb: 2, dbState: "ok" },
      { title: "Chỉ 1 request lấy lock", description: "`SET lock:homepage-feed <token> NX PX 3000` — chỉ đúng 1 request thành công, số còn lại nhận `nil`.", requestsToDb: 1, dbState: "ok" },
      { title: "Số khác chờ hoặc dùng bản cũ", description: "Request không lấy được lock: chờ ngắn rồi đọc lại cache, hoặc trả bản cũ (stale) kèm cờ báo đang làm mới. Chỉ 1 query chạm DB.", requestsToDb: 1, dbState: "ok" },
    ],
  },
  penetration: {
    off: [
      { title: "Bot dò id ngẫu nhiên", description: "`GET /api/products/-7`, `/999999999`... — id không tồn tại, không bao giờ có trong cache.", requestsToDb: 100, dbState: "ok" },
      { title: "Luôn miss, luôn hỏi DB", description: "Mỗi request đều query DB để xác nhận 'không có', rồi không cache gì (vì kết quả rỗng thường bị bỏ qua).", requestsToDb: 800, dbState: "overload" },
    ],
    on: [
      { title: "Bot dò id ngẫu nhiên", description: "Vẫn hàng loạt id không tồn tại.", requestsToDb: 100, dbState: "ok" },
      { title: "Cache cả kết quả rỗng", description: "Query 1 lần, thấy không có ⇒ lưu một giá trị đánh dấu 'rỗng' với TTL ngắn. Request bot lặp lại trong khoảng đó chỉ chạm cache.", requestsToDb: 15, dbState: "ok" },
      { title: "(Tuỳ chọn) Bloom filter chặn ở cửa", description: "Kiểm tra id có khả năng tồn tại trước khi chạm cache/DB — chặn phần lớn id chắc chắn sai ngay từ đầu.", requestsToDb: 3, dbState: "ok" },
    ],
  },
  "hot-key": {
    off: [
      { title: "Một celebrity, một key", description: "Sự kiện flash sale: 50.000 req/giây đều đọc đúng `product:1`.", requestsToDb: 2, dbState: "ok" },
      { title: "Một node Redis gánh hết", description: "Dù HIT gần 100%, MỘT node Redis giữ key đó phải trả lời 50.000 lần/giây — CPU/băng thông của riêng node đó bão hoà trong khi các node khác rảnh.", requestsToDb: 5, dbState: "overload" },
    ],
    on: [
      { title: "Một celebrity, một key", description: "Vẫn 50.000 req/giây vào cùng một sản phẩm.", requestsToDb: 2, dbState: "ok" },
      { title: "Nhân bản key ra nhiều bản", description: "Ghi `product:1:copy0` .. `product:1:copy9`, mỗi request chọn ngẫu nhiên 1 bản để đọc — rải tải ra nhiều node/kết nối.", requestsToDb: 2, dbState: "ok" },
      { title: "Hoặc thêm cache local ngắn hạn", description: "Local in-process cache TTL 1–2 giây trước Redis, hấp thụ phần lớn tải cho đúng key đó.", requestsToDb: 2, dbState: "ok" },
    ],
  },
};

export function CacheIncidentScenarioDiagram() {
  const [incident, setIncident] = useState<Incident>("stampede");
  const [fix, setFix] = useState<Fix>("off");
  const steps = scenarios[incident][fix];

  return (
    <div>
      <div className="not-prose -mb-4 flex flex-wrap items-center gap-2">
        {(Object.keys(incidentLabels) as Incident[]).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => {
              setIncident(option);
              setFix("off");
            }}
            className={clsx("rounded-full px-3 py-1.5 text-sm font-medium", incident === option ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300")}
          >
            {incidentLabels[option]}
          </button>
        ))}
        <span className="mx-1 text-stone-400">|</span>
        {(["off", "on"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setFix(option)}
            className={clsx(
              "rounded-full px-3 py-1.5 text-sm font-medium",
              fix === option ? (option === "on" ? "bg-emerald-600 text-white" : "bg-rose-600 text-white") : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
            )}
          >
            {option === "off" ? "Chưa sửa" : "Đã sửa"}
          </button>
        ))}
      </div>
      <StepDiagram key={`${incident}-${fix}`} title="Sự cố cache kinh điển" viewBox="0 0 720 260" steps={steps}>
        {(stepIndex) => {
          const step = steps[stepIndex];
          const dbTone: DiagramTone = step.dbState === "overload" ? "rose" : "green";
          const barWidth = Math.min(320, step.requestsToDb * 0.35);
          return (
            <>
              <DiagramNode x={16} y={100} width={130} height={80} label="Clients" sublabel={incident === "penetration" ? "bot dò id" : "user thật"} emoji={incident === "penetration" ? "🤖" : "👥"} tone="violet" state="active" />
              <DiagramArrow from={[148, 140]} to={[210, 140]} tone="violet" animated />
              <DiagramNode
                x={212}
                y={100}
                width={140}
                height={80}
                label="Cache"
                sublabel={incident === "hot-key" && fix === "off" ? "1 node quá tải" : "Redis"}
                emoji="🗂️"
                tone={incident === "hot-key" && fix === "off" && stepIndex > 0 ? "rose" : "amber"}
                state="active"
              />
              <DiagramArrow from={[354, 130]} to={[520, 130]} tone={dbTone} animated label={`~${step.requestsToDb} req/s → DB`} curve={-16} />
              <DiagramNode x={522} y={100} width={150} height={80} label="Postgres" sublabel={step.dbState === "overload" ? "quá tải" : "ổn định"} emoji="🐘" tone={dbTone} state={step.dbState === "overload" ? "active" : "normal"} />
              <rect x={212} y={210} width={320} height={22} rx={8} className="fill-stone-100 dark:fill-stone-900" />
              <rect x={212} y={210} width={barWidth} height={22} rx={8} className={clsx(step.dbState === "overload" ? "fill-rose-500" : "fill-emerald-500", "transition-all duration-500")} />
              <DiagramLabel x={16} y={225} text="Tải lên DB:" anchor="start" bold size={12.5} />
            </>
          );
        }}
      </StepDiagram>
    </div>
  );
}
