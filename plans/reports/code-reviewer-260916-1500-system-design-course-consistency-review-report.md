# System Design Course — Cross-Module Consistency Review

Scope: 19 sd01-sd19 modules, content-only review (structural validator already green). Focus: cross-module contradictions a blind-parallel-write process would produce. No files edited.

## Critical

### C1. Postgres user/db convention splits 3 ways across modules — labs will fail as written
SD01 defines the canonical `sd-playground` compose file with `POSTGRES_USER=playground, POSTGRES_PASSWORD=playground, POSTGRES_DB=playground` (`src/content/modules/sd01-system-design-mindset/lessons/read-write-ratio-sd-playground.mdx:63`). No later module ever changes these env vars. Yet lesson commands across the course assume three different, mutually incompatible conventions:

- `-U playground` (matches SD01): SD02 `request-journey-dns-tcp-tls.mdx:73-74`, SD14 `url-shortener-requirements-and-estimation.mdx:100`, `read-path-cache-redirect-and-cache-redirect-and-pastebin.mdx:84`
- `-U app -d app` (does not exist in the compose file — role/db "app" was never created): SD05 (`sql-vs-nosql.mdx:69`, `transactions-isolation-levels.mdx:108`, `indexes-btree-vs-lsm.mdx:101`), SD06 (5 lessons, e.g. `connection-pooling-pgbouncer.mdx:96-99`, `replication-and-replication-lag.mdx:140-147`), SD07 (`transactional-outbox-cdc.mdx:118`, `delivery-semantics-idempotency.mdx:118-120`), SD08 (`inverted-index-tokenization-relevance.mdx:87-89`), SD09 (`cap-and-pacelc.mdx:69`, `consistency-models.mdx:68-70`), SD12 (3 lessons), SD13 (`capacity-planning-headroom.mdx:61-62`, `disaster-recovery-rpo-rto.mdx:42-71`), SD18 (3 lessons)
- `-U postgres` with no `-d` flag (role "postgres" was never created either — `POSTGRES_USER` was set to `playground`, so this errors "role postgres does not exist"): SD03 `autoscaling-next-bottleneck.mdx:78-79`, SD04 `cache-layers.mdx:80-81`, SD16 `thu-tu-tin-nhan-luu-tru-offline-da-thiet-bi.mdx:97`

