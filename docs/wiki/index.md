# Niceapps Creative Studio project wiki

This wiki is the durable synthesis layer for the standalone `niceapps-creative-studio` repository. It records the product boundary, architecture, verified implementation, durable decisions, release work, and known gaps without replacing source code, tests, manifests, or owner decisions as primary evidence.

## Current status

Niceapps Creative Studio is an analysis-first MCP server and Codex plugin for researching App Store screenshot references and turning product evidence into messaging, narrative, critique, and a designer-ready art-direction brief. The public MCP deliberately does not generate finished screenshot artwork.

The canonical repository is `https://github.com/ilyastorunn/niceapps-creative-studio`; npm distributes the local stdio server as `niceapps-creative-studio`. A GitHub-backed Codex marketplace packages the MCP with the Screenshot Studio skill. Public Plugins Directory submission is planned but requires a stable HTTPS MCP endpoint and OpenAI review.

As of 2026-09-17, the standalone repository is being synchronized with the completed full-catalog review: 418 screenshots across all 55 apps in the corresponding niceapps.club snapshot. See [Implementation](implementation.md) for the verification boundary and [Roadmap](roadmap.md) for catalog-drift handling.

## Reading order

1. [Product](product.md) — users, promise, scope, non-goals, and quality boundary.
2. [Architecture](architecture.md) — package, plugin, catalog, annotation, and planned remote-MCP boundaries.
3. [Implementation](implementation.md) — current tools, important paths, data coverage, tests, and known gaps.
4. [Decisions](decisions.md) — durable product and architecture choices with rationale.
5. [Roadmap](roadmap.md) — committed next work versus later ideas.
6. [Log](log.md) — reverse-chronological work and verification history.

## Evidence rules

- Current owner decisions, reproduced runtime behavior, passing tests, and inspected implementation outrank historical prose.
- Material claims link to repository paths or record the command/date that verified them.
- Conflicts remain explicit until source, tests, runtime evidence, or the owner resolves them.
- The wiki describes current behavior; `CHANGELOG.md` retains release history.

## Primary sources

- [`README.md`](../../README.md)
- [`AGENTS.md`](../../AGENTS.md)
- [`src/`](../../src)
- [`test/`](../../test)
- [`data/screenshot-annotations.json`](../../data/screenshot-annotations.json)
- [`plugins/niceapps-creative-studio/`](../../plugins/niceapps-creative-studio)
- [`server.json`](../../server.json)
- [`CHANGELOG.md`](../../CHANGELOG.md)
