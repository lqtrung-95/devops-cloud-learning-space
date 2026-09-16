"use client";

import { DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";

/** Cùng 4 bước của framework SD01 — nội dung mid vs senior khác nhau ở mỗi bước. */

interface LevelBehavior {
  mid: string;
  midSub: string;
  senior: string;
  seniorSub: string;
}

const behaviors: LevelBehavior[] = [
  { mid: "Trả lời khi được hỏi", midSub: "chờ interviewer dẫn dắt", senior: "Chủ động liệt kê giả định", seniorSub: "tự nêu out-of-scope, hỏi failure tolerance" },
  { mid: "Tính đúng công thức", midSub: "khi được nhắc mới ước lượng", senior: "Tự ước lượng ngay", seniorSub: "nối thẳng số vào quyết định kiến trúc" },
  { mid: "Vẽ đúng khối tiêu chuẩn", midSub: "theo mẫu quen thuộc", senior: "Vẽ nhanh, giải thích lý do", seniorSub: "mỗi khối gắn với 1 lý do cụ thể" },
  { mid: "So sánh khi được hỏi", midSub: "2 phương án cơ bản", senior: "Chủ động nêu failure mode", seniorSub: "trade-off + điều kiện đổi ý, không cần hỏi" },
];

const steps: DiagramStep[] = [
  {
    title: "① Làm rõ yêu cầu",
    description:
      "Mid trả lời đúng khi được hỏi trực tiếp. Senior chủ động nói ra giả định của mình (\"em giả định đọc nhiều hơn ghi ~50:1\") và tự đề xuất out-of-scope — không đợi interviewer gợi ý.",
  },
  {
    title: "② Ước lượng",
    description:
      "Mid ước lượng đúng công thức nhưng cần được nhắc mới làm. Senior ước lượng ngay không cần nhắc, và nối kết quả thẳng vào quyết định (\"50k QPS ghi ⇒ một Postgres không đủ, cần nghĩ tới sharding\").",
  },
  {
    title: "③ High-level design",
    description:
      "Cả hai đều vẽ đúng các khối tiêu chuẩn. Khác biệt là senior vẽ nhanh hơn và dành lời nói để giải thích *vì sao* chọn từng khối, thay vì chỉ liệt kê tên công nghệ.",
  },
  {
    title: "④ Đào sâu & trade-off",
    description:
      "Đây là chỗ khác biệt rõ nhất. Mid so sánh phương án khi được hỏi. Senior chủ động nêu bottleneck, failure mode và điều kiện đổi ý ngay cả khi không ai hỏi — dấu hiệu đã từng vận hành hệ thống thật.",
  },
];

export function MidVsSeniorExpectationsDiagram() {
  return (
    <StepDiagram title="Kỳ vọng mid vs senior qua từng bước của framework" viewBox="0 0 720 300" steps={steps}>
      {(step) => {
        const behavior = behaviors[step];
        return (
          <>
            <DiagramLabel x={250} y={16} text="Mid-level" size={13} bold />
            <DiagramLabel x={490} y={16} text="Senior" size={13} bold tone="violet" />

            <DiagramNode x={140} y={24} width={220} height={92} label={behavior.mid} sublabel={behavior.midSub} tone="blue" state="active" />
            <DiagramNode x={380} y={24} width={220} height={92} label={behavior.senior} sublabel={behavior.seniorSub} tone="violet" state="active" />

            <DiagramLabel x={20} y={142} text="Ai chủ động nói trade-off / failure mode mà không cần được hỏi? (xu hướng, không phải luật cố định)" anchor="start" size={11.5} bold />

            <DiagramNode x={20} y={154} width={220} height={40} label="Mid" sublabel="thỉnh thoảng, thường khi được hỏi" tone="blue" />
            <DiagramNode x={250} y={154} width={450} height={40} label="Senior" sublabel="gần như luôn, ngay cả khi không ai hỏi" tone="violet" />

            <DiagramNode
              x={20}
              y={216}
              width={680}
              height={60}
              rounded={12}
              label="Cùng một kiến trúc đúng — khác nhau ở mức độ chủ động và số liệu đi kèm mỗi bước"
              sublabel="đây là thứ rubric 'trade-off reasoning' và 'handling ambiguity' đang chấm"
              tone="slate"
              dashed
            />
          </>
        );
      }}
    </StepDiagram>
  );
}
