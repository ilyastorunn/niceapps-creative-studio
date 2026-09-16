import sharp from 'sharp'

const escapeXml = value => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')

const fetchImage = async url => {
  let response
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(30000), headers: { 'user-agent': 'niceapps-creative-studio/0.8' } })
  } catch (error) {
    throw new Error(`Reference image request failed: ${error.cause?.message || error.message}`)
  }
  if (!response.ok) throw new Error(`Reference image request failed with HTTP ${response.status}`)
  const bytes = Buffer.from(await response.arrayBuffer())
  const metadata = await sharp(bytes).metadata()
  if (!metadata.width || !metadata.height) throw new Error('Reference image is unreadable')
  return bytes
}

export async function createReferenceBoard(screenshots, screenshotIds, { apiUrl = 'https://api.niceapps.club' } = {}) {
  const byId = new Map(screenshots.map(item => [item.screenshot_id, item]))
  const selected = screenshotIds.map(id => {
    const item = byId.get(id)
    if (!item) throw new Error(`No approved screenshot found for id: ${id}`)
    return item
  })
  const columns = Math.min(3, selected.length)
  const rows = Math.ceil(selected.length / columns)
  const cardWidth = 360
  const imageHeight = 560
  const labelHeight = 76
  const gap = 20
  const padding = 24
  const boardWidth = padding * 2 + columns * cardWidth + (columns - 1) * gap
  const boardHeight = padding * 2 + rows * (imageHeight + labelHeight) + (rows - 1) * gap
  const layers = []

  for (const [index, item] of selected.entries()) {
    const left = padding + (index % columns) * (cardWidth + gap)
    const top = padding + Math.floor(index / columns) * (imageHeight + labelHeight + gap)
    const imageUrl = item.image_url.startsWith('data:')
      ? item.image_url
      : `${apiUrl.replace(/\/$/, '')}/api/reference-screenshots/${encodeURIComponent(item.app_slug)}/${item.position}`
    const image = await sharp(await fetchImage(imageUrl))
      .resize({ width: cardWidth, height: imageHeight, fit: 'contain', background: '#151515' })
      .png()
      .toBuffer()
    const label = Buffer.from(`<svg width="${cardWidth}" height="${labelHeight}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#151515"/>
      <text x="16" y="30" fill="#f7f5ef" font-family="Arial, sans-serif" font-size="19" font-weight="700">${escapeXml(item.app_name)}</text>
      <text x="16" y="56" fill="#aaa8a2" font-family="Arial, sans-serif" font-size="15">Frame ${item.position} · ${escapeXml(item.communication_job)}</text>
    </svg>`)
    layers.push({ input: image, left, top })
    layers.push({ input: label, left, top: top + imageHeight })
  }

  const image = await sharp({ create: { width: boardWidth, height: boardHeight, channels: 3, background: '#080808' } })
    .composite(layers)
    .removeAlpha()
    .png({ compressionLevel: 9 })
    .toBuffer()

  return {
    image,
    width: boardWidth,
    height: boardHeight,
    references: selected,
  }
}
