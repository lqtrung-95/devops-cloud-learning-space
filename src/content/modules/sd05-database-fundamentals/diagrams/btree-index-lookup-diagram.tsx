"use client";

import { DiagramArrow, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";

const steps: DiagramStep[] = [
  {
    title: "Query tới",
    description:
      "`WHERE customer_id = 4242 ORDER BY created_at DESC LIMIT 20`. Không có index, Postgres phải đọc cả bảng — cỡ vài chục nghìn page 8KB cho 5 triệu dòng.",
  },
  {
    title: "Root page",
    description: "Root chứa các khoá phân cách. 4242 nhỏ hơn 30000 → đi xuống nhánh trái. Chỉ đọc 1 page (thường đã nằm sẵn trong shared buffers).",
  },
  {
    title: "Internal page",
    description: "Page trung gian: 4000 ≤ 4242 < 4500 → đi tiếp xuống đúng leaf. Mỗi page chứa hàng trăm khoá, nên cây vài triệu dòng thường chỉ sâu cỡ 3 tầng.",
  },
  {
    title: "Leaf page",
    description:
      "Leaf chứa các entry `(customer_id, created_at) → TID` đã sắp xếp. Vì cột thứ hai cũng đã sắp, 20 entry mới nhất nằm liền nhau — không cần sort. Leaf còn nối với leaf kế bên để quét range.",
  },
  {
    title: "Heap fetch",
    description:
      "Mỗi TID trỏ tới một dòng trong heap (bảng thật) để lấy `total_cents`. Covering index (`INCLUDE (total_cents)`) cho phép Index Only Scan, bỏ bước này khi visibility map cho phép.",
  },
];

// Leaf level: only the leaf whose key range contains 4242 is on the lookup path.
const leaves = [
  { label: "Leaf", sublabel: "3990 … 4120", active: false },
  { label: "Leaf ✓", sublabel: "4121 … 4290", active: true },
  { label: "Leaf", sublabel: "4291 … 4499", active: false },
  { label: "Leaf", sublabel: "…", active: false },
];

export function BtreeIndexLookupDiagram() {
  return (
    <StepDiagram title="B-tree index: tìm customer_id = 4242" viewBox="0 0 720 350" steps={steps}>
      {(step) => {
        const stateFor = (activeAt: number) => (step === activeAt ? "active" : step > activeAt ? "normal" : "dimmed");
        return (
          <>
            <DiagramNode x={250} y={10} width={220} height={52} label="Root page" sublabel="… 30000 | 60000 …" tone="violet" state={stateFor(1)} />
            <DiagramArrow from={[300, 64]} to={[140, 104]} tone="green" dimmed={step < 2} animated={step === 2} />
            <DiagramArrow from={[360, 64]} to={[360, 104]} tone="slate" dimmed />
            <DiagramArrow from={[420, 64]} to={[580, 104]} tone="slate" dimmed />

            <DiagramNode x={40} y={108} width={200} height={52} label="Internal page ✓" sublabel="… 4000 | 4500 …" tone="blue" state={stateFor(2)} />
            <DiagramNode x={260} y={108} width={200} height={52} label="Internal page" sublabel="… 40000 | 50000 …" tone="blue" state="dimmed" />
            <DiagramNode x={480} y={108} width={200} height={52} label="Internal page" sublabel="… 70000 | 85000 …" tone="blue" state="dimmed" />
            <DiagramArrow from={[140, 162]} to={[270, 204]} tone="green" dimmed={step < 3} animated={step === 3} />

            {leaves.map((leaf, index) => {
              const x = 20 + index * 175;
              return (
                <g key={leaf.sublabel}>
                  <DiagramNode
                    x={x}
                    y={208}
                    width={150}
                    height={52}
                    label={leaf.label}
                    sublabel={leaf.sublabel}
                    tone="cyan"
                    state={leaf.active ? stateFor(3) : "dimmed"}
                  />
                  {index < leaves.length - 1 && <DiagramArrow from={[x + 152, 234]} to={[x + 173, 234]} tone="cyan" dimmed={step < 3} />}
                </g>
              );
            })}
            <DiagramArrow from={[270, 262]} to={[270, 292]} tone="green" dimmed={step < 4} animated={step === 4} label="TID" />

            <DiagramNode
              x={20}
              y={296}
              width={680}
              height={46}
              label="Heap — bảng orders (dòng thật)"
              sublabel={step === 0 ? "Seq Scan: đọc tuần tự mọi page" : "chỉ đọc vài page chứa 20 dòng cần lấy"}
              tone={step === 0 ? "rose" : "amber"}
              state={step === 0 || step === 4 ? "active" : "dimmed"}
            />
            {step === 0 && <DiagramLabel x={360} y={188} text="Chưa có index → phải quét toàn bộ heap" tone="rose" bold />}
          </>
        );
      }}
    </StepDiagram>
  );
}
