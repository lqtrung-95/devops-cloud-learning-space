# Phase 02 — M02 Networking: 4 lab submissions

**Priority:** P2 · **Status:** completed · **Effort:** 2.5h · **Depends on:** 00 · **Blocks:** 04

## Context links
- `src/content/modules/m02-networking/module-meta.ts:29-79` — the 4 labs
- `docs/content-authoring-guide.md` §3a
- M04 reference: `src/content/modules/m04-docker-containers/module-meta.ts:42-146`

## Overview
All 4 M02 labs are class **A**, but for three different reasons: `subnet-planning` has one mathematically correct answer, `nginx-reverse-proxy-lb` and `tcpdump-http-capture` produce tool output with decade-stable formats, and `https-letsencrypt` can be graded on the *certificate issuer* rather than on the learner's domain.

## Key insights
1. **Subnet math is the only lab in all 3 modules with a single objectively correct answer.** 8 equal subnets from `/16` ⇒ borrow 3 bits ⇒ `/19`; blocks are `10.0.0.0/19 … 10.0.224.0/19`. Matching the 2nd and last block pins both the prefix and the count — two checks, no arithmetic in the engine.
2. **Grade the CA, not the domain.** The learner's domain is by definition machine-specific, but every Let's Encrypt certificate carries `O = Let's Encrypt` in its issuer. `openssl x509 -noout -issuer` is a stable, scriptable contract.
3. **`nginx -t` writes to stderr.** A prompt that forgets `2>&1` produces an empty paste and a false negative for an honest learner. The exact success wording (`nginx: configuration file … test is successful`) has been unchanged for many years.
4. **Drop `-A` from the tcpdump prompt.** The lab's own step uses `tcpdump -i any -nn -A`, which prints packet **payloads** — an honest learner capturing anything with a cookie or `Authorization` header would paste a live credential into `lab_submission`. Without `-A`, the `Flags [S] / [S.] / [F.]` notation (the actual pedagogical point) is still fully visible and nothing sensitive is. This is a genuinely new security surface that M04 never had.
5. **Round-robin is not gradable and that is fine.** Backend response bodies are learner-authored. Grade what is invariant: config validity, both backends bound to loopback only, and a 2xx through the proxy. Do not invent a check for the un-checkable part.

## Requirements
**Functional** — 4 `submission` specs; `pnpm validate:module m02-networking` clean; each check justified as domain/host-independent.
**Non-functional** — no prompt may cause a credential, cookie, token or packet payload to be pasted.

## Architecture — draft specs

### 1. `subnet-planning` — **A**
`inputKind: "output"` · prompt: run `python3 -c "import ipaddress; print(list(ipaddress.ip_network('10.0.0.0/16').subnets(new_prefix=<prefix bạn tính được>)))"` and paste the output.
| check id | matcher | hint direction |
|---|---|---|
| `correct-new-prefix` | `contains` `10.0.32.0/19` | "8 subnet bằng nhau từ /16 cần mượn 3 bit — tính lại prefix rồi chạy lại lệnh." |
| `eight-equal-subnets` | `contains` `10.0.224.0/19` | "Danh sách chưa đủ 8 block — block cuối cùng chưa đúng." |
Not checked (by design): the `docs/network-plan.md` write-up and the "usable IPs = 8187" column — prose/derived, no stable paste.

### 2. `nginx-reverse-proxy-lb` — **A**
`inputKind: "output"` · prompt: run the three commands and paste everything:
`sudo nginx -t 2>&1`
`ss -tlnp | grep -E ':(3001|3002)'`
`curl -s -o /dev/null -w "PROXY_HTTP=%{http_code}\n" http://127.0.0.1/api/`
| check id | matcher |
|---|---|
| `nginx-config-valid` | `contains` `test is successful` |
| `backend-3001-loopback-only` | `contains` `127.0.0.1:3001` |
| `backend-3002-loopback-only` | `contains` `127.0.0.1:3002` |
| `proxy-returns-2xx` | `numberInRange` `PROXY_HTTP=\s*(\d+)`, `min: 200`, `max: 299` |

### 3. `https-letsencrypt` — **A** (highest friction — see risks)
`inputKind: "output"` · prompt: substitute your domain, run both, paste both:
`curl -sI http://<domain> | head -1`
`echo | openssl s_client -connect <domain>:443 2>/dev/null | openssl x509 -noout -issuer`
| check id | matcher | note |
|---|---|---|
| `http-redirects-to-https` | `regex` `HTTP/[\d.]+ 30[18]` | tolerates HTTP/1.1 and HTTP/2 status lines; linear, no backtracking |
| `letsencrypt-issued-cert` | `contains` `Let's Encrypt` | matches `issuer=C = US, O = Let's Encrypt, CN = …`; case-insensitive by default |
`head -1` on the curl is deliberate — it keeps `Set-Cookie` and auth headers out of the paste.

