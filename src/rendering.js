import fs from 'node:fs/promises'
import crypto from 'node:crypto'
import os from 'node:os'
import path from 'node:path'
import sharp from 'sharp'

const PREVIEW_WIDTH = 430
const PREVIEW_HEIGHT = 932
export const SLOT_PRESETS = {
  IPHONE_69_1290X2796: { width: 1290, height: 2796, device_family: 'iPhone 6.9-inch portrait' },
}
const escapeXml = value => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')

const safeOutputDirectory = value => {
  const resolved = path.resolve(value)
  const safeRoots = [
    os.tmpdir(),
    ...(process.platform === 'win32' ? [] : ['/tmp']),
    path.resolve(process.env.NICEAPPS_OUTPUT_ROOT || process.cwd()),
  ]
  const allowed = safeRoots.some(root => {
    const relative = path.relative(path.resolve(root), resolved)
    return relative && !relative.startsWith('..') && !path.isAbsolute(relative)
  })
  if (!allowed) throw new Error('output_dir must be a child of the current project or operating-system temporary directory')
  return resolved
}

const lines = value => Array.isArray(value) ? value.map(String) : [String(value)]

const HEADLINE_FONT = 'SF Pro Display, Inter, Helvetica Neue, Arial, sans-serif'
const BODY_FONT = 'SF Pro Text, Inter, Helvetica Neue, Arial, sans-serif'

const fraction = (value, fallback) => Number.isFinite(value) ? value : fallback

const typographyMetrics = (width, height, frame = {}) => {
  const directed = frame.layout === 'art-directed' ? frame.art_direction?.copy : null
  if (directed) {
    const headlineSize = Math.round(width * fraction(directed.headline_size, 0.092))
    const bodySize = Math.round(width * fraction(directed.body_size, 0.035))
    return {
      headlineSize,
      headlineLineHeight: Math.round(headlineSize * fraction(directed.headline_line_height, 1.04)),
      bodySize,
      bodyLineHeight: Math.round(bodySize * fraction(directed.body_line_height, 1.3)),
      x: Math.round(width * fraction(directed.x, 0.09)),
      y: Math.round(height * fraction(directed.y, 0.095)),
      width: Math.round(width * fraction(directed.width, 0.82)),
      bodyGap: Math.round(height * fraction(directed.body_gap, 0.035)),
      align: directed.align || 'left',
      headlineWeight: directed.headline_weight || 700,
      letterSpacing: directed.letter_spacing ?? -1.2,
    }
  }
  const headlineSize = Math.round(width * 0.092)
  const headlineLineHeight = Math.round(headlineSize * 1.04)
  const bodySize = Math.round(width * 0.035)
  return {
    headlineSize,
    headlineLineHeight,
    bodySize,
    bodyLineHeight: Math.round(bodySize * 1.3),
    x: Math.round(width * 0.09),
    y: Math.round(height * 0.095),
    width: Math.round(width * 0.82),
    bodyGap: Math.round(height * 0.035),
    align: 'left',
    headlineWeight: 700,
    letterSpacing: -1.2,
  }
}

const visiblePixelBounds = async (svg, width, height) => {
  const { data, info } = await sharp(svg).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  let left = info.width
  let top = info.height
  let right = -1
  let bottom = -1
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      if (data[(y * info.width + x) * info.channels + 3] === 0) continue
      left = Math.min(left, x)
      top = Math.min(top, y)
      right = Math.max(right, x)
      bottom = Math.max(bottom, y)
    }
  }
  if (right < 0) return { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 }
  return { left, top, right, bottom, width: right - left + 1, height: bottom - top + 1 }
}

