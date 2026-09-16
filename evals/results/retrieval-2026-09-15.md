# Screenshot retrieval evaluation — 2026-09-15

## Scope

Evaluated screenshot-level retrieval against three materially different briefs: calm time awareness, a data-rich running coach, and playful social discovery. Each target app was excluded from its own reference results. Product, visual, and communication relevance were queried separately because those are independent evidence lanes.

## Baseline findings

- Broad natural-language queries over-rewarded generic `primary-benefit` matches.
- A relevant running app existed in the catalog but had no screenshot annotations.
- One visually dominant campaign could occupy most result positions.
- Exact-filter-only results were relevant but initially returned no explanation.

## Changes driven by the evaluation

- Added eight visually reviewed Runmo annotations, bringing the seed to 92 screenshots across 11 apps.
- Added `product_terms` to distinguish product adjacency from visual style.
- Added `exclude_slugs` so a target's existing campaign does not masquerade as inspiration.
- Added a default two-results-per-app cap for reference diversity.
- Added query coverage and made coverage outrank raw weighted score.
- Added explicit reasons for exact-filter matches; query coverage is `null` when there is no text query.
- Added a reproducible seven-lane live evaluation runner.

## Result

All three briefs and all seven retrieval lanes passed their declared relevance checks against the production catalog. The evaluation establishes functional retrieval behavior, not creative quality or conversion performance. The social brief still has weak product-category coverage outside Bump; the useful references are visual and communication-adjacent. That gap should remain visible until more social campaigns are annotated.

## Reproduction

From the repository root, run:

```bash
npm run eval:retrieval
```
