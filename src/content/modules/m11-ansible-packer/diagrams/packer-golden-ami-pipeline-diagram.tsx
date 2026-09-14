"use client";

import { DiagramArrow, DiagramGroupBox, DiagramNode } from "@/components/diagrams/diagram-shapes";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";

const steps: DiagramStep[] = [
  { title: "packer build", description: "`packer build web.pkr.hcl` đọc source `amazon-ebs`: AMI Ubuntu 22.04 gốc, instance type tạm `t3.micro`, subnet có internet để tải package." },
  { title: "Boot máy tạm", description: "Packer tự tạo 1 EC2 tạm thời từ AMI gốc, chờ SSH sẵn sàng — máy này chỉ tồn tại trong lúc build, không tính vào fleet chạy thật." },
  { title: "Provisioner: Ansible", description: "Packer chạy provisioner `ansible` — thực ra chỉ là chạy playbook hardening (users, SSH, ufw, fail2ban, node_exporter) nhắm vào chính máy tạm này, y hệt cách dùng ở bài trước." },
  { title: "Snapshot & tạo AMI", description: "Máy tạm dừng lại, Packer tạo EBS snapshot rồi đăng ký thành AMI mới: `web-golden-2026-09-14-abc123`. Máy tạm bị xoá — golden image mới là thứ tồn tại lâu dài." },
  { title: "Output AMI ID", description: "Packer in ra AMI ID mới. Trong CI, ID này được lưu vào SSM Parameter Store hoặc truyền làm output cho bước Terraform kế tiếp." },
  { title: "Terraform dùng AMI mới", description: "Launch template của ASG được cập nhật `image_id` sang AMI mới; `terraform apply` kích hoạt **instance refresh** — ASG thay dần từng instance cũ bằng instance chạy AMI mới, không downtime nếu health check ổn." },
];

export function PackerGoldenAmiPipelineDiagram() {
  return (
    <StepDiagram title="Packer + Ansible → AMI → Terraform launch template" viewBox="0 0 720 300" steps={steps} autoPlayMs={3200}>
      {(step) => {
        const isOn = (...active: number[]) => active.includes(step);
        return (
          <>
            <DiagramNode x={10} y={16} width={140} height={60} emoji="📄" label="web.pkr.hcl" sublabel="source + provisioner" tone="violet" state={isOn(0) ? "active" : "normal"} />
            <DiagramNode x={10} y={110} width={140} height={60} emoji="🧩" label="playbook hardening" sublabel="Ansible" tone="violet" state={isOn(2) ? "active" : "normal"} />

            <DiagramGroupBox x={180} y={10} width={220} height={220} label="Máy tạm (chỉ lúc build)" tone="amber">
              <DiagramNode x={196} y={40} width={188} height={54} emoji="🖥️" label="EC2 tạm" sublabel={isOn(1, 2, 3) ? "đang cấu hình" : "chưa tạo"} tone="amber" state={isOn(1, 2) ? "active" : "normal"} />
              <DiagramNode x={196} y={110} width={188} height={54} emoji="🛡️" label="users · ssh · ufw" sublabel="fail2ban · node_exporter" tone="amber" state={isOn(2) ? "active" : "normal"} />
              <DiagramNode x={196} y={180} width={188} height={40} emoji={isOn(3) ? "💥" : "⏳"} label={isOn(3) ? "đã xoá sau build" : "sẽ bị xoá"} tone="rose" state={isOn(3) ? "active" : "normal"} dashed={!isOn(3)} />
            </DiagramGroupBox>

            <DiagramArrow from={[152, 46]} to={[176, 60]} tone="violet" animated={isOn(0)} dimmed={!isOn(0, 1, 2, 3)} />
            <DiagramArrow from={[152, 140]} to={[192, 140]} tone="violet" label="ansible" animated={isOn(2)} dimmed={!isOn(2)} />

            <DiagramNode x={430} y={40} width={160} height={70} emoji="📀" label="AMI mới" sublabel={isOn(4, 5) ? "web-golden-...-abc123" : "chưa tạo"} tone="green" state={isOn(3, 4, 5) ? "active" : "normal"} />
            <DiagramArrow from={[402, 100]} to={[428, 75]} tone="green" label="snapshot" animated={isOn(3)} dimmed={!isOn(3, 4, 5)} />

            <DiagramGroupBox x={430} y={140} width={270} height={130} label="Terraform" tone="blue">
              <DiagramNode x={446} y={168} width={230} height={44} label="launch_template.image_id" sublabel={isOn(5) ? "= AMI mới" : "= AMI cũ"} tone={isOn(5) ? "green" : "slate"} state={isOn(5) ? "active" : "normal"} />
              <DiagramNode x={446} y={222} width={230} height={34} label="ASG instance refresh" sublabel={isOn(5) ? "đang thay dần từng instance" : "chưa kích hoạt"} tone="cyan" state={isOn(5) ? "active" : "normal"} />
            </DiagramGroupBox>
            <DiagramArrow from={[592, 75]} to={[616, 140]} tone="blue" label="AMI ID" animated={isOn(4, 5)} dimmed={!isOn(4, 5)} />
          </>
        );
      }}
    </StepDiagram>
  );
}