Notably SD06's own replication lab says "giữ nguyên environment ... như SD01" (`replication-and-replication-lag.mdx:101`, i.e. keep SD01's env vars) but then every command in that same file uses `-U app`, contradicting its own stated assumption one paragraph later. This is not a typo isolated to one module — 13 lesson files use `app`, 4 use `playground`, 3 use bare `postgres`. A learner following the course in order hits a broken command at SD03 (module 3 of 19). Recommend picking one convention (majority use is `app`/`app`, but SD01 is the module that actually ships the compose file, so either update SD01's compose env vars to `app`/`app`/`app` or do a global find/replace back to `playground`/`playground`).

### C2. `toxiproxy` service is used by 3 modules but never added to `docker-compose.yml` anywhere in the course
SD01's playground overview explicitly credits Toxiproxy's introduction to SD11 (`read-write-ratio-sd-playground.mdx:13`: "...tới Redpanda (SD07) và Toxiproxy (SD11)"). But:
- SD09 (week 12, before SD11's week 15) already runs `docker compose exec toxiproxy toxiproxy-cli create replica-proxy ...` in its lab (`sd09-consistency-replication/module-meta.ts:64-67`) with no step anywhere adding the service to compose.
- SD10 (week 13-14) also runs `docker compose exec toxiproxy ...` (`vi-sao-dong-thuan-kho.mdx:62`).
- SD11 itself (week 15, the module SD01 says "owns" Toxiproxy) never shows a `docker-compose.yml` snippet adding the service either — its lab (`sd11-reliability-patterns/module-meta.ts:53`) just calls `docker compose exec toxiproxy toxiproxy-cli create slow-dep ...` directly.

Compare with SD08, which correctly does state the compose addition for its new services ("Thêm service `minio` (image `minio/minio`...) vào `docker-compose.yml`" — `sd08-storage-search/module-meta.ts:53`, same pattern at line 79 for opensearch). SD09/SD10/SD11 skip this step entirely for toxiproxy. Net effect: a learner following the lab as written from SD09 onward has no running `toxiproxy` container and every one of these lab commands fails immediately. Fix: add one explicit "add toxiproxy (image `ghcr.io/shopify/toxiproxy`, port `8474:8474`) to docker-compose.yml" step, ideally in SD09 (first real usage) since that predates SD11 in curriculum order, and update SD01's narrative reference from "(SD11)" to "(SD09)".

## High

### H1. SD01 playground service-introduction credit is inconsistent with actual first use (compounds C2)
Beyond the toxiproxy gap itself, the specific claim in SD01 ("Toxiproxy (SD11)") is simply wrong relative to the rest of the course — SD09 is the first (and, per the checked files, only fully-described) consumer. Low cost to fix alongside C2 since it's one sentence.

## Medium

None found that aren't already covered above — outbox table reuse (SD07→SD08→SD12→SD15), idempotency-consumer reuse (SD07→SD15/SD18), SD16↔SD03 stateless/sticky-session callback, SD18↔SD05 locking callback, and SD13↔DevOps-course-m16 SLO/error-budget callback were all spot-checked and match the mechanism/schema of the module they cite (verified: `sd07-async-messaging/lessons/transactional-outbox-cdc.mdx:29-39` outbox schema identical to what SD08/SD12 assume; `delivery-semantics-idempotency.mdx:48-52` `processed_messages(consumer, message_id)` matches SD15's `dispatch_dedup` claim; `m16-sre-practices/lessons/sli-slo-sla.mdx` + `error-budget-policy.mdx` exist and cover exactly what SD13 says they cover).

Redpanda (SD07→SD12/SD15), MinIO/OpenSearch (SD08, self-contained), etcd 3-node cluster (SD10, self-contained), PgBouncer (SD06, self-contained) service names/ports/images are internally consistent — no contradictions found across the modules that reuse them.

## Low / Informational

- Analogy reuse: broad settings (restaurant, apartment building "chung cư", post office "bưu điện/bưu cục", call-center "tổng đài") recur across many modules for different mechanisms (e.g. "chung cư" for SD07 queue/pub-sub/log, SD09 quorum, SD09 consistency models; "tổng đài" for SD10 split-brain, SD14 caching, SD15 notification retry, SD16 chat estimation/gateway). Each occurrence tells a distinct, non-contradictory scenario — no case found where the *same* analogy is reused for the same recurring idea in a wrong/contradictory way, nor a case likely to confuse a learner going through in order. No action needed.
- SD10 resource link `http://thesecretlivesofdata.com/raft/` uses `http://` not `https://` — real site, works, just worth normalizing to https if the linter ever checks protocol (not currently enforced).
- SD06 (`read-replicas-and-failover.mdx:74`) forward-references "bài toán consensus của SD10" before the learner has taken SD10 — acceptable as a teaser, not a defect.

## Resource URLs (module-meta.ts `resources`)
All 19 modules' resource arrays checked (~130 URLs). No fabricated or fake-looking URLs found. Spot-verified the least-obviously-legit ones:
- `bytebytego.com/courses/system-design-interview/design-a-news-feed-system` (SD15) — real, live page.
- `hellointerview.com/learn/system-design/problem-breakdowns/fb-news-feed` (SD15) — real, live page.
- `amazon.com/dp/1736049119` (SD17) — resolves to a real book (System Design Interview Vol. 2 by Alex Xu/Sahn Lam; ISBN differs slightly from ASIN by print variant but the product page is legitimate).
- `youtube.com/watch?v=x7drE24geUw` (SD09) — real video, "CRDTs: The Hard Parts", title/attribution in the resource entry matches.
All other URLs point to root/well-known doc pages (official docs, RFC, MDN, AWS/GCP whitepapers, Martin Fowler/Kleppmann blogs, microservices.io, etc.) — no deep-link fabrication pattern detected.

## Numbering / Ordering / IDs
- sd01..sd19 `order`, `phaseId` (`sd-phase-0` through `sd-phase-4`), and `weeks` fields in every `module-meta.ts` match `docs/system-design-curriculum.md` section 2's table exactly (phase boundaries at sd02/sd03, sd08/sd09, sd12/sd13, sd13/sd14; weeks 1-2 through 24) — verified field-by-field, no drift.
- No `m`-prefixed ids found inside any sd0*/sd1* folder (only false-positive substring matches like `mod-n-add-node`, `minio-...`, `multipart-...` — none collide with the DevOps course's `m01`-`m17` ids). Registry (`src/content/curriculum-registry.ts`) imports and lists all 19 sd modules alongside the 17 m modules with no duplicate id.

## Unresolved Questions
1. For C1, is there a preference for standardizing on `app`/`app` (majority convention, 13 files) vs `playground`/`playground` (SD01's actual shipped compose file, 4 files) vs something else? Affects whether the fix touches SD01's compose block or the other 20 lesson files.
2. For C2, should the toxiproxy compose-addition step live in SD09 (first real use) or should SD09's toxiproxy lab be deferred/reordered to after SD11 to match SD01's stated narrative? Either is a valid fix; picking one affects which module's file gets edited.
