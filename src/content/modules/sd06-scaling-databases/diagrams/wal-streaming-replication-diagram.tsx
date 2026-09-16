"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramArrow, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";

type Mode = "async" | "sync";
type ArrowId = "write" | "commit" | "stream" | "ack" | "read";
type ReplicaState = "old" | "flushed" | "replayed";

interface Frame extends DiagramStep {
  arrows: ArrowId[];
  walOnPrimary: boolean;
  committed: boolean;
  replica: ReplicaState;
  read?: "stale" | "maybe-stale" | "fresh";
}

const frames: Record<Mode, Frame[]> = {
  async: [
    { title: "Ghi", description: "App gửi `UPDATE users SET avatar = 'new.png'` tới primary.", arrows: ["write"], walOnPrimary: false, committed: false, replica: "old" },
    { title: "Ghi WAL", description: "Primary ghi bản ghi WAL (trang sổ nhật ký) xuống đĩa rồi mới coi transaction là bền vững.", arrows: [], walOnPrimary: true, committed: false, replica: "old" },
    { title: "COMMIT OK", description: "Async: primary trả OK cho app ngay, KHÔNG đợi replica. Ghi nhanh, nhưng replica đang trễ một nhịp.", arrows: ["commit"], walOnPrimary: true, committed: true, replica: "old" },
    { title: "Đọc replica", description: "App reload trang, đọc từ replica. WAL chưa tới nơi → trả avatar cũ. Đây là vi phạm read-your-writes.", arrows: ["read"], walOnPrimary: true, committed: true, replica: "old", read: "stale" },
    { title: "Stream WAL", description: "Walsender đẩy WAL qua kết nối replication; replica ghi xuống đĩa rồi replay vào dữ liệu. Khoảng từ bước 3 tới đây chính là replication lag.", arrows: ["stream"], walOnPrimary: true, committed: true, replica: "replayed" },
    { title: "Đọc lại", description: "Replica đã replay qua LSN của lần ghi → đọc thấy avatar mới. Lag thường cỡ ms, nhưng tăng vọt khi primary ghi dồn dập hoặc replica bận.", arrows: ["read"], walOnPrimary: true, committed: true, replica: "replayed", read: "fresh" },
  ],
  sync: [
    { title: "Ghi", description: "App gửi cùng câu `UPDATE` tới primary.", arrows: ["write"], walOnPrimary: false, committed: false, replica: "old" },
    { title: "Ghi WAL", description: "Primary ghi WAL xuống đĩa của mình.", arrows: [], walOnPrimary: true, committed: false, replica: "old" },
    { title: "Stream + chờ", description: "Primary gửi WAL và ĐỢI. Replica sync (trong `synchronous_standby_names`) flush WAL xuống đĩa rồi báo lại.", arrows: ["stream", "ack"], walOnPrimary: true, committed: false, replica: "flushed" },
    { title: "COMMIT OK", description: "Chỉ bây giờ app mới nhận OK. Mỗi lần ghi cộng thêm một round trip tới replica — và nếu replica sync chết, ghi bị treo.", arrows: ["commit"], walOnPrimary: true, committed: true, replica: "flushed" },
    { title: "Đọc replica", description: "Với `synchronous_commit = on`, replica mới flush chứ chưa chắc đã replay → vẫn có thể thấy avatar cũ vài ms. Muốn chắc chắn thấy ngay cần `remote_apply`.", arrows: ["read"], walOnPrimary: true, committed: true, replica: "flushed", read: "maybe-stale" },
    { title: "Replay xong", description: "Replica replay xong → đọc thấy avatar mới. Điểm mạnh thật sự của sync: nếu primary chết sau bước 4, dữ liệu không mất.", arrows: ["read"], walOnPrimary: true, committed: true, replica: "replayed", read: "fresh" },
  ],
};

const replicaText: Record<ReplicaState, string> = {
  old: "avatar = old.png",
  flushed: "WAL đã flush · chưa replay",
  replayed: "avatar = new.png",
};

export function WalStreamingReplicationDiagram() {
  const [mode, setMode] = useState<Mode>("async");
  const steps = frames[mode];

  return (
    <div>
      <div className="not-prose -mb-4 flex flex-wrap gap-2">
        {(["async", "sync"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setMode(option)}
            className={clsx(
              "rounded-full px-3 py-1.5 text-sm font-medium",
              mode === option ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
            )}
          >
            {option === "async" ? "Async replication (mặc định)" : "Sync replication"}
          </button>
        ))}
      </div>
      <StepDiagram key={mode} title="Một lần ghi đi từ primary tới replica" viewBox="0 0 720 330" steps={steps}>
        {(step) => {
          const frame = steps[step];
          const on = (id: ArrowId) => frame.arrows.includes(id);
          return (
            <>
              <DiagramNode x={20} y={40} width={160} height={64} label="🧑‍💻 app (ghi)" sublabel="PUT /users/42/avatar" tone="violet" state={step === 0 ? "active" : "normal"} />
              <DiagramNode
                x={280}
                y={30}
                width={200}
                height={84}
                label="🗄️ Primary"
                sublabel={frame.walOnPrimary ? "WAL: …new.png ✓" : "WAL: chưa có"}
                tone="blue"
                state={frame.walOnPrimary && !frame.committed ? "active" : "normal"}
              />
              <DiagramNode
                x={280}
                y={220}
                width={200}
                height={84}
                label="📚 Replica"
                sublabel={replicaText[frame.replica]}
                tone={frame.replica === "replayed" ? "green" : frame.replica === "flushed" ? "amber" : "slate"}
                state={on("stream") ? "active" : "normal"}
              />
              <DiagramNode
                x={560}
                y={220}
                width={150}
                height={84}
                label={frame.read === "fresh" ? "✅ new.png" : frame.read ? "❌ old.png" : "🧑‍💻 app (đọc)"}
                sublabel={frame.read === "maybe-stale" ? "có thể cũ vài ms" : "GET /users/42"}
                tone={frame.read === "fresh" ? "green" : frame.read ? "rose" : "slate"}
                state={frame.read ? "active" : "dimmed"}
              />

              <DiagramArrow from={[182, 62]} to={[276, 62]} label="UPDATE" tone="violet" animated={on("write")} dimmed={!on("write")} />
              <DiagramArrow from={[278, 96]} to={[184, 96]} label="COMMIT OK" tone="green" animated={on("commit")} dimmed={!frame.committed} />
              <DiagramArrow from={[330, 116]} to={[330, 216]} label="WAL stream" tone="blue" animated={on("stream")} dimmed={!on("stream")} />
              <DiagramArrow from={[440, 216]} to={[440, 116]} label="flush ack" tone="amber" animated={on("ack")} dimmed={!on("ack")} />
              <DiagramArrow from={[556, 262]} to={[484, 262]} label="SELECT" tone="slate" animated={on("read")} dimmed={!on("read")} />

              <DiagramLabel
                x={600}
                y={70}
                text={mode === "async" ? "OK trước, chép sau" : "chép xong mới OK"}
                tone={mode === "async" ? "amber" : "green"}
                bold
              />
              <DiagramLabel x={600} y={92} text={mode === "async" ? "→ có replication lag" : "→ thêm latency khi ghi"} size={11.5} />
            </>
          );
        }}
      </StepDiagram>
    </div>
  );
}
