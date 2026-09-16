"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramArrow, DiagramGroupBox, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";

type Mode = "naive" | "majority";

interface Frame extends DiagramStep {
  aRole: "leader" | "leader-cut" | "stepped-down";
  bRole: "follower" | "self-proclaimed" | "waiting" | "new-leader";
  aWrites: boolean;
  bWrites: boolean;
  conflict: boolean;
}

const frames: Record<Mode, Frame[]> = {
  naive: [
    { title: "Bình thường", description: "A là leader duy nhất, gửi heartbeat cho B mỗi giây. B chỉ đứng nghỉ.", aRole: "leader", bRole: "follower", aWrites: true, bWrites: false, conflict: false },
    { title: "Đứt dây nội bộ", description: "Đường dây A↔B đứt, nhưng client vẫn gọi thẳng được cả A lẫn B qua 2 địa chỉ khác nhau — A không hề biết mình bị cô lập.", aRole: "leader-cut", bRole: "follower", aWrites: true, bWrites: false, conflict: false },
    { title: "B tự phong leader", description: "B không thấy heartbeat quá `election_timeout` → tự cho rằng A đã chết, tự phong mình làm leader và bắt đầu nhận ghi.", aRole: "leader-cut", bRole: "self-proclaimed", aWrites: true, bWrites: true, conflict: false },
    { title: "Split brain", description: "A vẫn tưởng mình là leader (nó không có cách nào biết ngược lại), tiếp tục nhận ghi từ client của nó. Giờ cả A và B cùng ghi vào cùng một dữ liệu — hai giá trị mâu thuẫn, không ai trọng tài.", aRole: "leader-cut", bRole: "self-proclaimed", aWrites: true, bWrites: true, conflict: true },
  ],
  majority: [
    { title: "Bình thường", description: "A giữ lease leader, phải xin gia hạn (renew) mỗi 2 giây từ đa số (majority) của cụm coordination 3 node. B đứng chờ.", aRole: "leader", bRole: "waiting", aWrites: true, bWrites: false, conflict: false },
    { title: "Mất liên lạc với majority", description: "A bị cô lập khỏi cụm coordination (dù client vẫn gọi được A). A gửi yêu cầu renew nhưng không đủ node phản hồi.", aRole: "leader-cut", bRole: "waiting", aWrites: true, bWrites: false, conflict: false },
    { title: "A tự rút lui", description: "Lease của A hết hạn mà không renew được → A tự biết chắc mình không còn là leader hợp lệ, chủ động step down và TỪ CHỐI ghi tiếp — thà báo lỗi còn hơn ghi bừa.", aRole: "stepped-down", bRole: "waiting", aWrites: false, bWrites: false, conflict: false },
    { title: "B giành lease mới", description: "Sau khi lease cũ hết hạn phía cụm coordination, B xin lease mới và được đa số cấp. Tại mọi thời điểm chỉ có tối đa một lease hợp lệ đang tồn tại — không có lúc nào cả A và B cùng ghi.", aRole: "stepped-down", bRole: "new-leader", aWrites: false, bWrites: true, conflict: false },
  ],
};

const buttonClass = (active: boolean) =>
  clsx(
    "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
    active ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
  );

/**
 * Contrasts naive heartbeat-timeout leader election (no majority check → split brain
 * possible) with majority-lease coordination (a node only stays/becomes leader once
 * a majority of a coordination group grants it — at most one valid leader ever).
 */
export function SplitBrainScenarioDiagram() {
  const [mode, setMode] = useState<Mode>("naive");
  const steps = frames[mode];

  return (
    <div>
      <div className="not-prose -mb-4 flex flex-wrap gap-2">
        {(["naive", "majority"] as const).map((option) => (
          <button key={option} type="button" onClick={() => setMode(option)} className={buttonClass(mode === option)}>
            {option === "naive" ? "Heartbeat đơn thuần (không majority)" : "Lease theo đa số (majority)"}
          </button>
        ))}
      </div>
      <StepDiagram key={mode} title="A và B canh cùng một tài nguyên — ai được ghi?" viewBox="0 0 720 300" steps={steps}>
        {(step) => {
          const frame = steps[step];
          const cut = frame.aRole !== "leader";
          return (
            <>
              <DiagramNode
                x={40}
                y={40}
                width={160}
                height={72}
                emoji={frame.aRole === "stepped-down" ? "🙅" : "🖥️"}
                label="Server A"
                sublabel={frame.aRole === "leader" ? "leader" : frame.aRole === "leader-cut" ? "leader (cô lập)" : "đã step down"}
                tone={frame.aRole === "stepped-down" ? "slate" : frame.aWrites ? "blue" : "amber"}
                state={frame.aWrites ? "active" : "normal"}
              />
              <DiagramNode
                x={520}
                y={40}
                width={160}
                height={72}
                emoji={frame.bRole === "self-proclaimed" || frame.bRole === "new-leader" ? "👑" : "🖥️"}
                label="Server B"
                sublabel={frame.bRole === "follower" || frame.bRole === "waiting" ? "chờ" : frame.bRole === "self-proclaimed" ? "tự phong leader" : "leader mới (hợp lệ)"}
                tone={frame.bWrites ? "blue" : "slate"}
                state={frame.bWrites ? "active" : "normal"}
              />

              {mode === "majority" && (
                <DiagramGroupBox x={270} y={30} width={180} height={100} label="Cụm coordination (3 node)" tone="violet">
                  {[0, 1, 2].map((i) => (
                    <DiagramNode key={i} x={290 + i * 50} y={62} width={40} height={40} emoji="🗳️" label="" tone="violet" rounded={8} />
                  ))}
                </DiagramGroupBox>
              )}

              <DiagramArrow
                from={[200, 76]}
                to={mode === "majority" ? [270, 76] : [520, 76]}
                tone={cut ? "rose" : "green"}
                dimmed={cut}
                animated={!cut}
                label={cut ? "✂️ mất liên lạc" : mode === "majority" ? "renew lease" : "heartbeat"}
              />
              {mode === "majority" && (
                <DiagramArrow from={[450, 76]} to={[520, 76]} tone={frame.bRole === "new-leader" ? "green" : "slate"} dimmed={frame.bRole !== "new-leader"} animated={frame.bRole === "new-leader"} label="cấp lease" />
              )}

              <DiagramNode
                x={280}
                y={190}
                width={160}
                height={64}
                emoji="🗂️"
                label="Tài nguyên dùng chung"
                sublabel={frame.conflict ? "2 giá trị mâu thuẫn!" : frame.bWrites ? "ghi bởi B" : frame.aWrites ? "ghi bởi A" : "không ai ghi"}
                tone={frame.conflict ? "rose" : "slate"}
                state={frame.conflict ? "active" : "normal"}
              />
              {frame.aWrites && <DiagramArrow from={[120, 112]} to={[320, 190]} tone="blue" animated curve={-20} />}
              {frame.bWrites && <DiagramArrow from={[600, 112]} to={[400, 190]} tone={frame.conflict ? "rose" : "green"} animated curve={20} />}

              <DiagramLabel
                x={360}
                y={280}
                text={frame.conflict ? "❌ Cả hai cùng nhận là leader — không ai trọng tài" : mode === "majority" ? "✅ Tại mọi thời điểm tối đa một lease hợp lệ" : "Chưa xảy ra xung đột — xem bước tiếp"}
                size={13}
                bold
                tone={frame.conflict ? "rose" : "green"}
              />
            </>
          );
        }}
      </StepDiagram>
    </div>
  );
}
