# App brief

Normalize the available evidence into this compact structure. Omit fields that do not affect the work; preserve uncertainty explicitly.

```yaml
app_name: string
release_state: published | unreleased
platform: ios
market: string
language: string
one_line_product: string
primary_audience: string
problem: string
core_outcome: string
confirmed_features: string[]
differentiators: string[]
brand_character: string[]
available_raw_screens:
  - id: string
    visible_state: string
    useful_for: string[]
constraints: string[]
uncertainties: string[]
```

Do not silently convert marketing language into confirmed functionality. A feature is confirmed when it is visible in supplied materials or explicitly confirmed by the user.

Ask at most the smallest coherent group of blocking questions at one time. Continue useful analysis while non-blocking details remain unknown.
