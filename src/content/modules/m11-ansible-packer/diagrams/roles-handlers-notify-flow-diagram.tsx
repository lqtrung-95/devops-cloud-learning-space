"use client";

import { DiagramArrow, DiagramGroupBox, DiagramNode } from "@/components/diagrams/diagram-shapes";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";

const steps: DiagramStep[] = [
  { title: "Task 1: template", description: "Role `hardening` chạy task `template: nginx.conf.j2 -> /etc/nginx/nginx.conf`. File thay đổi -> `changed` -> task này `notify: restart nginx`." },
  { title: "Task 2: template khác", description: "Task tiếp theo sửa file cấu hình header bảo mật, cũng `changed` và cũng `notify: restart nginx`. Handler được xếp hàng lần thứ hai — nhưng Ansible chỉ nhớ 'cần chạy', không xếp hàng đợi 2 lần." },
  { title: "Task 3: không đổi gì", description: "Task copy `motd` thấy nội dung đã đúng -> `ok`, không notify gì thêm." },
  { title: "Handlers chạy 1 lần", description: "Hết phần `tasks`, Ansible mới chạy khối `handlers`. Dù bị notify 2 lần, `restart nginx` chỉ chạy **đúng một lần**, ở cuối play." },
  { title: "Chạy lại (không đổi code)", description: "Lần sau không ai sửa file cấu hình -> mọi template task đều `ok` -> không notify -> handler không chạy -> nginx không bị restart ngoài ý muốn." },
];

export function RolesHandlersNotifyFlowDiagram() {
  return (
    <StepDiagram title="Handler chỉ chạy khi được notify, và chỉ chạy một lần" viewBox="0 0 720 300" steps={steps} autoPlayMs={3200}>
      {(step) => {
        const task1Changed = step >= 0;
        const task2Changed = step >= 1;
        const task3Ok = step >= 2;
        const handlerQueued = step === 3;
        const handlerRan = step === 3;
        const secondRunClean = step === 4;

        return (
          <>
            <DiagramGroupBox x={10} y={10} width={330} height={230} label="tasks:" tone="blue">
              <DiagramNode x={26} y={40} width={295} height={46} emoji="📝" label="template nginx.conf.j2" sublabel={secondRunClean ? "ok (lần 2)" : task1Changed ? "changed → notify" : "chưa chạy"} tone={secondRunClean ? "green" : task1Changed ? "amber" : "slate"} state={step === 0 ? "active" : "normal"} />
              <DiagramNode x={26} y={98} width={295} height={46} emoji="📝" label="template security-headers.j2" sublabel={secondRunClean ? "ok (lần 2)" : task2Changed ? "changed → notify" : "chưa chạy"} tone={secondRunClean ? "green" : task2Changed ? "amber" : "slate"} state={step === 1 ? "active" : "normal"} />
              <DiagramNode x={26} y={156} width={295} height={46} emoji="📄" label="copy /etc/motd" sublabel={task3Ok ? "ok — không đổi" : "chưa chạy"} tone={task3Ok ? "green" : "slate"} state={step === 2 ? "active" : "normal"} />
            </DiagramGroupBox>

            <DiagramArrow from={[344, 100]} to={[400, 100]} tone="amber" label="notify" dimmed={!task1Changed || secondRunClean} animated={step === 0} />
            <DiagramArrow from={[344, 158]} to={[400, 120]} tone="amber" label="notify" dimmed={!task2Changed || secondRunClean} animated={step === 1} />

            <DiagramGroupBox x={404} y={40} width={140} height={100} label="Hàng đợi handler" tone="amber">
              <DiagramNode x={418} y={70} width={112} height={44} emoji="🔔" label="restart nginx" sublabel={handlerQueued ? "sẽ chạy 1 lần" : secondRunClean ? "không được gọi" : "chờ notify"} tone={handlerQueued ? "amber" : "slate"} state={handlerQueued ? "active" : "normal"} dashed={!handlerQueued} />
            </DiagramGroupBox>

            <DiagramArrow from={[474, 144]} to={[474, 190]} tone={handlerRan ? "green" : "slate"} dimmed={!handlerRan} animated={handlerRan} />
            <DiagramNode
              x={380}
              y={194}
              width={190}
              height={60}
              emoji={handlerRan ? "✅" : secondRunClean ? "🚫" : "⏳"}
              label="handlers:"
              sublabel={handlerRan ? "restart nginx — chạy đúng 1 lần" : secondRunClean ? "không chạy — không có gì đổi" : "chưa tới lượt"}
              tone={handlerRan ? "green" : secondRunClean ? "slate" : "slate"}
              state={handlerRan || secondRunClean ? "active" : "normal"}
              dashed={!handlerRan && !secondRunClean}
            />

            <DiagramNode x={600} y={100} width={110} height={70} emoji="🌐" label="nginx" sublabel={handlerRan ? "vừa restart" : secondRunClean ? "vẫn chạy, không gián đoạn" : "đang chạy"} tone={handlerRan ? "green" : "cyan"} state={handlerRan ? "active" : "normal"} />
          </>
        );
      }}
    </StepDiagram>
  );
}
