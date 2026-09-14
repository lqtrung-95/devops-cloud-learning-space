"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import { DiagramArrow, DiagramGroupBox, DiagramNode } from "@/components/diagrams/diagram-shapes";

type Tool = "helm" | "kustomize";
type Env = "dev" | "prod";

const helmValues: Record<Env, string[]> = {
  dev: ["replicaCount: 1", "image.tag: dev-abc123", "resources.requests.cpu: 100m", "ingress.host: dev.shop.local"],
  prod: ["replicaCount: 5", "image.tag: 1.4.0", "resources.requests.cpu: 500m", "ingress.host: shop.example.com"],
};

const kustomizePatches: Record<Env, string[]> = {
  dev: ["patch: replicas 1", "patch: image tag dev-abc123", "no HPA (base excludes it)"],
  prod: ["patch: replicas 5", "patch: image tag 1.4.0", "add: hpa.yaml (patch strategic merge)"],
};

export function HelmVsKustomizeToggleDiagram() {
  const [tool, setTool] = useState<Tool>("helm");
  const [env, setEnv] = useState<Env>("prod");

  const pill = (active: boolean) =>
    clsx("rounded-full px-3 py-1.5 text-sm font-medium", active ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300");

  const rendered = tool === "helm" ? helmValues[env] : kustomizePatches[env];

  return (
    <div>
      <div className="not-prose -mb-4 flex flex-wrap gap-2">
        {(["helm", "kustomize"] as const).map((option) => (
          <button key={option} type="button" className={pill(tool === option)} onClick={() => setTool(option)}>
            {option === "helm" ? "Helm: khuôn bánh + chỗ điền" : "Kustomize: bản gốc + giấy dán sửa"}
          </button>
        ))}
        {(["dev", "prod"] as const).map((option) => (
          <button key={option} type="button" className={pill(env === option)} onClick={() => setEnv(option)}>
            Môi trường: {option}
          </button>
        ))}
      </div>
      <DiagramFrame
        title={tool === "helm" ? "helm template + values → manifest cuối" : "kustomize base + overlay → manifest cuối"}
        viewBox="0 0 720 300"
        caption={
          tool === "helm"
            ? "Chart có {{ .Values.x }} là chỗ điền trong template. Mỗi môi trường có một values-<env>.yaml riêng đè lên giá trị mặc định."
            : "Kustomize không có template: bạn viết YAML thật (base/) rồi patch từng phần khác biệt trong overlays/<env>/, không đụng vào base."
        }
      >
        <DiagramGroupBox x={20} y={16} width={280} height={260} label={tool === "helm" ? "Chart templates/" : "base/"} tone="blue">
          <DiagramNode
            x={40}
            y={48}
            width={240}
            height={64}
            label={tool === "helm" ? "deployment.yaml" : "deployment.yaml"}
            sublabel={tool === "helm" ? "image: {{ .Values.image.tag }}" : "image: shop-api:latest (thật)"}
            tone="blue"
          />
          <DiagramNode x={40} y={128} width={240} height={64} label="service.yaml + hpa.yaml" sublabel={tool === "helm" ? "{{ if .Values.hpa.enabled }}" : "kustomization.yaml liệt kê file"} tone="cyan" />
          <DiagramNode x={40} y={208} width={240} height={48} label={tool === "helm" ? "values.yaml (mặc định)" : "(không có giá trị mặc định)"} tone="slate" />
        </DiagramGroupBox>

        <DiagramArrow from={[300, 146]} to={[400, 146]} tone="violet" animated label={tool === "helm" ? `-f values-${env}.yaml` : `overlays/${env}`} />

        <DiagramGroupBox x={410} y={16} width={290} height={260} label={tool === "helm" ? `values-${env}.yaml` : `overlays/${env}/`} tone="violet">
          {rendered.map((line, index) => (
            <DiagramNode key={line} x={432} y={48 + index * 54} width={246} height={44} label={line} tone={env === "prod" ? "amber" : "green"} />
          ))}
        </DiagramGroupBox>
      </DiagramFrame>
    </div>
  );
}
