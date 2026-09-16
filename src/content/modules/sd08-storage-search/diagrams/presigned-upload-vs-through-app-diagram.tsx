"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramArrow, DiagramGroupBox, DiagramNode, MovingPacket } from "@/components/diagrams/diagram-shapes";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";

type Scenario = "through-app" | "presigned";

const scenarios: Record<Scenario, { button: string; steps: DiagramStep[] }> = {
  "through-app": {
    button: "❌ Upload qua app server",
    steps: [
      { title: "Client gửi file", description: "Client `POST /uploads` kèm nguyên file 200MB trong body — app server phải nhận hết bytes trước." },
      { title: "App forward", description: "App đọc toàn bộ file vào bộ nhớ/đĩa tạm rồi tự gọi `PutObject` sang object storage. App vừa tốn RAM/CPU vừa tốn gấp đôi băng thông (nhận rồi gửi lại)." },
      { title: "Nghẽn khi đông", description: "10 người upload cùng lúc = 10 kết nối lớn giữ chặt app server. App server trở thành bottleneck và single point of failure cho riêng việc upload." },
    ],
  },
  presigned: {
    button: "✅ Presigned URL — client PUT thẳng",
    steps: [
      { title: "Xin vé", description: "Client `POST /uploads/presign` (metadata nhỏ: filename, content-type). App kiểm tra quyền, KHÔNG nhận file." },
      { title: "App ký vé", description: "App gọi SDK sinh presigned PUT URL (hết hạn 5 phút, giới hạn `content-length-range`), trả về client kèm object key." },
      { title: "Client PUT thẳng", description: "Client `PUT` toàn bộ 200MB thẳng lên object storage bằng URL đã ký — app server không nhìn thấy một byte nào của file." },
      { title: "Báo hoàn tất", description: "Client gọi `POST /uploads/complete` (chỉ gửi key + size). App ghi metadata vào Postgres, có thể enqueue việc quét virus async." },
    ],
  },
};

export function PresignedUploadVsThroughAppDiagram() {
  const [scenario, setScenario] = useState<Scenario>("presigned");
  const isPresigned = scenario === "presigned";

  return (
    <div>
      <div className="not-prose -mb-4 flex flex-wrap gap-2">
        {(Object.keys(scenarios) as Scenario[]).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setScenario(option)}
            className={clsx(
              "rounded-full px-3 py-1.5 text-sm font-medium",
              scenario === option ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
            )}
          >
            {scenarios[option].button}
          </button>
        ))}
      </div>
      <StepDiagram key={scenario} title="Upload 200MB: qua app server vs presigned URL trực tiếp" viewBox="0 0 720 300" steps={scenarios[scenario].steps}>
        {(step) => {
          const appHoldsBytes = !isPresigned && step >= 1;
          const clientDirect = isPresigned && step >= 2;
          return (
            <>
              <DiagramNode x={10} y={110} width={110} height={80} label="Client" sublabel={clientDirect ? "PUT 200MB thẳng" : step === 0 ? "gửi request" : "chờ"} emoji="💻" tone="violet" state={step === 0 || clientDirect ? "active" : "normal"} />

              <DiagramNode
                x={300}
                y={110}
                width={130}
                height={80}
                label="App server"
                sublabel={appHoldsBytes ? "🔥 giữ 200MB" : isPresigned ? "chỉ ký vé" : "nhận request nhỏ"}
                emoji="🖥️"
                tone={appHoldsBytes ? "rose" : "cyan"}
                state={step === 0 || step === 1 || (isPresigned && step === 3) ? "active" : "normal"}
              />

              <DiagramGroupBox x={520} y={40} width={180} height={220} label="Object storage" tone="green">
                <DiagramNode x={540} y={80} width={140} height={70} label="bucket/uploads" sublabel={step >= 2 ? "object nhận đủ 200MB" : "trống"} tone="green" state={step >= 2 ? "active" : "normal"} />
                <DiagramNode x={540} y={170} width={140} height={60} label="Postgres" sublabel={isPresigned ? (step === 3 ? "metadata ghi" : "chưa") : "không dùng ở bước này"} tone="blue" state={isPresigned && step === 3 ? "active" : "normal"} dashed={!isPresigned} />
              </DiagramGroupBox>

              {!isPresigned && (
                <>
                  <DiagramArrow from={[120, 140]} to={[296, 140]} tone="rose" label="body 200MB" dimmed={step === 0} />
                  <DiagramArrow from={[434, 150]} to={[536, 115]} tone="rose" dimmed={step < 1} label="PutObject (lại 200MB)" curve={20} />
                  {step >= 1 && <MovingPacket key={`through-${step}`} path="M 130 150 L 540 115" durationSeconds={2.2} tone="rose" label="200MB" />}
                </>
              )}

              {isPresigned && (
                <>
                  <DiagramArrow from={[120, 130]} to={[296, 130]} tone="cyan" dimmed={step > 0} label="xin presign" />
                  <DiagramArrow from={[296, 150]} to={[120, 150]} tone="cyan" dimmed={step !== 1} label="URL đã ký" />
                  {step >= 2 && <MovingPacket key={`presign-${step}`} path="M 65 150 L 600 115" durationSeconds={2.2} tone="green" label="200MB" />}
                  <DiagramArrow from={[65, 190]} to={[296, 175]} tone="violet" dimmed={step !== 3} curve={-30} label="báo hoàn tất (key, size)" />
                  <DiagramArrow from={[364, 175]} to={[536, 205]} tone="blue" dimmed={step !== 3} label="ghi metadata" />
                </>
              )}
            </>
          );
        }}
      </StepDiagram>
    </div>
  );
}