const lineSvg = ({ text, width, fontSize, fontWeight, fontFamily, letterSpacing = 0 }) => {
  const height = Math.ceil(fontSize * 2)
  return {
    height,
    svg: Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><text x="0" y="${Math.ceil(fontSize * 1.25)}" fill="#fff" font-family="${fontFamily}" font-size="${fontSize}" font-weight="${fontWeight}" letter-spacing="${letterSpacing}">${escapeXml(text)}</text></svg>`),
  }
}

export async function validateScreenshotCopy(input) {
  const preset = input.slot ? SLOT_PRESETS[input.slot] : null
  if (input.slot && !preset) throw new Error(`Unsupported screenshot slot: ${input.slot}`)
  const width = preset?.width || input.width || PREVIEW_WIDTH
  const height = preset?.height || input.height || PREVIEW_HEIGHT
  const reports = []
  const errors = []

  for (const frame of input.frames) {
    const metrics = typographyMetrics(width, height, frame)
    const availableWidth = metrics.width
    const headline = lines(frame.headline)
    const body = frame.body ? lines(frame.body) : []
    const measuredHeadline = []
    const measuredBody = []
    for (const text of headline) {
      const rendered = lineSvg({ text, width: width * 2, fontSize: metrics.headlineSize, fontWeight: metrics.headlineWeight, fontFamily: HEADLINE_FONT, letterSpacing: metrics.letterSpacing })
      measuredHeadline.push({ text, ...(await visiblePixelBounds(rendered.svg, width * 2, rendered.height)) })
    }
    for (const text of body) {
      const rendered = lineSvg({ text, width: width * 2, fontSize: metrics.bodySize, fontWeight: 450, fontFamily: BODY_FONT })
      measuredBody.push({ text, ...(await visiblePixelBounds(rendered.svg, width * 2, rendered.height)) })
    }

    const frameErrors = []
    if (measuredHeadline.some(line => line.width > availableWidth)) frameErrors.push('headline-overflow')
    if (measuredBody.some(line => line.width > availableWidth)) frameErrors.push('body-overflow')
    const bodyY = metrics.y + metrics.headlineLineHeight * Math.max(headline.length, 1) + metrics.bodyGap
    const copyBottom = body.length
      ? bodyY + metrics.bodyLineHeight * (body.length - 1) + Math.max(...measuredBody.map(line => line.bottom - Math.ceil(metrics.bodySize * 1.25)), 0)
      : metrics.y + metrics.headlineLineHeight * (headline.length - 1) + Math.max(...measuredHeadline.map(line => line.bottom - Math.ceil(metrics.headlineSize * 1.25)), 0)
    const box = layoutBox(frame.layout, width, height, frame.art_direction?.source)
    const copyLeft = metrics.x
    const copyRight = metrics.x + availableWidth
    const copyTop = metrics.y - metrics.headlineSize
    const copyLimit = box.top - Math.round(height * 0.025)
    const horizontallyOverlaps = copyLeft < box.left + box.width && copyRight > box.left
    const verticallyOverlaps = copyBottom > box.top && copyTop < box.top + (box.height || height - box.top)
    if (frame.layout === 'art-directed' ? (horizontallyOverlaps && verticallyOverlaps) : copyBottom > copyLimit) frameErrors.push('copy-source-collision')
    const report = {
      id: frame.id,
      fit: frameErrors.length === 0,
      available_width: availableWidth,
      copy_bottom: copyBottom,
      copy_limit: copyLimit,
      headline: measuredHeadline.map(({ text, width: lineWidth }) => ({ text, width: lineWidth, fits: lineWidth <= availableWidth })),
      body: measuredBody.map(({ text, width: lineWidth }) => ({ text, width: lineWidth, fits: lineWidth <= availableWidth })),
      errors: frameErrors,
    }
    reports.push(report)
    if (frameErrors.length) errors.push({ frame: frame.id, codes: frameErrors })
  }

  return {
    status: errors.length ? 'failed' : 'passed',
    slot: input.slot || null,
    locale: input.locale || 'en-US',
    width,
    height,
    fonts: { headline: HEADLINE_FONT, body: BODY_FONT },
    frames: reports,
    errors,
  }
}

const copySvg = (frame, theme, width, height) => {
  const headline = lines(frame.headline)
  const body = frame.body ? lines(frame.body) : []
  const { headlineSize, headlineLineHeight, bodySize, bodyLineHeight, x, y, width: copyWidth, bodyGap, align, headlineWeight, letterSpacing } = typographyMetrics(width, height, frame)
  const anchor = align === 'center' ? 'middle' : align === 'right' ? 'end' : 'start'
  const textX = align === 'center' ? x + copyWidth / 2 : align === 'right' ? x + copyWidth : x
  const tspans = headline.map((text, index) => `<tspan x="${textX}" dy="${index ? headlineLineHeight : 0}">${escapeXml(text)}</tspan>`).join('')
  const bodyY = y + headlineLineHeight * Math.max(headline.length, 1) + bodyGap
  const bodySpans = body.map((text, index) => `<tspan x="${textX}" dy="${index ? bodyLineHeight : 0}">${escapeXml(text)}</tspan>`).join('')
  const foreground = frame.art_direction?.copy?.foreground || theme.foreground
  const muted = frame.art_direction?.copy?.muted || theme.muted
  return Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <text x="${textX}" y="${y}" fill="${escapeXml(foreground)}" font-family="${HEADLINE_FONT}" font-size="${headlineSize}" font-weight="${headlineWeight}" letter-spacing="${letterSpacing}" text-anchor="${anchor}">${tspans}</text>
    ${body.length ? `<text x="${textX}" y="${bodyY}" fill="${escapeXml(muted)}" font-family="${BODY_FONT}" font-size="${bodySize}" font-weight="450" text-anchor="${anchor}">${bodySpans}</text>` : ''}
  </svg>`)
}

