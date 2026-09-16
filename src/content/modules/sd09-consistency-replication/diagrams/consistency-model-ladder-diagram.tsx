"use client";

import { useState } from "react";
import { DiagramNode } from "@/components/diagrams/diagram-shapes";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";

interface ModelInfo {
  key: string;
  label: string;
  tone: "green" | "blue" | "cyan" | "amber" | "slate";
  guarantee: string;
  example: string;
}

/** Strongest at top, weakest at bottom — matches the "ladder" learners climb down as they relax guarantees. */
const models: ModelInfo[] = [
  {
    key: "linearizable",
    label: "Linearizable",
    tone: "green",
    guarantee: "Mọi client thấy hệ thống như CHỈ CÓ MỘT bản sao, cập nhật tức thời theo thời gian thực.",
    example:
      "A ghi x=1, server báo thành công lúc 10:00:00. Bất kỳ read nào sau 10:00:00 (kể cả từ client khác, node khác) BẮT BUỘC thấy x=1 — không có ngoại lệ.",
  },
  {
    key: "sequential",
    label: "Sequential",
    tone: "blue",
    guarantee: "Mọi node đồng ý MỘT thứ tự toàn cục, khớp thứ tự thao tác của từng client — nhưng có thể không khớp thời gian thực.",
    example:
      "A ghi x=1 rồi B đọc thấy x=1 (đúng thứ tự chương trình). Nhưng C đọc ngay lúc đó vẫn có thể thấy x=0 một lúc — miễn là C không bao giờ thấy x quay lại 0 sau khi đã thấy x=1.",
  },
  {
    key: "causal",
    label: "Causal",
    tone: "cyan",
    guarantee: "Chỉ giữ thứ tự cho thao tác có quan hệ nhân-quả (đọc-rồi-ghi); thao tác độc lập được phép thấy khác thứ tự ở người khác.",
    example:
      "Bình luận trả lời luôn hiện SAU bình luận gốc nó trả lời, với mọi người. Nhưng 2 bình luận ở 2 chủ đề không liên quan có thể hiện thứ tự khác nhau ở 2 người xem — không sao, chúng không nhân-quả với nhau.",
  },
  {
    key: "read-your-writes",
    label: "Read-your-writes",
    tone: "amber",
    guarantee: "Một client LUÔN thấy chính ghi của mình ở lần đọc tiếp theo — không đảm bảo gì cho client khác.",
    example:
      "A đổi avatar, F5 ngay sau đó trên chính máy A → phải thấy avatar mới. Nhưng bạn B của A xem trang A ngay lúc đó vẫn có thể thấy avatar cũ vài giây — chấp nhận được.",
  },
  {
    key: "eventual",
    label: "Eventual",
    tone: "slate",
    guarantee: "Không đảm bảo gì tại một thời điểm cụ thể — chỉ đảm bảo NẾU ngừng ghi thì cuối cùng mọi bản sao hội tụ về cùng giá trị.",
    example:
      "Like count tăng ở nhiều node cùng lúc; ngay sau khi bấm, hai người xem có thể thấy hai con số khác nhau vài giây. Miễn là cuối cùng (vài giây/phút sau) mọi nơi khớp nhau.",
  },
];

export function ConsistencyModelLadderDiagram() {
  const [selected, setSelected] = useState(0);
  const current = models[selected];

  return (
    <DiagramFrame
      title="Thang mức consistency — mạnh nhất trên đỉnh, yếu nhất dưới đáy"
      viewBox="0 0 720 260"
      caption={
        <>
          <strong>{current.label}:</strong> {current.guarantee}
          <br />
          <span className="italic">Ví dụ:</span> {current.example}
        </>
      }
    >
      {models.map((model, index) => {
        const y = 20 + index * 44;
        return (
          <DiagramNode
            key={model.key}
            x={110}
            y={y}
            width={500}
            height={36}
            label={model.label}
            tone={model.tone}
            state={index === selected ? "active" : "normal"}
            rounded={8}
            onClick={() => setSelected(index)}
          />
        );
      })}
    </DiagramFrame>
  );
}
