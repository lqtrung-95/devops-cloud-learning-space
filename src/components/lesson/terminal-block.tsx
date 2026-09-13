interface TerminalCommand {
  command: string;
  /** Expected output (optional). */
  output?: string;
  /** Short explanation shown as a comment above the command. */
  comment?: string;
}

interface TerminalBlockProps {
  title?: string;
  commands: TerminalCommand[];
  /** Prompt symbol, e.g. "$" or "#" for root. */
  prompt?: string;
}

/** Terminal-looking block that separates commands you type from the output you should see. */
export function TerminalBlock({ title = "Terminal", commands, prompt = "$" }: TerminalBlockProps) {
  return (
    <div className="not-prose my-6 overflow-hidden rounded-xl border border-stone-800 bg-stone-950 shadow-lg">
      <div className="flex items-center gap-2 border-b border-stone-800 px-4 py-2">
        <span className="size-3 rounded-full bg-rose-500" aria-hidden />
        <span className="size-3 rounded-full bg-amber-400" aria-hidden />
        <span className="size-3 rounded-full bg-emerald-500" aria-hidden />
        <span className="ml-2 text-xs font-medium text-stone-400">{title}</span>
      </div>
      <div className="space-y-3 overflow-x-auto p-4 font-mono text-[13px] leading-relaxed">
        {commands.map((item, index) => (
          <div key={`${item.command}-${index}`}>
            {item.comment && <div className="text-stone-500"># {item.comment}</div>}
            <div className="whitespace-pre text-stone-100">
              <span className="select-none text-emerald-400">{prompt} </span>
              {item.command}
            </div>
            {item.output && <div className="whitespace-pre text-stone-400">{item.output}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
