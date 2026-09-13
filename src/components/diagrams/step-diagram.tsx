"use client";

import clsx from "clsx";
import { useEffect, useState, type ReactNode } from "react";
import { InlineCodeText } from "@/components/ui/inline-code-text";
import { DiagramFrame } from "./diagram-frame";

export interface DiagramStep {
  /** Short title shown on the step pill. */
  title: string;
  /** Explanation for this step (ELI5 friendly). */
  description: ReactNode;
}

interface StepDiagramProps {
  title: string;
  viewBox: string;
  steps: DiagramStep[];
  /** Render the SVG content for the current step (0-based). */
  children: (step: number) => ReactNode;
  autoPlayMs?: number;
}

/**
 * Step-by-step interactive diagram: learners click through (or autoplay) a process
 * such as "what happens when you type a URL". Each step re-renders the SVG.
 */
export function StepDiagram({ title, viewBox, steps, children, autoPlayMs = 2500 }: StepDiagramProps) {
  const [step, setStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const lastStep = steps.length - 1;

  useEffect(() => {
    if (!isPlaying) return;
    const timer = setTimeout(() => {
      if (step >= lastStep) {
        setIsPlaying(false);
      } else {
        setStep(step + 1);
      }
    }, autoPlayMs);
    return () => clearTimeout(timer);
  }, [isPlaying, step, lastStep, autoPlayMs]);

  const togglePlay = () => {
    if (!isPlaying && step >= lastStep) setStep(0);
    setIsPlaying(!isPlaying);
  };

  const controls = (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} className={controlButton}>
          ← Trước
        </button>
        <button type="button" onClick={togglePlay} className={clsx(controlButton, "min-w-24")}>
          {isPlaying ? "⏸ Dừng" : "▶ Tự chạy"}
        </button>
        <button type="button" onClick={() => setStep(Math.min(lastStep, step + 1))} disabled={step === lastStep} className={controlButton}>
          Tiếp →
        </button>
        <span className="ml-auto text-xs font-medium text-stone-500">
          Bước {step + 1}/{steps.length}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {steps.map((item, index) => (
          <button
            key={item.title}
            type="button"
            onClick={() => {
              setIsPlaying(false);
              setStep(index);
            }}
            className={clsx(
              "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
              index === step
                ? "bg-indigo-600 text-white"
                : index < step
                  ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200"
                  : "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400",
            )}
          >
            {index + 1}. {item.title}
          </button>
        ))}
      </div>
      <p aria-live="polite" className="text-sm leading-relaxed text-stone-700 dark:text-stone-300">
        {typeof steps[step].description === "string" ? <InlineCodeText text={steps[step].description} /> : steps[step].description}
      </p>
    </div>
  );

  return (
    <DiagramFrame title={title} viewBox={viewBox} controls={controls}>
      {children(step)}
    </DiagramFrame>
  );
}

const controlButton =
  "rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800";
