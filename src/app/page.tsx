import Link from "next/link";
import { CourseOverviewCard } from "@/components/landing/course-overview-card";
import { buttonClassName } from "@/components/ui/button-styles";
import { getAllCourses, getPhasesWithModules } from "@/content/curriculum-lookup";
import { getCurrentSession } from "@/lib/auth/auth-server";
import { getUserProgressSnapshot } from "@/lib/progress/user-progress-snapshot";

const learningSteps = [
  { emoji: "🧸", title: "Hiểu bằng ví dụ đời thường", text: "Mỗi khái niệm bắt đầu bằng phần giải thích “như cho bé 5 tuổi”." },
  { emoji: "🖼️", title: "Nhìn bằng hình tương tác", text: "Sơ đồ động — bấm từng bước để thấy request, dữ liệu, container chạy thế nào." },
  { emoji: "🔧", title: "Đi sâu kỹ thuật", text: "Sau khi hiểu bản chất, học chính xác thuật ngữ, trade-off và công cụ thật." },
  { emoji: "🧪", title: "Tự tay làm lab", text: "Checklist lab và quiz — tiến độ được lưu vào tài khoản của bạn." },
];

export default async function LandingPage() {
  const session = await getCurrentSession();
  const snapshot = session ? await getUserProgressSnapshot(session.user.id) : null;

  return (
    <div>
      <section className="mx-auto max-w-3xl px-4 py-14 text-center lg:py-20">
        <p className="inline-flex rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
          🧸 Dễ hiểu, có sơ đồ tương tác và lab thực hành
        </p>
        <h1 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
          Học công nghệ khó <span className="text-indigo-600 dark:text-indigo-400">dễ như nghe kể chuyện</span>
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-stone-600 dark:text-stone-400">
          Mỗi khái niệm được giải thích bằng ví dụ đời thường và hình minh hoạ tương tác, rồi mới đi vào kỹ thuật và thực hành.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href={session ? "/dashboard" : "/login"} className={buttonClassName("primary", "px-5 py-3 text-base")}>
            {session ? "Tiếp tục học →" : "Bắt đầu miễn phí →"}
          </Link>
          <Link href="#courses" className={buttonClassName("secondary", "px-5 py-3 text-base")}>
            Xem các khoá học
          </Link>
        </div>
      </section>

      <section id="courses" className="mx-auto max-w-6xl scroll-mt-20 px-4 pb-14">
        <h2 className="text-2xl font-bold">Các khoá học</h2>
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {getAllCourses().map((course) => (
            <CourseOverviewCard key={course.id} course={course} phases={getPhasesWithModules(course.id)} progress={snapshot?.courseProgressById.get(course.id)} />
          ))}
        </div>
      </section>

      <section className="border-y border-stone-200 bg-white py-14 dark:border-stone-800 dark:bg-stone-900/50">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-2xl font-bold">Mỗi bài học đi theo 4 bước</h2>
          <div className="relative mt-12">
            <span aria-hidden className="absolute left-[12.5%] right-[12.5%] top-7 hidden h-px bg-stone-200 dark:bg-stone-800 lg:block" />
            <ol className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {learningSteps.map((step) => (
                <li key={step.title} className="relative flex flex-col items-center text-center">
                  <span className="relative z-10 flex size-14 items-center justify-center rounded-full border border-stone-200 bg-stone-50 text-2xl dark:border-stone-800 dark:bg-stone-900">
                    <span aria-hidden>{step.emoji}</span>
                  </span>
                  <p className="mt-4 font-bold">{step.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-stone-600 dark:text-stone-400">{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>
    </div>
  );
}
