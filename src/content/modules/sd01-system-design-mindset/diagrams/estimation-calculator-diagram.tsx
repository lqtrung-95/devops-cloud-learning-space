"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import { DiagramArrow, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";

const SECONDS_PER_DAY = 100_000; // làm tròn 86.400 ⇒ 10⁵ để tính nhẩm
const PEAK_FACTOR = 3;

const dauOptions = [1_000_000, 10_000_000, 100_000_000];
const readOptions = [5, 20, 100];
const writeOptions = [0.1, 1, 5];
const sizeOptions = [
  { bytes: 500, label: "500 B (link, like)" },
  { bytes: 5_000, label: "5 KB (bài text)" },
  { bytes: 500_000, label: "500 KB (ảnh nén)" },
];

const numberFormat = new Intl.NumberFormat("vi-VN", { maximumSignificantDigits: 2 });

function formatCount(value: number): string {
  if (value >= 1e9) return `${numberFormat.format(value / 1e9)} tỷ`;
  if (value >= 1e6) return `${numberFormat.format(value / 1e6)} triệu`;
  return numberFormat.format(value);
}

function formatBytes(bytes: number): string {
  const units = ["B", "KB", "MB", "GB", "TB", "PB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1000 && unitIndex < units.length - 1) {
    value /= 1000;
    unitIndex += 1;
  }
  return `${numberFormat.format(value)} ${units[unitIndex]}`;
}

interface OptionGroupProps<T> {
  label: string;
  options: T[];
  value: T;
  render: (option: T) => string;
  onChange: (option: T) => void;
}

function OptionGroup<T>({ label, options, value, render, onChange }: OptionGroupProps<T>) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="w-36 font-medium text-stone-700 dark:text-stone-300">{label}</span>
      {options.map((option) => (
        <button
          key={render(option)}
          type="button"
          onClick={() => onChange(option)}
          className={clsx(
            "rounded-full px-2.5 py-1 text-xs font-medium",
            option === value ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
          )}
        >
          {render(option)}
        </button>
      ))}
    </div>
  );
}

export function EstimationCalculatorDiagram() {
  const [dau, setDau] = useState(dauOptions[1]);
  const [reads, setReads] = useState(readOptions[1]);
  const [writes, setWrites] = useState(writeOptions[1]);
  const [size, setSize] = useState(sizeOptions[1]);

  const readsPerDay = dau * reads;
  const writesPerDay = dau * writes;
  const readQps = readsPerDay / SECONDS_PER_DAY;
  const writeQps = writesPerDay / SECONDS_PER_DAY;
  const storagePerDay = writesPerDay * size.bytes;
  const storageFiveYears = storagePerDay * 365 * 5;
  const ratio = reads / writes;
  const verdict =
    ratio >= 10 ? `read:write ≈ ${numberFormat.format(ratio)}:1 ⇒ đọc nhiều: ưu tiên cache, read replica` : `read:write ≈ ${numberFormat.format(ratio)}:1 ⇒ ghi đáng kể: chú ý đường ghi, partition`;

  return (
    <DiagramFrame
      title="Máy tính ước lượng — đổi giả định, xem con số chạy theo"
      viewBox="0 0 720 300"
      controls={
        <div className="space-y-2 text-sm">
          <OptionGroup label="👥 DAU" options={dauOptions} value={dau} render={formatCount} onChange={setDau} />
          <OptionGroup label="📖 Đọc / user / ngày" options={readOptions} value={reads} render={(option) => `${option} lần`} onChange={setReads} />
          <OptionGroup label="✍️ Ghi / user / ngày" options={writeOptions} value={writes} render={(option) => `${numberFormat.format(option)} lần`} onChange={setWrites} />
          <OptionGroup label="📦 Kích thước / bản ghi" options={sizeOptions} value={size} render={(option) => option.label} onChange={setSize} />
        </div>
      }
      caption={`Giả định cố định: 1 ngày ≈ 10⁵ giây, peak = ${PEAK_FACTOR}× trung bình, storage chưa nhân replication. Kết quả là thứ tự độ lớn — đủ để chọn kiến trúc, không phải để đặt mua server.`}
    >
      <DiagramNode x={10} y={110} width={120} height={70} label="DAU" sublabel={formatCount(dau)} emoji="👥" tone="violet" />

      <DiagramArrow from={[132, 130]} to={[176, 70]} tone="blue" />
      <DiagramNode x={180} y={30} width={150} height={60} label="Đọc / ngày" sublabel={formatCount(readsPerDay)} tone="blue" />
      <DiagramArrow from={[332, 60]} to={[366, 60]} tone="blue" label="÷10⁵" />
      <DiagramNode x={370} y={30} width={150} height={60} label="QPS đọc TB" sublabel={`~${numberFormat.format(readQps)}`} tone="blue" />
      <DiagramArrow from={[522, 60]} to={[556, 60]} tone="blue" label={`×${PEAK_FACTOR}`} />
      <DiagramNode x={560} y={30} width={150} height={60} label="QPS đọc đỉnh" sublabel={`~${numberFormat.format(readQps * PEAK_FACTOR)}`} tone="blue" state="active" />

      <DiagramArrow from={[132, 160]} to={[176, 220]} tone="green" />
      <DiagramNode x={180} y={196} width={150} height={60} label="QPS ghi TB" sublabel={`~${numberFormat.format(writeQps)} (đỉnh ~${numberFormat.format(writeQps * PEAK_FACTOR)})`} tone="green" />
      <DiagramArrow from={[332, 226]} to={[366, 226]} tone="green" label={`×${formatBytes(size.bytes)}`} />
      <DiagramNode x={370} y={196} width={150} height={60} label="Storage / ngày" sublabel={formatBytes(storagePerDay)} tone="green" />
      <DiagramArrow from={[522, 226]} to={[556, 226]} tone="green" label="×1.825" />
      <DiagramNode x={560} y={196} width={150} height={60} label="Storage 5 năm" sublabel={formatBytes(storageFiveYears)} tone="green" state="active" />

      <DiagramLabel x={360} y={140} text={verdict} size={13} tone="amber" bold />
      <DiagramLabel x={360} y={162} text={`${formatCount(writesPerDay)} bản ghi mới mỗi ngày`} size={12} />
      <DiagramLabel x={360} y={286} text="365 × 5 = 1.825 ngày" size={11} />
    </DiagramFrame>
  );
}
