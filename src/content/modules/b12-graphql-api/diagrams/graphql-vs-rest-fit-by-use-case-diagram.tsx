"use client";

import { DiagramNode } from "@/components/diagrams/diagram-shapes";
import { diagramToneClasses, type DiagramTone } from "@/components/diagrams/diagram-tones";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";

interface FitStep extends DiagramStep {
  restTone: DiagramTone;
  restVerdict: [string, string];
  graphqlTone: DiagramTone;
  graphqlVerdict: [string, string];
}

const steps: FitStep[] = [
  {
    title: "Client đa dạng cần field khác nhau",
    description: "Web cần đủ field hiển thị board, mobile chỉ cần vài field cho notification badge — cùng data, khác nhu cầu.",
    restTone: "rose",
    restVerdict: ["Phải tạo nhiều endpoint", "hoặc `?fields=` chắp vá"],
    graphqlTone: "green",
    graphqlVerdict: ["Mỗi client tự chọn field cần", "không đổi API"],
  },
  {
    title: "Dữ liệu lồng sâu nhiều cấp",
    description: "project → tasks → comments → author trong đúng 1 màn hình.",
    restTone: "rose",
    restVerdict: ["Nhiều round-trip, hoặc 1 endpoint", "over-fetch cứng riêng màn hình"],
    graphqlTone: "green",
    graphqlVerdict: ["1 query lồng đúng shape", "gọn ở phía client"],
  },
  {
    title: "Upload file đính kèm (attachment)",
    description: "Luồng binary/multipart cho file lớn — đã có presigned URL từ B08.",
    restTone: "green",
    restVerdict: ["Presigned URL + PUT thẳng", "lên MinIO — đơn giản, đã chạy tốt"],
    graphqlTone: "rose",
    graphqlVerdict: ["Không có cách chuẩn cho", "binary/multipart — chỉ thêm phức tạp"],
  },
  {
    title: "Cache theo URL (CDN, browser cache)",
    description: "Endpoint đọc nhiều, ít đổi — vd danh sách project công khai.",
    restTone: "green",
    restVerdict: ["GET + URL cố định — CDN/", "browser cache dùng được ngay"],
    graphqlTone: "rose",
    graphqlVerdict: ["Luôn POST tới 1 URL /graphql", "mất khả năng cache theo URL"],
  },
  {
    title: "CRUD đơn giản, 1 bảng, không lồng",
    description: "Vd GET /api/v1/health, hay danh sách webhook của 1 organization.",
    restTone: "green",
    restVerdict: ["1 endpoint, 1 shape cố định", "đơn giản, không cần schema riêng"],
    graphqlTone: "rose",
    graphqlVerdict: ["Thêm type/resolver cho thứ vốn", "chỉ là 1 SELECT đơn giản"],
  },
];

function VerdictLines({ x, y, lines, tone }: { x: number; y: number; lines: [string, string]; tone: DiagramTone }) {
  const textClass = diagramToneClasses[tone].text;
  return (
    <text x={x} y={y} textAnchor="middle" fontSize={11} className={textClass}>
      <tspan x={x} dy={0}>
        {lines[0]}
      </tspan>
      <tspan x={x} dy={15}>
        {lines[1]}
      </tspan>
    </text>
  );
}

export function GraphqlVsRestFitByUseCaseDiagram() {
  return (
    <StepDiagram title="GraphQL hợp với ca nào, REST vẫn thắng ở ca nào?" viewBox="0 0 680 230" steps={steps}>
      {(stepIndex) => {
        const step = steps[stepIndex];
        return (
          <>
            <DiagramNode x={40} y={40} width={280} height={70} label="REST" sublabel="/api/v1/..." emoji="📦" tone={step.restTone} state="active" />
            <VerdictLines x={180} y={140} lines={step.restVerdict} tone={step.restTone} />
            <DiagramNode x={360} y={40} width={280} height={70} label="GraphQL" sublabel="/graphql" emoji="🕸️" tone={step.graphqlTone} state="active" />
            <VerdictLines x={500} y={140} lines={step.graphqlVerdict} tone={step.graphqlTone} />
          </>
        );
      }}
    </StepDiagram>
  );
}
