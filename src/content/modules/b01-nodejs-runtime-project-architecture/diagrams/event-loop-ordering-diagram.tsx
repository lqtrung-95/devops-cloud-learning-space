"use client";

import { DiagramArrow, DiagramGroupBox, DiagramNode } from "@/components/diagrams/diagram-shapes";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";

/**
 * Step-by-step trace of:
 *
 *   console.log("1: start");
 *   setTimeout(() => console.log("2: setTimeout"), 0);
 *   Promise.resolve().then(() => console.log("3: promise"));
 *   process.nextTick(() => console.log("4: nextTick"));
 *   console.log("5: end");
 *
 * Verified order: call stack runs 1 and 5 first (synchronous). Once the stack
 * is empty, Node drains the process.nextTick queue fully (4), THEN the
 * microtask/Promise queue (3), and only after both are empty does the event
 * loop move to the Timers phase for the setTimeout callback (2).
 * Final order: 1, 5, 4, 3, 2.
 */

interface QueueState {
  callStack: string;
  nextTick: string;
  microtask: string;
  macrotask: string;
  active: "callStack" | "nextTick" | "microtask" | "macrotask" | "none";
  output: string[];
}

const states: QueueState[] = [
  { callStack: "main()", nextTick: "(trống)", microtask: "(trống)", macrotask: "(trống)", active: "callStack", output: ["1: start"] },
  { callStack: "main()", nextTick: "(trống)", microtask: "(trống)", macrotask: "cb setTimeout", active: "macrotask", output: ["1: start"] },
  { callStack: "main()", nextTick: "(trống)", microtask: "cb .then", active: "microtask", macrotask: "cb setTimeout", output: ["1: start"] },
  { callStack: "main()", nextTick: "cb nextTick", microtask: "cb .then", active: "nextTick", macrotask: "cb setTimeout", output: ["1: start"] },
  { callStack: "(rỗng)", nextTick: "cb nextTick", microtask: "cb .then", macrotask: "cb setTimeout", active: "none", output: ["1: start", "5: end"] },
  { callStack: "cb nextTick", nextTick: "(đã chạy)", microtask: "cb .then", macrotask: "cb setTimeout", active: "nextTick", output: ["1: start", "5: end", "4: nextTick"] },
  { callStack: "cb .then", nextTick: "(trống)", microtask: "(đã chạy)", macrotask: "cb setTimeout", active: "microtask", output: ["1: start", "5: end", "4: nextTick", "3: promise"] },
  { callStack: "cb setTimeout", nextTick: "(trống)", microtask: "(trống)", macrotask: "(đã chạy)", active: "macrotask", output: ["1: start", "5: end", "4: nextTick", "3: promise", "2: setTimeout"] },
];

const steps: DiagramStep[] = [
  { title: "1: start", description: "`console.log(\"1: start\")` chạy ngay — call stack chỉ có `main()`." },
  { title: "setTimeout", description: "`setTimeout(fn, 0)` đăng ký callback vào hàng đợi **macrotask** (phase Timers), rồi trả về ngay — không chờ 0ms." },
  { title: "Promise.then", description: "`Promise.resolve().then(fn)` đăng ký callback vào **microtask queue**." },
  { title: "process.nextTick", description: "`process.nextTick(fn)` đăng ký callback vào hàng đợi **nextTick** — hàng đợi riêng của Node, ưu tiên cao nhất." },
  { title: "5: end", description: "`console.log(\"5: end\")` chạy, `main()` kết thúc — call stack rỗng. Output tới giờ: `1: start`, `5: end`." },
  { title: "Xả nextTick trước", description: "Call stack rỗng nên Node xả **toàn bộ hàng đợi nextTick trước tiên** — in `4: nextTick`." },
  { title: "Xả microtask (Promise)", description: "nextTick queue đã rỗng, Node chuyển sang **microtask queue** — in `3: promise`." },
  { title: "Sang phase Timers", description: "nextTick và microtask đều rỗng, event loop mới cho phép **phase Timers** chạy — in `2: setTimeout`. Thứ tự cuối: 1, 5, 4, 3, 2." },
];

const boxTone = (isActive: boolean) => (isActive ? "blue" : "slate");

export function EventLoopOrderingDiagram() {
  return (
    <StepDiagram title="Call stack, nextTick, microtask & macrotask — ai chạy trước ai" viewBox="0 0 720 380" steps={steps}>
      {(step) => {
        const state = states[step];
        return (
          <>
            <DiagramNode
              x={16}
              y={16}
              width={150}
              height={78}
              label="Call stack"
              sublabel={state.callStack}
              emoji="📚"
              tone={boxTone(state.active === "callStack")}
              state={state.active === "callStack" ? "active" : "normal"}
            />
            <DiagramNode
              x={190}
              y={16}
              width={150}
              height={78}
              label="nextTick queue"
              sublabel={state.nextTick}
              emoji="🥇"
              tone={state.active === "nextTick" ? "violet" : "slate"}
              state={state.active === "nextTick" ? "active" : "normal"}
            />
            <DiagramNode
              x={364}
              y={16}
              width={160}
              height={78}
              label="Microtask queue"
              sublabel={state.microtask}
              emoji="🧵"
              tone={state.active === "microtask" ? "amber" : "slate"}
              state={state.active === "microtask" ? "active" : "normal"}
            />
            <DiagramNode
              x={548}
              y={16}
              width={160}
              height={78}
              label="Macrotask (Timers)"
              sublabel={state.macrotask}
              emoji="⏰"
              tone={state.active === "macrotask" ? "green" : "slate"}
              state={state.active === "macrotask" ? "active" : "normal"}
            />

            <DiagramArrow from={[91, 94]} to={[265, 94]} tone="violet" curve={30} dimmed={state.active !== "nextTick"} animated={state.active === "nextTick"} label="ưu tiên 1" />
            <DiagramArrow from={[91, 108]} to={[444, 108]} tone="amber" curve={-40} dimmed={state.active !== "microtask"} animated={state.active === "microtask"} label="ưu tiên 2" />
            <DiagramArrow from={[91, 122]} to={[628, 122]} tone="green" curve={54} dimmed={state.active !== "macrotask"} animated={state.active === "macrotask"} label="ưu tiên 3" />

            <DiagramGroupBox x={16} y={128} width={692} height={228} label={`Console output (${state.output.length} dòng)`} tone="cyan">
              {state.output.map((line, index) => (
                <text key={`${step}-${line}`} x={40} y={172 + index * 30} fontSize={16} className="fill-stone-800 font-mono dark:fill-stone-200">
                  {line}
                </text>
              ))}
            </DiagramGroupBox>
          </>
        );
      }}
    </StepDiagram>
  );
}
