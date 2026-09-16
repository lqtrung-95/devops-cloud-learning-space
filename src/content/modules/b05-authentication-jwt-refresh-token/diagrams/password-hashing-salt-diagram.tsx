"use client";

import { DiagramArrow, DiagramNode } from "@/components/diagrams/diagram-shapes";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";

// Same password, two users — the whole point is that the stored hash differs.
const PASSWORD = "matkhau123";
const SALT_A = "9f2a…";
const SALT_B = "c81e…";
const HASH_A = "$argon2id$…9f2a…7bQ1";
const HASH_B = "$argon2id$…c81e…4mZ9";

const steps: DiagramStep[] = [
  { title: "Hai user, cùng mật khẩu", description: `Cả An và Bình đều đặt mật khẩu \`${PASSWORD}\`. Nếu hash thẳng bằng SHA-256, hai hàng trong DB sẽ giống hệt nhau — attacker chỉ cần crack một lần, dò được cả hai.` },
  { title: "Sinh salt ngẫu nhiên", description: "Trước khi hash, server sinh một chuỗi salt ngẫu nhiên riêng cho từng user (argon2 tự làm việc này). Salt không cần giữ bí mật — chỉ cần khác nhau giữa các user." },
  { title: "Trộn mật khẩu + salt", description: `An: \`${PASSWORD} + salt ${SALT_A}\`. Bình: \`${PASSWORD} + salt ${SALT_B}\`. Cùng mật khẩu gốc nhưng đầu vào cho hàm hash đã khác nhau hoàn toàn.` },
  { title: "argon2id: chậm & tốn RAM có chủ đích", description: "argon2id chạy hàm memory-hard — cố tình chậm và cần nhiều RAM để mỗi lần thử một mật khẩu đều tốn chi phí thật, khiến brute-force hàng tỷ lần/giây bằng GPU trở nên bất khả thi." },
  { title: "Lưu vào DB", description: `Kết quả: An có \`password_hash = ${HASH_A}\`, Bình có \`password_hash = ${HASH_B}\`. Hai hash khác nhau hoàn toàn dù mật khẩu gốc giống hệt — salt đã được argon2 nhúng sẵn trong chuỗi hash, không cần lưu cột riêng.` },
  { title: "Khi login lại", description: "Server không \"giải mã\" hash để so sánh — không thể, vì hash một chiều. Thay vào đó `argon2.verify(hash, password)` chạy lại đúng salt đã lưu trong chuỗi hash và so kết quả." },
];

export function PasswordHashingSaltDiagram() {
  return (
    <StepDiagram title="Vì sao cùng mật khẩu lại ra hai hash khác nhau?" viewBox="0 0 720 300" steps={steps}>
      {(step) => (
        <>
          <DiagramNode x={16} y={20} width={190} height={64} label="An" sublabel={`nhập: "${PASSWORD}"`} emoji="🧑" tone="violet" state={step === 0 ? "active" : "normal"} />
          <DiagramNode x={16} y={200} width={190} height={64} label="Bình" sublabel={`nhập: "${PASSWORD}"`} emoji="🧑" tone="violet" state={step === 0 ? "active" : "normal"} />

          <DiagramNode x={252} y={20} width={150} height={54} label={`🧂 salt ${SALT_A}`} sublabel="ngẫu nhiên riêng" tone="amber" state={step >= 1 ? (step === 1 ? "active" : "normal") : "dimmed"} />
          <DiagramNode x={252} y={210} width={150} height={54} label={`🧂 salt ${SALT_B}`} sublabel="ngẫu nhiên riêng" tone="amber" state={step >= 1 ? (step === 1 ? "active" : "normal") : "dimmed"} />

          <DiagramNode
            x={438}
            y={110}
            width={160}
            height={90}
            label="argon2id()"
            sublabel={step >= 3 ? "chậm · tốn RAM" : "hàm hash"}
            emoji="🧮"
            tone={step === 3 ? "amber" : "blue"}
            state={step >= 2 ? "active" : "dimmed"}
          />

          <DiagramNode x={636} y={30} width={80} height={54} label="🗄️" sublabel={HASH_A.slice(0, 12) + "…"} tone="green" state={step >= 4 ? "active" : "dimmed"} />
          <DiagramNode x={636} y={200} width={80} height={54} label="🗄️" sublabel={HASH_B.slice(0, 12) + "…"} tone="green" state={step >= 4 ? "active" : "dimmed"} />

          <DiagramArrow from={[210, 52]} to={[248, 47]} tone="violet" dimmed={step < 1} />
          <DiagramArrow from={[210, 232]} to={[248, 237]} tone="violet" dimmed={step < 1} />
          <DiagramArrow from={[404, 47]} to={[436, 130]} tone="amber" dimmed={step < 2} />
          <DiagramArrow from={[404, 237]} to={[436, 175]} tone="amber" dimmed={step < 2} />
          <DiagramArrow from={[600, 135]} to={[634, 57]} tone="green" dimmed={step < 4} />
          <DiagramArrow from={[600, 175]} to={[634, 227]} tone="green" dimmed={step < 4} />
        </>
      )}
    </StepDiagram>
  );
}
