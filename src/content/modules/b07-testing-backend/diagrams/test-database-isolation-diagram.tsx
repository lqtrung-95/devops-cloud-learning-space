"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import { DiagramArrow, DiagramGroupBox, DiagramNode } from "@/components/diagrams/diagram-shapes";

type Scenario = "shared" | "isolated";

const copy: Record<Scenario, { caption: string; warning: string }> = {
  shared: {
    caption: "Test trỏ thẳng vào database dev (taskflow). Test tạo user demo@test.com — user đó tồn tại thật trong DB dev sau khi test chạy xong.",
    warning: "Lần chạy test kế tiếp: INSERT trùng email → lỗi unique constraint. Dev mở app thấy dữ liệu 'rác' do test để lại.",
  },
  isolated: {
    caption: "Test trỏ vào database taskflow_test — cùng container Postgres, khác tên database. Migrate schema riêng, không đụng dữ liệu dev.",
    warning: "Test chạy bao nhiêu lần cũng được: taskflow_test sạch mỗi lần (kết hợp rollback per-test ở lesson 4). taskflow (dev) không hề bị đụng tới.",
  },
};

export function TestDatabaseIsolationDiagram() {
  const [scenario, setScenario] = useState<Scenario>("shared");
  const isShared = scenario === "shared";

  return (
    <div>
      <div className="not-prose -mb-4 flex flex-wrap gap-2">
        {(["shared", "isolated"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setScenario(option)}
            className={clsx(
              "rounded-full px-3 py-1.5 text-sm font-medium",
              scenario === option ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
            )}
          >
            {option === "shared" ? "Kịch bản: test dùng chung DB dev" : "Kịch bản: test dùng DB riêng"}
          </button>
        ))}
      </div>
      <DiagramFrame
        title="DB test riêng vs dùng chung DB dev"
        viewBox="0 0 720 260"
        caption={copy[scenario].caption}
        controls={
          <p className={clsx("text-sm leading-relaxed", isShared ? "text-rose-700 dark:text-rose-400" : "text-emerald-700 dark:text-emerald-400")}>
            <span className="font-semibold">{isShared ? "⚠ Hậu quả: " : "✅ Kết quả: "}</span>
            {copy[scenario].warning}
          </p>
        }
      >
        <DiagramNode x={16} y={94} width={150} height={72} label="🧪 pnpm test" sublabel="tests/setup.ts" tone="violet" state="active" />

        <DiagramGroupBox x={200} y={16} width={504} height={228} label="Container postgres — 1 instance (port 5434→5432)" tone="slate">
          <DiagramNode
            x={230}
            y={56}
            width={210}
            height={70}
            label="🏗️ taskflow (dev)"
            sublabel="dữ liệu dev thật"
            tone={isShared ? "rose" : "slate"}
            state={isShared ? "active" : "dimmed"}
          />
          <DiagramNode
            x={230}
            y={148}
            width={210}
            height={70}
            label="🧼 taskflow_test"
            sublabel="chỉ để chạy test"
            tone={isShared ? "slate" : "green"}
            state={isShared ? "dimmed" : "active"}
          />
          <DiagramNode x={480} y={92} width={190} height={56} label="👩‍💻 Dev" sublabel="đang code, mở app xem" tone="amber" />
          <DiagramArrow from={[478, 118]} to={[442, 91]} tone="amber" dimmed={!isShared} label={isShared ? "cùng thấy dữ liệu" : undefined} />
        </DiagramGroupBox>

        <DiagramArrow
          from={[166, 130]}
          to={[228, isShared ? 91 : 183]}
          tone={isShared ? "rose" : "green"}
          animated
          label={isShared ? "DATABASE_URL trỏ nhầm" : "TEST_DATABASE_URL"}
        />
      </DiagramFrame>
    </div>
  );
}
