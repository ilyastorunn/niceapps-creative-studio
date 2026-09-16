# Screenshot quality rubric

Score each dimension from 0 to 5 and explain any score below 4.

| Dimension | Evaluation question |
| --- | --- |
| Product understanding | Does the set represent the app's actual audience, problem, and outcome? |
| Reference relevance | Is every reference selected for a clear, defensible reason? |
| Narrative | Does the sequence progress without repeating the same message? |
| Copy | Is the copy specific, readable, concise, and supported by evidence? |
| UI selection | Does each chosen product screen prove the accompanying claim? |
| Visual system | Is the set coherent without becoming compositionally monotonous? |
| Readiness | Is every frame already a separately exported, opaque, correctly sized ASC upload rather than merely ready to proceed to export? |

Use these failure tags when relevant:

- `insufficient-app-context`
- `wrong-reference-selection`
- `generic-copy`
- `unsupported-claim`
- `weak-narrative`
- `poor-ui-selection`
- `visual-inconsistency`
- `unreadable-text`
- `over-derived-from-reference`
- `missing-raw-screens`
- `wrong-asc-dimensions`
- `non-uploadable-artifact`
- `mutated-source-ui`

## Final-output gate

Keep technical validity and creative acceptance separate. Compare the actual portrait opening with selected references at equal displayed height, and record specific weaknesses rather than awarding quality based on export success. An export can be technically valid and still rejected visually. A new visual direction should be proven on the opening before set-wide production.

A set cannot score above 2 for readiness or be called final unless all of the following are verified:

- a current Apple-supported screenshot slot and device family are named;
- every ordered frame exists as its own PNG or JPEG at the slot's exact dimensions;
- files are opaque RGB, open successfully, and have deterministic sequence names;
- source UI remains faithful to the supplied capture rather than generatively reconstructed;
- headlines and supporting copy were checked in the rendered files;
- the set was inspected both at full resolution and at reduced storefront-like size.

The score is diagnostic, not proof of conversion performance. Never describe reference popularity, visual polish, or this rubric as an A/B test result.
