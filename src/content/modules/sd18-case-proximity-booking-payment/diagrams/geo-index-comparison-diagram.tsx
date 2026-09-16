"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramNode, DiagramLabel } from "@/components/diagrams/diagram-shapes";
import { diagramToneClasses, type DiagramTone } from "@/components/diagrams/diagram-tones";
import { StepDiagram } from "@/components/diagrams/step-diagram";

type Method = "full-scan" | "geohash" | "index";

interface Point {
  id: string;
  x: number;
  y: number;
  dist: number;
}

/** Rider is the query point; drivers are scattered around it with precomputed distances. */
const QUERY = { x: 360, y: 165 };

const POINTS: Point[] = [
  { id: "p3", x: 355, y: 170, dist: 7 },
  { id: "p1", x: 370, y: 160, dist: 11 },
  { id: "p2", x: 400, y: 190, dist: 47 },
  { id: "p4", x: 300, y: 140, dist: 65 },
  { id: "p5", x: 470, y: 230, dist: 128 },
  { id: "p13", x: 420, y: 280, dist: 130 },
  { id: "p11", x: 250, y: 250, dist: 139 },
  { id: "p10", x: 500, y: 60, dist: 175 },
  { id: "p6", x: 560, y: 100, dist: 210 },
  { id: "p9", x: 150, y: 270, dist: 235 },
  { id: "p7", x: 620, y: 260, dist: 277 },
  { id: "p12", x: 650, y: 180, dist: 290 },
  { id: "p8", x: 80, y: 50, dist: 303 },
  { id: "p14", x: 40, y: 180, dist: 321 },
];

const TOP3 = new Set(["p3", "p1", "p2"]);

const CELL_W = 120;
const CELL_H = 75;
const cellOf = (p: { x: number; y: number }) => ({ col: Math.floor(p.x / CELL_W), row: Math.floor(p.y / CELL_H) });
const QUERY_CELL = cellOf(QUERY);
const sameCell = (p: Point) => {
  const c = cellOf(p);
  return c.col === QUERY_CELL.col && c.row === QUERY_CELL.row;
};
const neighborCell = (p: Point) => {
  const c = cellOf(p);
  return Math.abs(c.col - QUERY_CELL.col) <= 1 && Math.abs(c.row - QUERY_CELL.row) <= 1;
};

const methods: { key: Method; label: string }[] = [
  { key: "full-scan", label: "Quét toàn bộ" },
  { key: "geohash", label: "Geohash grid" },
  { key: "index", label: "PostGIS GiST / H3" },
];

const STEPS: Record<Method, { title: string; description: string }[]> = {
  "full-scan": [
    { title: "Tính khoảng cách mọi điểm", description: "Không có index không gian: tính khoảng cách rider tới cả 14 tài xế (thực tế là 1 triệu điểm) — O(N), chậm dần khi N tăng." },
    { title: "Sắp xếp, lấy top-3", description: "Sort toàn bộ theo khoảng cách rồi lấy 3 gần nhất. Đúng nhưng lãng phí: 1M phép tính khoảng cách cho mỗi lượt tìm tài xế." },
  ],
  geohash: [
    { title: "Encode vị trí thành geohash cell", description: "Rider ở ô geohash (cột 3, hàng 2). Ý tưởng: gộp các điểm gần nhau vào cùng một chuỗi ký tự để tra bằng index thường (B-tree/hash) thay vì tính khoảng cách." },
    { title: "Query đúng 1 cell", description: "Chỉ lấy điểm trong cùng cell với rider. Nhanh — nhưng geohash có biên cứng: điểm p3 chỉ cách rider 7m lại nằm ở cell bên cạnh nên bị bỏ sót (tô màu xám)." },
    { title: "Check thêm 8 cell lân cận", description: "Luôn phải quét khối 3×3 cell quanh vị trí rider, không chỉ 1 cell — nếu không sẽ mất chính xác ở gần biên như p3." },
    { title: "Tính khoảng cách thật, lấy top-3", description: "Trong tập ứng viên (8 điểm) mới tính khoảng cách chính xác (haversine) và lấy 3 gần nhất. Ít việc hơn full scan nhiều, nhưng vẫn phải trả giá 'bù biên' bằng cách check nhiều cell hơn." },
  ],
  index: [
    { title: "ST_DWithin bán kính nhỏ", description: "`SELECT ... FROM drivers WHERE ST_DWithin(geom, :point, 15)` — GiST index nhảy thẳng tới các điểm trong bán kính 15m, không quét bảng. Chỉ thấy 2 điểm, chưa đủ K=3." },
    { title: "Chưa đủ K → tăng bán kính", description: "Không thấy đủ K tài xế thì tăng bán kính (thường ×2–3) rồi query lại: `ST_DWithin(geom, :point, 50)`. GiST vẫn chỉ động tới các trang chứa điểm trong vòng tròn mới." },
    { title: "ORDER BY <-> LIMIT k", description: "`ORDER BY geom <-> :point LIMIT 3` trên tập đã lọc để lấy đúng thứ tự gần nhất. H3 làm tương tự bằng hex cell theo resolution; quadtree chia ô động theo mật độ — cả ba đều rẻ hơn quét toàn bảng nhiều bậc." },
  ],
};

