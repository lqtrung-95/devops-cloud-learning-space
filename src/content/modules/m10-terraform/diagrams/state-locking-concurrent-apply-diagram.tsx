"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramArrow, DiagramGroupBox, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";

type Scenario = "no-lock" | "lockfile";

const scenarioSteps: Record<Scenario, DiagramStep[]> = {
  "no-lock": [
    { title: "An apply", description: "An chạy `terraform apply` để thêm một subnet. Terraform tải state (serial 5) từ S3 — không có ai giữ khoá cả." },
    { title: "Bình apply cùng lúc", description: "Cùng phút đó Bình chạy `apply` để đổi security group. Bình cũng tải state serial 5 — chưa biết gì về thay đổi của An." },
    { title: "An ghi state", description: "An xong trước và ghi state serial 6 (có subnet mới) lên S3." },
    { title: "Bình ghi đè", description: "Bình xong sau và ghi state dựa trên bản cũ serial 5 → subnet của An biến mất khỏi state dù vẫn chạy trên AWS. Lần plan sau Terraform định tạo lại subnet đó → lỗi trùng CIDR hoặc tài nguyên mồ côi." },
  ],
  lockfile: [
    { title: "An lấy khoá", description: "`use_lockfile = true`: trước khi đọc state, Terraform tạo file `dev/terraform.tfstate.tflock` bằng conditional write của S3 (chỉ thành công nếu file chưa tồn tại)." },
    { title: "Bình bị chặn", description: "Bình chạy `apply`, cũng cố tạo file `.tflock` → S3 từ chối vì file đã có. Bình nhận `Error acquiring the state lock` kèm tên người giữ khoá." },
    { title: "An ghi state & nhả khoá", description: "An apply xong, ghi state serial 6 rồi xoá file `.tflock`." },
    { title: "Bình chạy lại", description: "Bình chạy lại `apply`: lấy được khoá, đọc state serial 6 (đã có subnet của An) và plan chỉ còn đúng thay đổi security group. Không ai ghi đè ai." },
  ],
};

export function StateLockingConcurrentApplyDiagram() {
  const [scenario, setScenario] = useState<Scenario>("no-lock");
  const locked = scenario === "lockfile";

  return (
    <div>
      <div className="not-prose -mb-4 flex flex-wrap gap-2">
        {(["no-lock", "lockfile"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setScenario(option)}
            className={clsx(
              "rounded-full px-3 py-1.5 text-sm font-medium",
              scenario === option ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
            )}
          >
            {option === "no-lock" ? "🔓 Không có locking" : "🔒 S3 backend + use_lockfile"}
          </button>
        ))}
      </div>
      <StepDiagram key={scenario} title="Hai người cùng apply một lúc" viewBox="0 0 720 320" steps={scenarioSteps[scenario]} autoPlayMs={3500}>
        {(step) => {
          const serial = step >= 2 ? 6 : 5;
          const stateLost = !locked && step === 3;
          const lockHolder = locked ? (step <= 1 ? "An" : step === 3 ? "Bình" : null) : null;
          const binhBlocked = locked && step === 1;
          return (
            <>
              <DiagramNode x={10} y={30} width={170} height={70} emoji="👩‍💻" label="An" sublabel="thêm subnet" tone="blue" state={step === 3 && locked ? "dimmed" : step === 0 || step === 2 ? "active" : "normal"} />
              <DiagramNode
                x={10}
                y={200}
                width={170}
                height={70}
                emoji={binhBlocked ? "⛔" : "🧑‍💻"}
                label="Bình"
                sublabel={binhBlocked ? "bị chặn — chờ khoá" : "đổi security group"}
                tone={binhBlocked ? "rose" : "violet"}
                state={step === 1 || step === 3 ? "active" : "normal"}
              />

              <DiagramGroupBox x={260} y={20} width={230} height={270} label="S3 bucket: tfstate" tone="amber">
                <DiagramNode
                  x={280}
                  y={60}
                  width={190}
                  height={70}
                  emoji={stateLost ? "💥" : "📒"}
                  label="terraform.tfstate"
                  sublabel={stateLost ? "serial 6 — mất subnet!" : `serial ${serial}`}
                  tone={stateLost ? "rose" : "amber"}
                  state={step >= 2 ? "active" : "normal"}
                />
                <DiagramNode
                  x={280}
                  y={170}
                  width={190}
                  height={70}
                  emoji={lockHolder ? "🔒" : "🔓"}
                  label=".tflock"
                  sublabel={!locked ? "không dùng" : lockHolder ? `đang giữ: ${lockHolder}` : "đã nhả khoá"}
                  tone={lockHolder ? "green" : "slate"}
                  state={!locked ? "dimmed" : lockHolder ? "active" : "normal"}
                  dashed={!lockHolder}
                />
              </DiagramGroupBox>

              <DiagramNode x={560} y={110} width={150} height={80} emoji="☁️" label="AWS thật" sublabel={step >= 2 ? "có subnet mới" : "VPC dev"} tone="cyan" />

              <DiagramArrow from={[182, 65]} to={[276, locked && step === 0 ? 200 : 95]} tone="blue" label={locked && step === 0 ? "tạo khoá" : step === 2 ? "ghi serial 6" : "đọc"} animated={step === 0 || step === 2} dimmed={step === 1 || step === 3} />
              <DiagramArrow
                from={[182, 235]}
                to={[276, binhBlocked ? 210 : 115]}
                tone={binhBlocked ? "rose" : "violet"}
                label={binhBlocked ? "412: đã có khoá" : step === 3 ? (locked ? "đọc serial 6" : "ghi đè bản cũ") : "đọc serial 5"}
                animated={step === 1 || step === 3}
                dimmed={step === 0 || step === 2}
              />
              <DiagramArrow from={[492, 150]} to={[556, 150]} tone="cyan" label="API" animated={step !== 1 || !locked} />
              <DiagramLabel x={360} y={310} text={stateLost ? "State và thực tế lệch nhau → hậu quả khó gỡ" : locked ? "Mỗi thời điểm chỉ một người được ghi state" : ""} tone={stateLost ? "rose" : "green"} bold size={13} />
            </>
          );
        }}
      </StepDiagram>
    </div>
  );
}
