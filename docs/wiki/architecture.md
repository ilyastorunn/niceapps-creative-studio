# Architecture

## Runtime layers

1. The npm package starts a local stdio MCP server from [`src/index.js`](../../src/index.js).
2. The Codex plugin in [`plugins/niceapps-creative-studio/`](../../plugins/niceapps-creative-studio) combines that MCP with the Screenshot Studio skill.
3. `https://api.niceapps.club` supplies live catalog metadata, public App Store import support, and approved screenshot assets.
4. [`data/screenshot-annotations.json`](../../data/screenshot-annotations.json) supplies versioned human review and searchable visual vocabulary.

The live catalog owns current image URLs. At runtime, [`src/screenshots.js`](../../src/screenshots.js) joins those URLs to reviewed annotations by app slug and zero-based screenshot index. Draft sets are excluded and stale indexes fail closed.

## Tool boundaries

[`src/index.js`](../../src/index.js) registers ten public tools across five responsibilities:

- catalog: `search_apps`, `get_app`;
- reference research: `search_screenshots`, `get_screenshot_set`, `get_reference_board`;
- external context: `import_app_store`;
- iteration memory: `record_direction_feedback`, `compare_direction_previews`;
- measurable QA: `validate_screenshot_copy`, `validate_screenshot_set`.

Catalog and reference operations use public network data. Direction feedback and comparison-board output are the only local write paths, and their implementation restricts destinations to the current project or operating-system temporary storage.

## Distribution

- npm package metadata and the executable boundary live in [`package.json`](../../package.json).
- MCP Registry metadata lives in [`server.json`](../../server.json).
- GitHub CI and release publishing live in [`.github/workflows/`](../../.github/workflows).
- The GitHub-backed Codex marketplace entry lives in [`.agents/plugins/marketplace.json`](../../.agents/plugins/marketplace.json).
- The plugin manifest pins the npm-backed server and bundles the skill.

The npm `files` allowlist is the end-user package boundary; repository-only tests, evaluation cases, wiki files, and CI configuration do not enter the published tarball.

## Planned Plugins Directory boundary

The current MCP transport is local stdio and cannot be submitted as an MCP-backed universal-directory plugin. The approved direction is to add a stable, public Streamable HTTP MCP endpoint, expected under the niceapps.club Cloudflare boundary, while retaining stdio/npm for local and cross-client installation.

The remote server should share tool definitions and business logic with the stdio server rather than fork behavior. Public-directory submission also requires accurate tool annotations, domain verification, policy pages, starter prompts, positive and negative review cases, publisher verification, and OpenAI review.

## Dependency and ownership boundary

The standalone repository owns MCP source, annotations, tests, plugin packaging, evaluation cases, and release documentation. The `nice-apps-club` site repository owns the website, catalog API, asset proxy, and public docs route. Changes that originate in the site repository are not considered released in the MCP until deliberately synchronized and verified here.

## Evidence

- **Verified 2026-09-17:** [`src/index.js`](../../src/index.js), [`src/catalog.js`](../../src/catalog.js), [`src/screenshots.js`](../../src/screenshots.js), manifests, package metadata, CI workflows, and current plugin files were inspected.
- **Official external requirement:** OpenAI’s plugin submission documentation requires a stable public HTTPS endpoint for MCP-backed public submissions: <https://developers.openai.com/plugins/deploy/submission>.
