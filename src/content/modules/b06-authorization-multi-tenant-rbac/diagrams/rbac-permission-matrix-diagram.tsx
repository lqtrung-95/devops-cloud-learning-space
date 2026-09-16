"use client";

import { useState } from "react";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import { DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";

type RoleKey = "owner" | "admin" | "member";

const ROLES: { key: RoleKey; label: string; emoji: string }[] = [
  { key: "owner", label: "Owner", emoji: "👑" },
  { key: "admin", label: "Admin", emoji: "🛠️" },
  { key: "member", label: "Member", emoji: "🙋" },
];

const ACTIONS = [
  { key: "createTask", label: "Tạo task", emoji: "✅" },
  { key: "deleteProject", label: "Xoá project", emoji: "🗑️" },
  { key: "inviteMember", label: "Mời thành viên", emoji: "✉️" },
  { key: "removeOrg", label: "Xoá tổ chức", emoji: "💣" },
] as const;

// Ma trận quyền cố định — đúng nội dung lab: chỉ chặn `member` ở hành động xoá project.
const PERMISSIONS: Record<RoleKey, Record<(typeof ACTIONS)[number]["key"], boolean>> = {
  owner: { createTask: true, deleteProject: true, inviteMember: true, removeOrg: true },
  admin: { createTask: true, deleteProject: true, inviteMember: true, removeOrg: false },
  member: { createTask: true, deleteProject: false, inviteMember: false, removeOrg: false },
};

/** Click vào một role để xem role đó được phép làm gì — ma trận quyền owner/admin/member. */
export function RbacPermissionMatrixDiagram() {
  const [selected, setSelected] = useState<RoleKey>("owner");
  const permissions = PERMISSIONS[selected];

  return (
    <DiagramFrame
      title="Ma trận quyền: click một role để xem được phép làm gì"
      viewBox="0 0 720 300"
      caption={`Role hiện tại: ${ROLES.find((role) => role.key === selected)?.label} — bảng \`memberships\` lưu đúng role này theo từng (user_id, organization_id), không phải một quyền cố định toàn cục cho user.`}
    >
      <DiagramLabel x={110} y={22} text="Chọn role" bold size={13} />
      {ROLES.map((role, index) => (
        <DiagramNode
          key={role.key}
          x={16}
          y={40 + index * 84}
          width={190}
          height={68}
          label={`${role.emoji} ${role.label}`}
          sublabel={role.key === selected ? "đang chọn" : "click để xem quyền"}
          tone={role.key === selected ? "violet" : "slate"}
          state={role.key === selected ? "active" : "normal"}
          onClick={() => setSelected(role.key)}
        />
      ))}

      <DiagramLabel x={470} y={22} text={`Hành động của "${ROLES.find((role) => role.key === selected)?.label}"`} bold size={13} />
      {ACTIONS.map((action, index) => {
        const allowed = permissions[action.key];
        const col = index % 2;
        const row = Math.floor(index / 2);
        return (
          <DiagramNode
            key={action.key}
            x={240 + col * 250}
            y={40 + row * 130}
            width={230}
            height={110}
            label={`${action.emoji} ${action.label}`}
            sublabel={allowed ? "✓ được phép" : "✗ bị chặn"}
            tone={allowed ? "green" : "rose"}
            state={allowed ? "normal" : "dimmed"}
          />
        );
      })}
    </DiagramFrame>
  );
}
