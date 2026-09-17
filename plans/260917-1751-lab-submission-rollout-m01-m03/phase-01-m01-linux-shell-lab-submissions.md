# Phase 01 — M01 Linux & Shell: 4 lab submissions

**Priority:** P2 · **Status:** completed · **Effort:** 2h · **Depends on:** 00 · **Blocks:** 04

## Context links
- `src/content/modules/m01-linux-shell/module-meta.ts:29-84` — the 4 labs
- `src/content/modules/m04-docker-containers/module-meta.ts:42-146` — the worked reference (copy its style, not its content)
- `docs/content-authoring-guide.md` §3a (matcher table + invariants rule)

## Overview
Author `submission` for all 4 M01 labs. **All four are class A.** Everything M01 asks for terminates in a command with a stable, documented, machine-readable contract (`sshd -T`, `systemctl is-*`/`show`, shell exit codes) — no prose deliverables in this module.

## Key insights
1. **systemd is the invariant goldmine.** `systemctl show <unit> --property=…` emits `Key=Value` lines — a documented machine-readable contract, unlike `systemctl status`/`list-timers` which are column-formatted and truncate to terminal width. Use `show` / `is-active` / `is-enabled`, never `status` or `list-timers`, in a submission prompt.
2. **`sshd -T` prints the *effective* config in lowercase, one directive per line** (`passwordauthentication no`). Grading this beats grepping `/etc/ssh/sshd_config`, which misses `Include`d drop-ins — a real false-negative source on Ubuntu 22.04+ where cloud-init writes `/etc/ssh/sshd_config.d/*.conf`.
3. **Behavioural checks beat existence checks.** For `healthcheck-script` the script body is learner-authored (no invariant), but its *contract* is specified by the lab: non-zero exit when over threshold. Run it twice with forced thresholds and grade the two exit codes. Same trick as M04's Trivy `--exit-code`.
4. **`NRestarts` proves the restart actually happened**, where `Restart=on-failure` only proves it was configured. Grade the outcome.
5. **Steps text may be edited, lab `id`s may not.** M01 says "ví dụ `DISK_THRESHOLD=80`" — the prompt needs a pinned env-var name, so the step must be tightened in the same pass. M04 left this drift open as a known wart; do not repeat it.

## Requirements
**Functional** — 4 `submission` specs; every check keyed on a machine-invariant; every check has a Vietnamese `hint` that nudges without restating the matcher; `pnpm validate:module m01-linux-shell` clean.
**Non-functional** — every matcher tested against output really captured on a Linux box (see step 1); no prompt asks for a file's contents, only for command output.

## Architecture — draft specs

### 1. `harden-vm` — **A**
`inputKind: "output"` · prompt: run `sudo sshd -T | grep -E '^(passwordauthentication|permitrootlogin)'` then `sudo ufw status | head -3`, paste both.
| check id | matcher | note |
|---|---|---|
| `password-auth-disabled` | `contains` `passwordauthentication no` | `sshd -T` normalises to lowercase |
| `root-login-disabled` | `contains` `permitrootlogin no` | lab step pins `no` (not `prohibit-password`) |
| `firewall-active` | `contains` `Status: active` | `contains` is case-insensitive + whitespace-collapsing by default |

### 2. `backup-script` — **A**
`inputKind: "output"` · prompt: run, in the folder holding `backup.sh`:
`echo "TIMER_ENABLED=$(systemctl is-enabled backup.timer)"; echo "TIMER_ACTIVE=$(systemctl is-active backup.timer)"; shellcheck backup.sh; echo "SHELLCHECK_EXIT=$?"; ls -1 <thư mục backup> | tail -3`
| check id | matcher |
|---|---|
| `timer-enabled` | `contains` `TIMER_ENABLED=enabled` |
| `timer-active` | `contains` `TIMER_ACTIVE=active` |
| `shellcheck-clean` | `numberInRange` `SHELLCHECK_EXIT=\s*(\d+)`, `max: 0` |
| `dated-archive-exists` | `regex` `\d{4}-\d{2}-\d{2}[^\s]*\.tar\.gz` — proves the `$(date +%F)` naming the lab specifies |

### 3. `healthcheck-script` — **A**
`inputKind: "output"` · prompt: run the script twice with forced thresholds, then ShellCheck:
`DISK_THRESHOLD=0 RAM_THRESHOLD=0 LOAD_THRESHOLD=0 ./healthcheck.sh; echo "OVER_EXIT=$?"`
`DISK_THRESHOLD=100 RAM_THRESHOLD=100 LOAD_THRESHOLD=100 ./healthcheck.sh; echo "UNDER_EXIT=$?"`
`shellcheck healthcheck.sh; echo "SHELLCHECK_EXIT=$?"`
| check id | matcher |
|---|---|
| `alerts-when-over-threshold` | `numberInRange` `OVER_EXIT=\s*(\d+)`, `min: 1` |
| `silent-when-under-threshold` | `numberInRange` `UNDER_EXIT=\s*(\d+)`, `max: 0` |
| `shellcheck-clean` | `numberInRange` `SHELLCHECK_EXIT=\s*(\d+)`, `max: 0` |
**Content edit required:** step 4 must name all three env vars (`DISK_THRESHOLD`, `RAM_THRESHOLD`, `LOAD_THRESHOLD`) as the required interface. Setting all three is what makes `UNDER_EXIT=0` deterministic — pinning only `DISK_THRESHOLD` leaves a RAM/load alarm free to fail an honest submission.

