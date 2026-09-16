"use client";

import { DiagramArrow, DiagramNode } from "@/components/diagrams/diagram-shapes";
import type { DiagramTone } from "@/components/diagrams/diagram-tones";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";

interface NodeSpec {
  x: number;
  y: number;
  width: number;
  height: number;
  emoji: string;
  label: string;
  sublabel: string;
  tone: DiagramTone;
}

// Vị trí cố định cho mọi bước — chỉ đổi state (active/dimmed) theo bước hiện tại.
const nodes: Record<string, NodeSpec> = {
  client: { x: 10, y: 130, width: 96, height: 60, emoji: "📱", label: "Client", sublabel: "app/web", tone: "violet" },
  postSvc: { x: 140, y: 40, width: 130, height: 56, emoji: "📝", label: "Post Service", sublabel: "nhận bài mới", tone: "blue" },
  postgres: { x: 140, y: 210, width: 130, height: 56, emoji: "🐘", label: "Postgres", sublabel: "post gốc (nguồn sự thật)", tone: "slate" },
  fanout: { x: 306, y: 40, width: 130, height: 56, emoji: "🔀", label: "Fanout Worker", sublabel: "đọc follower list", tone: "amber" },
  timeline: { x: 472, y: 40, width: 154, height: 60, emoji: "🗂️", label: "Redis: timeline:{userId}", sublabel: "ZSET postId (follower thường)", tone: "cyan" },
  celebStore: { x: 472, y: 130, width: 154, height: 60, emoji: "⭐", label: "Post store celebrity", sublabel: "pull K bài mới nhất", tone: "rose" },
  feedSvc: { x: 306, y: 210, width: 130, height: 56, emoji: "📰", label: "Feed Service", sublabel: "GET /feed", tone: "blue" },
  postCache: { x: 472, y: 210, width: 154, height: 56, emoji: "⚡", label: "Redis: post cache", sublabel: "hydrate nội dung", tone: "green" },
};

type NodeId = keyof typeof nodes;

const steps: DiagramStep[] = [
  { title: "Đăng bài", description: "Client gọi `POST /posts` → Post Service ghi post gốc vào Postgres và nạp bản cache vào Redis (`post:{id}`)." },
  {
    title: "Fan-out follower thường",
    description: "Fanout Worker phân trang danh sách follower, chạy `ZADD timeline:{followerId} <postId>` cho từng follower — cái giá phải trả tăng tuyến tính theo số follower.",
  },
  {
    title: "Bỏ qua fan-out celebrity",
    description: "Nếu tác giả vượt ngưỡng follower (celebrity), Fanout Worker **không** ghi vào timeline của từng follower — chỉ đánh dấu bài mới nhất ở post store của celebrity, để dành đọc khi cần (pull).",
  },
  { title: "Mở feed", description: "Client gọi `GET /feed?cursor=...` → Feed Service đọc `ZREVRANGE timeline:{userId} 0 N` lấy N postId gần nhất — đã có sẵn nhờ bước 2." },
  {
    title: "Merge pull celebrity",
    description: "Với mỗi celebrity mà user đang follow, Feed Service lấy trực tiếp K bài mới nhất từ post store của họ rồi trộn theo thời gian vào danh sách trên — chi phí không phụ thuộc follower count của celebrity đó.",
  },
  {
    title: "Hydrate & trả kết quả",
    description: "Có danh sách postId, Feed Service lấy nội dung đầy đủ bằng batch `HMGET`/`MGET` từ Redis post cache; cache miss thì đọc Postgres rồi nạp lại cache. Trả JSON kèm cursor cho lần load tiếp theo.",
  },
];

// Mỗi bước: các node "active", và các cạnh (from→to theo id) được tô đậm.
const stepHighlights: { active: NodeId[]; edges: [NodeId, NodeId, string?][] }[] = [
  { active: ["client", "postSvc", "postgres"], edges: [["client", "postSvc"], ["postSvc", "postgres"]] },
  { active: ["postSvc", "fanout", "timeline"], edges: [["postSvc", "fanout"], ["fanout", "timeline", "ZADD × follower"]] },
  { active: ["fanout", "celebStore"], edges: [["fanout", "celebStore", "flag celebrity"]] },
  { active: ["client", "feedSvc", "timeline"], edges: [["client", "feedSvc"], ["feedSvc", "timeline", "ZREVRANGE"]] },
  { active: ["feedSvc", "celebStore"], edges: [["feedSvc", "celebStore", "lấy K bài mới"]] },
  { active: ["feedSvc", "postCache", "postgres", "client"], edges: [["feedSvc", "postCache", "HMGET"], ["postCache", "client", "trả feed"]] },
];

function center(node: NodeSpec): [number, number] {
  return [node.x + node.width / 2, node.y + node.height / 2];
}

export function TimelineWriteReadHydrationStepDiagram() {
  return (
    <StepDiagram title="Ghi & đọc timeline: push, pull, hydrate" viewBox="0 0 720 300" steps={steps}>
      {(step) => {
        const highlight = stepHighlights[step];
        return (
          <>
            {highlight.edges.map(([from, to, label], index) => (
              <DiagramArrow key={`${from}-${to}-${index}`} from={center(nodes[from])} to={center(nodes[to])} label={label} tone="blue" curve={from === "fanout" || to === "celebStore" ? 24 : 0} />
            ))}
            {(Object.entries(nodes) as [NodeId, NodeSpec][]).map(([id, node]) => (
              <DiagramNode
                key={id}
                x={node.x}
                y={node.y}
                width={node.width}
                height={node.height}
                emoji={node.emoji}
                label={node.label}
                sublabel={node.sublabel}
                tone={node.tone}
                state={highlight.active.includes(id) ? "active" : "dimmed"}
              />
            ))}
          </>
        );
      }}
    </StepDiagram>
  );
}
