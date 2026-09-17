# Project log

Entries are reverse chronological. Each records the durable result, affected areas, decisions, verification, deployment, and remaining work.

## 2026-09-17 — Standalone project wiki and full-catalog synchronization

- **Scope:** Established a source-aware wiki for the standalone MCP repository, strengthened the repository agent contract, synchronized the completed full-catalog reviewed annotation dataset from the former combined site repository, refreshed a retrieval expectation that the expanded catalog superseded, and repaired the Codex project-registration mismatch that prevented repository-aware commit/push controls.
- **Affected areas:** `AGENTS.md`, `README.md`, `CHANGELOG.md`, `data/screenshot-annotations.json`, `test/annotations.test.js`, `evals/retrieval-cases.json`, and `docs/wiki/{index,product,architecture,implementation,decisions,roadmap,log}.md`; Codex saved-project registration.
- **Decisions:** The standalone repository is canonical for MCP source and releases. Retain npm/stdio installation while adding a shared HTTPS transport for public-directory distribution. Treat catalog-to-annotation parity as a release concern rather than assuming the site and MCP repositories remain synchronized.
- **Verification:** `npm test` passed 25 cases, including annotation structure and exact 55-set/418-frame coverage. The first live retrieval evaluation exposed one stale 11-app-era expected result; after updating that fixture, `npm run eval:retrieval` passed all three briefs and seven lanes against the production catalog. `npm run validate` confirmed plugin, skill, registry metadata, and the ten-tool surface. `npm pack --dry-run` reran all tests and produced the intended ten-file package (29.9 kB packed, 153.3 kB unpacked). `git diff --check` passed, and all seven wiki pages passed the relative-link/path check with zero broken targets. The Codex-saved project path now resolves through a symlink to the canonical repository, and `git rev-parse`, `git remote -v`, and status inspection from that saved path resolve the correct working tree and GitHub remote.
- **Deployment:** Source update only; npm 0.8.0 was not republished.
- **Follow-up:** Implement and submit the remote MCP. Add automated live catalog parity so future coverage drift fails visibly.
