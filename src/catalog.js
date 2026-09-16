const DEFAULT_API_URL = 'https://api.niceapps.club'

export function apiBase(env = process.env) {
  return String(env.NICEAPPS_API_URL || DEFAULT_API_URL).replace(/\/$/, '')
}

export function parseScreenshots(value) {
  if (Array.isArray(value)) return value.filter(item => typeof item === 'string' && item)
  try {
    const parsed = JSON.parse(String(value || '[]'))
    return Array.isArray(parsed) ? parsed.filter(item => typeof item === 'string' && item) : []
  } catch {
    return []
  }
}

export function normalizeApp(row) {
  return {
    slug: String(row.slug || ''),
    name: String(row.name || ''),
    category: String(row.category || ''),
    description: String(row.description || ''),
    long_description: String(row.long_description || ''),
    developer: String(row.developer || ''),
    platform: String(row.platform || 'iOS'),
    app_store_url: String(row.app_store_url || ''),
    website_url: String(row.website_url || ''),
    icon: String(row.icon || ''),
    screenshots: parseScreenshots(row.screenshots),
    is_dot_pick: Boolean(row.is_dot_pick),
  }
}

export function scoreApp(app, query, category = '') {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
  const haystack = [app.name, app.category, app.description, app.long_description, app.developer]
    .join(' ')
    .toLowerCase()
  const textScore = terms.reduce((score, term) => score + (haystack.includes(term) ? 2 : 0), 0)
  const categoryScore = category && app.category.toLowerCase() === category.toLowerCase() ? 3 : 0
  return textScore + categoryScore + (app.is_dot_pick ? 0.25 : 0)
}

export function searchCatalog(apps, { query = '', category = '', limit = 8 } = {}) {
  const normalized = apps.map(normalizeApp)
  return normalized
    .map(app => ({ app, score: scoreApp(app, query, category) }))
    .filter(item => !query && !category ? true : item.score > 0)
    .sort((a, b) => b.score - a.score || a.app.name.localeCompare(b.app.name))
    .slice(0, limit)
    .map(item => item.app)
}

export async function fetchCatalog(fetcher = fetch, env = process.env) {
  const response = await fetcher(`${apiBase(env)}/api/apps`, { headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error(`niceapps.club API returned ${response.status}`)
  const payload = await response.json()
  if (!Array.isArray(payload)) throw new Error('niceapps.club API returned an invalid catalog')
  return payload.map(normalizeApp)
}

export async function importAppStore(input, fetcher = fetch, env = process.env) {
  const workerUrl = `${apiBase(env)}/api/import/app-store?url=${encodeURIComponent(input)}`
  const workerResponse = await fetcher(workerUrl, { headers: { Accept: 'application/json' } })
  const workerPayload = await workerResponse.json().catch(() => ({}))
  if (workerResponse.ok) return workerPayload

  // Apple can reject lookup calls from a Cloudflare Worker while accepting the
  // same public request from the user's machine. The local MCP is the natural
  // fallback boundary for that case.
  const id = String(input).match(/(?:id|\/id)(\d{5,})/i)?.[1] || String(input).match(/^\d{5,}$/)?.[0]
  const appleUrl = id
    ? `https://itunes.apple.com/lookup?id=${id}&country=us`
    : `https://itunes.apple.com/search?term=${encodeURIComponent(input)}&entity=software&country=us&limit=1`
  const appleResponse = await fetcher(appleUrl, { headers: { Accept: 'application/json' } })
  const applePayload = await appleResponse.json().catch(() => ({}))
  if (!appleResponse.ok) {
    throw new Error(workerPayload.error || `App Store import returned ${workerResponse.status}`)
  }

  const result = applePayload.results?.[0]
  if (!result) throw new Error('No app found')
  const screenshots = (result.screenshotUrls?.length ? result.screenshotUrls : (result.ipadScreenshotUrls || []))
    .filter(Boolean)
    .map(imageUrl => imageUrl.replace(/^http:/, 'https:').replace(/\/\d+x\d+bb\./, '/640x960bb.'))
  const longDescription = String(result.description || '').trim()
  const firstParagraph = longDescription.split(/\n\s*\n/)[0] || longDescription
  const description = firstParagraph.length > 280 ? `${firstParagraph.slice(0, 277).trimEnd()}…` : firstParagraph

  return {
    name: result.trackName || '',
    category: result.primaryGenreName || 'Productivity',
    description,
    long_description: longDescription,
    developer: result.artistName || '',
    platform: 'iOS',
    app_store_url: result.trackViewUrl || '',
    icon: result.artworkUrl512 || result.artworkUrl100 || '✦',
    accent: '#b8f25a',
    screenshots,
    apple_id: result.trackId || 0,
    website_url: result.sellerUrl || '',
  }
}
