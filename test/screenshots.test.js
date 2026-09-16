import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildScreenshotIndex,
  getScreenshotSet,
  screenshotAnnotationSummary,
  searchScreenshots,
} from '../src/screenshots.js'
import sharp from 'sharp'
import { createReferenceBoard } from '../src/reference-board.js'

const apps = [
  {
    slug: 'calm-plan',
    name: 'Calm Plan',
    category: 'Productivity',
    screenshots: ['one.png', 'two.png'],
  },
  {
    slug: 'money-map',
    name: 'Money Map',
    category: 'Finance',
    screenshots: ['money.png'],
  },
]

const seed = {
  version: 1,
  reviewed_at: '2026-09-15',
  sets: [
    {
      app_slug: 'calm-plan',
      status: 'approved',
      defaults: {
        visual_style: ['minimal', 'warm'],
        product_terms: ['planner', 'calm'],
        background: ['cream'],
        device_treatment: ['large-crop'],
        copy_density: 'low',
      },
      screens: [
        { index: 0, communication_job: 'primary-benefit', headline_pattern: 'outcome', composition: ['top-copy'] },
        { index: 1, communication_job: 'trust', headline_pattern: 'proof', composition: ['metric-card'] },
      ],
    },
    {
      app_slug: 'money-map',
      status: 'draft',
      defaults: {},
      screens: [{ index: 0, communication_job: 'primary-benefit', headline_pattern: 'outcome' }],
    },
  ],
}

test('expands approved set annotations against current catalog image URLs', () => {
  const index = buildScreenshotIndex(apps, seed)
  assert.equal(index.length, 2)
  assert.deepEqual(index[0], {
    screenshot_id: 'calm-plan:1',
    app_slug: 'calm-plan',
    app_name: 'Calm Plan',
    category: 'Productivity',
    position: 1,
    image_url: 'one.png',
    communication_job: 'primary-benefit',
    headline_pattern: 'outcome',
    product_terms: ['planner', 'calm'],
    visual_style: ['minimal', 'warm'],
    background: ['cream'],
    device_treatment: ['large-crop'],
    composition: ['top-copy'],
    copy_density: 'low',
    annotation_status: 'approved',
  })
})

test('searches visual and communication fields and explains matches', () => {
  const results = searchScreenshots(buildScreenshotIndex(apps, seed), { query: 'minimal benefit' })
  assert.equal(results[0].screenshot_id, 'calm-plan:1')
  assert.ok(results[0].match_score > 0)
  assert.ok(results[0].match_reasons.some(reason => reason.includes('visual style')))
  assert.ok(results[0].match_reasons.some(reason => reason.includes('communication job')))
})

test('combines exact filters without forcing an unrelated match', () => {
  const index = buildScreenshotIndex(apps, seed)
  const result = searchScreenshots(index, { visual_style: ['warm'], communication_job: ['trust'] })[0]
  assert.equal(result.position, 2)
  assert.equal(result.query_coverage, null)
  assert.deepEqual(result.match_reasons, [
    'communication job matches filter “trust”',
    'visual style matches filter “warm”',
  ])
  assert.deepEqual(searchScreenshots(index, { query: 'cinematic' }), [])
})

test('supports target-app exclusion and caps results per reference app', () => {
  const index = buildScreenshotIndex(apps, seed)
  assert.deepEqual(searchScreenshots(index, { query: 'calm', exclude_slugs: ['calm-plan'] }), [])
  assert.equal(searchScreenshots(index, { per_app_limit: 1, limit: 8 }).length, 1)
})

test('returns a complete ordered set and annotation provenance', () => {
  const index = buildScreenshotIndex(apps, seed)
  assert.deepEqual(getScreenshotSet(index, 'calm-plan').map(item => item.position), [1, 2])
  assert.deepEqual(screenshotAnnotationSummary(seed), {
    version: 1,
    reviewed_at: '2026-09-15',
    approved_sets: 1,
    annotated_screenshots: 2,
  })
})

test('skips stale annotation indexes instead of returning a broken image', () => {
  const stale = structuredClone(seed)
  stale.sets[0].screens.push({ index: 9, communication_job: 'close', headline_pattern: 'brand' })
  assert.equal(buildScreenshotIndex(apps, stale).length, 2)
})

test('creates a visual board from approved screenshot ids', async () => {
  const first = await sharp({ create: { width: 390, height: 844, channels: 3, background: '#f25f4b' } }).png().toBuffer()
  const second = await sharp({ create: { width: 390, height: 844, channels: 3, background: '#2457f5' } }).png().toBuffer()
  const index = buildScreenshotIndex([{ ...apps[0], screenshots: [
    `data:image/png;base64,${first.toString('base64')}`,
    `data:image/png;base64,${second.toString('base64')}`,
  ] }], seed)
  const board = await createReferenceBoard(index, ['calm-plan:1', 'calm-plan:2'])
  const metadata = await sharp(board.image).metadata()
  assert.equal(board.references.length, 2)
  assert.equal(metadata.width, board.width)
  assert.equal(metadata.height, board.height)
  assert.equal(metadata.channels, 3)
})