const backgroundSvg = (theme, width, height) => Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs><radialGradient id="glow" cx="82%" cy="20%" r="70%"><stop offset="0" stop-color="${escapeXml(theme.accent)}" stop-opacity=".32"/><stop offset="1" stop-color="${escapeXml(theme.background)}" stop-opacity="0"/></radialGradient></defs>
  <rect width="${width}" height="${height}" fill="${escapeXml(theme.background)}"/>
  <rect width="${width}" height="${height}" fill="url(#glow)"/>
</svg>`)

const layoutBox = (layout, width, height, directed = null) => {
  if (layout === 'art-directed') return {
    width: Math.round(width * fraction(directed?.width, 0.58)),
    height: directed?.height ? Math.round(height * directed.height) : null,
    top: Math.round(height * fraction(directed?.y, 0.28)),
    left: Math.round(width * fraction(directed?.x, 0.34)),
    radius: Math.round(width * fraction(directed?.radius, 0.045)),
    detail: directed?.fit === 'cover',
    shadow: directed?.shadow !== false,
  }
  if (layout === 'device-center') return { width: Math.round(width * 0.62), top: Math.round(height * 0.34), left: Math.round(width * 0.19), radius: Math.round(width * 0.06) }
  if (layout === 'detail-focus') return { width: Math.round(width * 0.92), top: Math.round(height * 0.38), left: Math.round(width * 0.04), radius: Math.round(width * 0.045), detail: true }
  return { width: Math.round(width * 0.76), top: Math.round(height * 0.36), left: Math.round(width * 0.12), radius: Math.round(width * 0.065) }
}

const renderSource = async (frame, width, height) => {
  const sourcePath = path.resolve(frame.source_path)
  const sourceBytes = await fs.readFile(sourcePath)
  const sourceMetadata = await sharp(sourcePath).metadata()
  if (!sourceMetadata.width || !sourceMetadata.height) throw new Error(`Could not read source image: ${sourcePath}`)
  const box = layoutBox(frame.layout, width, height, frame.art_direction?.source)
  const targetHeight = box.height || (box.detail ? Math.round(height * 0.52) : Math.round(box.width * sourceMetadata.height / sourceMetadata.width))
  const image = await sharp(sourcePath)
    .resize({ width: box.width, height: box.height || (box.detail ? targetHeight : height - box.top - 12), fit: box.detail ? 'cover' : 'inside', position: frame.art_direction?.source?.position || frame.detail_position || 'centre' })
    .png()
    .toBuffer()
  const metadata = await sharp(image).metadata()
  const mask = Buffer.from(`<svg width="${metadata.width}" height="${metadata.height}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" rx="${box.radius}" fill="#fff"/></svg>`)
  const rounded = await sharp(image).composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer()
  const verificationInset = Math.min(box.radius + 4, Math.floor(metadata.width / 4), Math.floor(metadata.height / 4))
  const verificationPixels = await sharp(rounded)
    .extract({ left: verificationInset, top: verificationInset, width: metadata.width - verificationInset * 2, height: metadata.height - verificationInset * 2 })
    .removeAlpha().toColourspace('srgb').raw().toBuffer()
  const shadow = Buffer.from(`<svg width="${metadata.width}" height="${metadata.height}" xmlns="http://www.w3.org/2000/svg"><defs><filter id="s"><feGaussianBlur stdDeviation="12"/></filter></defs><rect x="8" y="8" width="${metadata.width - 16}" height="${metadata.height - 16}" rx="${box.radius}" fill="#000" opacity=".42" filter="url(#s)"/></svg>`)
  return {
    box,
    rounded,
    shadow,
    width: metadata.width,
    height: metadata.height,
    sourcePath,
    sourceWidth: sourceMetadata.width,
    sourceHeight: sourceMetadata.height,
    sourceSha256: crypto.createHash('sha256').update(sourceBytes).digest('hex'),
    transform: box.detail ? 'cover-crop' : 'proportional-fit',
    verificationInset,
    interiorSha256: crypto.createHash('sha256').update(verificationPixels).digest('hex'),
  }
}

const motifSvg = (motif, width, height) => {
  if (!motif) return null
  const left = Math.round(width * fraction(motif.x, 0))
  const top = Math.round(height * fraction(motif.y, 0))
  const motifWidth = Math.round(width * fraction(motif.width, 1))
  const motifHeight = Math.round(height * fraction(motif.height, 1))
  const color = escapeXml(motif.color || '#ffffff')
  const secondary = escapeXml(motif.secondary_color || color)
  const opacity = fraction(motif.opacity, 1)
  let shapes = ''
  if (motif.type === 'dot-grid') {
    const columns = motif.columns || 12
    const rows = motif.rows || 12
    const gapX = motifWidth / Math.max(columns - 1, 1)
    const gapY = motifHeight / Math.max(rows - 1, 1)
    const radius = Math.max(1, Math.round(Math.min(gapX, gapY) * fraction(motif.size, 0.24)))
    const progress = Math.max(0, Math.min(1, fraction(motif.progress, 0.7)))
    const filled = Math.round(columns * rows * progress)
    for (let index = 0; index < columns * rows; index += 1) {
      const cx = left + (index % columns) * gapX
      const cy = top + Math.floor(index / columns) * gapY
      shapes += `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="${index < filled ? color : secondary}"/>`
    }
  } else if (motif.type === 'grid') {
    const columns = motif.columns || 8
    const rows = motif.rows || 12
    for (let column = 0; column <= columns; column += 1) {
      const x = left + motifWidth * column / columns
      shapes += `<line x1="${x}" y1="${top}" x2="${x}" y2="${top + motifHeight}" stroke="${color}"/>`
    }
    for (let row = 0; row <= rows; row += 1) {
      const y = top + motifHeight * row / rows
      shapes += `<line x1="${left}" y1="${y}" x2="${left + motifWidth}" y2="${y}" stroke="${color}"/>`
    }
  } else if (motif.type === 'rings') {
    const count = motif.count || 8
    const cx = left + motifWidth / 2
    const cy = top + motifHeight / 2
    for (let index = count; index > 0; index -= 1) {
      shapes += `<circle cx="${cx}" cy="${cy}" r="${Math.min(motifWidth, motifHeight) * index / count / 2}" fill="none" stroke="${color}"/>`
    }
  }
  return Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><g opacity="${opacity}">${shapes}</g></svg>`)
}

