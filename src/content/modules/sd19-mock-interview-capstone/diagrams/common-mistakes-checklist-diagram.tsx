"use client";

import { useState } from "react";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import { DiagramNode } from "@/components/diagrams/diagram-shapes";
import type { DiagramTone } from "@/components/diagrams/diagram-tones";

/** Click-to-reveal checklist: 6 lỗi phổ biến, mỗi lỗi lật ra "vì sao" + cách sửa. */

interface Mistake {
  front: string;
  frontSub: string;
  back: string;
  backSub: string;
  tone: DiagramTone;
}

const mistakes: Mistake[] = [
  { front: "🚫 Vẽ hộp ngay", frontSub: "chưa hỏi gì cả", back: "Chọn kiến trúc theo cảm tính", backSub: "Sửa: hỏi 5–8 phút đầu tiên", tone: "amber" },
  { front: "🤐 Bỏ qua NFR", frontSub: "chỉ nói functional", back: "Không có số để so sánh phương án", backSub: "Sửa: luôn hỏi latency & availability", tone: "amber" },
  { front: "🎤 Buzzword rỗng", frontSub: '"dùng Kafka vì scalable"', back: "Không giải thích được cơ chế thật", backSub: "Sửa: gắn với QPS cụ thể", tone: "amber" },
  { front: "🔍 Đào sâu sai chỗ", frontSub: "20' cho phần dễ nhất", back: "Bỏ lỡ phần khó nhất của bài toán", backSub: "Sửa: hỏi interviewer muốn đào đâu", tone: "amber" },
  { front: "🙉 Phớt lờ gợi ý", frontSub: "interviewer nhắc mà lơ", back: "Bỏ lỡ tín hiệu đổi hướng quan trọng", backSub: "Sửa: coi mọi câu hỏi là gợi ý", tone: "amber" },
  { front: "🤫 Im lặng suy nghĩ", frontSub: "không nói ra gì cả", back: "Interviewer không biết bạn đang nghĩ gì", backSub: "Sửa: think aloud, kể cả lúc phân vân", tone: "amber" },
];

const CARD_WIDTH = 220;
const CARD_HEIGHT = 108;
const GAP = 10;
const COLUMNS = 3;

export function CommonMistakesChecklistDiagram() {
  const [revealed, setRevealed] = useState<boolean[]>(() => mistakes.map(() => false));

  const toggle = (index: number) => setRevealed((current) => current.map((value, valueIndex) => (valueIndex === index ? !value : value)));
  const revealedCount = revealed.filter(Boolean).length;

  return (
    <DiagramFrame
      title="6 lỗi hay gặp — bấm vào từng thẻ để xem vì sao"
      viewBox="0 0 720 244"
      caption={`Đã lật ${revealedCount}/6 thẻ. Bấm lại để úp về câu hỏi ban đầu — dùng để tự kiểm tra bạn có nhớ "vì sao" trước khi xem đáp án.`}
    >
      {mistakes.map((mistake, index) => {
        const column = index % COLUMNS;
        const row = Math.floor(index / COLUMNS);
        const x = 20 + column * (CARD_WIDTH + GAP);
        const y = 12 + row * (CARD_HEIGHT + GAP);
        const isRevealed = revealed[index];
        return (
          <DiagramNode
            key={mistake.front}
            x={x}
            y={y}
            width={CARD_WIDTH}
            height={CARD_HEIGHT}
            label={isRevealed ? mistake.back : mistake.front}
            sublabel={isRevealed ? mistake.backSub : mistake.frontSub}
            tone={isRevealed ? "rose" : mistake.tone}
            state={isRevealed ? "active" : "normal"}
            onClick={() => toggle(index)}
          />
        );
      })}
    </DiagramFrame>
  );
}
