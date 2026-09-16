"use client";

import { DiagramArrow, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";

type NodeRole = "follower" | "candidate" | "leader" | "dead";

interface Frame extends DiagramStep {
  term: number;
  roles: [NodeRole, NodeRole, NodeRole];
  votesFor?: number; // index of node currently receiving votes
  heartbeat?: boolean;
}

const NAMES = ["N1", "N2", "N3"] as const;

const frames: Frame[] = [
  { title: "Im lặng", description: "3 node đều là follower, `term = 0`, chưa ai là leader. Mỗi node tự đặt một `election timeout` NGẪU NHIÊN (vd 150–300ms) — random để tránh 2 node cùng bật ứng cử một lúc.", term: 0, roles: ["follower", "follower", "follower"] },
  { title: "N1 hết timeout trước", description: "Timeout của N1 chạy hết trước (vì random ngắn hơn). N1 tự tăng `term = 1`, chuyển thành candidate, bỏ phiếu cho chính mình, gửi `RequestVote(term=1)` cho N2 và N3.", term: 1, roles: ["candidate", "follower", "follower"], votesFor: 0 },
  { title: "N2, N3 bỏ phiếu", description: "N2 và N3 CHƯA bỏ phiếu ở `term 1` và log của N1 không cũ hơn log của họ → cả hai gật đầu. N1 nhận đủ 2/3 phiếu (kể cả phiếu của chính mình) — quá bán trên 3 node.", term: 1, roles: ["candidate", "follower", "follower"], votesFor: 0 },
  { title: "N1 thành leader", description: "N1 trở thành leader của `term 1`, ngay lập tức gửi `AppendEntries` rỗng (heartbeat) để giữ ghế và ngăn N2, N3 tự ứng cử.", term: 1, roles: ["leader", "follower", "follower"], heartbeat: true },
  { title: "N1 bị kill", description: "Tiến trình N1 bị giết (crash hoặc mất mạng). Heartbeat ngừng hẳn — N2 và N3 không biết vì sao, chỉ biết không còn nghe leader.", term: 1, roles: ["dead", "follower", "follower"] },
  { title: "N2 hết timeout trước", description: "Sau khoảng `election timeout` không có heartbeat, N2 hết timeout trước N3 (lại là random). N2 tăng `term = 2`, thành candidate, xin phiếu N3 (N1 đã chết, không phản hồi).", term: 2, roles: ["dead", "candidate", "follower"], votesFor: 1 },
  { title: "N2 thành leader mới", description: "N3 gật đầu (chưa bỏ phiếu ở term 2). N2 có 2/3 phiếu → thành leader của `term 2`. `term` chỉ tăng, không bao giờ giảm — đây là cách Raft biết ai đang giữ nhiệm kỳ mới nhất.", term: 2, roles: ["dead", "leader", "follower"], heartbeat: true },
];

const roleTone = (role: NodeRole) => (role === "leader" ? "green" : role === "candidate" ? "amber" : role === "dead" ? "rose" : "slate");
const roleLabel = (role: NodeRole) => (role === "leader" ? "👑 leader" : role === "candidate" ? "🙋 candidate" : role === "dead" ? "💀 chết" : "follower");

/**
 * Randomized-timeout leader election across a kill-leader event: term monotonically
 * increases (1 -> 2), a majority of 3 votes elects each leader, and the old leader's
 * crash is discovered only through a missing heartbeat, not an explicit signal.
 */
export function RaftLeaderElectionDiagram() {
  return (
    <StepDiagram title="Bầu leader qua randomized timeout — và một lần kill leader" viewBox="0 0 720 260" steps={frames}>
      {(step) => {
        const frame = frames[step];
        const positions: [number, number][] = [
          [280, 40],
          [80, 170],
          [480, 170],
        ];
        return (
          <>
            <DiagramLabel x={360} y={20} text={`term hiện tại = ${frame.term}`} size={14} bold tone="violet" />
            {positions.map(([x, y], i) => (
              <DiagramNode
                key={NAMES[i]}
                x={x}
                y={y}
                width={140}
                height={70}
                label={NAMES[i]}
                sublabel={roleLabel(frame.roles[i])}
                tone={roleTone(frame.roles[i])}
                state={frame.roles[i] === "leader" || frame.roles[i] === "candidate" ? "active" : frame.roles[i] === "dead" ? "dimmed" : "normal"}
                dashed={frame.roles[i] === "dead"}
              />
            ))}
            {frame.votesFor !== undefined &&
              positions
                .map((_, i) => i)
                .filter((i) => i !== frame.votesFor && frame.roles[i] !== "dead")
                .map((i) => (
                  <DiagramArrow
                    key={`vote-request-${i}`}
                    from={[positions[frame.votesFor!][0] + 70, positions[frame.votesFor!][1] + 35]}
                    to={[positions[i][0] + 70, positions[i][1] + 35]}
                    tone="amber"
                    animated
                    label="RequestVote"
                  />
                ))}
            {frame.heartbeat &&
              positions
                .map((_, i) => i)
                .filter((i) => frame.roles[i] === "follower")
                .map((i) => {
                  const leaderIndex = frame.roles.indexOf("leader");
                  return (
                    <DiagramArrow
                      key={`heartbeat-${i}`}
                      from={[positions[leaderIndex][0] + 70, positions[leaderIndex][1] + 35]}
                      to={[positions[i][0] + 70, positions[i][1] + 35]}
                      tone="green"
                      animated
                      label="heartbeat"
                    />
                  );
                })}
          </>
        );
      }}
    </StepDiagram>
  );
}
