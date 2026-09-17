import test from 'node:test'
import assert from 'node:assert/strict'
import annotations from '../data/screenshot-annotations.json' with { type: 'json' }

test('keeps approved screenshot annotations structurally complete and uniquely addressable', () => {
  const slugs = new Set()

  for (const set of annotations.sets) {
    assert.equal(typeof set.app_slug, 'string')
    assert.ok(!slugs.has(set.app_slug), `duplicate annotation set: ${set.app_slug}`)
    slugs.add(set.app_slug)
    assert.ok(['approved', 'draft'].includes(set.status))
    assert.ok(Array.isArray(set.screens) && set.screens.length > 0)
    assert.deepEqual(set.screens.map(screen => screen.index), set.screens.map((_, index) => index))

    for (const screen of set.screens) {
      assert.equal(typeof screen.communication_job, 'string')
      assert.equal(typeof screen.headline_pattern, 'string')
      assert.ok(Array.isArray(screen.composition) && screen.composition.length > 0)
    }

    if (set.status === 'approved') {
      assert.ok(Array.isArray(set.defaults.visual_style) && set.defaults.visual_style.length > 0)
      assert.ok(Array.isArray(set.defaults.background) && set.defaults.background.length > 0)
      assert.ok(Array.isArray(set.defaults.device_treatment) && set.defaults.device_treatment.length > 0)
      assert.equal(typeof set.defaults.copy_density, 'string')
    }
  }
})

test('includes the reviewed full-catalog expansion batches', () => {
  const approved = annotations.sets.filter(set => set.status === 'approved')
  assert.equal(approved.length, 55)
  assert.equal(approved.reduce((count, set) => count + set.screens.length, 0), 418)
  assert.ok(approved.some(set => set.app_slug === 'moonlitt-moon-phase-tracker'))
  assert.ok(approved.some(set => set.app_slug === 'tide-guide-charts-tables'))
  assert.ok(approved.some(set => set.app_slug === 'strava-run-bike-walk'))
  assert.ok(approved.some(set => set.app_slug === 'how-we-feel'))
  assert.ok(approved.some(set => set.app_slug === 'cosmos-search-discover'))
  assert.ok(approved.some(set => set.app_slug === 'pool-the-screenshot-app'))
  assert.ok(approved.some(set => set.app_slug === 'detail-ai-video-editor'))
  assert.ok(approved.some(set => set.app_slug === 'lumy'))
  assert.ok(approved.some(set => set.app_slug === 'capwords-ai-language-tutor'))
  assert.ok(approved.some(set => set.app_slug === 'clutter-screenshot-organizer'))
})
