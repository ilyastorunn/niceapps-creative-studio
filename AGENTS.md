# Repository agent contract

Niceapps Creative Studio is analysis-first. Do not add image generation or screenshot rendering to the public MCP surface without explicit owner approval and repeatable evaluation evidence.

## Before changing the repository

1. Read [`docs/wiki/index.md`](docs/wiki/index.md), the newest entries in [`docs/wiki/log.md`](docs/wiki/log.md), and the page that owns the area being changed.
2. Verify important claims against current source, tests, manifests, package contents, or runtime behavior. Wiki prose is context, not primary evidence.
3. When implementation and documentation disagree, resolve the mismatch or record it explicitly; never silently choose the convenient version.
4. Preserve unrelated working-tree changes.

## Completion contract

1. Run `npm test`, `npm run eval:retrieval`, `npm run validate`, and `npm pack --dry-run` for MCP behavior, dataset, plugin, or packaging changes.
2. Keep README, plugin metadata, `server.json`, and `CHANGELOG.md` aligned with the public tool surface and release state.
3. Update affected durable wiki pages and append one reverse-chronological entry to `docs/wiki/log.md` for every meaningful code, dataset, configuration, packaging, deployment, or product-boundary change.
4. Preserve the distinction between measurable QA and subjective creative acceptance.
5. Never claim that reference similarity predicts conversion performance.
6. Check touched wiki links, repo-relative paths, and `git diff --check` before reporting completion.
