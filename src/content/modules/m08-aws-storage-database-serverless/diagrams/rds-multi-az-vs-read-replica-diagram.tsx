"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramArrow, DiagramGroupBox, DiagramNode } from "@/components/diagrams/diagram-shapes";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";

type Scenario = "multi-az" | "read-replica";

const scenarioSteps: Record<Scenario, DiagramStep[]> = {
  "multi-az": [
    { title: "Bình thường", description: "App kết nối tới một endpoint `app-db.xxxx.rds.amazonaws.com`. Primary ở AZ a ghi dữ liệu và đồng bộ (synchronous) sang standby ở AZ b. Standby không nhận truy vấn đọc." },
    { title: "AZ a gặp sự cố", description: "Mất điện/mạng ở AZ a, hoặc primary hỏng phần cứng. Kết nối hiện tại bị rớt." },
    { title: "Failover tự động", description: "RDS tự promote standby thành primary và trỏ lại DNS của endpoint sang AZ b. Thường mất khoảng 1–2 phút (kiểm tra tài liệu cho engine của bạn)." },
    { title: "App kết nối lại", description: "App giữ nguyên endpoint, chỉ cần retry kết nối (đừng cache DNS quá lâu). RDS dựng standby mới ở AZ khác. Không mất giao dịch đã commit vì replication đồng bộ." },
  ],
  "read-replica": [
    { title: "Bình thường", description: "Primary nhận ghi. Dữ liệu được sao chép bất đồng bộ (asynchronous) sang read replica — có thể cùng AZ, khác AZ, thậm chí khác region." },
    { title: "Chia tải đọc", description: "Replica có endpoint riêng. App (hoặc ORM) phải tự gửi truy vấn đọc nặng — báo cáo, trang danh sách — sang replica. Primary nhẹ bớt." },
    { title: "Replica lag", description: "Vì bất đồng bộ, dữ liệu vừa ghi có thể chưa kịp xuất hiện trên replica (vài ms tới vài giây, hoặc hơn khi tải nặng). Đọc-ngay-sau-khi-ghi nên đi vào primary." },
    { title: "Primary chết", description: "Không có failover tự động như Multi-AZ. Bạn phải promote replica thành DB độc lập (endpoint của replica), rồi đổi cấu hình app. Phần dữ liệu còn trong 'lag' có thể mất." },
  ],
};

export function RdsMultiAzVsReadReplicaDiagram() {
  const [scenario, setScenario] = useState<Scenario>("multi-az");
  const steps = scenarioSteps[scenario];
  const isMultiAz = scenario === "multi-az";

  return (
    <div>
      <div className="not-prose -mb-4 flex flex-wrap gap-2">
        {(["multi-az", "read-replica"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setScenario(option)}
            className={clsx(
              "rounded-full px-3 py-1.5 text-sm font-medium",
              scenario === option ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
            )}
          >
            {option === "multi-az" ? "🛡️ Multi-AZ (sẵn sàng cao)" : "📚 Read replica (mở rộng đọc)"}
          </button>
        ))}
      </div>
      <StepDiagram key={scenario} title={isMultiAz ? "RDS Multi-AZ: failover tự động" : "RDS read replica: chia tải đọc"} viewBox="0 0 720 320" steps={steps}>
        {(step) => {
          const primaryDown = (isMultiAz && step >= 1) || (!isMultiAz && step === 3);
          const rightIsWriter = (isMultiAz && step >= 2) || (!isMultiAz && step === 3);
          return (
            <>
              <DiagramNode x={275} y={12} width={170} height={70} label="App" sublabel={isMultiAz ? "endpoint: app-db" : "ghi → primary · đọc → replica"} emoji="⚙️" tone="violet" state="active" />
              <DiagramGroupBox x={20} y={120} width={320} height={185} label="AZ a" tone="blue" />
              <DiagramGroupBox x={380} y={120} width={320} height={185} label={isMultiAz ? "AZ b" : "AZ b hoặc region khác"} tone="blue" />

              <DiagramNode
                x={90}
                y={175}
                width={180}
                height={90}
                label={primaryDown ? "Primary ✗" : "Primary"}
                sublabel={primaryDown ? "sự cố" : "đọc + ghi"}
                emoji="🐘"
                tone={primaryDown ? "rose" : "green"}
                state={primaryDown ? "dimmed" : "active"}
              />
              <DiagramNode
                x={450}
                y={175}
                width={180}
                height={90}
                label={rightIsWriter ? "Primary mới" : isMultiAz ? "Standby" : "Read replica"}
                sublabel={rightIsWriter ? (isMultiAz ? "tự động promote" : "promote thủ công") : isMultiAz ? "không đọc được" : "chỉ đọc"}
                emoji={isMultiAz && !rightIsWriter ? "💤" : "🐘"}
                tone={rightIsWriter ? "green" : isMultiAz ? "slate" : "cyan"}
                state={rightIsWriter || (!isMultiAz && step >= 1) ? "active" : "normal"}
              />

              {!primaryDown && (
                <DiagramArrow
                  from={[274, 220]}
                  to={[446, 220]}
                  tone={isMultiAz ? "green" : "amber"}
                  animated
                  label={isMultiAz ? "sync" : step === 2 ? "async · lag ⏳" : "async"}
                />
              )}

              <DiagramArrow from={[320, 84]} to={[200, 170]} tone="violet" label={isMultiAz ? "" : "ghi"} dimmed={primaryDown} animated={!primaryDown} />
              {(rightIsWriter || (!isMultiAz && step >= 1)) && (
                <DiagramArrow from={[400, 84]} to={[520, 170]} tone={rightIsWriter ? "green" : "cyan"} animated label={rightIsWriter ? (isMultiAz ? "DNS trỏ lại" : "đổi config app") : "đọc"} />
              )}
              {isMultiAz && step === 2 && (
                <text x={360} y={112} textAnchor="middle" fontSize={12} className="fill-amber-700 dark:fill-amber-300">
                  ⏱️ ~1–2 phút gián đoạn
                </text>
              )}
            </>
          );
        }}
      </StepDiagram>
    </div>
  );
}
