"use client";

import { DiagramArrow, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";

const steps: DiagramStep[] = [
  { title: "Ra lệnh", description: "Bạn gõ `sudo systemctl start my-app` — giống như nhờ quản lý nhà hàng mở bếp cho món mới." },
  { title: "systemd khởi động app", description: "systemd (tiến trình PID 1, 'quản lý nhà hàng') đọc file my-app.service và chạy chương trình. App nhận số thứ tự PID 1234." },
  { title: "App chạy & ghi log", description: "App đang phục vụ. Mọi dòng in ra (stdout/stderr) được journald ghi vào sổ — xem bằng `journalctl -u my-app`." },
  { title: "App bị crash", description: "Có lỗi, app thoát với exit code 1. Nếu không có ai trông, website sẽ sập tới khi bạn phát hiện." },
  { title: "Tự khởi động lại", description: "Nhờ dòng `Restart=on-failure`, systemd thấy app chết và tự chạy lại sau vài giây — PID mới là 1301." },
  { title: "Chạy cùng máy", description: "`systemctl enable my-app` = dặn quản lý: mỗi sáng mở cửa (máy boot) thì tự bật app luôn." },
];

export function SystemdServiceLifecycleDiagram() {
  return (
    <StepDiagram title="Vòng đời một service dưới sự quản lý của systemd" viewBox="0 0 720 290" steps={steps}>
      {(step) => {
        const crashed = step === 3;
        const pid = step >= 4 ? "PID 1301" : step >= 1 ? (crashed ? "đã dừng (exit 1)" : "PID 1234") : "chưa chạy";
        return (
          <>
            <DiagramNode x={16} y={100} width={140} height={84} label="Bạn" sublabel="systemctl" emoji="🧑‍💻" tone="violet" state={step === 0 || step === 5 ? "active" : "normal"} />
            <DiagramNode x={250} y={100} width={160} height={84} label="systemd" sublabel="PID 1 · quản lý" emoji="🧑‍💼" tone="blue" state={step === 1 || step === 4 ? "active" : "normal"} />
            <DiagramNode
              x={510}
              y={30}
              width={190}
              height={84}
              label="my-app.service"
              sublabel={pid}
              emoji={crashed ? "💥" : step >= 1 ? "🍜" : "💤"}
              tone={crashed ? "rose" : step >= 1 ? "green" : "slate"}
              state={step === 2 || step === 3 ? "active" : "normal"}
            />
            <DiagramNode x={510} y={190} width={190} height={74} label="journald" sublabel="sổ ghi log" emoji="📒" tone="amber" state={step === 2 ? "active" : "dimmed"} />

            <DiagramArrow from={[158, 142]} to={[246, 142]} tone="violet" animated={step === 0 || step === 5} dimmed={step !== 0 && step !== 5} label={step === 5 ? "enable" : "start"} />
            <DiagramArrow from={[412, 128]} to={[506, 80]} tone="blue" animated={step === 1 || step === 4} dimmed={step !== 1 && step !== 4} label={step === 4 ? "restart" : "chạy"} />
            <DiagramArrow from={[605, 116]} to={[605, 186]} tone="amber" animated={step === 2} dimmed={step !== 2} label="log" />
            {crashed && <DiagramArrow from={[506, 96]} to={[412, 150]} tone="rose" animated label="tôi chết rồi!" />}
            {step === 5 && <DiagramLabel x={330} y={240} text="🔌 Máy khởi động → systemd tự bật my-app" tone="green" bold size={13} />}
          </>
        );
      }}
    </StepDiagram>
  );
}
