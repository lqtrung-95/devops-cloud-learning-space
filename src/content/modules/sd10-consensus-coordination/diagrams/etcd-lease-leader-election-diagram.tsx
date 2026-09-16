"use client";

import { DiagramArrow, DiagramGroupBox, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";

interface Frame extends DiagramStep {
  aRole: "campaigning" | "leader" | "leader-cut" | "dead";
  bRole: "campaigning" | "watching" | "leader";
  keyOwner: "none" | "a" | "b";
  keepAlive: boolean;
  ttlNote: string;
}

const frames: Frame[] = [
  { title: "Cả hai cùng campaign", description: "Worker A và B cùng gọi `Campaign()`: mỗi bên xin một `lease` TTL 10s rồi thử `put` key `/election/leader` — thao tác này là một compare-and-swap nguyên tử được chính etcd (nội bộ chạy Raft) đảm bảo chỉ một bên thắng.", aRole: "campaigning", bRole: "campaigning", keyOwner: "none", keepAlive: false, ttlNote: "TTL lease = 10s" },
  { title: "A thắng, B chờ", description: "A giành được key `/election/leader` → trở thành leader. B thất bại, chuyển sang `Watch(/election/leader)` để biết ngay khi key biến mất, thay vì polling liên tục.", aRole: "leader", bRole: "watching", keyOwner: "a", keepAlive: true, ttlNote: "TTL còn 10s, A vừa renew" },
  { title: "A gửi KeepAlive đều đặn", description: "A gửi `KeepAlive` mỗi ~3s (trước khi TTL 10s hết) để giữ lease sống — chừng nào còn KeepAlive, A còn là leader hợp lệ.", aRole: "leader", bRole: "watching", keyOwner: "a", keepAlive: true, ttlNote: "renew mỗi 3s" },
  { title: "Tiến trình A bị kill", description: "A bị `kill -9` (hoặc pause GC dài). Nó ngừng gửi KeepAlive — nhưng key vẫn còn tồn tại trong etcd cho tới khi TTL thật sự hết, KHÔNG biến mất ngay lập tức.", aRole: "dead", bRole: "watching", keyOwner: "a", keepAlive: false, ttlNote: "đếm ngược TTL: 10s → 0s" },
  { title: "Lease hết hạn", description: "Sau đúng TTL kể từ lần renew cuối (không sớm hơn), etcd tự xoá lease và key `/election/leader` gắn với nó. Đây là CẬN DƯỚI của thời gian failover — không thể phát hiện A chết nhanh hơn TTL.", aRole: "dead", bRole: "watching", keyOwner: "none", keepAlive: false, ttlNote: "TTL = 0 → etcd xoá key" },
  { title: "B nhận watch event, giành ghế", description: "`Watch` của B nhận event 'key đã xoá' gần như ngay lập tức, B gọi lại `Campaign()`, etcd cấp key mới cho B. B trở thành leader — toàn bộ quá trình chỉ có tối đa một leader hợp lệ tại một thời điểm.", aRole: "dead", bRole: "leader", keyOwner: "b", keepAlive: true, ttlNote: "TTL mới 10s cho B" },
];

const roleTone = (role: string) => (role === "leader" ? "green" : role === "dead" ? "rose" : role === "campaigning" ? "amber" : "slate");

/**
 * etcd lease-based leader election: two workers race for one key, the loser watches
 * instead of polling, and failover time is bounded below by the lease TTL — not instant.
 */
export function EtcdLeaseLeaderElectionDiagram() {
  return (
    <StepDiagram title="Hai worker tranh ghế leader qua etcd — TTL quyết định tốc độ failover" viewBox="0 0 720 280" steps={frames}>
      {(step) => {
        const frame = frames[step];
        return (
          <>
            <DiagramNode
              x={30}
              y={30}
              width={150}
              height={70}
              emoji={frame.aRole === "dead" ? "💀" : frame.aRole === "leader" ? "👑" : "🧑‍💻"}
              label="Worker A"
              sublabel={frame.aRole === "campaigning" ? "campaign..." : frame.aRole === "leader" ? "leader" : frame.aRole === "dead" ? "đã chết" : ""}
              tone={roleTone(frame.aRole)}
              state={frame.aRole === "leader" ? "active" : "normal"}
              dashed={frame.aRole === "dead"}
            />
            <DiagramNode
              x={540}
              y={30}
              width={150}
              height={70}
              emoji={frame.bRole === "leader" ? "👑" : "🧑‍💻"}
              label="Worker B"
              sublabel={frame.bRole === "campaigning" ? "campaign..." : frame.bRole === "watching" ? "watch key" : "leader"}
              tone={roleTone(frame.bRole)}
              state={frame.bRole === "leader" ? "active" : "normal"}
            />

            <DiagramGroupBox x={230} y={20} width={260} height={110} label="Cụm etcd (Raft nội bộ)" tone="violet">
              <DiagramNode
                x={280}
                y={60}
                width={160}
                height={54}
                emoji="🔑"
                label="/election/leader"
                sublabel={frame.keyOwner === "none" ? "(không tồn tại)" : `chủ: worker ${frame.keyOwner.toUpperCase()}`}
                tone={frame.keyOwner === "none" ? "slate" : frame.keyOwner === "a" ? "blue" : "green"}
                rounded={10}
              />
            </DiagramGroupBox>

            <DiagramArrow
              from={[180, 65]}
              to={[280, 65]}
              tone={frame.aRole === "dead" ? "rose" : frame.keepAlive && frame.keyOwner === "a" ? "green" : "amber"}
              animated={frame.aRole !== "dead"}
              dimmed={frame.aRole === "dead"}
              label={frame.aRole === "dead" ? "hết KeepAlive" : frame.keyOwner === "a" ? "KeepAlive" : "Campaign()"}
            />
            <DiagramArrow
              from={[540, 65]}
              to={[440, 65]}
              tone={frame.bRole === "leader" ? "green" : "slate"}
              animated={frame.bRole !== "watching"}
              dimmed={frame.bRole === "watching"}
              label={frame.bRole === "watching" ? "Watch(...)" : frame.bRole === "leader" ? "Campaign() lại" : "Campaign()"}
            />

            <DiagramLabel x={360} y={200} text={frame.ttlNote} size={13} bold tone="amber" />
            <DiagramLabel
              x={360}
              y={230}
              text="Failover nhanh hay chậm phụ thuộc TTL: TTL ngắn → phát hiện chết nhanh hơn nhưng renew tốn tài nguyên hơn."
              size={12}
            />
          </>
        );
      }}
    </StepDiagram>
  );
}
