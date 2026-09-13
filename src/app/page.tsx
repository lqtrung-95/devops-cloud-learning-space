import Link from "next/link";
import { DevopsLoopHeroDiagram } from "@/components/landing/devops-loop-hero-diagram";
import { buttonClassName } from "@/components/ui/button-styles";
import { getPhasesWithModules } from "@/content/curriculum-lookup";
import { getCurrentSession } from "@/lib/auth/auth-server";

const learningSteps = [
  { emoji: "🧸", title: "Hiểu bằng ví dụ đời thường", text: "Mỗi khái niệm bắt đầu bằng phần giải thích “như cho bé 5 tuổi”." },
  { emoji: "🖼️", title: "Nhìn bằng hình tương tác", text: "Sơ đồ động — bấm từng bước để thấy gói tin, container, pipeline chạy thế nào." },
  { emoji: "🔧", title: "Đi sâu kỹ thuật", text: "Sau khi hiểu bản chất, học chính xác thuật ngữ và lệnh thật." },
  { emoji: "🧪", title: "Tự tay làm lab", text: "Checklist lab và quiz — tiến độ được lưu vào tài khoản của bạn." },
];

export default async function LandingPage() {
  const session = await getCurrentSession();
  const phases = getPhasesWithModules();
  const moduleCount = phases.reduce((sum, phase) => sum + phase.modules.length, 0);

  return (
    <div>
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 lg:grid-cols-2 lg:py-20">
        <div>
          <p className="inline-flex rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
            ☁️ AWS-first · 28 tuần · {moduleCount} module
          </p>
          <h1 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            Học DevOps & Cloud <span className="text-indigo-600 dark:text-indigo-400">dễ như nghe kể chuyện</span>
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-stone-600 dark:text-stone-400">
            Từ Linux, Docker, CI/CD, AWS, Terraform tới Kubernetes và SRE — mỗi khái niệm được giải thích bằng ví dụ đời thường và hình minh hoạ
            tương tác, rồi mới đi vào kỹ thuật.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={session ? "/dashboard" : "/login"} className={buttonClassName("primary", "px-5 py-3 text-base")}>
              {session ? "Tiếp tục học →" : "Bắt đầu miễn phí →"}
            </Link>
            <Link href="/roadmap" className={buttonClassName("secondary", "px-5 py-3 text-base")}>
              Xem lộ trình
            </Link>
          </div>
        </div>
        <div className="rounded-3xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900">
          <DevopsLoopHeroDiagram />
          <p className="px-2 pb-2 text-center text-sm text-stone-500">
            DevOps = dây chuyền tự động đưa code của bạn tới người dùng, nhanh và an toàn.
          </p>
        </div>
      </section>

      <section className="border-y border-stone-200 bg-white py-14 dark:border-stone-800 dark:bg-stone-900/50">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-2xl font-bold">Mỗi bài học đi theo 4 bước</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {learningSteps.map((step, index) => (
              <div key={step.title} className="rounded-2xl bg-stone-50 p-5 dark:bg-stone-900">
                <p className="text-3xl" aria-hidden>
                  {step.emoji}
                </p>
                <p className="mt-3 text-xs font-bold text-indigo-600 dark:text-indigo-400">BƯỚC {index + 1}</p>
                <p className="font-bold">{step.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-stone-600 dark:text-stone-400">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-2xl font-bold">6 chặng đường</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {phases.map((phase) => (
            <Link
              key={phase.id}
              href="/roadmap"
              className="rounded-2xl border border-stone-200 bg-white p-5 transition-colors hover:border-indigo-300 dark:border-stone-800 dark:bg-stone-900"
            >
              <p className="text-3xl" aria-hidden>
                {phase.emoji}
              </p>
              <p className="mt-2 text-xs font-bold uppercase text-stone-500">
                Phase {phase.order} · {phase.weeks}
              </p>
              <p className="font-bold">{phase.title}</p>
              <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">{phase.description}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