const directedBackgroundLayers = async (frame, theme, width, height) => {
  const background = frame.art_direction?.background
  if (!background) return [{ input: backgroundSvg(theme, width, height), left: 0, top: 0 }]
  const colors = background.colors?.length ? background.colors : [theme.background, theme.accent]
  const angle = fraction(background.angle, 135)
  const base = background.type === 'solid'
    ? Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="${escapeXml(colors[0])}"/></svg>`)
    : Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g" gradientTransform="rotate(${angle} .5 .5)">${colors.map((color, index) => `<stop offset="${index / Math.max(colors.length - 1, 1) * 100}%" stop-color="${escapeXml(color)}"/>`).join('')}</linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>`)
  const layers = [{ input: base, left: 0, top: 0 }]
  if (background.image_path) {
    const image = await sharp(path.resolve(background.image_path)).resize({ width, height, fit: background.fit || 'cover', position: background.position || 'centre' }).png().toBuffer()
    layers.push({ input: image, left: 0, top: 0, blend: 'over' })
  }
  const motif = motifSvg(frame.art_direction?.motif, width, height)
  if (motif) layers.push({ input: motif, left: 0, top: 0 })
  return layers
}

const renderProject = async (input, { kind, finalOutput, width, height, slot = null }) => {
  const outputDir = safeOutputDirectory(input.output_dir)
  const copyValidation = await validateScreenshotCopy({ ...input, width, height, slot })
  if (copyValidation.status === 'failed') {
    throw new Error(`Screenshot copy preflight failed: ${JSON.stringify(copyValidation.errors)}`)
  }
  await fs.mkdir(outputDir, { recursive: true })
  const theme = {
    background: input.theme?.background || '#111315',
    foreground: input.theme?.foreground || '#f7f5ef',
    muted: input.theme?.muted || '#b8b7b2',
    accent: input.theme?.accent || '#7d5cff',
  }
  const outputs = []

  for (const [index, frame] of input.frames.entries()) {
    const source = await renderSource(frame, width, height)
    const file = `${String(index + 1).padStart(2, '0')}-${frame.id}.png`
    const outputPath = path.join(outputDir, file)
    const backgroundLayers = await directedBackgroundLayers(frame, theme, width, height)
    await sharp({ create: { width, height, channels: 3, background: theme.background } })
      .composite([
        ...backgroundLayers,
        ...(source.box.shadow === false ? [] : [{ input: source.shadow, left: source.box.left, top: source.box.top }]),
        { input: source.rounded, left: source.box.left, top: source.box.top },
        { input: copySvg(frame, theme, width, height), left: 0, top: 0 },
      ])
      .removeAlpha()
      .png({ compressionLevel: 9 })
      .toFile(outputPath)
    outputs.push({
      file,
      path: outputPath,
      layout: frame.layout,
      source_path: source.sourcePath,
      source_sha256: source.sourceSha256,
      source_dimensions: { width: source.sourceWidth, height: source.sourceHeight },
      placement: { left: source.box.left, top: source.box.top, width: source.width, height: source.height },
      transform: source.transform,
      detail_position: frame.detail_position || 'centre',
      concept: frame.art_direction?.concept || null,
      art_direction: frame.art_direction || null,
      verification: { inset: source.verificationInset, interior_sha256: source.interiorSha256 },
    })
  }

  const thumbWidth = Math.round(width * 0.42)
  const thumbHeight = Math.round(height * 0.42)
  const gap = 16
  const sheetPath = path.join(outputDir, finalOutput ? 'qa-contact-sheet.png' : 'preview-contact-sheet.png')
  const sheetLayers = []
  for (const [index, output] of outputs.entries()) {
    const thumb = await sharp(output.path).resize({ width: thumbWidth, height: thumbHeight, fit: 'fill' }).png().toBuffer()
    sheetLayers.push({ input: thumb, left: gap + index * (thumbWidth + gap), top: gap })
  }
  await sharp({ create: { width: gap + outputs.length * (thumbWidth + gap), height: thumbHeight + gap * 2, channels: 3, background: '#e7e5df' } })
    .composite(sheetLayers).png().toFile(sheetPath)

  const manifest = {
    kind,
    final_output: finalOutput,
    slot,
    locale: input.locale || 'en-US',
    width,
    height,
    copy_validation: copyValidation,
    frames: outputs,
  }
  const manifestPath = path.join(outputDir, 'render-manifest.json')
  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
  if (finalOutput) {
    await fs.writeFile(path.join(outputDir, 'upload-order.json'), `${JSON.stringify({
      slot,
      locale: manifest.locale,
      width,
      height,
      files: outputs.map(output => output.file),
    }, null, 2)}\n`)
  }

  return {
    ...manifest,
    output_dir: outputDir,
    contact_sheet: sheetPath,
    render_manifest: manifestPath,
    warnings: finalOutput
      ? ['Technical rendering completed; run validate_screenshot_set and complete source-fidelity and visual review before claiming ASC readiness.']
      : ['Direction preview only; not sized or verified for App Store Connect upload.'],
  }
}

