import annotations from '../data/screenshot-annotations.json' with { type: 'json' }
import { normalizeApp } from './catalog.js'

const list = value => Array.isArray(value) ? value : (value ? [value] : [])
const words = value => String(value || '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)

export function buildScreenshotIndex(apps, seed = annotations) {
  const bySlug = new Map(apps.map(row => {
    const app = normalizeApp(row)
    return [app.slug, app]
  }))

  return seed.sets.flatMap(set => {
    if (set.status !== 'approved') return []
    const app = bySlug.get(set.app_slug)
    if (!app) return []

    return set.screens.flatMap(screen => {
      const imageUrl = app.screenshots[screen.index]
      if (!imageUrl) return []
      return [{
        screenshot_id: `${app.slug}:${screen.index + 1}`,
        app_slug: app.slug,
        app_name: app.name,
        category: app.category,
        position: screen.index + 1,
        image_url: imageUrl,
        communication_job: screen.communication_job,
        headline_pattern: screen.headline_pattern,
        product_terms: list(screen.product_terms || set.defaults.product_terms),
        visual_style: list(screen.visual_style || set.defaults.visual_style),
        background: list(screen.background || set.defaults.background),
        device_treatment: list(screen.device_treatment || set.defaults.device_treatment),
        composition: list(screen.composition),
        copy_density: screen.copy_density || set.defaults.copy_density,
        annotation_status: set.status,
      }]
    })
  })
}

const fieldMatches = (screenshot, key, requested) => {
  const values = list(screenshot[key]).map(value => String(value).toLowerCase())
  return !requested.length || requested.some(value => values.includes(String(value).toLowerCase()))
}

export function scoreScreenshot(screenshot, query = '') {
  const terms = words(query)
  if (!terms.length) return { score: 0, matched: [] }
  const weightedFields = [
    ['communication_job', 5],
    ['headline_pattern', 4],
    ['product_terms', 4],
    ['visual_style', 3],
    ['composition', 3],
    ['device_treatment', 2],
    ['background', 2],
    ['category', 2],
    ['app_name', 1],
  ]
  const matches = []
  let score = 0
  for (const term of terms) {
    for (const [field, weight] of weightedFields) {
      const haystack = list(screenshot[field]).join(' ').toLowerCase()
      if (haystack.includes(term)) {
        score += weight
        matches.push({ field, term })
        break
      }
    }
  }
  return { score, matched: matches }
}

export function searchScreenshots(screenshots, input = {}) {
  const {
    query = '', category = '', communication_job = [], visual_style = [],
    composition = [], device_treatment = [], exclude_slugs = [], per_app_limit = 2, limit = 8,
  } = input
  const filters = { communication_job, visual_style, composition, device_treatment }
  const activeFilters = Object.entries(filters).filter(([, values]) => list(values).length)

  const excluded = new Set(exclude_slugs.map(value => value.toLowerCase()))
  const ranked = screenshots
    .filter(item => !excluded.has(item.app_slug.toLowerCase()))
    .filter(item => !category || item.category.toLowerCase() === category.toLowerCase())
    .filter(item => activeFilters.every(([key, values]) => fieldMatches(item, key, list(values))))
    .map(item => {
      const scored = scoreScreenshot(item, query)
      const uniqueTerms = new Set(words(query))
      return {
        item,
        ...scored,
        queryCoverage: uniqueTerms.size
          ? new Set(scored.matched.map(match => match.term)).size / uniqueTerms.size
          : null,
      }
    })
    .filter(result => !query || result.score > 0)
    .sort((a, b) => (b.queryCoverage || 0) - (a.queryCoverage || 0) || b.score - a.score || a.item.position - b.item.position)
    .map(({ item, score, matched, queryCoverage }) => ({
      ...item,
      match_score: score,
      query_coverage: queryCoverage,
      match_reasons: [
        ...matched.map(({ field, term }) => `${field.replaceAll('_', ' ')} matches “${term}”`),
        ...activeFilters.map(([field, requested]) => {
          const actual = list(item[field]).map(value => String(value).toLowerCase())
          const match = list(requested).find(value => actual.includes(String(value).toLowerCase()))
          return `${field.replaceAll('_', ' ')} matches filter “${match}”`
        }),
      ],
    }))

  const counts = new Map()
  return ranked.filter(item => {
    const count = counts.get(item.app_slug) || 0
    if (count >= per_app_limit) return false
    counts.set(item.app_slug, count + 1)
    return true
  }).slice(0, limit)
}

export function getScreenshotSet(screenshots, slug) {
  return screenshots.filter(item => item.app_slug === slug).sort((a, b) => a.position - b.position)
}

export const screenshotAnnotationSummary = (seed = annotations) => ({
  version: seed.version,
  reviewed_at: seed.reviewed_at,
  approved_sets: seed.sets.filter(set => set.status === 'approved').length,
  annotated_screenshots: seed.sets.filter(set => set.status === 'approved')
    .reduce((count, set) => count + set.screens.length, 0),
})
