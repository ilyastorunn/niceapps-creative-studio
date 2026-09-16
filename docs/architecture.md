# Architecture

Niceapps Creative Studio has three public layers:

1. The npm package runs a local stdio MCP server from `src/index.js`.
2. The Codex plugin in `plugins/niceapps-creative-studio/` combines that MCP with the Screenshot Studio skill.
3. The public `api.niceapps.club` service supplies catalog metadata and approved screenshot assets.

The bundled annotation dataset in `data/screenshot-annotations.json` owns human review and searchable visual vocabulary. At runtime it is joined to current catalog entries so the catalog remains the source of screenshot URLs. Stale indexes fail closed.

The product is analysis-first. Retrieval, visual reference boards, direction feedback, copy measurement, and validation are exposed. Screenshot generation and rendering are not public MCP capabilities.

Local writes occur only for explicitly requested direction-feedback files and optional comparison boards. Path checks restrict them to the current project or the operating-system temporary directory. The server does not upload assets or mutate App Store Connect.