export async function renderPreview(input) {
  return renderProject(input, {
    kind: 'direction-preview',
    finalOutput: false,
    width: input.width || PREVIEW_WIDTH,
    height: input.height || PREVIEW_HEIGHT,
  })
}

export async function renderScreenshotSet(input) {
  const preset = SLOT_PRESETS[input.slot]
  if (!preset) throw new Error(`Unsupported screenshot slot: ${input.slot}`)
  return renderProject(input, {
    kind: 'app-store-screenshot-set',
    finalOutput: true,
    width: preset.width,
    height: preset.height,
    slot: input.slot,
  })
}

export async function validateScreenshotSet(input) {
  const expected = input.expected
  const errors = []
  const warnings = []
  const files = []
  for (const [index, value] of input.files.entries()) {
    const filePath = path.resolve(value)
    try {
      const metadata = await sharp(filePath).metadata()
      const itemErrors = []
      if (metadata.width !== expected.width || metadata.height !== expected.height) itemErrors.push('wrong-dimensions')
      if (!['png', 'jpeg'].includes(metadata.format)) itemErrors.push('unsupported-format')
      if (metadata.hasAlpha || metadata.channels === 4) itemErrors.push('alpha-channel')
      if (metadata.space !== 'srgb') itemErrors.push('non-srgb-color-space')
      const expectedPrefix = `${String(index + 1).padStart(2, '0')}-`
      if (!path.basename(filePath).startsWith(expectedPrefix)) itemErrors.push('non-sequential-name')
      if (itemErrors.length) errors.push({ file: filePath, codes: itemErrors })
      files.push({ path: filePath, position: index + 1, width: metadata.width, height: metadata.height, format: metadata.format, space: metadata.space, channels: metadata.channels, valid: !itemErrors.length })
    } catch (error) {
      errors.push({ file: filePath, codes: ['unreadable-file'], message: error.message })
    }
  }
  let fidelity = { verified: Boolean(input.source_fidelity_verified), method: input.source_fidelity_verified ? 'caller-evidence' : null, frames: [] }
  if (input.render_manifest) {
    fidelity = await verifyRenderedSourceFidelity(input.render_manifest)
    if (!fidelity.verified) errors.push({ file: path.resolve(input.render_manifest), codes: ['source-fidelity-failed'], details: fidelity.frames })
  }
  if (!fidelity.verified) warnings.push('source-fidelity-not-verified')
  if (!input.full_resolution_reviewed) warnings.push('full-resolution-visual-review-required')
  if (!input.storefront_scale_reviewed) warnings.push('storefront-scale-visual-review-required')
  return {
    status: errors.length ? 'failed' : (warnings.length ? 'passed-with-warnings' : 'passed'),
    slot: input.slot,
    locale: input.locale,
    expected,
    files,
    errors,
    warnings,
    source_fidelity: fidelity,
    asc_ready: !errors.length && !warnings.length,
  }
}

