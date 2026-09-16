"use client";

import clsx from "clsx";
import { DiagramArrow, DiagramLabel } from "@/components/diagrams/diagram-shapes";
import { diagramToneClasses } from "@/components/diagrams/diagram-tones";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";

type SlotState = "committed" | "uncommitted" | "stale" | "empty";
interface Slot {
  term: number;
  state: SlotState;
}
interface Frame extends DiagramStep {
  leaderLog: Slot[];
  n3Log: Slot[];
  n1Log: Slot[];
  commitIndex: number;
  ackedBy: string; // e.g. "leader" | "leader, N3" | "leader, N3, N1"
  clientReply?: "waiting" | "ok";
}

const E = (term: number, state: SlotState): Slot => ({ term, state });

const frames: Frame[] = [
  {
    title: "Client ghi x=5",
    description: "Leader N2 (`term=2`) nhận ghi từ client, thêm entry mới vào CUỐI log của chính nó tại `index 3` — chưa gửi cho ai, chưa committed (màu hổ phách).",
    leaderLog: [E(1, "committed"), E(1, "committed"), E(2, "uncommitted")],
    n3Log: [E(1, "committed"), E(1, "committed"), E(0, "empty")],
    n1Log: [E(1, "committed"), E(1, "committed"), E(1, "stale")],
    commitIndex: 2,
    ackedBy: "leader",
  },
  {
    title: "Gửi AppendEntries",
    description: "Leader gửi `AppendEntries(prevLogIndex=2, prevLogTerm=1, entries=[idx3])` song song tới N3 và N1.",
    leaderLog: [E(1, "committed"), E(1, "committed"), E(2, "uncommitted")],
    n3Log: [E(1, "committed"), E(1, "committed"), E(0, "empty")],
    n1Log: [E(1, "committed"), E(1, "committed"), E(1, "stale")],
    commitIndex: 2,
    ackedBy: "leader",
  },
  {
    title: "N3 khớp, ghi ngay",
    description: "N3 có `idx2 = term 1` khớp `prevLogTerm` → chấp nhận, ghi `idx3 = term 2` và ACK. N1 thì TỪ CHỐI: nó đã có sẵn một entry khác ở `idx3` (term 1, còn sót lại từ khi nó từng là leader) — log không khớp.",
    leaderLog: [E(1, "committed"), E(1, "committed"), E(2, "uncommitted")],
    n3Log: [E(1, "committed"), E(1, "committed"), E(2, "uncommitted")],
    n1Log: [E(1, "committed"), E(1, "committed"), E(1, "stale")],
    commitIndex: 2,
    ackedBy: "leader, N3",
  },
  {
    title: "Đủ đa số → commit",
    description: "Leader (tự đếm) + N3 = 2/3 — ĐÃ LÀ ĐA SỐ trên 3 node. Leader KHÔNG cần chờ N1: `commit index` nhảy lên 3 ngay, leader trả `OK` cho client. Đây chính là ý 'committed khi đã replicate tới đa số', không phải tới TẤT CẢ.",
    leaderLog: [E(1, "committed"), E(1, "committed"), E(2, "committed")],
    n3Log: [E(1, "committed"), E(1, "committed"), E(2, "committed")],
    n1Log: [E(1, "committed"), E(1, "committed"), E(1, "stale")],
    commitIndex: 3,
    ackedBy: "leader, N3",
    clientReply: "ok",
  },
  {
    title: "N1 bị ghi đè",
    description: "Leader thấy N1 từ chối, giảm `nextIndex` cho N1 và ra lệnh xoá entry xung đột. Vì entry cũ của N1 ở `idx3` CHƯA BAO GIỜ committed (không node nào khác có nó), xoá nó là AN TOÀN — đây là log matching property: chỉ entry đã committed mới được đảm bảo bất biến.",
    leaderLog: [E(1, "committed"), E(1, "committed"), E(2, "committed")],
    n3Log: [E(1, "committed"), E(1, "committed"), E(2, "committed")],
    n1Log: [E(1, "committed"), E(1, "committed"), E(0, "empty")],
    commitIndex: 3,
    ackedBy: "leader, N3",
    clientReply: "ok",
  },
  {
    title: "N1 bắt kịp",
    description: "N1 nhận lại `idx3 = term 2` giống hệt leader và N3. Cả 3 node giờ có log giống nhau ở phần đã committed — invariant log matching được khôi phục.",
    leaderLog: [E(1, "committed"), E(1, "committed"), E(2, "committed")],
    n3Log: [E(1, "committed"), E(1, "committed"), E(2, "committed")],
    n1Log: [E(1, "committed"), E(1, "committed"), E(2, "committed")],
    commitIndex: 3,
    ackedBy: "leader, N3, N1",
    clientReply: "ok",
  },
];

function slotTone(state: SlotState) {
  if (state === "committed") return "green" as const;
  if (state === "uncommitted") return "amber" as const;
  if (state === "stale") return "rose" as const;
  return "slate" as const;
}

function LogRow({ x, y, name, log }: { x: number; y: number; name: string; log: Slot[] }) {
  const slotSize = 46;
  const gap = 8;
  return (
    <g>
      <text x={x} y={y + 30} fontSize={13} fontWeight={700} className="fill-stone-800 dark:fill-stone-200">
        {name}
      </text>
      {log.map((slot, i) => {
        const tones = diagramToneClasses[slotTone(slot.state)];
        const sx = x + 46 + i * (slotSize + gap);
        return (
          <g key={i}>
            <rect
              x={sx}
              y={y}
              width={slotSize}
              height={slotSize}
              rx={8}
              className={clsx(tones.shape)}
              strokeWidth={slot.state === "uncommitted" ? 3 : 1.75}
              strokeDasharray={slot.state === "stale" ? "5 3" : undefined}
            />
            <text x={sx + slotSize / 2} y={y + 20} textAnchor="middle" fontSize={11} className={tones.text}>
              idx{i + 1}
            </text>
            <text x={sx + slotSize / 2} y={y + 36} textAnchor="middle" fontSize={11} fontWeight={600} className={tones.text}>
              {slot.state === "empty" ? "—" : `T${slot.term}`}
            </text>
          </g>
        );
      })}
    </g>
  );
}

/**
 * Log replication + commit: leader appends locally first, replicates in parallel,
 * and advances the commit index the moment a MAJORITY (not all) followers ack —
 * while a stale, never-committed follower entry gets safely overwritten (log matching).
 */
export function RaftLogReplicationDiagram() {
  return (
    <StepDiagram title="Từ ghi mới tới committed: leader không chờ node chậm nhất" viewBox="0 0 720 300" steps={frames}>
      {(step) => {
        const frame = frames[step];
        return (
          <>
            <DiagramLabel x={360} y={16} text={`commit index = ${frame.commitIndex} · đã ACK: ${frame.ackedBy}`} size={13} bold tone="violet" />
            <LogRow x={20} y={40} name="N2 (leader)" log={frame.leaderLog} />
            <LogRow x={20} y={110} name="N3" log={frame.n3Log} />
            <LogRow x={20} y={180} name="N1" log={frame.n1Log} />

            {frame.commitIndex >= 3 && (
              <DiagramLabel x={66 + 2 * 54 + 23} y={250} text="↑ commit index" size={11} bold tone="green" />
            )}

            <DiagramArrow from={[400, 260]} to={[550, 260]} tone="slate" dimmed={!frame.clientReply} animated={Boolean(frame.clientReply)} label={frame.clientReply === "ok" ? "trả lời client: OK" : "client đang chờ…"} />
          </>
        );
      }}
    </StepDiagram>
  );
}
