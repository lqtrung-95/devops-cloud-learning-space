"use client";

import { useState } from "react";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import { DiagramArrow, DiagramGroupBox, DiagramNode } from "@/components/diagrams/diagram-shapes";

type StorageKey = "ebs" | "efs" | "s3";

const storageInfo: Record<StorageKey, { title: string; emoji: string; analogy: string; facts: string[] }> = {
  ebs: {
    title: "EBS — ổ cứng gắn vào một máy",
    emoji: "💽",
    analogy: "Như ổ cứng gắn trong laptop: nhanh, của riêng một máy, và phải nằm cùng 'toà nhà' (AZ) với máy đó.",
    facts: [
      "Phạm vi: 1 Availability Zone — EC2 ở AZ khác không gắn được",
      "Kiểu truy cập: block device → format xfs/ext4 rồi mount như ổ đĩa",
      "Gắn vào 1 EC2 tại một thời điểm (ngoại lệ: io1/io2 Multi-Attach cùng AZ)",
      "Backup bằng snapshot (incremental) → tạo volume mới ở AZ/region khác",
    ],
  },
  efs: {
    title: "EFS — ổ mạng dùng chung",
    emoji: "🗂️",
    analogy: "Như ổ mạng chung của cả công ty: nhiều máy ở nhiều tầng cùng mở một thư mục, ai ghi thì người khác thấy ngay.",
    facts: [
      "Phạm vi: Region — có mount target ở từng AZ",
      "Kiểu truy cập: NFS v4.1, chỉ dành cho Linux; nhiều EC2/container mount cùng lúc",
      "Dung lượng tự co giãn, trả theo GB thực dùng (đắt hơn EBS/GB)",
      "Cần file share cho Windows? Dùng FSx for Windows File Server",
    ],
  },
  s3: {
    title: "S3 — kho hàng object qua API",
    emoji: "🪣",
    analogy: "Như kho hàng khổng lồ: gửi kiện theo mã (key) và lấy kiện ở quầy (HTTPS API). Bạn không 'bước vào kho' để sửa một góc kiện hàng.",
    facts: [
      "Phạm vi: Region — dữ liệu tự nhân bản qua nhiều AZ (trừ One Zone-IA)",
      "Kiểu truy cập: GET/PUT qua HTTPS; muốn sửa file thì ghi đè cả object",
      "Dung lượng gần như vô hạn, thiết kế độ bền 11 số 9",
      "Hợp cho: ảnh/file người dùng, backup, log, static website, data lake",
    ],
  },
};

export function StorageTypesComparisonDiagram() {
  const [selected, setSelected] = useState<StorageKey>("ebs");
  const info = storageInfo[selected];
  const stateOf = (key: StorageKey) => (selected === key ? "active" : "normal");

  return (
    <DiagramFrame
      title="EBS vs EFS vs S3 — bấm vào từng loại lưu trữ"
      viewBox="0 0 720 330"
      controls={
        <div className="space-y-2 text-sm">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(storageInfo) as StorageKey[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setSelected(key)}
                className={
                  selected === key
                    ? "rounded-full bg-indigo-600 px-3 py-1.5 font-medium text-white"
                    : "rounded-full bg-stone-200 px-3 py-1.5 font-medium text-stone-700 dark:bg-stone-800 dark:text-stone-300"
                }
              >
                {storageInfo[key].emoji} {key.toUpperCase()}
              </button>
            ))}
          </div>
          <p className="font-semibold text-indigo-700 dark:text-indigo-300">{info.title}</p>
          <p className="text-stone-700 dark:text-stone-300">{info.analogy}</p>
          <ul className="list-disc space-y-0.5 pl-5 text-stone-600 dark:text-stone-400">
            {info.facts.map((fact) => (
              <li key={fact}>{fact}</li>
            ))}
          </ul>
        </div>
      }
      caption="Nhìn đường nối: EBS chỉ nối với đúng 1 máy trong cùng AZ, EFS nối với máy ở mọi AZ, S3 nằm ngoài AZ và được gọi qua API."
    >
      <DiagramGroupBox x={20} y={30} width={540} height={290} label="Region ap-southeast-1" tone="slate" />
      <DiagramGroupBox x={34} y={56} width={250} height={180} label="AZ a" tone="blue" />
      <DiagramGroupBox x={298} y={56} width={250} height={180} label="AZ b" tone="blue" />

      <DiagramNode x={60} y={84} width={130} height={52} label="EC2 web-1" tone="slate" />
      <DiagramNode x={324} y={84} width={130} height={52} label="EC2 web-2" tone="slate" />
      <DiagramNode x={60} y={170} width={100} height={50} label="💽 EBS" sublabel="vol-a" tone="amber" state={stateOf("ebs")} onClick={() => setSelected("ebs")} />
      <DiagramNode x={324} y={170} width={100} height={50} label="💽 EBS" sublabel="vol-b" tone="amber" state={stateOf("ebs")} onClick={() => setSelected("ebs")} />
      <DiagramNode x={150} y={254} width={290} height={54} label="🗂️ EFS" sublabel="mount target ở AZ a + AZ b" tone="green" state={stateOf("efs")} onClick={() => setSelected("efs")} />
      <DiagramNode x={585} y={110} width={120} height={110} label="S3 bucket" sublabel="regional" emoji="🪣" tone="violet" state={stateOf("s3")} onClick={() => setSelected("s3")} />

      <DiagramArrow from={[110, 138]} to={[110, 166]} tone="amber" bidirectional animated={selected === "ebs"} dimmed={selected !== "ebs"} />
      <DiagramArrow from={[374, 138]} to={[374, 166]} tone="amber" bidirectional animated={selected === "ebs"} dimmed={selected !== "ebs"} />
      <DiagramArrow from={[210, 250]} to={[182, 140]} tone="green" label="NFS" animated={selected === "efs"} dimmed={selected !== "efs"} />
      <DiagramArrow from={[400, 250]} to={[448, 140]} tone="green" label="NFS" animated={selected === "efs"} dimmed={selected !== "efs"} />
      <DiagramArrow from={[125, 82]} to={[600, 108]} curve={-55} tone="violet" animated={selected === "s3"} dimmed={selected !== "s3"} />
      <DiagramArrow from={[456, 110]} to={[581, 150]} tone="violet" label="HTTPS API" animated={selected === "s3"} dimmed={selected !== "s3"} />
    </DiagramFrame>
  );
}