export async function verifyRenderedSourceFidelity(manifestPath) {
  const resolvedManifest = path.resolve(manifestPath)
  const manifest = JSON.parse(await fs.readFile(resolvedManifest, 'utf8'))
  const frames = []
  for (const frame of manifest.frames || []) {
    try {
      const sourceBytes = await fs.readFile(frame.source_path)
      const hash = crypto.createHash('sha256').update(sourceBytes).digest('hex')
      if (hash !== frame.source_sha256) {
        frames.push({ file: frame.path, verified: false, reason: 'source-hash-changed' })
        continue
      }
      const { left, top, width, height } = frame.placement
      const inset = frame.verification?.inset
      if (!Number.isInteger(inset) || !frame.verification?.interior_sha256) {
        frames.push({ file: frame.path, verified: false, reason: 'missing-verification-proof' })
        continue
      }
      const compareWidth = width - inset * 2
      const compareHeight = height - inset * 2
      const actual = await sharp(frame.path)
        .extract({ left: left + inset, top: top + inset, width: compareWidth, height: compareHeight })
        .removeAlpha()
        .toColourspace('srgb')
        .raw().toBuffer()
      const actualHash = crypto.createHash('sha256').update(actual).digest('hex')
      const verified = actualHash === frame.verification.interior_sha256
      frames.push({ file: frame.path, verified, reason: verified ? 'interior-pixel-equality' : 'pixel-mismatch' })
    } catch (error) {
      frames.push({ file: frame.path, verified: false, reason: 'verification-error', message: error.message })
    }
  }
  return { verified: frames.length > 0 && frames.every(frame => frame.verified), method: 'manifest-hash-and-interior-pixel-equality', manifest: resolvedManifest, frames }
}
