"use client";

import { DiagramArrow, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";
import type { DiagramTone } from "@/components/diagrams/diagram-tones";

/**
 * Two-party sequence diagram (client ↔ server) used by the TCP and TLS diagrams.
 * Messages belonging to steps up to the current one are drawn top-to-bottom;
 * the current step's messages are coloured and animated, older ones turn grey.
 */

export interface SequenceParty {
  label: string;
  sublabel: string;
  emoji: string;
  tone: DiagramTone;
}

export interface SequenceMessage {
  step: number;
  direction: "right" | "left";
  label: string;
  tone?: DiagramTone;
}

interface SequenceMessageLanesProps {
  left: SequenceParty;
  right: SequenceParty;
  messages: SequenceMessage[];
  step: number;
  /** Which party the current step focuses on (thicker border). */
  activeSide?: "left" | "right" | "both";
  /** Height of the parent viewBox, used to size the lifelines. */
  height: number;
  firstMessageY?: number;
  messageGap?: number;
}

const LEFT_X = 20;
const RIGHT_X = 500;
const NODE_WIDTH = 200;
const LEFT_LINE = LEFT_X + NODE_WIDTH / 2;
const RIGHT_LINE = RIGHT_X + NODE_WIDTH / 2;

export function SequenceMessageLanes({ left, right, messages, step, activeSide, height, firstMessageY = 118, messageGap = 34 }: SequenceMessageLanesProps) {
  const visible = messages.filter((message) => message.step <= step);
  const sideState = (side: "left" | "right") => (activeSide === side || activeSide === "both" ? "active" : "normal");

  return (
    <>
      {[LEFT_LINE, RIGHT_LINE].map((x) => (
        <line key={x} x1={x} y1={84} x2={x} y2={height - 8} strokeWidth={1.5} strokeDasharray="5 5" className="stroke-stone-300 dark:stroke-stone-700" />
      ))}
      <DiagramNode x={LEFT_X} y={6} width={NODE_WIDTH} height={78} label={left.label} sublabel={left.sublabel} emoji={left.emoji} tone={left.tone} state={sideState("left")} />
      <DiagramNode x={RIGHT_X} y={6} width={NODE_WIDTH} height={78} label={right.label} sublabel={right.sublabel} emoji={right.emoji} tone={right.tone} state={sideState("right")} />
      {visible.map((message, index) => {
        const y = firstMessageY + index * messageGap;
        const isCurrent = message.step === step;
        const from: [number, number] = message.direction === "right" ? [LEFT_LINE + 4, y] : [RIGHT_LINE - 4, y];
        const to: [number, number] = message.direction === "right" ? [RIGHT_LINE - 4, y] : [LEFT_LINE + 4, y];
        return (
          <g key={`${message.step}-${message.label}`}>
            <DiagramArrow from={from} to={to} tone={isCurrent ? (message.tone ?? "blue") : "slate"} animated={isCurrent} />
            <DiagramLabel x={(LEFT_LINE + RIGHT_LINE) / 2} y={y - 7} text={message.label} tone={isCurrent ? (message.tone ?? "blue") : "slate"} bold={isCurrent} />
          </g>
        );
      })}
    </>
  );
}
