import fs from 'node:fs/promises'
import process from 'node:process'
import { buildScreenshotIndex, searchScreenshots } from '../src/screenshots.js'

const cases = JSON.parse(await fs.readFile(new URL('./retrieval-cases.json', import.meta.url), 'utf8'))
const catalogUrl = process.env.NICEAPPS_API_URL || 'https://api.niceapps.club'
const response = await fetch(`${catalogUrl.replace(/\/$/, '')}/api/apps`, { headers: { Accept: 'application/json' } })
if (!response.ok) throw new Error(`Catalog returned ${response.status}`)
const index = buildScreenshotIndex(await response.json())

const report = cases.map(testCase => {
  const lanes = testCase.lanes.map(lane => {
    const input = { ...lane.input, exclude_slugs: [testCase.target_slug], per_app_limit: 2 }
    const results = searchScreenshots(index, input)
    const resultSlugs = [...new Set(results.map(item => item.app_slug))]
    return {
      name: lane.name,
      passed: results.length > 0
        && results.every(item => item.app_slug !== testCase.target_slug)
        && lane.expected_any_slugs.some(slug => resultSlugs.includes(slug)),
      input,
      result_slugs: resultSlugs,
      results: results.map(item => ({
        screenshot_id: item.screenshot_id,
        score: item.match_score,
        coverage: item.query_coverage,
        reasons: item.match_reasons,
      })),
    }
  })
  return { id: testCase.id, brief: testCase.brief, passed: lanes.every(lane => lane.passed), lanes }
})

const summary = {
  passed: report.every(testCase => testCase.passed),
  cases: report.length,
  lanes: report.reduce((count, testCase) => count + testCase.lanes.length, 0),
  report,
}
console.log(JSON.stringify(summary, null, 2))
if (!summary.passed) process.exitCode = 1
