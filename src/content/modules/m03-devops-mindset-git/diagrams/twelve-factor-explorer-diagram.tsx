"use client";

import { useState } from "react";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import { DiagramNode } from "@/components/diagrams/diagram-shapes";
import type { DiagramTone } from "@/components/diagrams/diagram-tones";
import { InlineCodeText } from "@/components/ui/inline-code-text";

interface Factor {
  numeral: string;
  name: string;
  tone: DiagramTone;
  rule: string;
  bad: string;
  good: string;
}

const factors: Factor[] = [
  { numeral: "I", name: "Codebase", tone: "violet", rule: "Một app = một repo được theo dõi bằng Git, deploy ra nhiều môi trường.", bad: "Copy thư mục code riêng cho staging và prod rồi sửa tay mỗi bên.", good: "Một repo `sample-app`; dev/staging/prod chỉ khác version được deploy." },
  { numeral: "II", name: "Dependencies", tone: "violet", rule: "Khai báo và cô lập mọi dependency, không dựa vào thứ 'có sẵn trên server'.", bad: "Server phải cài sẵn `imagemagick` mà không ai ghi lại.", good: "`package-lock.json`/`requirements.txt` + Dockerfile cài đủ mọi thứ." },
  { numeral: "III", name: "Config", tone: "rose", rule: "Cấu hình thay đổi theo môi trường nằm trong biến môi trường, không nằm trong code.", bad: "`const DB = \"postgres://prod:pass@10.0.2.9\"` commit vào Git.", good: "`DATABASE_URL` đọc từ env; secret lấy từ Secrets Manager khi chạy." },
  { numeral: "IV", name: "Backing services", tone: "blue", rule: "DB, cache, queue là tài nguyên gắn vào qua URL, đổi được mà không sửa code.", bad: "Code hard-code Redis local, lên cloud phải sửa code.", good: "`REDIS_URL` trỏ Redis container ở local, ElastiCache ở prod." },
  { numeral: "V", name: "Build, release, run", tone: "amber", rule: "Tách rõ: build ra artifact → ghép với config thành release → chạy.", bad: "SSH vào prod `git pull` rồi sửa file trực tiếp.", good: "CI build image `sample-app:1.4.2`, deploy image đó kèm config của từng môi trường." },
  { numeral: "VI", name: "Processes", tone: "cyan", rule: "Process stateless, không lưu dữ liệu cần giữ trên ổ đĩa/bộ nhớ local.", bad: "Session người dùng lưu trong RAM của 1 instance — scale ra 2 là mất đăng nhập.", good: "Session trong Redis, file upload lên S3." },
  { numeral: "VII", name: "Port binding", tone: "cyan", rule: "App tự mở port HTTP, không cần web server được 'cài vào' từ bên ngoài.", bad: "App chỉ chạy được khi deploy vào một Tomcat cấu hình tay.", good: "`PORT=3000 node server.js` tự phục vụ HTTP, proxy đứng trước." },
  { numeral: "VIII", name: "Concurrency", tone: "green", rule: "Scale bằng cách chạy thêm process (scale out), chia theo loại: web, worker.", bad: "Chỉ có một cách: mua máy to hơn.", good: "3 process web + 2 process worker; K8s tăng replicas khi tải cao." },
  { numeral: "IX", name: "Disposability", tone: "green", rule: "Khởi động nhanh, tắt êm khi nhận SIGTERM.", bad: "Nhận SIGTERM là chết ngay, request đang xử lý bị cắt ngang.", good: "Bắt `SIGTERM`: ngừng nhận request mới, xử lý nốt, đóng DB rồi thoát." },
  { numeral: "X", name: "Dev/prod parity", tone: "amber", rule: "Giữ dev, staging, prod giống nhau nhất có thể (công cụ, phiên bản, thời gian).", bad: "Dev dùng SQLite, prod dùng PostgreSQL — lỗi chỉ lộ ra ở prod.", good: "`docker compose` chạy đúng Postgres + Redis cùng version với prod." },
  { numeral: "XI", name: "Logs", tone: "blue", rule: "Coi log là luồng sự kiện ghi ra stdout; hạ tầng lo việc gom và lưu trữ.", bad: "App tự ghi `/var/log/app.log` và tự xoay vòng file.", good: "`console.log(JSON.stringify(...))` ra stdout → CloudWatch/Loki gom lại." },
  { numeral: "XII", name: "Admin processes", tone: "rose", rule: "Tác vụ quản trị (migrate DB, script sửa dữ liệu) chạy như process một lần, cùng code và config.", bad: "Chạy SQL tay trên prod từ laptop, không ai biết đã chạy gì.", good: "`npm run migrate` chạy như một job cùng image & env với app." },
];

const COLUMNS = 4;
const CELL_WIDTH = 168;
const CELL_HEIGHT = 58;

export function TwelveFactorExplorerDiagram() {
  const [selectedIndex, setSelectedIndex] = useState(2);
  const selected = factors[selectedIndex];

  return (
    <DiagramFrame
      title="The Twelve-Factor App — bấm từng nguyên tắc để xem đúng/sai"
      viewBox="0 0 720 222"
      controls={
        <div className="space-y-2 text-sm leading-relaxed">
          <p className="font-bold text-indigo-700 dark:text-indigo-300">
            {selected.numeral}. {selected.name}
          </p>
          <p className="text-stone-700 dark:text-stone-300">{selected.rule}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-rose-900 dark:bg-rose-950 dark:text-rose-100">
              ❌ <InlineCodeText text={selected.bad} />
            </p>
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
              ✅ <InlineCodeText text={selected.good} />
            </p>
          </div>
        </div>
      }
      caption="12 nguyên tắc giúp app chạy tốt trên cloud: dễ scale, dễ deploy lại, cấu hình theo môi trường. Container và Kubernetes sau này đều giả định app tuân theo phần lớn các nguyên tắc này."
    >
      {factors.map((factor, index) => {
        const column = index % COLUMNS;
        const row = Math.floor(index / COLUMNS);
        return (
          <DiagramNode
            key={factor.name}
            x={10 + column * (CELL_WIDTH + 8)}
            y={10 + row * (CELL_HEIGHT + 12)}
            width={CELL_WIDTH}
            height={CELL_HEIGHT}
            label={factor.name}
            sublabel={`Factor ${factor.numeral}`}
            tone={factor.tone}
            state={index === selectedIndex ? "active" : "normal"}
            onClick={() => setSelectedIndex(index)}
          />
        );
      })}
    </DiagramFrame>
  );
}
