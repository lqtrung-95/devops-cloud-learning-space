"use client";

import { DiagramArrow, DiagramGroupBox, DiagramNode } from "@/components/diagrams/diagram-shapes";
import type { DiagramTone } from "@/components/diagrams/diagram-tones";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";

const steps: DiagramStep[] = [
  { title: "Viết code", description: "Bạn sửa file `.tf`: thêm một S3 bucket, đổi AMI của EC2, xoá một Elastic IP cũ. Đây mới là bản vẽ — chưa có gì thay đổi trên AWS." },
  { title: "init", description: "`terraform init` tải provider `hashicorp/aws` từ Registry vào `.terraform/`, ghi phiên bản vào `.terraform.lock.hcl` và kết nối backend chứa state. Chạy lại khi thêm provider/module hoặc đổi backend." },
  { title: "plan: refresh", description: "`terraform plan` đọc state (sổ kiểm kê) rồi hỏi AWS API xem tài nguyên thật đang ra sao — để biết có ai sửa tay không." },
  { title: "plan: diff", description: "So bản vẽ với thực tế và in ra diff: `+` tạo mới, `~` sửa tại chỗ, `-/+` phải xoá rồi tạo lại (thay thế), `-` xoá. Đây là lúc con người review." },
  { title: "apply", description: "`terraform apply` gọi AWS API theo đồ thị phụ thuộc (dependency graph): cái gì cần trước làm trước, cái độc lập chạy song song (mặc định 10 luồng)." },
  { title: "Ghi state", description: "Mỗi tài nguyên xong, Terraform ghi ID thật (ví dụ `i-0a1b2c...`) và thuộc tính vào state. Lần plan sau sẽ dựa trên bản ghi này." },
  { title: "destroy", description: "`terraform destroy` = một plan mà mọi tài nguyên đều là `-`, xoá theo thứ tự ngược dependency. Tuyệt vời cho môi trường thử nghiệm, nguy hiểm với prod." },
];

type DiffLine = { symbol: string; address: string; note: string; tone: DiagramTone };

const changeDiff: DiffLine[] = [
  { symbol: "+", address: "aws_s3_bucket.assets", note: "tạo mới", tone: "green" },
  { symbol: "~", address: "aws_security_group.web", note: "sửa tại chỗ", tone: "amber" },
  { symbol: "-/+", address: "aws_instance.web", note: "thay thế (đổi ami)", tone: "violet" },
  { symbol: "-", address: "aws_eip.old", note: "xoá", tone: "rose" },
];

const destroyDiff: DiffLine[] = [
  { symbol: "-", address: "aws_s3_bucket.assets", note: "xoá", tone: "rose" },
  { symbol: "-", address: "aws_security_group.web", note: "xoá", tone: "rose" },
  { symbol: "-", address: "aws_instance.web", note: "xoá", tone: "rose" },
];

const toneText: Record<DiagramTone, string> = {
  green: "fill-emerald-700 dark:fill-emerald-300",
  amber: "fill-amber-700 dark:fill-amber-300",
  violet: "fill-violet-700 dark:fill-violet-300",
  rose: "fill-rose-700 dark:fill-rose-300",
  blue: "fill-blue-700 dark:fill-blue-300",
  slate: "fill-stone-700 dark:fill-stone-300",
  cyan: "fill-cyan-700 dark:fill-cyan-300",
};

export function TerraformPlanApplyWorkflowDiagram() {
  return (
    <StepDiagram title="Terraform core workflow: từ bản vẽ tới hạ tầng thật" viewBox="0 0 720 320" steps={steps} autoPlayMs={3200}>
      {(step) => {
        const isOn = (...active: number[]) => active.includes(step);
        const lines = step === 6 ? destroyDiff : changeDiff;
        const summary = step === 6 ? "Plan: 0 to add, 0 to change, 3 to destroy." : step >= 4 ? "Apply complete! Resources: 2 added, 1 changed, 2 destroyed." : "Plan: 2 to add, 1 to change, 2 to destroy.";
        return (
          <>
            <DiagramNode x={10} y={16} width={140} height={66} label="main.tf" sublabel="bản vẽ HCL" emoji="📝" tone="violet" state={isOn(0, 2) ? "active" : "normal"} />
            <DiagramNode x={285} y={16} width={150} height={66} label="terraform" sublabel={["viết code", "init", "plan", "plan", "apply", "apply", "destroy"][step]} emoji="⚙️" tone="blue" state={step === 0 ? "dimmed" : "active"} />
            <DiagramNode x={570} y={16} width={140} height={66} label="Registry" sublabel="provider aws" emoji="📦" tone="slate" state={isOn(1) ? "active" : "dimmed"} />
            <DiagramNode x={10} y={112} width={140} height={66} label="terraform.tfstate" sublabel={step >= 5 ? "đã cập nhật ✓" : "sổ kiểm kê"} emoji="📒" tone="amber" state={isOn(2, 5, 6) ? "active" : step === 0 ? "dimmed" : "normal"} />
            <DiagramNode x={570} y={112} width={140} height={66} label="AWS API" sublabel={step >= 4 && step < 6 ? "đang thay đổi" : "hạ tầng thật"} emoji="☁️" tone="cyan" state={isOn(2, 4, 6) ? "active" : step === 0 ? "dimmed" : "normal"} />

            <DiagramArrow from={[152, 49]} to={[281, 49]} tone="violet" label="đọc .tf" animated={isOn(2)} dimmed={!isOn(0, 2)} />
            <DiagramArrow from={[437, 49]} to={[566, 49]} tone="slate" label="tải plugin" animated={isOn(1)} dimmed={!isOn(1)} bidirectional />
            <DiagramArrow from={[285, 84]} to={[154, 140]} tone="amber" label={step >= 5 ? "ghi" : "đọc"} animated={isOn(2, 5)} dimmed={!isOn(2, 5, 6)} bidirectional />
            <DiagramArrow from={[435, 84]} to={[566, 140]} tone="cyan" label={step === 2 ? "refresh" : "gọi API"} animated={isOn(2, 4, 6)} dimmed={!isOn(2, 4, 6)} bidirectional />

            <DiagramGroupBox x={170} y={150} width={380} height={160} label={step >= 3 ? (step === 6 ? "terraform destroy — plan" : "Kết quả plan") : "Kết quả plan (chưa có)"} tone={step >= 3 ? "blue" : "slate"}>
              {step >= 3 &&
                lines.map((line, index) => (
                  <text key={`${step}-${line.address}`} x={188} y={196 + index * 24} fontSize={13} className="font-mono" style={{ whiteSpace: "pre" }}>
                    <tspan className={toneText[line.tone]} fontWeight={700}>
                      {line.symbol.padEnd(4, " ")}
                    </tspan>
                    <tspan className="fill-stone-800 dark:fill-stone-200">{line.address}</tspan>
                    <tspan className="fill-stone-500"> # {line.note}</tspan>
                  </text>
                ))}
              {step >= 3 && (
                <text x={188} y={296} fontSize={12.5} fontWeight={700} className={step === 4 || step === 5 ? toneText.green : toneText.blue}>
                  {summary}
                </text>
              )}
            </DiagramGroupBox>
          </>
        );
      }}
    </StepDiagram>
  );
}
