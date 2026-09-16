import test from 'node:test'
import assert from 'node:assert/strict'
import { importAppStore, normalizeApp, parseScreenshots, searchCatalog } from '../src/catalog.js'

const apps = [
  { slug: 'calm', name: 'Calm Plan', category: 'Productivity', description: 'A quiet daily planner', screenshots: '["one.png"]' },
  { slug: 'money', name: 'Money Map', category: 'Finance', description: 'Understand spending', screenshots: [] },
]

test('normalizes serialized screenshots', () => {
  assert.deepEqual(parseScreenshots('["one.png",""]'), ['one.png'])
  assert.deepEqual(normalizeApp(apps[0]).screenshots, ['one.png'])
})

test('searches product language and category', () => {
  assert.equal(searchCatalog(apps, { query: 'planner' })[0].slug, 'calm')
  assert.equal(searchCatalog(apps, { category: 'Finance' })[0].slug, 'money')
})

test('returns no forced match for unrelated terms', () => {
  assert.deepEqual(searchCatalog(apps, { query: 'weather' }), [])
})

test('falls back to a local Apple lookup when the Worker import fails', async () => {
  const requests = []
  const fetcher = async url => {
    requests.push(url)
    if (url.includes('/api/import/app-store')) {
      return new Response(JSON.stringify({ error: 'Apple API request failed (Apple returned 403).' }), { status: 502 })
    }
    return Response.json({ results: [{
      trackName: 'Unscroll',
      primaryGenreName: 'Productivity',
      description: 'A deliberate pause.',
      artistName: 'Nice Apps',
      trackViewUrl: 'https://apps.apple.com/app/id6766120727',
      artworkUrl512: 'icon.png',
      screenshotUrls: ['https://example.com/320x480bb.jpg'],
      trackId: 6766120727,
    }] })
  }

  const result = await importAppStore('6766120727', fetcher, { NICEAPPS_API_URL: 'https://api.example' })
  assert.equal(result.name, 'Unscroll')
  assert.deepEqual(result.screenshots, ['https://example.com/640x960bb.jpg'])
  assert.match(requests[1], /itunes\.apple\.com\/lookup\?id=6766120727/)
})
