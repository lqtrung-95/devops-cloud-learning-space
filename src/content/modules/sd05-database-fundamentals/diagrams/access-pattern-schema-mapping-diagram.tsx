"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import { DiagramArrow, DiagramGroupBox, DiagramNode } from "@/components/diagrams/diagram-shapes";

type SqlTable = "customers" | "orders" | "order_items";
type DynamoItem = "profile" | "order-meta" | "order-items" | "gsi1" | "gsi2";

const sqlTables: { key: SqlTable; label: string; sublabel: string; y: number }[] = [
  { key: "customers", label: "customers", sublabel: "id PK, name, email", y: 44 },
  { key: "orders", label: "orders", sublabel: "id PK, customer_id FK, status, created_at", y: 134 },
  { key: "order_items", label: "order_items", sublabel: "order_id FK, sku, qty, price", y: 224 },
];

const dynamoItems: { key: DynamoItem; label: string; sublabel: string; y: number; dashed?: boolean }[] = [
  { key: "profile", label: "PK=CUSTOMER#c1 · SK=PROFILE", sublabel: "name, email", y: 36 },
  { key: "order-meta", label: "PK=ORDER#o9 · SK=META", sublabel: "status, total, createdAt, GSI1*, GSI2*", y: 90 },
  { key: "order-items", label: "PK=ORDER#o9 · SK=ITEM#001…", sublabel: "sku, qty, price", y: 144 },
  { key: "gsi1", label: "GSI1: CUSTOMER#c1 · ORDER#<thời gian>", sublabel: "chỉ item META có thuộc tính này (sparse)", y: 198, dashed: true },
  { key: "gsi2", label: "GSI2: STATUS#PENDING#2026-09-15", sublabel: "đổi status → item tự chuyển partition", y: 252, dashed: true },
];

interface AccessPattern {
  title: string;
  sqlTables: SqlTable[];
  sql: string;
  dynamoItems: DynamoItem[];
  dynamo: string;
}

const patterns: AccessPattern[] = [
  {
    title: "① Hồ sơ khách",
    sqlTables: ["customers"],
    sql: "SELECT * FROM customers WHERE id = $1",
    dynamoItems: ["profile"],
    dynamo: "GetItem PK=CUSTOMER#c1, SK=PROFILE",
  },
  {
    title: "② 20 đơn mới nhất của khách",
    sqlTables: ["orders"],
    sql: "SELECT … FROM orders WHERE customer_id = $1 ORDER BY created_at DESC LIMIT 20  -- index (customer_id, created_at DESC)",
    dynamoItems: ["gsi1", "order-meta"],
    dynamo: "Query GSI1 PK=CUSTOMER#c1, SK begins_with ORDER#, ScanIndexForward=false, Limit=20",
  },
  {
    title: "③ Chi tiết đơn + items",
    sqlTables: ["orders", "order_items"],
    sql: "SELECT … FROM orders o JOIN order_items i ON i.order_id = o.id WHERE o.id = $1",
    dynamoItems: ["order-meta", "order-items"],
    dynamo: "Query PK=ORDER#o9  → một lần gọi trả cả META lẫn ITEM#… (item collection)",
  },
  {
    title: "④ Đơn PENDING trong ngày (kho)",
    sqlTables: ["orders"],
    sql: "SELECT … FROM orders WHERE status = 'pending' AND created_at >= $1  -- index (status, created_at)",
    dynamoItems: ["gsi2"],
    dynamo: "Query GSI2 PK=STATUS#PENDING#2026-09-15  (bucket theo ngày để tránh hot partition)",
  },
  {
    title: "⑤ Tìm đơn theo orderId (CSKH)",
    sqlTables: ["orders"],
    sql: "SELECT * FROM orders WHERE id = $1",
    dynamoItems: ["order-meta"],
    dynamo: "GetItem PK=ORDER#o9, SK=META",
  },
];

export function AccessPatternSchemaMappingDiagram() {
  const [patternIndex, setPatternIndex] = useState(2);
  const pattern = patterns[patternIndex];

  return (
    <DiagramFrame
      title="Cùng 5 access pattern — Postgres normalized vs DynamoDB single-table"
      viewBox="0 0 720 320"
      controls={
        <div className="space-y-3 text-sm">
          <div className="flex flex-wrap gap-2">
            {patterns.map((item, index) => (
              <button
                key={item.title}
                type="button"
                onClick={() => setPatternIndex(index)}
                className={clsx(
                  "rounded-full px-3 py-1.5 font-medium",
                  index === patternIndex ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
                )}
              >
                {item.title}
              </button>
            ))}
          </div>
          <div className="space-y-1.5 rounded-xl bg-stone-900 px-4 py-3 font-mono text-[13px] text-stone-100">
            <p>
              <span className="text-sky-400">Postgres › </span>
              {pattern.sql}
            </p>
            <p>
              <span className="text-amber-400">DynamoDB › </span>
              {pattern.dynamo}
            </p>
          </div>
        </div>
      }
      caption="Postgres: giữ mỗi sự thật một chỗ, ghép lúc đọc bằng JOIN + index. DynamoDB: biết trước pattern nên xếp sẵn item theo partition key/sort key và GSI — đọc là một GetItem/Query, nhưng thêm pattern mới thường phải thêm GSI hoặc backfill dữ liệu."
    >
      <DiagramGroupBox x={8} y={8} width={300} height={304} label="PostgreSQL (normalized)" tone="blue" />
      {sqlTables.map((table) => (
        <DiagramNode
          key={table.key}
          x={24}
          y={table.y + 8}
          width={268}
          height={58}
          label={table.label}
          sublabel={table.sublabel}
          tone="blue"
          state={pattern.sqlTables.includes(table.key) ? "active" : "dimmed"}
        />
      ))}
      <DiagramArrow from={[158, 110]} to={[158, 138]} tone="blue" label="1–n" />
      <DiagramArrow from={[158, 200]} to={[158, 228]} tone="blue" label="1–n" />

      <DiagramGroupBox x={322} y={8} width={390} height={304} label="DynamoDB — bảng shop (single-table)" tone="amber" />
      {dynamoItems.map((item) => (
        <DiagramNode
          key={item.key}
          x={336}
          y={item.y}
          width={362}
          height={46}
          label={item.label}
          sublabel={item.sublabel}
          tone={item.dashed ? "cyan" : "amber"}
          dashed={item.dashed}
          rounded={8}
          state={pattern.dynamoItems.includes(item.key) ? "active" : "dimmed"}
        />
      ))}
    </DiagramFrame>
  );
}
