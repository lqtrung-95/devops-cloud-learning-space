"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import { DiagramArrow, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";
import type { DiagramTone } from "@/components/diagrams/diagram-tones";

type ApiStyle = "rest" | "graphql" | "grpc";

interface StyleInfo {
  label: string;
  client: string;
  middle: { label: string; sublabel: string; tone: DiagramTone };
  clientCalls: string[];
  backendLabel: string;
  facts: [string, string][];
}

const styles: Record<ApiStyle, StyleInfo> = {
  rest: {
    label: "REST (JSON)",
    client: "Mobile app",
    middle: { label: "REST API", sublabel: "resource + HTTP verb", tone: "blue" },
    clientCalls: ["GET /orders/42", "GET /users/7", "GET /orders/42/items"],
    backendLabel: "JSON",
    facts: [
      ["Round trip từ client", "3 (song song được, vẫn là 3 request)"],
      ["Payload", "Trả nguyên resource — dễ over-fetch field không dùng"],
      ["HTTP caching", "Dễ: GET + URL làm cache key, CDN hiểu ngay"],
      ["Tooling / debug", "curl, browser, OpenAPI — ai cũng biết"],
    ],
  },
  graphql: {
    label: "GraphQL",
    client: "Mobile app",
    middle: { label: "GraphQL server", sublabel: "schema + resolvers", tone: "violet" },
    clientCalls: ["POST /graphql { order(id: 42) { status items { name } user { name } } }"],
    backendLabel: "resolver",
    facts: [
      ["Round trip từ client", "1 — client mô tả đúng hình dạng dữ liệu cần"],
      ["Payload", "Chỉ các field được hỏi"],
      ["HTTP caching", "Khó hơn: thường POST một endpoint ⇒ cache ở client/persisted query"],
      ["Rủi ro", "N+1 ở resolver, query quá phức tạp ⇒ cần DataLoader, giới hạn độ sâu"],
    ],
  },
  grpc: {
    label: "gRPC (protobuf)",
    client: "Web / mobile",
    middle: { label: "BFF", sublabel: "REST/JSON ra ngoài", tone: "amber" },
    clientCalls: ["GET /screens/order/42"],
    backendLabel: "gRPC · HTTP/2",
    facts: [
      ["Round trip từ client", "1 tới BFF; BFF gọi nội bộ song song qua gRPC"],
      ["Payload", "Binary protobuf, nhỏ hơn JSON cùng dữ liệu (thường vài lần)"],
      ["Contract", "File .proto sinh client/server nhiều ngôn ngữ, streaming 4 kiểu"],
      ["Hạn chế", "Browser không gọi thẳng được (cần gRPC-Web/proxy), khó debug bằng curl"],
    ],
  },
};

const services = [
  { label: "Order service", y: 24 },
  { label: "User service", y: 114 },
  { label: "Catalog service", y: 204 },
];

export function ApiStyleComparisonDiagram() {
  const [style, setStyle] = useState<ApiStyle>("rest");
  const info = styles[style];

  return (
    <DiagramFrame
      title="Màn hình 'Chi tiết đơn hàng' cần dữ liệu từ 3 service — lấy bằng cách nào?"
      viewBox="0 0 720 290"
      controls={
        <div className="space-y-3 text-sm">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(styles) as ApiStyle[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setStyle(key)}
                className={clsx(
                  "rounded-full px-3 py-1.5 font-medium",
                  key === style ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
                )}
              >
                {styles[key].label}
              </button>
            ))}
          </div>
          <dl className="grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-[auto_1fr]">
            {info.facts.map(([term, detail]) => (
              <div key={term} className="contents">
                <dt className="font-semibold text-stone-800 dark:text-stone-200">{term}</dt>
                <dd className="text-stone-600 dark:text-stone-400">{detail}</dd>
              </div>
            ))}
          </dl>
        </div>
      }
      caption="Không kiểu nào thắng tuyệt đối: REST cho API công khai và caching, GraphQL cho client đa dạng nhiều màn hình, gRPC cho giao tiếp service-to-service. Nhiều hệ thống dùng cả ba ở các tầng khác nhau."
    >
      <DiagramNode x={10} y={105} width={130} height={80} label={info.client} emoji="📱" tone="slate" />
      <DiagramNode x={290} y={105} width={150} height={80} label={info.middle.label} sublabel={info.middle.sublabel} tone={info.middle.tone} state="active" />

      {info.clientCalls.length > 1 ? (
        info.clientCalls.map((call, index) => (
          <DiagramArrow key={call} from={[142, 125 + index * 20]} to={[286, 125 + index * 20]} tone="blue" animated curve={(index - 1) * 30} label={call} />
        ))
      ) : (
        <>
          <DiagramArrow from={[142, 145]} to={[286, 145]} tone={info.middle.tone} animated />
          <DiagramLabel x={214} y={98} text={info.clientCalls[0].length > 30 ? "POST /graphql (1 query)" : info.clientCalls[0]} size={11} bold />
        </>
      )}
      {style === "graphql" && <DiagramLabel x={75} y={214} text="{ order { status items user } }" size={11} tone="violet" />}

      {services.map((service) => (
        <g key={service.label}>
          <DiagramArrow from={[442, 145]} to={[546, service.y + 30]} tone={style === "grpc" ? "amber" : "slate"} animated={style !== "rest"} dimmed={style === "rest"} />
          <DiagramNode x={550} y={service.y} width={160} height={60} label={service.label} sublabel={style === "rest" ? "sau API" : info.backendLabel} tone="green" />
        </g>
      ))}
      {style === "rest" && <DiagramLabel x={495} y={274} text="client tự ghép dữ liệu từ 3 response" size={11} tone="blue" />}
      {style === "graphql" && <DiagramLabel x={495} y={274} text="1 query ⇒ nhiều resolver gọi service" size={11} tone="violet" />}
      {style === "grpc" && <DiagramLabel x={495} y={274} text="nội bộ: binary, contract .proto" size={11} tone="amber" />}
    </DiagramFrame>
  );
}
