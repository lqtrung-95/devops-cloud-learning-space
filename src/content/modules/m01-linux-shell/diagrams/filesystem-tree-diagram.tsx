"use client";

import { useState } from "react";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import { DiagramArrow, DiagramNode } from "@/components/diagrams/diagram-shapes";
import type { DiagramTone } from "@/components/diagrams/diagram-tones";

interface DirectoryInfo {
  path: string;
  emoji: string;
  tone: DiagramTone;
  analogy: string;
  examples: string;
  x: number;
  y: number;
  parent?: string;
}

const directories: DirectoryInfo[] = [
  { path: "/", emoji: "🏢", tone: "violet", x: 330, y: 12, analogy: "Cổng chính của toà nhà — mọi phòng đều bắt đầu từ đây.", examples: "Mọi đường dẫn tuyệt đối đều bắt đầu bằng /" },
  { path: "/bin", emoji: "🧰", tone: "blue", x: 8, y: 130, parent: "/", analogy: "Tủ đồ nghề chung: ai trong toà nhà cũng dùng được.", examples: "ls, cp, mv, cat, bash" },
  { path: "/etc", emoji: "⚙️", tone: "amber", x: 115, y: 130, parent: "/", analogy: "Phòng ban quản lý: nơi cất nội quy và cấu hình của cả toà nhà.", examples: "/etc/passwd, /etc/hosts, /etc/nginx/nginx.conf" },
  { path: "/home", emoji: "🏠", tone: "green", x: 222, y: 130, parent: "/", analogy: "Khu căn hộ: mỗi người dùng có một căn riêng.", examples: "/home/trung, /home/lan" },
  { path: "/var", emoji: "📒", tone: "cyan", x: 329, y: 130, parent: "/", analogy: "Kho chứa đồ thay đổi liên tục — như sổ bảo vệ ghi mỗi ngày.", examples: "/var/log, /var/lib/docker, /var/www" },
  { path: "/tmp", emoji: "🗑️", tone: "slate", x: 436, y: 130, parent: "/", analogy: "Bàn nháp: để tạm, khởi động lại máy là có thể bị dọn sạch.", examples: "File tạm của chương trình" },
  { path: "/usr", emoji: "📚", tone: "blue", x: 543, y: 130, parent: "/", analogy: "Thư viện phần mềm được cài thêm cho mọi người.", examples: "/usr/bin/python3, /usr/local/bin" },
  { path: "/root", emoji: "👑", tone: "rose", x: 650, y: 130, parent: "/", analogy: "Căn hộ của quản lý toà nhà (root) — người thường không vào được.", examples: "Thư mục home của user root" },
  { path: "/etc/ssh", emoji: "🔐", tone: "amber", x: 115, y: 240, parent: "/etc", analogy: "Ngăn tủ cất nội quy về cửa ra vào (SSH).", examples: "/etc/ssh/sshd_config" },
  { path: "/home/trung", emoji: "🛋️", tone: "green", x: 222, y: 240, parent: "/home", analogy: "Căn hộ của Trung — đồ cá nhân, code, file cấu hình riêng.", examples: "~/.bashrc, ~/.ssh/, ~/projects" },
  { path: "/var/log", emoji: "📜", tone: "cyan", x: 329, y: 240, parent: "/var", analogy: "Sổ nhật ký: ghi lại mọi chuyện đã xảy ra — nơi đầu tiên cần xem khi có lỗi.", examples: "/var/log/syslog, /var/log/nginx/error.log" },
];

const NODE_WIDTH = 100;
const NODE_HEIGHT = 64;

export function FilesystemTreeDiagram() {
  const [selectedPath, setSelectedPath] = useState("/etc");
  const selected = directories.find((directory) => directory.path === selectedPath)!;
  const byPath = new Map(directories.map((directory) => [directory.path, directory]));

  return (
    <DiagramFrame
      title="Cây thư mục Linux — bấm vào từng thư mục"
      viewBox="0 0 760 316"
      controls={
        <div className="flex items-start gap-3">
          <span className="text-3xl" aria-hidden>
            {selected.emoji}
          </span>
          <div className="text-sm leading-relaxed">
            <p className="font-mono font-bold text-indigo-700 dark:text-indigo-300">{selected.path}</p>
            <p className="text-stone-700 dark:text-stone-300">{selected.analogy}</p>
            <p className="mt-1 text-stone-500">
              Ví dụ: <code className="font-mono text-[13px]">{selected.examples}</code>
            </p>
          </div>
        </div>
      }
      caption="Mọi thứ trong Linux đều nằm trong một cây duy nhất bắt đầu từ / — không có ổ C:, D: như Windows."
    >
      {directories
        .filter((directory) => directory.parent)
        .map((directory) => {
          const parent = byPath.get(directory.parent!)!;
          return (
            <DiagramArrow
              key={`arrow-${directory.path}`}
              from={[parent.x + NODE_WIDTH / 2 - 4, parent.y + NODE_HEIGHT]}
              to={[directory.x + NODE_WIDTH / 2 - 4, directory.y - 2]}
              tone={directory.path === selectedPath ? directory.tone : "slate"}
              animated={directory.path === selectedPath}
            />
          );
        })}
      {directories.map((directory) => (
        <DiagramNode
          key={directory.path}
          x={directory.x}
          y={directory.y}
          width={NODE_WIDTH - 8}
          height={NODE_HEIGHT}
          label={directory.path}
          emoji={directory.emoji}
          tone={directory.tone}
          state={directory.path === selectedPath ? "active" : "normal"}
          onClick={() => setSelectedPath(directory.path)}
        />
      ))}
    </DiagramFrame>
  );
}
