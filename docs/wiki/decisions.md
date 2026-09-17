# Decisions

## 2026-09-17 — Standalone repository is canonical for MCP releases

**Status:** accepted

The standalone `ilyastorunn/niceapps-creative-studio` repository owns MCP source, reviewed annotations, tests, plugin packaging, evaluation, and npm releases. The niceapps.club repository may originate catalog/API work, but MCP changes are not complete until synchronized and verified in the standalone repository.

**Rationale:** splitting the product reduced noise for MCP users, but the 55-app annotation expansion demonstrated that duplicated source trees can drift silently.

## 2026-09-17 — Preserve local installation while adding remote distribution

**Status:** accepted

Keep the npm stdio server for Codex CLI, Claude, Cursor, Windsurf, VS Code, Gemini CLI, and generic local MCP clients. Add a shared-behavior HTTPS transport for OpenAI’s public Plugins Directory rather than replacing local installation.

**Rationale:** the two channels serve different installation models; OpenAI’s public submission requires HTTPS, while npm is already working and cross-client.

## 2026-09-16 — Analysis-first public boundary

**Status:** accepted; supersedes public rendering experiments

Public tools may retrieve and inspect references, plan messaging and narrative, record direction feedback, preflight copy, and validate existing exports. They must not generate or describe automatically composed images as final App Store artwork.

**Rationale:** three creative evaluations produced technically correct but insufficiently distinctive results. A strong designer-ready brief is currently more reliable and honest than automatic production.

## 2026-09-16 — Visual inspection is mandatory

**Status:** accepted

Annotations are retrieval metadata. Agents must use the reference board and inspect actual images before proposing transferable visual principles.

## 2026-09-16 — Technical readiness and creative acceptance are separate

**Status:** accepted

Copy and export validators report measurable facts. They cannot certify taste, originality, persuasion, or conversion performance.

## 2026-09-15 — Human-reviewed annotations remain versioned with the MCP

**Status:** accepted

The catalog/API owns current app records and image URLs; the package owns approved frame-level interpretation. Stale indexes fail closed rather than silently pointing at a different screenshot.

## Sources

- [`CHANGELOG.md`](../../CHANGELOG.md)
- [`README.md`](../../README.md)
- [`plugins/niceapps-creative-studio/skills/screenshot-studio/SKILL.md`](../../plugins/niceapps-creative-studio/skills/screenshot-studio/SKILL.md)
- Owner decisions recorded during the 2026-09-15 through 2026-09-17 implementation sessions.
