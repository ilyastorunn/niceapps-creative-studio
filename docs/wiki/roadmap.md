# Roadmap

This page separates committed next work from ideas. It is not a release promise.

## Now

- Keep the standalone repository’s 55-app / 418-screenshot reviewed index synchronized with catalog changes.
- Treat the wiki and its log as part of completing meaningful repository work.
- Preserve the analysis-first boundary while preparing remote distribution.

## Next

- Refactor tool registration so stdio and remote transports share one server definition.
- Deploy a stable public HTTPS MCP endpoint suitable for OpenAI scanning and review.
- Add accurate `readOnlyHint`, `openWorldHint`, and `destructiveHint` annotations to every remote tool.
- Publish support, Privacy Policy, and Terms pages that match actual public-data use and local-write behavior.
- Prepare production listing copy, logo, starter prompts, at least five positive and three negative review cases, availability, and release notes.
- Verify developer identity and Apps Management access, complete domain verification, scan tools, then submit through the OpenAI Platform plugin portal.
- Add a deterministic catalog/annotation parity report so future catalog drift is visible before release.

## Later

- Expand copy-measurement slots only with fixtures and a demonstrated need.
- Improve retrieval semantics only if repeatable evaluation shows explainable lexical retrieval is the limiting factor.
- Add cross-platform verification for Linux and Windows.

## Explicitly not planned

- Automatic final screenshot generation without a new owner decision and repeatable evidence that it improves the product.
- Claims that reference similarity, catalog inclusion, or rubric scores predict App Store conversion.

## Evidence

- OpenAI public plugin requirements: <https://developers.openai.com/plugins/deploy/submission>.
- Current transport and manifest: [`src/index.js`](../../src/index.js), [`server.json`](../../server.json).
