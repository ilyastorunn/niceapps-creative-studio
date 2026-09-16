---
name: screenshot-studio
description: Analyze an iOS app and plan or critique an evidence-based App Store screenshot set using relevant niceapps.club references. Use for screenshot audits, creative direction, messaging, story sequencing, copy preflight, or designer-ready briefs. Do not use for image generation, final screenshot rendering, app icon design, or keyword-ranking research.
---

# Screenshot Studio

Produce a specific, evidence-backed screenshot brief. Do not generate final artwork, imitate a reference campaign, or claim that aesthetic similarity proves conversion performance.

## Establish the app context

Support either entry path:

- For a published app, accept an App Store URL or Apple ID and use `import_app_store` when available.
- For an unreleased app, inspect the material the user provides: product description, landing page, feature list, Figma export, onboarding copy, current campaign, or raw in-app screenshots.

Extract known facts before asking questions. Ask only about unresolved information that can materially change positioning, audience, screen selection, copy, or visual direction. Mark uncertainty instead of inventing capabilities. Normalize the result with [references/app-brief.md](references/app-brief.md).

## Retrieve and inspect references

1. Use `search_screenshots` in separate product, visual, and communication lanes.
2. Pass the target app slug through `exclude_slugs` when it already appears in the catalog.
3. Use `get_screenshot_set` when sequence and campaign rhythm matter.
4. Call `get_reference_board` with the strongest screenshot IDs and inspect the returned image. Annotations are an index, not visual evidence.
5. Fall back to `search_apps` and `get_app` only when reviewed frame coverage is absent, and disclose that limitation.

Keep the reference group small and explain why each item is relevant. Describe visible hierarchy, product scale, crop, contrast, typography, material, lighting, image-making method, and communication job. If a lane has no credible match, report the gap instead of weakening filters until something appears.

## Build the screenshot story

Define one positioning statement and one primary audience. Create an ordered sequence in which each frame has a distinct communication job. Adapt the sequence to the app; do not force a universal template.

For every proposed frame provide:

- communication job;
- headline and optional supporting copy;
- claim evidence from the app brief;
- required in-app screen or state;
- composition and product-crop direction;
- image-making method and visual-system notes;
- relevant reference principle and why it transfers;
- unresolved dependency or risk.

Prefer user outcomes over a feature inventory. Keep claims within demonstrated or user-confirmed capabilities. Maintain campaign continuity without repeating the same composition on every frame.

Use `validate_screenshot_copy` when the target slot and locale are known. Repair overflow through clearer writing or deliberate line breaks, not silent global type shrinking. Treat font and canvas measurements as technical evidence only.

## Critique an existing set

Separate findings into product understanding, messaging, sequence, copy, source-screen choice, visual system, and technical export. Evaluate the actual files with [references/quality-rubric.md](references/quality-rubric.md). Prioritize the few changes with the highest expected impact and explain the evidence behind each one.

Use `validate_screenshot_set` only for existing export files. A technically valid set is not necessarily persuasive, original, or ready for publication; human full-resolution and storefront-scale review remain separate gates.

## Respond to rejected directions

Use `record_direction_feedback` to persist the rejected direction's image-making method, palette, composition, device treatment, the user's reason, elements to avoid, and product truths to preserve.

Treat “another design” as a direction reset. Retrieve a materially different reference group and specify two or three new openings that change both image-making method and composition system, plus at least one of palette or device treatment. A new gradient, accent color, prop, crop, or headline over the same system is not a new direction.

If the user or another design tool supplies preview images, use `compare_direction_previews` to verify that the alternatives differ materially. Do not create those preview images with this MCP and do not expand a rejected direction into a full campaign.

## Deliverable contract

Return a designer-ready specification, not finished App Store images. The final response should contain:

1. normalized brief and explicit unknowns;
2. selected references with visible evidence and limitations;
3. positioning and ordered narrative;
4. frame-by-frame copy, source-screen, and composition plan;
5. art-direction system, including image-making method and continuity rules;
6. copy-fit or export findings when relevant;
7. decisions still requiring the user or a human designer.

Never describe a brief, reference board, generated mockup, or technical validation result as upload-ready artwork.
