/** Generic pulsing placeholder shown by route `loading.tsx` files while a page's data loads. */
export function LoadingSkeleton({ cardCount = 6 }: { cardCount?: number }) {
  return (
    <div className="mx-auto max-w-6xl animate-pulse px-4 py-10">
      <div className="h-8 w-64 rounded bg-stone-200 dark:bg-stone-800" />
      <div className="mt-3 h-4 w-full max-w-md rounded bg-stone-200 dark:bg-stone-800" />
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: cardCount }).map((_, index) => (
          <div key={index} className="h-32 rounded-xl bg-stone-200 dark:bg-stone-800" />
        ))}
      </div>
    </div>
  );
}
