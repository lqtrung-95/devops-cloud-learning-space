import type { ModuleDefinition } from "@/content/content-types";

export const sd19MockInterviewCapstoneModule: ModuleDefinition = {
  id: "sd19",
  slug: "sd19-mock-interview-capstone",
  phaseId: "sd-phase-4",
  order: 19,
  weeks: "Tuần 24",
  title: "Mock interview & capstone",
  emoji: "🎤",
  eli5Summary:
    "18 module trước dạy bạn *nấu* từng món (cache, queue, sharding…). Module này dạy bạn *phục vụ* cả bàn tiệc trong đúng 45 phút có khách ngồi chờ — phân bổ thời gian, nói ra suy nghĩ, và biết mình đang bị chấm ở đâu. Không có kỹ thuật mới, chỉ có phong độ.",
  objectives: [
    "Phân bổ 45 phút phỏng vấn theo framework 4 bước và quản lý thời gian thành tiếng",
    "Nhận diện các lỗi thường gặp (vẽ ngay, bỏ NFR, buzzword rỗng, đào sâu sai chỗ) trước khi phạm phải",
    "Tự chấm và chấm cho bạn luyện tập bằng rubric 5 tiêu chí, thang điểm 1–3",
    "Phân biệt kỳ vọng mid vs senior ở từng bước của framework để điều chỉnh cách trả lời",
    "Viết một design doc capstone hoàn chỉnh theo Phụ lục A với ít nhất 3 alternatives mỗi quyết định lớn",
    "So sánh phiên bản case study đầu khoá với bản viết lại để thấy rõ mình đã tiến bộ ở đâu",
  ],
  lessons: [
    {
      slug: "cau-truc-45-phut-phong-van",
      title: "Cấu trúc một buổi phỏng vấn 45 phút",
      minutes: 40,
      summary: "Phân bổ thời gian cho 5 pha — làm rõ, ước lượng, high-level, đào sâu, wrap-up — và cách quản lý giờ thành tiếng.",
    },
    {
      slug: "loi-hay-gap-va-rubric-tu-cham",
      title: "Lỗi hay gặp & rubric tự chấm",
      minutes: 45,
      summary: "6 lỗi khiến ứng viên tốt vẫn trượt, và một phiếu chấm 5 tiêu chí để tự soi lại buổi luyện tập.",
    },
    {
      slug: "ky-vong-theo-level-mid-senior",
      title: "Kỳ vọng theo level: mid vs senior",
      minutes: 40,
      summary: "Cùng một câu hỏi, cùng một framework — điều gì khiến câu trả lời của senior nghe khác hẳn.",
    },
  ],
  labs: [
    {
      id: "mock-interview-3-bam-gio",
      title: "3 mock interview bấm giờ",
      description: "Tự làm (hoặc bắt cặp) 3 case study kinh điển trong đúng 45 phút mỗi bài, nói to suy nghĩ, rồi tự chấm bằng rubric ở bài 2.",
      steps: [
        "Chuẩn bị 3 đề: `Google Docs-like collaborative editor`, `web crawler`, `top-K leaderboard` — không đọc trước bài giải mẫu",
        "Với mỗi đề: đặt hẹn giờ 45 phút, nói to suy nghĩ (ghi âm hoặc nhờ người khác nghe), đi đúng thứ tự yêu cầu → ước lượng → high-level → đào sâu → wrap-up",
        "Ngừng đúng phút 45 dù đang dang dở — đây là một phần bài học: cảm nhận việc hết giờ giữa chừng",
        "Ngay sau mỗi bài, chấm bằng rubric 5 tiêu chí (`requirements`, `structured communication`, `technical depth`, `trade-off reasoning`, `handling ambiguity`), thang 1–3, viết 1 câu nhận xét mỗi tiêu chí",
        "So sánh điểm giữa 3 bài — tiêu chí nào thấp nhất ở cả 3 bài là tiêu chí cần luyện thêm trước khi phỏng vấn thật",
      ],
    },
    {
      id: "capstone-design-doc",
      title: "Capstone: design doc hoàn chỉnh",
      description: "Chọn 1 hệ thống (ở công ty, side project, hoặc một case bạn thích trong SD14–SD18) và viết design doc đủ 8 mục theo Phụ lục A.",
      steps: [
        "Chọn hệ thống có độ khó tương đương một case phỏng vấn senior (không phải CRUD đơn giản); nêu lý do chọn trong 1 câu",
        "Viết đủ 8 mục của Phụ lục A: requirements, ước lượng (bảng `| Đại lượng | Giả định | Kết quả |`), API, data model, high-level design, deep dive 2–3 điểm, trade-off & alternatives, bottleneck/failure modes",
        "Mục 7 (trade-off & alternatives) phải có **ít nhất 3 alternatives** cho quyết định lớn nhất, đủ 5 cột `Quyết định | Chọn | Bỏ | Vì sao | Khi nào đổi ý`",
        "Thêm phần capacity & DR ngắn cho hệ thống này: 1 con số RPO/RTO hợp lý và điểm nghẽn khi 10× tải",
        "Đưa cho một đồng nghiệp/bạn học review như review một senior engineer thật — sửa tới khi họ không cần hỏi thêm câu nào để hiểu thiết kế",
      ],
    },
    {
      id: "viet-lai-case-study-cu",
      title: "Viết lại 1 case study cũ & so sánh",
      description: "Quay lại 1 case study bạn làm sớm trong course (SD14–SD16) và viết lại từ đầu, không xem bản cũ, rồi so sánh.",
      steps: [
        "Chọn 1 case cũ (ví dụ URL shortener ở SD14) — cất bản cũ đi, đừng mở lại",
        "Bấm giờ 45 phút, viết lại toàn bộ design doc theo Phụ lục A từ trí nhớ và kiến thức đã học tới SD18",
        "So sánh 2 bản side-by-side: số lượng alternatives, có bảng trade-off hay không, ước lượng có giả định rõ ràng không, có đề cập failure mode/capacity không",
        "Viết 3–5 câu nhận xét cụ thể: chỗ nào bản mới tốt hơn hẳn, chỗ nào vẫn còn yếu giống bản cũ",
        "Lưu cả 2 bản trong `design-docs/` để làm portfolio — nhà tuyển dụng/senior review thích thấy quá trình tiến bộ hơn 1 bản hoàn hảo duy nhất",
      ],
    },
  ],
  deliverable:
    "3 bản ghi chú mock interview đã bấm giờ kèm điểm rubric, 1 capstone design doc đầy đủ 8 mục theo Phụ lục A (≥3 alternatives cho quyết định chính), và bản viết lại 1 case study cũ kèm so sánh trước/sau.",
  successCriteria: "3 mock đều đi đủ 4 bước trong 45 phút; capstone đủ để một senior engineer review mà không cần giải thích thêm.",
  resources: [
    { title: "Hello Interview — System Design guides & mock interview", url: "https://www.hellointerview.com/", kind: "course" },
    { title: "System Design Interview Vol. 1–2 (Alex Xu), qua ByteByteGo", url: "https://bytebytego.com/", kind: "book" },
    { title: "Design Docs at Google (Malte Ubl)", url: "https://www.industrialempathy.com/posts/design-docs-at-google/", kind: "doc" },
    { title: "The System Design Primer (donnemartin, GitHub)", url: "https://github.com/donnemartin/system-design-primer", kind: "course" },
    { title: "interviewing.io — luyện phỏng vấn kỹ thuật với người thật", url: "https://interviewing.io/", kind: "practice" },
    { title: "Pramp — luyện phỏng vấn bắt cặp miễn phí", url: "https://www.pramp.com/", kind: "practice" },
  ],
  quiz: [
    {
      id: "jump-to-boxes",
      question:
        "Interviewer nói \"Thiết kế Google Docs\". Bạn lập tức vẽ 5 service và 3 database trong 3 phút đầu, chưa hỏi câu nào. Vấn đề lớn nhất ở đây là gì?",
      options: [
        "Vẽ quá nhiều box khiến sơ đồ rối mắt",
        "Chọn kiến trúc trước khi biết quy mô, tính năng cốt lõi và NFR — mọi hộp vẽ ra đều là đoán mò",
        "Nên dùng bút màu khác nhau cho mỗi service",
        "Không sao, vì high-level design luôn nên vẽ trước",
      ],
      answerIndex: 1,
      explanation:
        "Đây đúng là lỗi \"vẽ ngay không hỏi\" của SD01: kiến trúc sư không phác thảo khi chưa biết nhà mấy người ở. 5–8 phút đầu luôn dành cho yêu cầu và ước lượng.",
      recallPrompt:
        "Trong phỏng vấn system design, nếu bạn lập tức vẽ service và database trong vài phút đầu mà chưa hỏi về quy mô, tính năng cốt lõi hay NFR, thì vấn đề lớn nhất ở đây là gì?",
    },
    {
      id: "time-running-out",
      question:
        "Còn 12 phút, bạn mới xong high-level design (dùng hết 33 phút vì vẽ quá chi tiết). Interviewer hỏi \"Điều gì nghẽn khi có 10× user?\". Bạn nên làm gì?",
      options: [
        "Xin thêm 15 phút để vẽ thêm chi tiết",
        "Trả lời thẳng vào bottleneck bằng những gì đã có, chấp nhận bỏ qua phần chưa kịp vẽ",
        "Quay lại sửa lại high-level design cho gọn hơn trước",
        "Bỏ qua câu hỏi, tiếp tục hoàn thiện sơ đồ đang vẽ dở",
      ],
      answerIndex: 1,
      explanation:
        "Câu hỏi của interviewer chính là tín hiệu \"chuyển sang đào sâu ngay\". Cố vẽ thêm là lỗi \"đào sâu sai chỗ\" — thời gian còn lại nên dùng cho đúng thứ đang được hỏi.",
    },
    {
      id: "buzzword-defense",
      question:
        "Bạn nói \"Em dùng Kafka vì nó scalable\". Interviewer hỏi lại: \"Scalable cụ thể là sao trong bài này?\". Câu trả lời mạnh nhất là gì?",
      options: [
        "Nhắc lại \"Kafka nổi tiếng là scalable, nhiều công ty lớn dùng\"",
        "Đổi sang RabbitMQ vì nghĩ Kafka bị nghi ngờ",
        "Gắn với con số cụ thể: \"đỉnh tải ghi ~20.000 event/giây, Kafka partition theo key giúp nhiều consumer xử lý song song mà vẫn giữ thứ tự trong 1 conversation\"",
        "Im lặng và chuyển sang phần khác",
      ],
      answerIndex: 2,
      explanation:
        "Buzzword không giải thích là lỗi kinh điển. Một câu trả lời mạnh luôn nối lại với con số và cơ chế cụ thể — đúng dạng \"chọn X vì Y (có số)\" từ SD01.",
    },
    {
      id: "senior-vs-mid-deep-dive",
      question:
        "Ở phần đào sâu, hai ứng viên trình bày cùng một kiến trúc đúng. Điểm nào khiến người chấm coi một người là senior còn người kia là mid?",
      options: [
        "Senior vẽ sơ đồ đẹp hơn bằng công cụ chuyên nghiệp hơn",
        "Senior chủ động nêu failure mode, bottleneck và trade-off mà không cần được hỏi; mid chỉ trả lời khi bị hỏi",
        "Senior nói nhanh hơn nên xong sớm hơn",
        "Senior dùng nhiều công nghệ mới hơn trong thiết kế",
      ],
      answerIndex: 1,
      explanation:
        "Kỳ vọng senior không nằm ở kiến trúc khác biệt mà ở việc chủ động đào sâu thất bại và đánh đổi — dấu hiệu đã từng vận hành hệ thống thật, không chỉ đọc lý thuyết.",
    },
    {
      id: "rubric-rambling",
      question:
        "Người luyện tập trình bày đúng kiến trúc nhưng nói lan man, nhảy qua lại giữa các phần không theo thứ tự, khiến người nghe khó theo dõi. Tiêu chí nào trong rubric 5 tiêu chí bị trừ điểm nhiều nhất?",
      options: ["Requirements gathering", "Structured communication", "Technical depth", "Handling ambiguity"],
      answerIndex: 1,
      explanation:
        "Kiến trúc đúng nhưng dẫn dắt lộn xộn là vấn đề giao tiếp có cấu trúc — đúng thứ mà interviewer chấm nhiều nhất, vì họ phải \"nghe\" ra được thiết kế, không tự suy luận hộ bạn.",
    },
    {
      id: "handle-ambiguous-scope",
      question:
        "Bạn không chắc hệ thống có cần hỗ trợ multi-region hay không, và interviewer không trả lời rõ khi được hỏi. Cách xử lý tốt nhất?",
      options: [
        "Bỏ qua, thiết kế như single-region rồi không nhắc gì thêm",
        "Dừng lại chờ interviewer quyết định thay mình",
        "Nêu rõ giả định đang chọn (ví dụ \"em giả định single-region cho MVP, sẽ nói thêm hướng mở rộng multi-region ở phần bottleneck\") và tiếp tục",
        "Thiết kế cả hai phương án song song ngay từ đầu",
      ],
      answerIndex: 2,
      explanation:
        "Xử lý mơ hồ tốt nghĩa là nêu giả định thành tiếng và tiếp tục đi, không đứng khựng lại. Có thể quay lại multi-region ở phần mở rộng nếu còn thời gian.",
    },
    {
      id: "practice-realism",
      question: "Cách luyện mock interview một mình nào giúp gần giống phỏng vấn thật nhất?",
      options: [
        "Đọc bài giải mẫu trước rồi chép lại ý chính",
        "Bấm giờ 45 phút, nói to thành tiếng như đang giải thích cho người khác, và không dừng để tra cứu",
        "Chỉ cần vẽ sơ đồ trên giấy, không cần nói gì",
        "Làm không giới hạn thời gian để tập trung vào chất lượng",
      ],
      answerIndex: 1,
      explanation:
        "Nguyên tắc \"luyện nói ra thành tiếng\" (§1 curriculum): phỏng vấn chấm cách dẫn dắt, không chỉ kiến trúc cuối — im lặng vẽ một mình không luyện được kỹ năng đó.",
    },
    {
      id: "capstone-missing-alternatives",
      question:
        "Capstone design doc của bạn có mục 7 (trade-off & alternatives) nhưng mỗi quyết định lớn chỉ ghi 1 phương án duy nhất đã chọn. Theo Phụ lục A, cần sửa gì?",
      options: [
        "Không cần sửa, miễn phương án chọn đúng",
        "Thêm ít nhất vài alternatives đã cân nhắc và bỏ, kèm lý do và điều kiện đổi ý cho quyết định lớn nhất",
        "Xoá mục 7 vì không bắt buộc",
        "Chuyển toàn bộ mục 7 lên đầu tài liệu",
      ],
      answerIndex: 1,
      explanation:
        "Bảng trade-off là \"sản phẩm\" quan trọng nhất của mỗi design doc (§1 curriculum). Chỉ ghi phương án đã chọn mà không có alternatives nghĩa là chưa cho thấy quá trình ra quyết định.",
    },
    {
      id: "when-to-start-drawing",
      question: "Thời điểm hợp lý để bắt đầu vẽ high-level design trong 45 phút là khi nào?",
      options: [
        "Ngay phút đầu tiên, trước cả khi hỏi yêu cầu",
        "Sau khi đã có functional/NFR rõ ràng và ước lượng cơ bản, thường quanh phút thứ 10",
        "Chỉ sau khi đã đào sâu xong toàn bộ trade-off",
        "Không cần vẽ, chỉ cần nói bằng lời cũng đủ",
      ],
      answerIndex: 1,
      explanation:
        "Phân bổ hợp lý cho 45 phút: ~5–8 phút yêu cầu, ~5 phút ước lượng, rồi mới sang high-level. Vẽ quá sớm là đoán mò; vẽ quá muộn thì hết giờ trước khi tới phần đào sâu.",
    },
    {
      id: "rewrite-improvement-signal",
      question:
        "Sau khi học hết SD01–SD18 và viết lại 1 case study làm ở SD14, dấu hiệu rõ nhất cho thấy bạn đã tiến bộ là gì?",
      options: [
        "Bản mới dùng nhiều công nghệ trendy hơn bản cũ",
        "Bản mới dài hơn hẳn vì liệt kê thêm nhiều service",
        "Bản mới có ước lượng kèm giả định rõ ràng, nhiều alternatives có bảng trade-off, và nêu được bottleneck/failure mode mà bản cũ bỏ qua",
        "Bản mới vẽ đẹp hơn bằng công cụ chuyên nghiệp hơn",
      ],
      answerIndex: 2,
      explanation:
        "Tiến bộ thật nằm ở chất lượng lập luận — số liệu có giả định, so sánh phương án, và chủ động nêu điểm yếu — chứ không phải độ dài hay công cụ vẽ.",
    },
  ],
};