### 4. `systemd-app-service` — **A**
`inputKind: "output"` · prompt: after `kill -9`-ing the process and watching systemd restart it, run
`systemctl show my-app --no-pager --property=ActiveState,UnitFileState,User,NRestarts`
| check id | matcher |
|---|---|
| `service-active` | `contains` `ActiveState=active` |
| `service-enabled` | `contains` `UnitFileState=enabled` |
| `runs-as-non-root` | `regex` `^User=(?!root\b)\S`, flags `m` — mirrors M04's `uid=(?!0\b)\d+`; no trailing anchor so a CRLF paste still passes; an unset `User=` (⇒ root) correctly fails |
| `auto-restarted-after-kill` | `numberInRange` `NRestarts=\s*(\d+)`, `min: 1` |

**Matcher coverage this module:** `contains` ✓ · `regex` ✓ · `numberInRange` ✓ · `jsonHasKeys` ✗ (nothing in M01 emits JSON — do not force it).

## Related code files
**Modify** — `src/content/modules/m01-linux-shell/module-meta.ts` (add `submission` ×4; tighten `healthcheck-script` steps; lab `id`s untouched)
**Create / delete** — none

## Implementation steps
1. **Capture real output first.** Plain `docker run ubuntu` has no systemd and no ufw. Use one of: `multipass launch --name lab` (closest to the lab's own instructions), an EC2 free-tier box, or a systemd-enabled container (`docker run -d --privileged jrei/systemd-ubuntu:22.04`) + skip ufw there. Actually run: sshd hardening, a real `backup.timer`, the healthcheck script at both thresholds, and a `my-app.service` that you `kill -9`. Save each paste into the scratchpad.
2. Confirm the three uncertain contracts empirically before authoring: (a) `sshd -T` key casing on the distro used; (b) that `NRestarts` increments after `kill -9` and is not reset by the restart itself; (c) `ufw status` first-line wording.
3. Author the 4 `submission` blocks in `module-meta.ts`, matching M04's formatting.
4. Tighten `healthcheck-script` steps to name the three env vars.
5. `pnpm validate:module m01-linux-shell` → clean.
6. Scratch-script `gradeLabSubmission(spec, capturedOutput)` for each lab: one genuine pass **and** one genuine fail (e.g. `PermitRootLogin yes` still set, timer not enabled, script exiting 0 over threshold, service running as root). All 8 outcomes must be correct.
7. Tune, re-validate, then `pnpm typecheck && pnpm lint && pnpm test`.

## Todo list
- [ ] Real Linux environment stood up (multipass / EC2 / systemd container)
- [ ] Real output captured for all 4 labs, pass **and** fail variants
- [ ] `NRestarts`, `sshd -T` casing, `ufw status` wording empirically confirmed
- [ ] `submission` authored ×4
- [ ] `healthcheck-script` steps pinned to 3 env vars
- [ ] `pnpm validate:module m01-linux-shell` clean
- [ ] 8/8 grader outcomes correct on captured output
- [ ] typecheck + lint + test clean

## Success criteria
- All 4 M01 labs complete only via submission; module page renders 4 panels, no self-tick checkboxes.
- Each check passes on honest output captured from a machine other than the authoring one (different user, hostname, paths) — verified by inspection that no matcher references a machine-specific token.
- Zero diff in any other `module-meta.ts`.

## Risk assessment
| Risk | L×I | Mitigation |
|---|---|---|
| No systemd/ufw available locally → matchers guessed | **High** × **High** | Step 1 is a hard gate; three named environment options; if none is obtainable, downgrade `backup-script`/`systemd-app-service` to B rather than ship guessed matchers |
| `NRestarts` semantics differ by systemd version | Med × High | Step 2 empirical check; fallback check = `contains Restart=on-failure` (weaker but safe) |
| Learner's healthcheck uses different env-var names → false negative | Med × High | Step 4 pins the names in the lab steps; hint names them explicitly |
| `sshd -T` needs root and fails silently for the learner | Med × Med | Prompt spells out `sudo`; hint mentions it |
| Learner stuck without a VM can no longer self-tick | Med × Med | Accepted: the module deliverable already requires a VM. Existing completions are never revoked |

## Security considerations
- `sshd -T` output contains host-key *paths*, never key material. The prompt greps to 2 lines anyway.
- No prompt asks for `~/.ssh/*`, `authorized_keys`, `/etc/shadow` or any file contents — command output only.
- `journalctl -u backup` is deliberately **not** in any prompt: application logs can carry secrets. `systemctl is-*` gives the same signal with no payload.

## Next steps
Phase 04 (cross-module validation). Parallel-safe with 02 and 03.
