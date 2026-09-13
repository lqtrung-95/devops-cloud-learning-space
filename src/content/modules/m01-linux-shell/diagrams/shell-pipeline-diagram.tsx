"use client";

import { DiagramArrow, DiagramGroupBox, DiagramNode } from "@/components/diagrams/diagram-shapes";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";

const commands = [
  { label: "cat access.log", x: 8, width: 132 },
  { label: 'grep " 500"', x: 162, width: 124 },
  { label: "awk '{print $1}'", x: 308, width: 152 },
  { label: "sort", x: 482, width: 96 },
  { label: "uniq -c", x: 600, width: 110 },
];

const dataAtStep: string[][] = [
  [
    "203.0.113.5  GET  /login  200",
    "198.51.100.7 GET  /api    500",
    "203.0.113.5  POST /api    500",
    "192.0.2.44   GET  /       200",
    "198.51.100.7 GET  /api    500",
    "192.0.2.44   GET  /cart   404",
  ],
  ["198.51.100.7 GET  /api    500", "203.0.113.5  POST /api    500", "198.51.100.7 GET  /api    500"],
  ["198.51.100.7", "203.0.113.5", "198.51.100.7"],
  ["198.51.100.7", "198.51.100.7", "203.0.113.5"],
  ["      2 198.51.100.7", "      1 203.0.113.5"],
];

const steps: DiagramStep[] = [
  { title: "cat", description: "`cat` đổ toàn bộ file log ra — như mở vòi nước: 6 dòng chảy vào ống." },
  { title: "grep", description: "`grep \" 500\"` là cái rây: chỉ giữ lại dòng có lỗi 500. Còn 3 dòng." },
  { title: "awk", description: "`awk '{print $1}'` là máy cắt: chỉ lấy cột thứ nhất — địa chỉ IP." },
  { title: "sort", description: "`sort` xếp các IP giống nhau đứng cạnh nhau (uniq cần điều này)." },
  { title: "uniq -c", description: "`uniq -c` gộp dòng trùng và đếm. Kết quả: IP 198.51.100.7 gây ra 2 lỗi 500!" },
];

export function ShellPipelineDiagram() {
  return (
    <StepDiagram title="Pipe | — dây chuyền xử lý dữ liệu" viewBox="0 0 720 330" steps={steps}>
      {(step) => (
        <>
          {commands.map((command, index) => (
            <g key={command.label}>
              <DiagramNode
                x={command.x}
                y={14}
                width={command.width}
                height={48}
                label={command.label}
                tone={index === step ? "blue" : index < step ? "green" : "slate"}
                state={index === step ? "active" : index > step ? "dimmed" : "normal"}
              />
              {index < commands.length - 1 && (
                <DiagramArrow
                  from={[command.x + command.width + 2, 38]}
                  to={[commands[index + 1].x - 2, 38]}
                  tone="blue"
                  animated={index === step - 1}
                  dimmed={index >= step}
                />
              )}
            </g>
          ))}
          <DiagramGroupBox x={8} y={86} width={702} height={232} label={`Dữ liệu sau "${commands[step].label}" (${dataAtStep[step].length} dòng)`} tone="blue">
            {dataAtStep[step].map((line, index) => (
              <text key={`${step}-${line}-${index}`} x={30} y={132 + index * 29} fontSize={15} className="fill-stone-800 font-mono dark:fill-stone-200">
                {line}
              </text>
            ))}
          </DiagramGroupBox>
        </>
      )}
    </StepDiagram>
  );
}
