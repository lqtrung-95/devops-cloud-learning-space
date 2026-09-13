import { DiagramArrow, DiagramNode, MovingPacket } from "@/components/diagrams/diagram-shapes";

/** Animated hero illustration: code travels through the pipeline to the cloud and feedback flows back. */
export function DevopsLoopHeroDiagram() {
  const stages = [
    { x: 10, label: "Code", emoji: "👩‍💻", tone: "violet" },
    { x: 150, label: "Build", emoji: "📦", tone: "blue" },
    { x: 290, label: "Test", emoji: "🧪", tone: "cyan" },
    { x: 430, label: "Deploy", emoji: "🚀", tone: "green" },
    { x: 570, label: "Cloud", emoji: "☁️", tone: "amber" },
  ] as const;

  return (
    <svg viewBox="0 0 690 230" role="img" aria-label="Vòng lặp DevOps: code, build, test, deploy lên cloud và nhận phản hồi" className="h-auto w-full font-sans">
      {stages.map((stage, index) => (
        <g key={stage.label}>
          <DiagramNode x={stage.x} y={40} width={110} height={84} label={stage.label} emoji={stage.emoji} tone={stage.tone} />
          {index < stages.length - 1 && <DiagramArrow from={[stage.x + 112, 82]} to={[stage.x + 146, 82]} tone="slate" animated />}
        </g>
      ))}
      <DiagramArrow from={[625, 128]} to={[65, 128]} curve={-70} tone="rose" animated label="📊 Monitor & phản hồi" />
      <MovingPacket path="M 65 82 L 625 82" durationSeconds={4} tone="violet" label="v1.2" />
    </svg>
  );
}
