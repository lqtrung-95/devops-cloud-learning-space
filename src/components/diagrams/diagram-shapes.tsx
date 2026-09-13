import clsx from "clsx";
import type { ReactNode } from "react";
import { diagramToneClasses, type DiagramTone } from "./diagram-tones";

/** SVG primitives shared by all lesson diagrams. Coordinates are in the parent viewBox units. */

interface DiagramNodeProps {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  sublabel?: string;
  emoji?: string;
  tone?: DiagramTone;
  /** Highlighted nodes get a thicker border; dimmed nodes fade out (useful for step-by-step diagrams). */
  state?: "normal" | "active" | "dimmed";
  rounded?: number;
  dashed?: boolean;
  onClick?: () => void;
}

export function DiagramNode({
  x,
  y,
  width,
  height,
  label,
  sublabel,
  emoji,
  tone = "slate",
  state = "normal",
  rounded = 12,
  dashed = false,
  onClick,
}: DiagramNodeProps) {
  const tones = diagramToneClasses[tone];
  const centerX = x + width / 2;
  const hasEmoji = Boolean(emoji);
  const labelY = y + height / 2 + (sublabel ? -2 : 5) + (hasEmoji ? 10 : 0);

  return (
    <g
      className={clsx("transition-opacity duration-500", state === "dimmed" && "opacity-30", onClick && "cursor-pointer")}
      onClick={onClick}
    >
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={rounded}
        className={clsx(tones.shape, "transition-all duration-300")}
        strokeWidth={state === "active" ? 3.5 : 1.75}
        strokeDasharray={dashed ? "6 4" : undefined}
      />
      {hasEmoji && (
        <text x={centerX} y={labelY - 22} textAnchor="middle" fontSize={22}>
          {emoji}
        </text>
      )}
      <text x={centerX} y={labelY} textAnchor="middle" fontSize={14} fontWeight={600} className={tones.text}>
        {label}
      </text>
      {sublabel && (
        <text x={centerX} y={labelY + 17} textAnchor="middle" fontSize={11.5} className={tones.text} opacity={0.8}>
          {sublabel}
        </text>
      )}
    </g>
  );
}

interface DiagramArrowProps {
  from: [number, number];
  to: [number, number];
  label?: string;
  tone?: DiagramTone;
  /** Moving dashes — shows "data is flowing". */
  animated?: boolean;
  dimmed?: boolean;
  /** Bend the line: positive/negative values curve to either side. */
  curve?: number;
  bidirectional?: boolean;
}

function arrowHeadPoints(tip: [number, number], angle: number, size = 9): string {
  const left: [number, number] = [tip[0] - size * Math.cos(angle - Math.PI / 7), tip[1] - size * Math.sin(angle - Math.PI / 7)];
  const right: [number, number] = [tip[0] - size * Math.cos(angle + Math.PI / 7), tip[1] - size * Math.sin(angle + Math.PI / 7)];
  return `${tip[0]},${tip[1]} ${left[0]},${left[1]} ${right[0]},${right[1]}`;
}

export function DiagramArrow({ from, to, label, tone = "slate", animated = false, dimmed = false, curve = 0, bidirectional = false }: DiagramArrowProps) {
  const tones = diagramToneClasses[tone];
  const midX = (from[0] + to[0]) / 2;
  const midY = (from[1] + to[1]) / 2;
  const length = Math.hypot(to[0] - from[0], to[1] - from[1]) || 1;
  // Control point perpendicular to the line for curved arrows.
  const controlX = midX - ((to[1] - from[1]) / length) * curve;
  const controlY = midY + ((to[0] - from[0]) / length) * curve;
  const path = curve ? `M ${from[0]} ${from[1]} Q ${controlX} ${controlY} ${to[0]} ${to[1]}` : `M ${from[0]} ${from[1]} L ${to[0]} ${to[1]}`;
  const endAngle = curve ? Math.atan2(to[1] - controlY, to[0] - controlX) : Math.atan2(to[1] - from[1], to[0] - from[0]);
  const startAngle = curve ? Math.atan2(from[1] - controlY, from[0] - controlX) : endAngle + Math.PI;
  const labelX = curve ? (midX + controlX) / 2 : midX;
  const labelY = curve ? (midY + controlY) / 2 : midY;

  return (
    <g className={clsx("transition-opacity duration-500", dimmed && "opacity-25")}>
      <path d={path} fill="none" strokeWidth={2} className={clsx(tones.stroke, animated && "diagram-dash-animated")} />
      <polygon points={arrowHeadPoints(to, endAngle)} className={tones.fill} />
      {bidirectional && <polygon points={arrowHeadPoints(from, startAngle)} className={tones.fill} />}
      {label && <DiagramLabel x={labelX} y={labelY - 8} text={label} />}
    </g>
  );
}

interface DiagramLabelProps {
  x: number;
  y: number;
  text: string;
  anchor?: "start" | "middle" | "end";
  size?: number;
  tone?: DiagramTone;
  bold?: boolean;
}

/** Text with a background halo so it stays readable on top of lines. */
export function DiagramLabel({ x, y, text, anchor = "middle", size = 12, tone = "slate", bold = false }: DiagramLabelProps) {
  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      fontSize={size}
      fontWeight={bold ? 600 : 500}
      className={clsx(diagramToneClasses[tone].text, "stroke-stone-50 dark:stroke-stone-950")}
      strokeWidth={4}
      paintOrder="stroke"
    >
      {text}
    </text>
  );
}

interface MovingPacketProps {
  /** SVG path the packet travels along, e.g. "M 50 100 L 300 100". */
  path: string;
  durationSeconds?: number;
  tone?: DiagramTone;
  label?: string;
  /** Loop forever (default) or travel once. Change `key` on the element to replay a one-shot packet. */
  repeat?: boolean;
  delaySeconds?: number;
}

/** A small dot (optionally labelled) that moves along a path — e.g. a network packet or a request. */
export function MovingPacket({ path, durationSeconds = 2, tone = "amber", label, repeat = true, delaySeconds = 0 }: MovingPacketProps) {
  const tones = diagramToneClasses[tone];
  const motion = (
    <animateMotion
      dur={`${durationSeconds}s`}
      begin={`${delaySeconds}s`}
      repeatCount={repeat ? "indefinite" : "1"}
      fill="freeze"
      path={path}
    />
  );
  return (
    <g className="motion-reduce:hidden">
      <circle r={7} className={clsx(tones.fill, "stroke-white dark:stroke-stone-950")} strokeWidth={2}>
        {motion}
      </circle>
      {label && (
        <text fontSize={10.5} fontWeight={600} textAnchor="middle" dy={-12} className={tones.text}>
          {label}
          {motion}
        </text>
      )}
    </g>
  );
}

interface DiagramGroupBoxProps {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  tone?: DiagramTone;
  children?: ReactNode;
}

/** Dashed container box, e.g. "VPC", "Server", "Kubernetes cluster". */
export function DiagramGroupBox({ x, y, width, height, label, tone = "slate", children }: DiagramGroupBoxProps) {
  const tones = diagramToneClasses[tone];
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} rx={16} fill="none" strokeWidth={1.5} strokeDasharray="7 5" className={tones.stroke} />
      <text x={x + 14} y={y + 20} fontSize={12} fontWeight={700} className={tones.text}>
        {label}
      </text>
      {children}
    </g>
  );
}