### 4. `tcpdump-http-capture` — **A**
`inputKind: "output"` · prompt: terminal 1 `sudo tcpdump -i any -nn 'tcp port 80'` (**without `-A`** — payload may contain sensitive data); terminal 2 `curl http://127.0.0.1/`; wait ~2s, `Ctrl-C` terminal 1, paste its output.
| check id | matcher |
|---|---|
| `syn-observed` | `contains` `Flags [S]` |
| `syn-ack-observed` | `contains` `Flags [S.]` |
| `connection-closed` | `regex` `Flags \[F` — matches `[F.]` and `[FP.]` |
`contains` whitespace-collapses and lowercases both sides, so `Flags [S]` cannot false-positive on `Flags [S.]` (the char after `s` differs).
**Content edit required:** step 1 of the lab currently prescribes `-A`; update it to mention `-A` only as an optional local exploration, and tell the learner the submission paste must be the non-`-A` capture.

**Matcher coverage this module:** `contains` ✓ · `regex` ✓ · `numberInRange` ✓ · `jsonHasKeys` ✗.

## Related code files
**Modify** — `src/content/modules/m02-networking/module-meta.ts` (add `submission` ×4; adjust `tcpdump-http-capture` step 1; lab `id`s untouched)
**Create / delete** — none

## Implementation steps
1. **Capture real output.** Docker Compose is available locally — stand up `nginx` + two `python3 -m http.server` backends (3001/3002) and capture `nginx -t`, `ss -tlnp`, and the `curl` write-out. For tcpdump, run it inside a container with `--cap-add=NET_ADMIN` (or on the host) against a local HTTP request and capture the flags output.
2. Verify the two claimed-stable strings verbatim on the captured output: `test is successful`, and the `Flags [S] / [S.] / [F.]` notation on the distro's tcpdump build.
3. For `https-letsencrypt`: capture a real `openssl x509 -noout -issuer` against any public Let's Encrypt-served host (e.g. `letsencrypt.org` itself) to confirm the issuer string shape, and a real 301 status line from any redirecting host. No certificate needs to be issued to verify the *matchers*.
4. Run the subnet python one-liner and confirm the printed `IPv4Network('10.0.32.0/19')` repr contains the bare CIDR text the `contains` matcher needs.
5. Author the 4 `submission` blocks; adjust the tcpdump step text.
6. `pnpm validate:module m02-networking` → clean.
7. Scratch-script `gradeLabSubmission` per lab, pass + fail (wrong prefix `/20`; `nginx -t` failing; a self-signed issuer; a capture with no FIN). 8/8 correct.
8. `pnpm typecheck && pnpm lint && pnpm test`.

## Todo list
- [ ] nginx + 2 backends stood up via Docker Compose, real output captured
- [ ] tcpdump flags output captured (no `-A`)
- [ ] Let's Encrypt issuer string + 301 status line captured from a real host
- [ ] Subnet python output captured
- [ ] `submission` authored ×4
- [ ] `tcpdump-http-capture` step 1 updated to drop `-A` from the submission path
- [ ] `pnpm validate:module m02-networking` clean
- [ ] 8/8 grader outcomes correct
- [ ] typecheck + lint + test clean

## Success criteria
- All 4 labs auto-graded; no matcher mentions a domain, hostname, IP other than the loopback/CIDRs the lab itself pins, or a learner-chosen string.
- The tcpdump prompt provably cannot elicit a packet payload.
- Zero diff in any other `module-meta.ts`.

## Risk assessment
| Risk | L×I | Mitigation |
|---|---|---|
| `https-letsencrypt` now unachievable without a real domain + public IP; the self-tick escape disappears | **High** × Med | The module `deliverable` already mandates domain + HTTPS, so this is not new scope. Open question for the user at the end of this plan — B (evidence-only) is the one-line fallback |
| Cloudflare/CDN in front of the learner's domain ⇒ issuer is not Let's Encrypt ⇒ honest fail | Med × Med | Hint names this case explicitly ("nếu domain đi qua CDN, cert do CDN cấp") |
| tcpdump notation differs on a BSD/macOS build | Low × Med | Lab targets a Linux VM; step 2 verifies on the target distro |
| `ss` absent in a minimal container (iproute2 not installed) ⇒ honest fail | Med × Low | Hint tells the learner to `apt install iproute2`; `netstat -tlnp` prints the same `127.0.0.1:3001` token, so the matcher tolerates either tool |
| `nginx -t` output captured without `2>&1` ⇒ empty paste | Med × High | `2>&1` is inside the prompt; hint says "nhớ kèm `2>&1`" |

## Security considerations
- **tcpdump payloads** — the single biggest new exposure in this rollout; handled by dropping `-A` from the submission path (insight 4).
- `curl -sI | head -1` keeps response headers (`Set-Cookie`, `Authorization` echoes) out of the paste.
- No prompt asks for `/etc/letsencrypt/**` — private keys live there. Only the public certificate's issuer field is requested, via `s_client`.
- `nginx -T` (full config dump) is deliberately not used: it can exceed the 10k truncation limit and may embed paths/credentials.

## Next steps
Phase 04. Parallel-safe with 01 and 03.
