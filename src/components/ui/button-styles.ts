import clsx from "clsx";

type ButtonVariant = "primary" | "secondary" | "ghost";

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-indigo-600 text-white shadow-sm hover:bg-indigo-500 disabled:bg-indigo-400",
  secondary:
    "border border-stone-300 bg-white text-stone-800 hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:hover:bg-stone-800",
  ghost: "text-stone-700 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800",
};

/** Shared button classes for <button> and <Link> so both look identical. */
export function buttonClassName(variant: ButtonVariant = "primary", extra?: string): string {
  return clsx(
    "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500",
    variantClasses[variant],
    extra,
  );
}
