"use client";

import { DiagramArrow, DiagramGroupBox, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";

const steps: DiagramStep[] = [
  {
    title: "Ghi WAL",
    description: "`PUT user:42 = v3` được append vào cuối WAL/commit log trên disk — ghi tuần tự, rẻ. Mất điện thì dựng lại memtable từ log này.",
  },
  {
    title: "Memtable",
    description: "Đồng thời key được chèn vào memtable — một cấu trúc đã sắp xếp nằm trong RAM. Xong hai bước này là có thể trả lời client: không có ghi ngẫu nhiên nào vào file dữ liệu.",
  },
  {
    title: "Flush → SSTable",
    description: "Memtable đầy thì được ghi một lượt thành SSTable mới: file bất biến (immutable), key đã sắp xếp. Bản cũ `v1`, `v2` vẫn nằm trong các SSTable cũ — chưa ai xoá.",
  },
  {
    title: "Đọc: read amp",
    description: "`GET user:9`: xem memtable trước, rồi các SSTable từ mới đến cũ. Bloom filter của #3 nói \"chắc chắn không có\" → bỏ qua; của #2 nói \"có thể có\" (false positive) → phải đọc block rồi mới biết không có; tới #1 mới thấy. Càng nhiều file chồng key, một lần đọc càng tốn — read amplification.",
  },
  {
    title: "Compaction",
    description: "Chạy nền: merge-sort nhiều SSTable thành file mới, giữ bản mới nhất, bỏ bản cũ và tombstone (dấu xoá) đã đủ điều kiện. Cùng một dữ liệu bị ghi lại nhiều lần — write amplification; trước khi gộp, bản cũ chiếm chỗ — space amplification.",
  },
  {
    title: "Đọc sau compaction",
    description: "Sau compaction, `user:9` chỉ còn ở một file L1 → đọc ít file hơn. Tuning compaction (leveled vs size-tiered) chính là chọn điểm cân bằng giữa ba loại amplification — tuỳ workload, cần benchmark.",
  },
];

const oldTables = [
  { x: 250, label: "SSTable #1", sublabel: "user:9, user:42 = v1" },
  { x: 400, label: "SSTable #2", sublabel: "user:42 = v2" },
];

export function LsmTreeWriteReadPathDiagram() {
  return (
    <StepDiagram title="LSM-tree: đường ghi, flush, compaction và đường đọc" viewBox="0 0 720 340" steps={steps}>
      {(step) => {
        const isRead = step === 3 || step === 5;
        const l0State = step === 3 ? "active" : step >= 4 ? "dimmed" : "normal";
        return (
          <>
            <DiagramGroupBox x={320} y={6} width={390} height={104} label="RAM" tone="violet" />
            <DiagramGroupBox x={10} y={122} width={700} height={212} label="Disk" tone="slate" />

            <DiagramNode x={10} y={30} width={150} height={60} label="App" sublabel={isRead ? "GET user:9" : "PUT user:42 = v3"} tone="slate" state="active" />
            <DiagramNode
              x={340}
              y={34}
              width={350}
              height={60}
              label="Memtable (sorted)"
              sublabel={step === 2 ? "đầy → flush, mở memtable mới" : step >= 3 ? "không có user:9 → xuống disk" : "user:42 = v3, user:57 = …"}
              tone="violet"
              state={step === 1 || isRead ? "active" : step === 0 ? "dimmed" : "normal"}
            />
            <DiagramNode x={30} y={150} width={190} height={60} label="WAL / commit log" sublabel="append tuần tự" tone="amber" state={step === 0 ? "active" : "normal"} />

            <DiagramArrow from={[100, 92]} to={[120, 146]} tone="amber" animated={step === 0} dimmed={step !== 0} label="1" />
            <DiagramArrow from={[162, 60]} to={[336, 64]} tone={isRead ? "blue" : "violet"} animated={step === 1 || isRead} dimmed={step === 0 || step === 2 || step === 4} label={isRead ? "đọc" : "2"} />

            {oldTables.map((table) => (
              <DiagramNode key={table.label} x={table.x} y={150} width={140} height={60} label={table.label} sublabel={table.sublabel} tone="cyan" state={l0State} dashed={step >= 4} />
            ))}
            <DiagramNode
              x={550}
              y={150}
              width={140}
              height={60}
              label="SSTable #3"
              sublabel="user:42 = v3"
              tone="cyan"
              state={step === 2 ? "active" : step === 3 ? "normal" : "dimmed"}
              dashed={step >= 4}
            />
            <DiagramLabel x={470} y={140} text="L0" size={12} bold tone="cyan" />
            {step <= 2 && <DiagramArrow from={[615, 96]} to={[620, 146]} tone="violet" animated={step === 2} dimmed={step !== 2} label="flush" />}

            {step === 3 && (
              <>
                <DiagramArrow from={[620, 96]} to={[620, 146]} tone="slate" dimmed label="① bỏ qua" />
                <DiagramArrow from={[500, 96]} to={[470, 146]} tone="amber" label="② đọc, không thấy" />
                <DiagramArrow from={[360, 96]} to={[320, 146]} tone="green" animated label="③ thấy" />
              </>
            )}

            <DiagramArrow from={[470, 212]} to={[470, 256]} tone="green" animated={step === 4} dimmed={step !== 4} label="merge" />
            <DiagramNode
              x={250}
              y={260}
              width={440}
              height={60}
              label="L1 SSTable (sau compaction)"
              sublabel="user:9, user:42 = v3 — bỏ v1, v2"
              tone="green"
              state={step === 4 || step === 5 ? "active" : "dimmed"}
            />
            {step === 5 && <DiagramArrow from={[560, 96]} to={[560, 256]} tone="blue" animated curve={-40} label="1 file" />}
            <DiagramLabel x={125} y={290} text={step >= 4 ? "Ghi lại dữ liệu = write amp" : "File cũ chưa gộp = space amp"} size={12} tone={step >= 4 ? "green" : "rose"} bold />
          </>
        );
      }}
    </StepDiagram>
  );
}
