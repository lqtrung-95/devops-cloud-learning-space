"use client";

import { useState } from "react";
import { InlineCodeText } from "@/components/ui/inline-code-text";
import type { LabDefinition } from "@/content/content-types";
import { ProgressItemCheckbox } from "./progress-item-checkbox";

interface LabChecklistCardProps {
  lab: LabDefinition;
  index: number;
  itemKey: string;
  completed: boolean;
  isSignedIn: boolean;
}

export function LabChecklistCard({ lab, index, itemKey, completed, isSignedIn }: LabChecklistCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="rounded-2xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
      <div className="flex items-start gap-3 p-4">
        <ProgressItemCheckbox itemKey={itemKey} completed={completed} isSignedIn={isSignedIn} label={`Hoàn thành lab ${lab.title}`} />
        <div className="min-w-0 flex-1">
          <button type="button" onClick={() => setIsExpanded(!isExpanded)} aria-expanded={isExpanded} className="w-full text-left">
            <p className="font-semibold">
              Lab {index + 1}: {lab.title}
            </p>
            <p className="mt-0.5 text-sm text-stone-600 dark:text-stone-400">{lab.description}</p>
            <p className="mt-1 text-xs font-medium text-indigo-600 dark:text-indigo-400">
              {isExpanded ? "▲ Ẩn các bước" : `▼ Xem ${lab.steps.length} bước`}
            </p>
          </button>
          {isExpanded && (
            <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-stone-700 marker:text-stone-400 dark:text-stone-300">
              {lab.steps.map((step) => (
                <li key={step}>
                  <InlineCodeText text={step} />
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}
