# Phase 04 — Content M02–M17 (parallel agents)

**Priority:** P1 · **Status:** pending · **Depends on:** 02, 03

## Agent split (disjoint file ownership)
| Agent | Modules | Owns |
|---|---|---|
| A | M02 Networking, M03 DevOps mindset | `src/content/modules/m02-*`, `m03-*` |
| B | M04 Docker, M05 CI/CD | `m04-*`, `m05-*` |
| C | M06 AWS core/IAM, M07 AWS networking/compute | `m06-*`, `m07-*` |
| D | M08 Storage/DB/Serverless, M09 Well-Architected | `m08-*`, `m09-*` |
| E | M10 Terraform, M11 Ansible/Packer | `m10-*`, `m11-*` |
| F | M12 K8s core, M13 EKS, M14 GitOps | `m12-*`, `m13-*`, `m14-*` |
| G | M15 Observability, M16 SRE, M17 DevSecOps | `m15-*`, `m16-*`, `m17-*` |

Shared components are read-only for agents; missing primitive → build module-local diagram instead and report.

## Per agent acceptance
- Follows `docs/content-authoring-guide.md`; source topics/labs from `docs/curriculum.md`
- 3–5 lessons/module, ≥1 interactive diagram/lesson, quiz 8–10 questions
- `pnpm typecheck` passes for owned files

## Lead after agents
Wire modules into registry, full build, spot-check rendering.
