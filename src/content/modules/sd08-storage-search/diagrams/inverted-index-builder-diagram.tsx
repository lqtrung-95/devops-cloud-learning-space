"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import { DiagramNode } from "@/components/diagrams/diagram-shapes";

interface Doc {
  id: number;
  title: string;
  raw: string;
  tokens: string[];
}

// Tokenization đã lowercase + bỏ dấu câu + bỏ stopword ("và", "cho", "để"…) trước khi vào index.
const docs: Doc[] = [
  { id: 0, title: "Bài A", raw: "Cache giảm tải cho database", tokens: ["cache", "giảm", "tải"] },
  { id: 1, title: "Bài B", raw: "Index giúp query tăng tốc", tokens: ["index", "tăng", "tốc"] },
  { id: 2, title: "Bài C", raw: "Cache và index đều làm nhanh", tokens: ["cache", "index", "nhanh"] },
  { id: 3, title: "Bài D", raw: "Database cần backup định kỳ", tokens: ["database", "cần", "backup"] },
];

// Postings list dựng từ 4 tài liệu trên — token → danh sách docId chứa nó.
const postings: { token: string; docIds: number[] }[] = [
  { token: "cache", docIds: [0, 2] },
  { token: "giảm", docIds: [0] },
  { token: "tải", docIds: [0] },
  { token: "index", docIds: [1, 2] },
  { token: "tăng", docIds: [1] },
  { token: "tốc", docIds: [1] },
  { token: "nhanh", docIds: [2] },
  { token: "database", docIds: [3] },
  { token: "cần", docIds: [3] },
  { token: "backup", docIds: [3] },
];

const docTone: Record<number, "blue" | "amber" | "green" | "rose"> = { 0: "blue", 1: "amber", 2: "green", 3: "rose" };

export function InvertedIndexBuilderDiagram() {
  const [selectedDoc, setSelectedDoc] = useState<number | null>(2);

  return (
    <DiagramFrame
      title="Bấm vào một tài liệu để xem postings list của nó trong inverted index"
      viewBox="0 0 720 340"
      caption={
        selectedDoc === null
          ? "Bấm một tài liệu bên trái để xem token nào của nó xuất hiện trong inverted index bên phải."
          : `${docs[selectedDoc].title} sau tokenize: [${docs[selectedDoc].tokens.join(", ")}]. Các hàng sáng bên phải là vị trí tài liệu này được ghi vào postings list — tra một token là biết ngay nó nằm trong (những) tài liệu nào, không phải quét lại toàn bộ ${docs.length} tài liệu.`
      }
    >
      <text x={12} y={16} fontSize={11.5} fontWeight={700} className="fill-stone-600 dark:fill-stone-400">
        4 tài liệu (forward index)
      </text>
      {docs.map((doc, index) => (
        <g key={doc.id} onClick={() => setSelectedDoc(selectedDoc === doc.id ? null : doc.id)} className="cursor-pointer">
          <DiagramNode
            x={10}
            y={26 + index * 72}
            width={190}
            height={58}
            label={`${doc.title}: "${doc.raw}"`}
            sublabel={`tokens: ${doc.tokens.join(", ")}`}
            tone={docTone[doc.id]}
            state={selectedDoc === doc.id ? "active" : selectedDoc === null ? "normal" : "dimmed"}
          />
        </g>
      ))}

      <text x={230} y={16} fontSize={11.5} fontWeight={700} className="fill-stone-600 dark:fill-stone-400">
        Inverted index (token → postings list)
      </text>
      <rect x={228} y={22} width={480} height={300} rx={14} className="fill-stone-50 stroke-stone-300 dark:fill-stone-900 dark:stroke-stone-700" strokeWidth={1.5} />

      {postings.map((row, index) => {
        const highlighted = selectedDoc !== null && row.docIds.includes(selectedDoc);
        const y = 50 + index * 28;
        return (
          <g key={row.token}>
            <text x={248} y={y} fontSize={13} fontWeight={highlighted ? 700 : 500} className={clsx(highlighted ? "fill-indigo-700 dark:fill-indigo-300" : "fill-stone-700 dark:fill-stone-300")}>
              {row.token}
            </text>
            <text x={340} y={y} fontSize={12} className="fill-stone-400 dark:fill-stone-600">
              →
            </text>
            {[0, 1, 2, 3].map((docId) => {
              const has = row.docIds.includes(docId);
              const isSelected = selectedDoc === docId;
              return (
                <g key={docId}>
                  <circle
                    cx={365 + docId * 78}
                    cy={y - 4}
                    r={11}
                    className={clsx(
                      has
                        ? isSelected
                          ? "fill-indigo-600 stroke-indigo-700 dark:fill-indigo-400 dark:stroke-indigo-300"
                          : "fill-stone-400 stroke-stone-500 dark:fill-stone-500 dark:stroke-stone-400"
                        : "fill-transparent stroke-stone-300 dark:stroke-stone-700",
                    )}
                    strokeWidth={has ? 2 : 1}
                    opacity={selectedDoc !== null && !has ? 0.35 : 1}
                  />
                  <text x={365 + docId * 78} y={y - 0.5} textAnchor="middle" fontSize={9.5} fontWeight={600} className={has ? "fill-white" : "fill-stone-400 dark:fill-stone-600"}>
                    {docId}
                  </text>
                </g>
              );
            })}
          </g>
        );
      })}
    </DiagramFrame>
  );
}
