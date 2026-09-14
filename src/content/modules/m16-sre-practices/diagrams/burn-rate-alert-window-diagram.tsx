"use client";

import { DiagramArrow, DiagramGroupBox, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";

const steps: DiagramStep[] = [
  {
    title: "Ngưỡng cố định gây ồn",
    description: "Alert kiểu cũ: `error_rate > 5%`. Một request lỗi lẻ tẻ lúc traffic thấp ban đêm cũng có thể đẩy tỉ lệ qua 5% dù ảnh hưởng thực tế rất nhỏ — false positive đánh thức on-call vô ích.",
  },
  {
    title: "Burn rate là gì",
    description: "Burn rate = tốc độ tiêu error budget so với tốc độ 'vừa đủ hết đúng cuối cửa sổ SLO'. Burn rate 1 = cứ tiêu đều thì hết budget đúng lúc cửa sổ (vd 30 ngày) kết thúc. Burn rate 14.4 = tiêu nhanh gấp 14.4 lần mức đó.",
  },
  {
    title: "Cửa sổ dài xác nhận mức độ nghiêm trọng",
    description: "Cửa sổ 1 giờ với burn rate ≥ 14.4 nghĩa là: giữ tốc độ này, budget 30 ngày sẽ cạn trong vòng ~2 ngày. Đủ nghiêm trọng để page ngay.",
  },
  {
    title: "Cửa sổ ngắn xác nhận vẫn đang cháy",
    description: "Chỉ dùng cửa sổ dài thì alert 'dính' rất lâu sau khi sự cố đã hết (vì trung bình 1 giờ vẫn còn cao). Thêm điều kiện cửa sổ 5 phút cũng vượt ngưỡng — sự cố hết thì cửa sổ ngắn tụt xuống trước, alert resolved nhanh.",
  },
  {
    title: "Multi-window, multi-burn-rate",
    description: "Kết hợp 2 cặp cửa sổ: (1h & 5m, ngưỡng 14.4) → page ngay lập tức. (6h & 30m, ngưỡng 6) → page chậm hơn cho sự cố kéo dài nhẹ hơn. Đây là công thức trong Google SRE Workbook.",
  },
];

export function BurnRateAlertWindowDiagram() {
  return (
    <StepDiagram title="Vì sao alert theo SLO dùng multi-window burn-rate" viewBox="0 0 720 300" steps={steps}>
      {(step) => (
        <>
          {step === 0 && (
            <>
              <DiagramNode x={40} y={40} width={280} height={90} label="error_rate > 5%" sublabel="ngưỡng cố định" emoji="📏" tone="amber" state="active" />
              <DiagramNode x={400} y={40} width={280} height={90} label="Alert firing lúc 3h sáng" sublabel="traffic thấp, 3 request lỗi / 40 request" emoji="😴" tone="rose" state="active" />
              <DiagramArrow from={[320, 85]} to={[396, 85]} tone="rose" animated />
            </>
          )}
          {step >= 1 && step < 4 && (
            <>
              <DiagramGroupBox x={20} y={20} width={680} height={130} label="Error budget 30 ngày = 216 phút" tone="cyan">
                <DiagramNode x={40} y={60} width={180} height={64} label="Burn rate = 1" sublabel="hết đúng ngày 30" tone="green" state={step === 1 ? "active" : "normal"} />
                <DiagramNode x={260} y={60} width={200} height={64} label="Burn rate = 6" sublabel="hết sau 5 ngày" tone="amber" state={step === 1 || step === 4 ? "active" : "normal"} />
                <DiagramNode x={490} y={60} width={190} height={64} label="Burn rate = 14.4" sublabel="hết sau ~2 ngày" tone="rose" state={step >= 1 ? "active" : "normal"} />
              </DiagramGroupBox>
              <DiagramNode x={60} y={180} width={280} height={90} label="Cửa sổ dài: 1h ≥ 14.4" sublabel="xác nhận: đủ nghiêm trọng" tone="rose" state={step === 2 || step === 4 ? "active" : "dimmed"} />
              <DiagramNode x={380} y={180} width={280} height={90} label="Cửa sổ ngắn: 5m ≥ 14.4" sublabel="xác nhận: vẫn đang cháy NGAY" tone="amber" state={step === 3 || step === 4 ? "active" : "dimmed"} />
              {step >= 4 && <DiagramLabel x={360} y={290} text="Cả hai đúng cùng lúc → Page. Chỉ cửa sổ dài đúng (sự cố đã hết) → không page." tone="violet" bold size={12} />}
            </>
          )}
        </>
      )}
    </StepDiagram>
  );
}
