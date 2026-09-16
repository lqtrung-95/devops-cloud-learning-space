"use client";

import { DiagramArrow, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";

// Timeline of tasks sorted newest-first (createdAt desc), as taskflow-api returns them.
// T7 does not exist yet at step 0 — it is inserted between page 1 and page 2.
const initialIds = ["T6", "T5", "T4", "T3", "T2", "T1"];
const afterInsertIds = ["T7", "T6", "T5", "T4", "T3", "T2", "T1"];

const steps: DiagramStep[] = [
  {
    title: "Trang 1",
    description:
      "`limit=3`. Cả hai cách đều trả `T6, T5, T4` — 3 task mới nhất. Cursor pagination lưu lại `createdAt` của `T4` (bản ghi cuối trang) làm `meta.cursor`.",
  },
  {
    title: "Có task mới",
    description: "Trong lúc người dùng đang xem trang 1, ai đó tạo `T7` — task MỚI NHẤT, chèn lên đầu danh sách. Vị trí tuyệt đối của mọi task khác bị đẩy lùi 1 bậc.",
  },
  {
    title: "Trang 2 — Offset",
    description:
      "`offset=3&limit=3` đếm lại từ đầu danh sách MỚI (đã có T7): vị trí 3-4-5 giờ là `T4, T3, T2` — `T4` bị trả TRÙNG vì nó đã xuất hiện ở trang 1.",
  },
  {
    title: "Trang 2 — Cursor",
    description:
      "Query `createdAt < cursor` (cursor = createdAt của T4) — không quan tâm T7 vừa chèn ở đâu. Kết quả đúng: `T3, T2, T1`, không trùng không thiếu.",
  },
];

const chipWidth = 70;
const chipHeight = 44;
const gap = 14;

function chipX(index: number, startX: number) {
  return startX + index * (chipWidth + gap);
}

export function CursorVsOffsetPaginationDiagram() {
  return (
    <StepDiagram title="Dữ liệu đổi giữa 2 trang: offset lệch, cursor thì không" viewBox="0 0 720 320" steps={steps}>
      {(step) => {
        const ids = step >= 1 ? afterInsertIds : initialIds;
        const page1Ids = new Set(["T6", "T5", "T4"]);

        // Row 1: the list itself (always shown).
        const listRow = (
          <>
            <DiagramLabel x={20} y={40} text="Danh sách (mới nhất → cũ nhất)" anchor="start" bold />
            {ids.map((id, index) => {
              const isNew = id === "T7";
              const inPage1 = page1Ids.has(id);
              return (
                <DiagramNode
                  key={id}
                  x={chipX(index, 20)}
                  y={54}
                  width={chipWidth}
                  height={chipHeight}
                  label={id}
                  tone={isNew && step >= 1 ? "violet" : inPage1 ? "green" : "slate"}
                  state={isNew && step === 1 ? "active" : "normal"}
                />
              );
            })}
          </>
        );

        // Row 2: offset page 2 result (only meaningful from step 2 onward).
        const offsetHighlight = ["T4", "T3", "T2"];
        const offsetRow = (
          <>
            <DiagramLabel x={20} y={150} text="Trang 2 — offset=3, limit=3" anchor="start" bold tone={step === 2 ? "rose" : "slate"} />
            {offsetHighlight.map((id, index) => (
              <DiagramNode
                key={id}
                x={chipX(index, 20)}
                y={164}
                width={chipWidth}
                height={chipHeight}
                label={id}
                sublabel={id === "T4" ? "trùng!" : undefined}
                tone={id === "T4" ? "rose" : "slate"}
                state={step === 2 ? (id === "T4" ? "active" : "normal") : "dimmed"}
              />
            ))}
            <DiagramArrow from={[300, 186]} to={[360, 186]} tone="rose" dimmed={step !== 2} />
            <DiagramLabel x={370} y={190} text="T4 đã thấy ở trang 1 rồi" anchor="start" tone="rose" />
          </>
        );

        // Row 3: cursor page 2 result (only meaningful at step 3).
        const cursorHighlight = ["T3", "T2", "T1"];
        const cursorRow = (
          <>
            <DiagramLabel x={20} y={250} text="Trang 2 — cursor = createdAt(T4)" anchor="start" bold tone={step === 3 ? "green" : "slate"} />
            {cursorHighlight.map((id, index) => (
              <DiagramNode
                key={id}
                x={chipX(index, 20)}
                y={264}
                width={chipWidth}
                height={chipHeight}
                label={id}
                tone="green"
                state={step === 3 ? "active" : "dimmed"}
              />
            ))}
            <DiagramArrow from={[300, 286]} to={[360, 286]} tone="green" dimmed={step !== 3} />
            <DiagramLabel x={370} y={290} text="không trùng, không thiếu" anchor="start" tone="green" />
          </>
        );

        return (
          <>
            {listRow}
            {offsetRow}
            {cursorRow}
          </>
        );
      }}
    </StepDiagram>
  );
}
