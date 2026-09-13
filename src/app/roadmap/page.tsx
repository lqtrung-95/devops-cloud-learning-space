import type { Metadata } from "next";
import { ModuleProgressCard } from "@/components/progress/module-progress-card";
import { getPhasesWithModules } from "@/content/curriculum-lookup";
import { getCurrentSession } from "@/lib/auth/auth-server";
import { getUserProgressSnapshot } from "@/lib/progress/user-progress-snapshot";

export const metadata: Metadata = { title: "Lộ trình học" };

export default async function RoadmapPage() {
  const session = await getCurrentSession();
  const snapshot = session ? await getUserProgressSnapshot(session.user.id) : null;
  const phases = getPhasesWithModules();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-extrabold tracking-tight">🗺️ Lộ trình DevOps & Cloud</h1>
      <p className="mt-2 max-w-2xl text-stone-600 dark:text-stone-400">
        28 tuần, ~10 giờ mỗi tuần. Đi lần lượt từng chặng — mỗi module có bài học giải thích dễ hiểu, lab thực hành và quiz.
      </p>

      <ol className="mt-10 space-y-12">
        {phases.map((phase) => (
          <li key={phase.id} className="relative border-l-2 border-dashed border-stone-300 pl-6 dark:border-stone-700">
            <span className="absolute -left-[17px] top-0 flex size-8 items-center justify-center rounded-full bg-white text-lg ring-2 ring-stone-300 dark:bg-stone-900 dark:ring-stone-700">
              {phase.emoji}
            </span>
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Phase {phase.order} · {phase.weeks}
            </p>
            <h2 className="text-xl font-bold">{phase.title}</h2>
            <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">{phase.description}</p>
            {phase.modules.length > 0 ? (
              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {phase.modules.map((learningModule) => (
                  <ModuleProgressCard key={learningModule.id} module={learningModule} progress={snapshot?.moduleProgressById.get(learningModule.id)} />
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm italic text-stone-500">Nội dung đang được biên soạn…</p>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
