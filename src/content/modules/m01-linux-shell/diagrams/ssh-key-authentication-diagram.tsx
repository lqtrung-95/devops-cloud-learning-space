"use client";

import { DiagramArrow, DiagramNode, MovingPacket } from "@/components/diagrams/diagram-shapes";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";

const steps: DiagramStep[] = [
  { title: "Tạo cặp khoá", description: "`ssh-keygen -t ed25519` tạo 2 file: 🔑 private key (chìa riêng, KHÔNG BAO GIỜ đưa ai) và 📮 public key (có thể phát cho bất kỳ ai)." },
  { title: "Gửi public key", description: "`ssh-copy-id trung@server` copy public key vào `~/.ssh/authorized_keys` trên server — như đăng ký mẫu chữ ký của bạn ở ngân hàng." },
  { title: "Xin vào", description: "Bạn gõ `ssh trung@server`. Laptop nói: 'Tôi là trung, đây là public key của tôi'." },
  { title: "Thử thách", description: "Server kiểm tra public key có trong authorized_keys, rồi gửi một dãy số ngẫu nhiên: 'Ký vào đây để chứng minh bạn giữ chìa riêng'." },
  { title: "Ký bằng private key", description: "Laptop dùng private key ký dãy số và gửi chữ ký về. Private key không hề rời khỏi laptop!" },
  { title: "Xác minh ✅", description: "Server dùng public key kiểm tra chữ ký. Khớp → cho vào. Không có mật khẩu nào bay qua mạng, hacker nghe lén cũng vô ích." },
];

export function SshKeyAuthenticationDiagram() {
  return (
    <StepDiagram title="Đăng nhập SSH bằng key hoạt động thế nào?" viewBox="0 0 720 290" steps={steps}>
      {(step) => (
        <>
          <DiagramNode x={20} y={90} width={180} height={100} label="Laptop của bạn" sublabel="ssh client" emoji="💻" tone="violet" state={[0, 2, 4].includes(step) ? "active" : "normal"} />
          <DiagramNode
            x={520}
            y={90}
            width={180}
            height={100}
            label="Server"
            sublabel={step === 5 ? "✅ Cho vào!" : "sshd"}
            emoji="🖥️"
            tone={step === 5 ? "green" : "blue"}
            state={[1, 3, 5].includes(step) ? "active" : "normal"}
          />
          <DiagramNode x={30} y={214} width={160} height={54} label="🔑 id_ed25519" sublabel="private · giữ bí mật" tone="rose" state={step === 4 ? "active" : "normal"} />
          <DiagramNode
            x={step >= 1 ? 530 : 30}
            y={step >= 1 ? 214 : 16}
            width={160}
            height={54}
            label="📮 id_ed25519.pub"
            sublabel={step >= 1 ? "authorized_keys" : "public · chia sẻ được"}
            tone="green"
            state={step === 5 ? "active" : "normal"}
          />

          {step === 1 && <MovingPacket key="copy" path="M 200 120 L 520 120" durationSeconds={1.6} tone="green" label="📮 public key" />}
          {step === 2 && <DiagramArrow from={[204, 115]} to={[516, 115]} tone="violet" animated label="Tôi là trung" />}
          {step === 3 && <DiagramArrow from={[516, 150]} to={[204, 150]} tone="blue" animated label="🎲 Ký dãy số 8f3a…" />}
          {step === 4 && <DiagramArrow from={[204, 130]} to={[516, 130]} tone="rose" animated label="✍️ chữ ký" />}
          {step === 5 && <DiagramArrow from={[610, 208]} to={[610, 194]} tone="green" label="kiểm tra chữ ký" />}
        </>
      )}
    </StepDiagram>
  );
}
