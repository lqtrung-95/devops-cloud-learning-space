"use client";

import { DiagramArrow, DiagramGroupBox, DiagramNode } from "@/components/diagrams/diagram-shapes";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";

type PartState = "pending" | "uploading" | "done" | "failed";

const partsByStep: PartState[][] = [
  ["pending", "pending", "pending", "pending"],
  ["done", "pending", "pending", "pending"],
  ["done", "done", "pending", "pending"],
  ["done", "done", "failed", "pending"],
  ["done", "done", "uploading", "pending"],
  ["done", "done", "done", "pending"],
  ["done", "done", "done", "done"],
];

const steps: DiagramStep[] = [
  { title: "CreateMultipartUpload", description: "App gọi `CreateMultipartUpload`, nhận về `uploadId`. File 200MB chia thành 4 part (8MB mỗi part, minh hoạ — thực tế phần đầu tối thiểu 5 MiB, tối đa 10.000 part)." },
  { title: "Part 1 xong", description: "`UploadPart(part=1)` thành công, object storage trả về `ETag` cho part 1 — client lưu lại `{partNumber: 1, ETag}` để dùng lúc complete." },
  { title: "Part 2 xong", description: "`UploadPart(part=2)` thành công. Các part có thể upload song song để tăng tốc — thứ tự part không cần đúng thứ tự gửi." },
  { title: "Part 3 lỗi mạng", description: "`UploadPart(part=3)` bị timeout/mất kết nối giữa chừng. Đây là điểm khác biệt cốt lõi so với PUT nguyên file: chỉ PART NÀY hỏng." },
  { title: "Retry đúng part 3", description: "Client retry lại CHỈ `UploadPart(part=3)` — không cần upload lại part 1, 2, 4. Đây là lý do multipart chịu lỗi tốt hơn nhiều so với upload một lần cho file lớn." },
  { title: "Part 3 xong", description: "Part 3 upload lại thành công, nhận `ETag` mới." },
  { title: "CompleteMultipartUpload", description: "Client gọi `CompleteMultipartUpload` kèm danh sách `{partNumber, ETag}` của cả 4 part theo đúng thứ tự. Object storage ráp lại thành 1 object hoàn chỉnh — nếu bỏ sót một part, complete sẽ báo lỗi." },
];

const toneFor: Record<PartState, "slate" | "cyan" | "green" | "rose"> = {
  pending: "slate",
  uploading: "cyan",
  done: "green",
  failed: "rose",
};

const labelFor: Record<PartState, string> = {
  pending: "chưa gửi",
  uploading: "đang gửi…",
  done: "ETag ✓",
  failed: "⚡ lỗi mạng",
};

export function MultipartUploadRetryDiagram() {
  return (
    <StepDiagram title="Multipart upload: 1 part lỗi, chỉ retry đúng part đó" viewBox="0 0 720 300" steps={steps}>
      {(step) => {
        const parts = partsByStep[step];
        const allDone = step === steps.length - 1;
        return (
          <>
            <DiagramNode x={10} y={110} width={110} height={70} label="Client" sublabel="4 part, 8MB/part" emoji="💻" tone="violet" state={step === 0 ? "active" : "normal"} />

            <DiagramGroupBox x={160} y={20} width={400} height={230} label="Upload từng part (song song / độc lập)">
              {parts.map((state, index) => (
                <g key={index}>
                  <DiagramNode
                    x={175 + index * 95}
                    y={70}
                    width={80}
                    height={70}
                    label={`Part ${index + 1}`}
                    sublabel={labelFor[state]}
                    tone={toneFor[state]}
                    state={state === "failed" || state === "uploading" ? "active" : "normal"}
                  />
                  <DiagramArrow from={[120, 140]} to={[175 + index * 95 + 40, 108]} tone={toneFor[state]} dimmed={state === "pending"} />
                </g>
              ))}
            </DiagramGroupBox>

            <DiagramNode
              x={600}
              y={110}
              width={110}
              height={80}
              label="Object storage"
              sublabel={allDone ? "1 object hoàn chỉnh" : "chờ đủ part"}
              emoji="📦"
              tone={allDone ? "green" : "amber"}
              state={allDone ? "active" : "normal"}
            />
            <DiagramArrow from={[560, 155]} to={[596, 150]} tone={allDone ? "green" : "amber"} dimmed={!allDone} label="CompleteMultipartUpload" />
          </>
        );
      }}
    </StepDiagram>
  );
}
