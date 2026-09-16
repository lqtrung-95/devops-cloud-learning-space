"use client";

import { useState } from "react";
import { DiagramArrow, DiagramGroupBox, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";

interface Item {
  id: string;
  label: string;
  sublabel: string;
  x: number;
  detail: string;
}

const gatewayItems: Item[] = [
  { id: "routing", label: "Routing", sublabel: "path → upstream", x: 40, detail: "nginx đọc `/api/v1/...` hay `/api/v2/...` và chuyển tới đúng upstream `api` — không quan tâm bên trong request có gì." },
  { id: "rate-limit", label: "Rate limit", sublabel: "limit_req theo IP", x: 200, detail: "`limit_req_zone` đếm request theo IP, không đếm theo 'nghiệp vụ' — 10 request/giây là 10 request/giây bất kể gọi tạo task hay xoá task." },
  { id: "tls", label: "TLS / proxy header", sublabel: "X-Real-IP, Host", x: 360, detail: "Gateway là nơi hợp lý để chấm dứt TLS và gắn header chuẩn hoá trước khi chuyển tiếp — việc hạ tầng, không đổi theo domain." },
  { id: "auth-passthrough", label: "Auth passthrough", sublabel: "chuyển tiếp token", x: 520, detail: "Gateway chuyển tiếp `Authorization` header nguyên vẹn — nó KHÔNG tự quyết định user có quyền gì, chỉ đảm bảo token tới được service." },
];

const serviceItems: Item[] = [
  { id: "validation", label: "Validation", sublabel: "Zod schema (B03)", x: 40, detail: "Kiểm tra `title` không rỗng, `status` đúng enum — quy tắc gắn với domain `taskflow-api`, đổi theo tính năng, không phải hạ tầng." },
  { id: "authz", label: "Authorization", sublabel: "role owner/admin (B06)", x: 200, detail: "Chỉ `api` biết `memberships.role` của user trong `organization` cụ thể — nginx không có khái niệm này." },
  { id: "serializer", label: "Serializer v1/v2", sublabel: "shape response", x: 360, detail: "Quyết định `status` là string hay `{ value, label }` là lựa chọn API design, không phải việc của gateway." },
  { id: "db", label: "Truy vấn DB", sublabel: "Drizzle + Postgres", x: 520, detail: "Đọc/ghi `tasks`, `comments`... — logic thuộc về service, gateway không mở kết nối Postgres." },
];

/** Click a responsibility to see why it sits on its side of the gateway/service boundary. */
export function GatewayVsServiceBoundaryDiagram() {
  const [selected, setSelected] = useState<Item | null>(null);

  const renderRow = (items: Item[], y: number) =>
    items.map((item) => (
      <DiagramNode
        key={item.id}
        x={item.x}
        y={y}
        width={140}
        height={56}
        label={item.label}
        sublabel={item.sublabel}
        tone={selected?.id === item.id ? "amber" : y < 150 ? "blue" : "green"}
        state={selected?.id === item.id ? "active" : selected ? "dimmed" : "normal"}
        onClick={() => setSelected(item)}
      />
    ));

  return (
    <DiagramFrame
      title="Ranh giới: nginx (gateway) ở trên, api (service) ở dưới"
      viewBox="0 0 720 300"
      caption={selected ? selected.detail : "Bấm vào một ô để xem vì sao trách nhiệm đó nằm ở gateway hay ở service."}
    >
      <DiagramGroupBox x={16} y={16} width={688} height={110} label="🚪 nginx — cross-cutting concern" tone="blue">
        {renderRow(gatewayItems, 44)}
      </DiagramGroupBox>

      <DiagramArrow from={[360, 130]} to={[360, 150]} tone="rose" dimmed />
      <DiagramLabel x={360} y={146} text="── ranh giới: không business logic nào được vượt lên trên ──" tone="rose" size={10.5} />

      <DiagramGroupBox x={16} y={158} width={688} height={128} label="🧠 api — business logic" tone="green">
        {renderRow(serviceItems, 190)}
      </DiagramGroupBox>
    </DiagramFrame>
  );
}