function isActive(method: Method, step: number, p: Point): boolean {
  if (method === "full-scan") return step === 0 || TOP3.has(p.id);
  if (method === "geohash") {
    if (step === 0) return false;
    if (step === 1) return sameCell(p);
    return neighborCell(p);
  }
  const radii = [15, 50, 50];
  return p.dist <= radii[step];
}

export function GeoIndexComparisonDiagram() {
  const [method, setMethod] = useState<Method>("full-scan");

  return (
    <div>
      <div className="not-prose -mb-4 flex flex-wrap gap-2">
        {methods.map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => setMethod(option.key)}
            className={clsx(
              "rounded-full px-3 py-1.5 text-sm font-medium",
              method === option.key ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
      <StepDiagram key={method} title="Tìm 3 tài xế gần rider nhất trong 1 triệu điểm (mô phỏng 14 điểm)" viewBox="0 0 720 320" steps={STEPS[method]}>
        {(step) => {
          const isFinal = step === STEPS[method].length - 1;
          const showGrid = method === "geohash";
          const showCircle = method === "index";
          const radius = [15, 50, 50][step] ?? 50;
          return (
            <>
              {showGrid &&
                Array.from({ length: 7 }, (_, i) => i * CELL_W).map((x) => (
                  <line key={`v${x}`} x1={x} y1={0} x2={x} y2={320} className="stroke-stone-300 dark:stroke-stone-700" strokeWidth={1} />
                ))}
              {showGrid &&
                Array.from({ length: 5 }, (_, i) => i * CELL_H).map((y) => (
                  <line key={`h${y}`} x1={0} y1={y} x2={720} y2={y} className="stroke-stone-300 dark:stroke-stone-700" strokeWidth={1} />
                ))}
              {showGrid && step >= 2 && (
                <rect
                  x={(QUERY_CELL.col - 1) * CELL_W}
                  y={(QUERY_CELL.row - 1) * CELL_H}
                  width={CELL_W * 3}
                  height={CELL_H * 3}
                  className="fill-cyan-500/10 stroke-cyan-500 dark:stroke-cyan-400"
                  strokeDasharray="5 4"
                />
              )}
              {showGrid && step === 1 && (
                <rect x={QUERY_CELL.col * CELL_W} y={QUERY_CELL.row * CELL_H} width={CELL_W} height={CELL_H} className="fill-cyan-500/15 stroke-cyan-500" />
              )}
              {showCircle && (
                <circle cx={QUERY.x} cy={QUERY.y} r={radius} fill="none" className={diagramToneClasses.cyan.stroke} strokeWidth={2} strokeDasharray="6 4" />
              )}
              {POINTS.map((p) => {
                const active = isActive(method, step, p);
                const tone: DiagramTone = isFinal && TOP3.has(p.id) && active ? "green" : active ? "amber" : "slate";
                return (
                  <g key={p.id} className="transition-opacity duration-500" opacity={active ? 1 : 0.3}>
                    <circle cx={p.x} cy={p.y} r={7} className={diagramToneClasses[tone].fill} />
                    {method === "geohash" && p.id === "p3" && step === 1 && (
                      <text x={p.x} y={p.y - 12} textAnchor="middle" fontSize={10} className="fill-rose-600 dark:fill-rose-400" fontWeight={700}>
                        bị bỏ sót!
                      </text>
                    )}
                  </g>
                );
              })}
              <DiagramNode x={330} y={141} width={60} height={48} label="Rider" emoji="🧍" tone="blue" state="active" rounded={24} />
              {isFinal && <DiagramLabel x={360} y={310} text="✅ Top-3 tài xế gần nhất (xanh lá)" size={13} bold tone="green" />}
            </>
          );
        }}
      </StepDiagram>
    </div>
  );
}
