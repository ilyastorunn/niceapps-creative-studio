# Changelog

## Unreleased

- Completed full-catalog retrieval coverage with 418 visually reviewed screenshots across all 55 apps in the 2026-09-17 catalog snapshot, plus structural, coverage, and refreshed live-retrieval regression cases.
- Added a source-aware project wiki and strengthened the repository agent contract so product boundaries, architecture, decisions, verification, and cross-repository synchronization remain durable.
- Added installation instructions for Codex, Claude Code, Claude Desktop, Cursor, Windsurf, VS Code, Gemini CLI, Windows, and generic stdio MCP clients.
- Ignored generated output, local environment files, evaluation results, feedback snapshots, and local Creative Studio state.
- Removed the stale committed retrieval-evaluation result; reproducible evaluation cases and the runner remain versioned.

## 0.8.0 — Visual reference boards

- Repositioned the public MCP as an analysis-first product and removed `render_preview` and `render_screenshot_set` from the exposed tool surface after creative evaluations produced template-like work.
- Rebuilt the public documentation around reference research, critique, messaging, narrative, and designer-ready art-direction briefs.
- Added `get_reference_board`, which returns selected catalog screenshots as real MCP image content for side-by-side inspection.
- Added a catalog-owned Worker image proxy so local MCP clients can reliably load approved App Store artwork without accepting arbitrary URLs.
- Made visual inspection mandatory before creative direction; annotations are now explicitly retrieval metadata rather than a substitute for sight.
- Reframed rendering as faithful composition. Presets and geometric motifs are low-level probes, not an automatic creative solution.
- Added regression coverage for reference-board rendering and proxy source restrictions.
- Added persistent rejected-direction feedback with explicit preserve/avoid constraints.
- Added visual comparison boards and a deterministic diversity gate: replacements must change at least three core axes, including image-making method and composition.

## 0.7.0 — Art-directed composition

- Added the `art-directed` layout for product-specific copy and source placement.
- Added solid and multi-stop gradient backgrounds plus optional local background images.
- Added configurable dot-grid, grid, and rings motifs for evidence-based visual systems.
- Added per-direction concepts to render manifests so creative decisions remain reviewable.
- Extended copy preflight to use custom typography widths, positions, and source collision geometry.
- Kept the original three preset layouts fully backward compatible.

## 0.6.0 — Standalone npm MCP

- Published the MCP server as the `niceapps-creative-studio` npm package with a direct `npx` entrypoint.
- Switched the Codex plugin to a pinned npm-backed server command.
- Added package metadata, a self-contained package README and license, CI, and a provenance-ready release workflow.
- Reworked repository and plugin documentation around installation, architecture, tool stages, output evidence, and quality boundaries.

## 0.5.0 — Initial public preview

- Added nine MCP tools spanning catalog lookup, screenshot-level retrieval, App Store import, localized-copy preflight, deterministic rendering, and export validation.
- Added 92 human-reviewed screenshot annotations across 11 varied apps.
- Added explainable retrieval with target-app exclusion, query-coverage ranking, exact filters, and per-app diversity limits.
- Added three controlled composition layouts and a production `1290 × 2796` iPhone screenshot preset.
- Added source hashes and interior-pixel equality proofs to rendered output manifests.
- Added localized copy measurement using the exact target canvas and renderer typography.
- Added behavioral, retrieval, rendering, integrity, and failure-path tests.

This is a public preview. It supports one production device slot, uses locally available font fallbacks, and requires human review before App Store submission.
