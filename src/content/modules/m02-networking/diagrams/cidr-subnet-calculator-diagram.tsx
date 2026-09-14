"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import { DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";

const presetAddresses = ["10.0.3.77", "172.31.20.5", "192.168.1.130", "8.8.8.8"];

function toNumber(address: string): number {
  return address.split(".").reduce((sum, octet) => (sum * 256 + Number(octet)) >>> 0, 0);
}

function toAddress(value: number): string {
  return [24, 16, 8, 0].map((shift) => (value >>> shift) & 255).join(".");
}

function describeRange(value: number): { text: string; isPrivate: boolean } {
  if (value >>> 24 === 10) return { text: "Private (10.0.0.0/8)", isPrivate: true };
  if (value >>> 20 === (172 << 4) + 1) return { text: "Private (172.16.0.0/12)", isPrivate: true };
  if (value >>> 16 === (192 << 8) + 168) return { text: "Private (192.168.0.0/16)", isPrivate: true };
  return { text: "Public — định tuyến trên Internet", isPrivate: false };
}

const BIT_WIDTH = 19;
const OCTET_GAP = 14;
const BITS_LEFT = (720 - (32 * BIT_WIDTH + 3 * OCTET_GAP)) / 2;

export function CidrSubnetCalculatorDiagram() {
  const [address, setAddress] = useState("10.0.3.77");
  const [prefix, setPrefix] = useState(24);

  const ip = toNumber(address);
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  const network = (ip & mask) >>> 0;
  const broadcast = (network | (~mask >>> 0)) >>> 0;
  const total = 2 ** (32 - prefix);
  const usable = Math.max(total - 2, 0);
  const awsAllowed = prefix >= 16 && prefix <= 28;
  const range = describeRange(ip);
  const bits = ip.toString(2).padStart(32, "0");

  return (
    <DiagramFrame
      title="Máy tính CIDR — kéo prefix, xem mạng được chia thế nào"
      viewBox="0 0 720 300"
      controls={
        <div className="space-y-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-stone-600 dark:text-stone-400">IP:</span>
            {presetAddresses.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setAddress(option)}
                className={clsx(
                  "rounded-full px-3 py-1 font-mono text-[13px]",
                  address === option ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
                )}
              >
                {option}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-3">
            <span className="font-medium text-stone-600 dark:text-stone-400">Prefix:</span>
            <input type="range" min={8} max={30} value={prefix} onChange={(event) => setPrefix(Number(event.target.value))} className="w-full accent-indigo-600" aria-label="Độ dài prefix" />
            <span className="w-12 font-mono font-bold text-indigo-700 dark:text-indigo-300">/{prefix}</span>
          </label>
          <div className="rounded-xl bg-stone-900 px-4 py-3 font-mono text-[13px] text-stone-100">
            <span className="text-stone-500">subnet mask →</span> {toAddress(mask)}{" "}
            <span className="text-stone-500">· CIDR →</span> <span className="text-emerald-400">{toAddress(network)}/{prefix}</span>
          </div>
        </div>
      }
      caption="Prefix /n = n bit đầu là 'tên đường' (network), phần còn lại là 'số nhà' (host). Mỗi lần tăng prefix thêm 1, mạng bị chia đôi."
    >
      <DiagramLabel x={360} y={22} text={`${address}/${prefix} · ${range.text}`} bold size={14} tone={range.isPrivate ? "green" : "amber"} />
      {bits.split("").map((bit, index) => {
        const x = BITS_LEFT + index * BIT_WIDTH + Math.floor(index / 8) * OCTET_GAP;
        const isNetwork = index < prefix;
        return (
          <g key={index}>
            <rect x={x} y={40} width={BIT_WIDTH - 3} height={30} rx={4} strokeWidth={1.5} className={isNetwork ? "fill-blue-100 stroke-blue-500 dark:fill-blue-950 dark:stroke-blue-400" : "fill-emerald-50 stroke-emerald-500 dark:fill-emerald-950 dark:stroke-emerald-400"} />
            <text x={x + (BIT_WIDTH - 3) / 2} y={60} textAnchor="middle" fontSize={13} fontFamily="monospace" className={isNetwork ? "fill-blue-900 dark:fill-blue-100" : "fill-emerald-900 dark:fill-emerald-100"}>
              {bit}
            </text>
          </g>
        );
      })}
      {address.split(".").map((octet, index) => (
        <DiagramLabel key={index} x={BITS_LEFT + index * (8 * BIT_WIDTH + OCTET_GAP) + 4 * BIT_WIDTH - 2} y={88} text={octet} size={12} />
      ))}
      <DiagramLabel x={BITS_LEFT} y={110} anchor="start" text={`🛣️ Network: ${prefix} bit`} tone="blue" bold />
      <DiagramLabel x={720 - BITS_LEFT} y={110} anchor="end" text={`🏠 Host: ${32 - prefix} bit`} tone="green" bold />

      <DiagramNode x={16} y={126} width={220} height={66} label={toAddress(network)} sublabel="Network address (không gán máy)" tone="blue" />
      <DiagramNode x={250} y={126} width={220} height={66} label={`${toAddress(network + 1)} → ${toAddress(broadcast - 1)}`} sublabel="Dải IP gán được cho máy" tone="green" state="active" />
      <DiagramNode x={484} y={126} width={220} height={66} label={toAddress(broadcast)} sublabel="Broadcast (không gán máy)" tone="blue" />

      <DiagramNode x={16} y={210} width={220} height={66} label={`${total.toLocaleString("en-US")} địa chỉ`} sublabel={`2^${32 - prefix} = tổng số IP`} tone="slate" />
      <DiagramNode x={250} y={210} width={220} height={66} label={`${usable.toLocaleString("en-US")} dùng được`} sublabel="trừ network + broadcast" tone="green" />
      <DiagramNode
        x={484}
        y={210}
        width={220}
        height={66}
        label={awsAllowed ? `${(total - 5).toLocaleString("en-US")} trên AWS` : "AWS không cho phép"}
        sublabel={awsAllowed ? "AWS giữ lại 5 IP mỗi subnet" : "subnet AWS phải từ /16 tới /28"}
        tone={awsAllowed ? "amber" : "rose"}
      />
    </DiagramFrame>
  );
}
