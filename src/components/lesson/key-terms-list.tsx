interface KeyTerm {
  term: string;
  /** Plain-language meaning, one sentence. */
  meaning: string;
}

/** Glossary recap at the end of a lesson: English term → simple Vietnamese meaning. */
export function KeyTermsList({ terms, title = "Từ khoá cần nhớ" }: { terms: KeyTerm[]; title?: string }) {
  return (
    <section className="not-prose my-8 rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-950">
      <h3 className="mb-4 text-base font-bold text-stone-900 dark:text-stone-100">📒 {title}</h3>
      <dl className="grid gap-3 sm:grid-cols-2">
        {terms.map((item) => (
          <div key={item.term} className="rounded-xl bg-stone-50 px-3 py-2.5 dark:bg-stone-900">
            <dt className="font-mono text-sm font-semibold text-indigo-700 dark:text-indigo-300">{item.term}</dt>
            <dd className="mt-0.5 text-sm leading-relaxed text-stone-600 dark:text-stone-400">{item.meaning}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
