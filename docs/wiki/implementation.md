# Implementation

## Current public behavior

The MCP exposes ten tools through `@modelcontextprotocol/sdk` and Zod schemas. Structured results are returned as both human-readable JSON text and `structuredContent`; reference and comparison boards also return PNG image content.

Catalog search is explainable lexical matching over normalized public app metadata. Screenshot search applies weighted field matching, exact filters, target-app exclusion, query-coverage ranking, and a per-app diversity cap. It does not use embeddings and does not present ranking as conversion evidence.

## Reviewed dataset

The 2026-09-17 full-catalog expansion contains 55 approved app sets and 418 reviewed screenshots. Every set has ordered, contiguous screenshot indexes and required retrieval fields. [`test/annotations.test.js`](../../test/annotations.test.js) is the structural and coverage regression gate.

This is a snapshot relationship, not a permanent claim that every future niceapps.club item is reviewed. Catalog additions or screenshot reordering can create drift because live image URLs and bundled annotations have different owners.

## Important paths

- [`src/index.js`](../../src/index.js) — MCP server registration and public tool schemas.
- [`src/catalog.js`](../../src/catalog.js) — catalog normalization, search, network access, and App Store import fallback.
- [`src/screenshots.js`](../../src/screenshots.js) — reviewed-index construction and screenshot retrieval.
- [`src/reference-board.js`](../../src/reference-board.js) — approved screenshot contact sheets.
- [`src/directions.js`](../../src/directions.js) — rejected-direction persistence and diversity comparison.
- [`src/rendering.js`](../../src/rendering.js) — internal composition primitives plus public copy/export validation.
- [`data/screenshot-annotations.json`](../../data/screenshot-annotations.json) — reviewed retrieval data.
- [`test/`](../../test) — unit, integration-style, path-safety, image, and dataset integrity tests.
- [`evals/`](../../evals) — repeatable retrieval briefs and live evaluation runner.
- [`plugins/niceapps-creative-studio/`](../../plugins/niceapps-creative-studio) — Codex plugin manifest and skill.
- [`scripts/validate-package.mjs`](../../scripts/validate-package.mjs) — package/plugin/skill/tool-surface consistency validation.

## Verification contract

For MCP behavior changes, the repository contract requires:

```bash
npm test
npm run eval:retrieval
npm pack --dry-run
```

`npm run validate` additionally checks plugin, skill, registry metadata, and the ten-tool public surface. Live retrieval evaluation depends on `api.niceapps.club` and therefore verifies integration state rather than only deterministic local behavior.

## Known gaps

- The public Plugins Directory needs a remote HTTPS MCP transport; only stdio is currently implemented.
- Tool annotations required for OpenAI review are not yet present.
- Privacy Policy and Terms URLs suitable for a public plugin listing are not yet recorded in this repository.
- The full-catalog dataset is manually reviewed but does not yet have an automated parity check against every new live catalog revision.
- Copy measurement supports one named iPhone canvas and locally available font fallbacks can differ across operating systems.
- Cross-platform verification beyond macOS remains incomplete.

## Evidence

- **Verified 2026-09-17:** implementation and test files above were inspected; dataset counts were computed directly from the bundled JSON.
- **Not yet verified in this setup task:** production remote MCP behavior, OpenAI portal scanning, or public-directory review.
