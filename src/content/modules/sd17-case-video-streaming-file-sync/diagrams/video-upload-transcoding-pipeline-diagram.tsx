"use client";

import { DiagramArrow, DiagramGroupBox, DiagramNode } from "@/components/diagrams/diagram-shapes";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";
import type { DiagramTone } from "@/components/diagrams/diagram-tones";

type RenditionState = "waiting" | "encoding" | "done";

// Each row = one step; each entry = state of one rendition (240p/480p/720p/1080p) at that step.
const renditionsByStep: RenditionState[][] = [
  ["waiting", "waiting", "waiting", "waiting"],
  ["waiting", "waiting", "waiting", "waiting"],
  ["encoding", "encoding", "waiting", "waiting"],
  ["done", "done", "encoding", "encoding"],
  ["done", "done", "done", "done"],
  ["done", "done", "done", "done"],
];

const steps: DiagramStep[] = [
  {
    title: "Upload resumable",
    description:
      "Client xin presigned URL/multipart (như SD08), `PUT`/`UploadPart` thẳng video gốc lên object storage `raw/`. App server chỉ thấy metadata, không cầm bytes video.",
  },
  {
    title: "Enqueue job transcode",
    description:
      "Khi object storage báo upload xong (event hoặc client gọi `complete`), app ghi `videoId, status='queued'` vào DB rồi đẩy 1 message `TranscodeRequested{videoId}` vào queue.",
  },
  {
    title: "Worker pool bắt đầu encode",
    description:
      "Một worker rảnh `pull` job, tải video gốc về, chạy `ffmpeg` sinh song song nhiều rendition (240p, 480p, 720p, 1080p) — mỗi rendition là một luồng công việc độc lập, có thể chạy trên các worker khác nhau.",
  },
  {
    title: "Rendition thấp xong trước",
    description:
      "Rendition nhẹ (240p, 480p) encode nhanh hơn nên xong trước; mỗi rendition xong được ghi thẳng vào `hls/<videoId>/vN/` trên object storage — không cần chờ rendition nặng nhất.",
  },
  {
    title: "Đủ rendition, sinh manifest",
    description:
      "Khi đủ rendition, worker sinh `master.m3u8` liệt kê cả 4 biến thể và cập nhật `status='ready'`. Một số hệ thống cho phép xem sớm ngay khi có rendition đầu tiên (progressive readiness) thay vì chờ đủ cả 4.",
  },
  {
    title: "Sẵn sàng phát qua CDN",
    description:
      "Video `ready`: CDN có thể bắt đầu cache các segment phổ biến; người xem gọi player, player tải `master.m3u8` rồi chọn rendition phù hợp băng thông (bài học tiếp theo).",
  },
];

const toneFor: Record<RenditionState, DiagramTone> = { waiting: "slate", encoding: "amber", done: "green" };
const labelFor: Record<RenditionState, string> = { waiting: "chờ", encoding: "đang encode…", done: "xong ✓" };
const names = ["240p", "480p", "720p", "1080p"];

export function VideoUploadTranscodingPipelineDiagram() {
  return (
    <StepDiagram title="Upload resumable → job queue → nhiều rendition song song" viewBox="0 0 720 320" steps={steps}>
      {(step) => {
        const renditions = renditionsByStep[step];
        const allDone = renditions.every((state) => state === "done");
        const anyEncoding = renditions.some((state) => state === "encoding");

        return (
          <>
            <DiagramNode x={10} y={130} width={100} height={70} label="Client" emoji="💻" tone="violet" state={step === 0 ? "active" : "normal"} />
            <DiagramArrow from={[112, 165]} to={[152, 165]} tone="violet" animated={step === 0} />

            <DiagramNode
              x={156}
              y={130}
              width={110}
              height={70}
              label="Object storage"
              sublabel="raw/<videoId>.mp4"
              emoji="📦"
              tone={step === 0 ? "violet" : "slate"}
              state={step === 0 ? "active" : "normal"}
            />

            <DiagramArrow from={[268, 150]} to={[306, 90]} tone="amber" dimmed={step < 1} label="event upload xong" />
            <DiagramNode x={310} y={55} width={120} height={60} label="Queue" sublabel="TranscodeRequested" emoji="📬" tone="amber" state={step === 1 ? "active" : "normal"} />

            <DiagramArrow from={[370, 118]} to={[370, 150]} tone="amber" dimmed={step < 2} />
            <DiagramNode
              x={306}
              y={155}
              width={130}
              height={60}
              label="Worker pool"
              sublabel="ffmpeg"
              emoji="🛠️"
              tone={anyEncoding ? "amber" : step >= 2 ? "green" : "slate"}
              state={anyEncoding ? "active" : "normal"}
            />

            <DiagramGroupBox x={470} y={20} width={230} height={230} label="Rendition (song song)">
              {names.map((name, index) => (
                <DiagramNode
                  key={name}
                  x={485}
                  y={40 + index * 52}
                  width={195}
                  height={40}
                  label={name}
                  sublabel={labelFor[renditions[index]]}
                  tone={toneFor[renditions[index]]}
                  state={renditions[index] === "encoding" ? "active" : "normal"}
                />
              ))}
            </DiagramGroupBox>
            <DiagramArrow from={[436, 185]} to={[482, 100]} tone="amber" dimmed={step < 2} curve={-20} />

            <DiagramNode
              x={560}
              y={260}
              width={140}
              height={50}
              label={allDone ? "master.m3u8 ✓" : "chờ đủ rendition"}
              emoji="🗂️"
              tone={allDone ? "green" : "slate"}
              state={step >= 4 && allDone ? "active" : "normal"}
            />
            <DiagramArrow from={[630, 250]} to={[630, 240]} tone="green" dimmed={step < 4} />
          </>
        );
      }}
    </StepDiagram>
  );
}
