# Product

## Promise

Niceapps Creative Studio helps developers and agents make stronger decisions before App Store screenshot production begins. It combines a curated reference catalog with an explicit workflow for product understanding, reference selection, messaging, sequence planning, art direction, critique, copy preflight, and technical export validation.

The intended output is a designer-ready specification, not finished marketing artwork. The Screenshot Studio skill defines that deliverable in [`plugins/niceapps-creative-studio/skills/screenshot-studio/SKILL.md`](../../plugins/niceapps-creative-studio/skills/screenshot-studio/SKILL.md).

## Users and entry paths

- Developers preparing screenshots for a published iOS app may begin with an App Store URL or Apple ID.
- Teams with an unreleased app may supply a product brief, feature list, Figma export, landing page, current campaign, or raw product screenshots.
- Designers or developers with an existing campaign may request critique, copy-fit checks, or technical export validation.
- A rejected direction may be recorded so the next proposal changes its image-making method and composition rather than only its palette.

## Product boundary

In scope:

- public catalog and App Store context retrieval;
- frame-level reference retrieval with explained matches;
- visual reference boards using actual approved screenshots;
- positioning, narrative, copy, screen selection, and art-direction planning;
- rejected-direction memory and alternative-diversity checks;
- measurable copy and export validation.

Out of scope for the public MCP:

- generating final App Store artwork;
- claiming aesthetic similarity predicts conversion lift;
- inventing unsupported product capabilities;
- publishing or uploading to App Store Connect;
- replacing full-resolution human creative review.

## Quality model

Reference annotations help retrieve candidates but are not visual evidence by themselves. Agents must inspect selected images before transferring principles. Technical validity and subjective creative acceptance remain separate gates. The maintained rubric is [`quality-rubric.md`](../../plugins/niceapps-creative-studio/skills/screenshot-studio/references/quality-rubric.md).

## Evidence

- **Verified 2026-09-17:** public tool registration in [`src/index.js`](../../src/index.js), skill workflow, README product language, and current tests were inspected.
- **Owner decision:** image generation remains excluded after repeated prototype results were judged too template-like or realism-led for the intended App Store design use case; release history is retained in [`CHANGELOG.md`](../../CHANGELOG.md).
