import type { ReactNode } from "react";

/**
 * Renders plain text where `backtick` segments become <code>. Content metadata
 * (lab steps, quiz questions, step descriptions) is plain strings, not MDX.
 */
export function InlineCodeText({ text }: { text: string }): ReactNode {
  return text.split(/(`[^`]+`)/g).map((part, index) =>
    part.length > 2 && part.startsWith("`") && part.endsWith("`") ? (
      <code key={index} className="rounded bg-stone-100 px-1 font-mono text-[0.9em] text-indigo-700 dark:bg-stone-800 dark:text-indigo-300">
        {part.slice(1, -1)}
      </code>
    ) : (
      part
    ),
  );
}
