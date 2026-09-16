"use client";

import { StepDiagram } from "@/components/diagrams/step-diagram";
import { DiagramArrow, DiagramGroupBox, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";

/**
 * Lesson 2 diagram: step through what happens when Alice (on gateway
 * instance 1) sends a message to Bob (on gateway instance 2), using Redis
 * pub/sub fan-out — each instance holds only its own local connection map.
 */

const ALICE = { x: 20, y: 40 };
const BOB = { x: 20, y: 230 };
const NGINX = { x: 190, y: 135 };
const I1 = { x: 360, y: 60 };
const I2 = { x: 360, y: 210 };
const REDIS = { x: 560, y: 135 };

function baseTopology(opts: { aliceActive?: boolean; bobActive?: boolean; i1Active?: boolean; i2Active?: boolean; redisActive?: boolean }) {
  return (
    <>
      <DiagramNode x={ALICE.x} y={ALICE.y} width={110} height={48} label="Alice" emoji="🧑" tone="violet" state={opts.aliceActive ? "active" : "normal"} />
      <DiagramNode x={BOB.x} y={BOB.y} width={110} height={48} label="Bob" emoji="🧑" tone="violet" state={opts.bobActive ? "active" : "normal"} />
      <DiagramNode x={NGINX.x} y={NGINX.y} width={100} height={40} label="Nginx" sublabel="WS-aware LB" tone="slate" />
      <DiagramGroupBox x={330} y={30} width={160} height={220} label="Gateway instances" tone="blue">
        <DiagramNode
          x={I1.x}
          y={I1.y - 20}
          width={140}
          height={50}
          label="Instance 1"
          sublabel="Map{alice → ws}"
          tone="blue"
          state={opts.i1Active ? "active" : "normal"}
        />
        <DiagramNode
          x={I2.x}
          y={I2.y - 20}
          width={140}
          height={50}
          label="Instance 2"
          sublabel="Map{bob → ws}"
          tone="blue"
          state={opts.i2Active ? "active" : "normal"}
        />
      </DiagramGroupBox>
      <DiagramNode x={REDIS.x} y={REDIS.y - 24} width={130} height={54} label="Redis" sublabel="channel chat:relay" tone="rose" state={opts.redisActive ? "active" : "normal"} />
    </>
  );
}

export function WebsocketGatewayPubsubRoutingDiagram() {
  return (
    <StepDiagram
      title="Alice (instance 1) gửi tin cho Bob (instance 2) — route qua Redis pub/sub"
      viewBox="0 0 720 320"
      steps={[
        {
          title: "Kết nối ban đầu",
          description:
            "Alice và Bob mở WebSocket qua Nginx. Nginx (round-robin) đưa Alice vào instance 1, Bob vào instance 2. Mỗi instance chỉ lưu connection của chính mình trong một `Map` cục bộ — instance 1 không biết gì về Bob.",
        },
        {
          title: "Alice gửi tin nhắn",
          description: "Alice gửi `{ conversationId, recipientId: \"bob\", body }` qua WebSocket tới instance 1. Instance 1 ghi tin nhắn vào Postgres (nguồn sự thật, có `seq`).",
        },
        {
          title: "Publish lên Redis",
          description: "Instance 1 không biết Bob ở đâu, nên `redis.publish(\"chat:relay\", {...})` — coi như hô lên một kênh chung thay vì tìm đúng địa chỉ.",
        },
        {
          title: "Mọi instance nhận, tự lọc",
          description:
            "Cả instance 1 và instance 2 đều subscribe `chat:relay` nên đều nhận được message. Mỗi instance tra `Map` cục bộ: instance 1 không có `bob` → bỏ qua; instance 2 có `bob` → gửi tiếp qua WebSocket.",
        },
        {
          title: "Bob nhận tin realtime",
          description: "Bob nhận tin nhắn gần như ngay lập tức dù kết nối vào instance khác với Alice. Cái giá: mọi instance đều nhận mọi message trên `chat:relay`, kể cả khi không liên quan — chấp nhận được ở quy mô vài chục instance, cần registry lookup (userId → instanceId) khi số instance lớn hơn nhiều.",
        },
      ]}
    >
      {(step) => (
        <>
          {baseTopology({
            aliceActive: step === 1,
            i1Active: step === 1 || step === 2 || step === 3,
            redisActive: step === 2 || step === 3,
            i2Active: step === 3 || step === 4,
            bobActive: step === 4,
          })}

          <DiagramArrow from={[ALICE.x + 110, ALICE.y + 24]} to={[NGINX.x, NGINX.y + 5]} tone="slate" dimmed={step !== 1} />
          <DiagramArrow from={[BOB.x + 110, BOB.y + 24]} to={[NGINX.x, NGINX.y + 25]} tone="slate" dimmed={step !== 4} />
          <DiagramArrow from={[NGINX.x + 100, NGINX.y + 5]} to={[I1.x, I1.y + 5]} tone="violet" animated={step === 1} dimmed={step !== 1} />
          <DiagramArrow from={[NGINX.x + 100, NGINX.y + 30]} to={[I2.x, I2.y + 30]} tone="violet" animated={step === 4} dimmed={step !== 4} />

          {step >= 2 && (
            <DiagramArrow from={[I1.x + 140, I1.y + 5]} to={[REDIS.x, REDIS.y - 5]} tone="rose" animated={step === 2} label={step === 2 ? "publish" : undefined} />
          )}
          {step >= 3 && (
            <>
              <DiagramArrow from={[REDIS.x, REDIS.y - 5]} to={[I1.x + 140, I1.y + 20]} tone="rose" animated={step === 3} curve={20} label={step === 3 ? "fan-out" : undefined} />
              <DiagramArrow from={[REDIS.x, REDIS.y + 5]} to={[I2.x + 140, I2.y + 5]} tone="rose" animated={step === 3} curve={-20} />
            </>
          )}
          {step === 4 && <DiagramArrow from={[I2.x, I2.y + 30]} to={[NGINX.x + 100, NGINX.y + 30]} tone="green" animated label="deliver" />}

          {step === 3 && <DiagramLabel x={360} y={20} text="Instance 1 tự lọc: không có 'bob' trong Map → bỏ qua" size={11} tone="slate" />}
        </>
      )}
    </StepDiagram>
  );
}
