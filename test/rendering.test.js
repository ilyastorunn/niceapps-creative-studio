import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import sharp from 'sharp'
import { renderPreview, renderScreenshotSet, validateScreenshotCopy, validateScreenshotSet } from '../src/rendering.js'

const withTemp = async callback => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'niceapps-render-test-'))
  try { await callback(root) } finally { await fs.rm(root, { recursive: true, force: true }) }
}

test('renders three controlled preview layouts as explicitly non-final RGB PNGs', async () => withTemp(async root => {
  const source = path.join(root, 'source.png')
  await sharp({ create: { width: 390, height: 844, channels: 3, background: '#5b46d8' } }).png().toFile(source)
  const result = await renderPreview({
    output_dir: path.join(root, 'preview'),
    width: 430,
    height: 932,
    theme: { background: '#101114', foreground: '#ffffff', muted: '#bbbbbb', accent: '#7656ff' },
    frames: [
      { id: 'bottom', layout: 'device-bottom', headline: ['One clear idea'], source_path: source },
      { id: 'center', layout: 'device-center', headline: ['Centered proof'], source_path: source },
      { id: 'detail', layout: 'detail-focus', headline: ['Zoom into value'], source_path: source, detail_position: 'top' },
    ],
  })
  assert.equal(result.final_output, false)
  assert.equal(result.frames.length, 3)
  assert.match(result.warnings[0], /not sized or verified/i)
  for (const frame of result.frames) {
    const metadata = await sharp(frame.path).metadata()
    assert.equal(metadata.width, 430)
    assert.equal(metadata.height, 932)
    assert.equal(metadata.channels, 3)
  }
  assert.equal((await sharp(result.contact_sheet).metadata()).format, 'png')
}))

test('refuses broad output directories', async () => {
  await assert.rejects(() => renderPreview({ output_dir: process.cwd(), frames: [] }), /must be a child/)
})

test('validates technical output and keeps visual and fidelity gates separate', async () => withTemp(async root => {
  const valid = path.join(root, '01-opening.png')
  const invalid = path.join(root, 'frame-two.png')
  await sharp({ create: { width: 1290, height: 2796, channels: 3, background: '#111111' } }).png().toFile(valid)
  await sharp({ create: { width: 640, height: 960, channels: 4, background: '#111111ff' } }).png().toFile(invalid)

  const report = await validateScreenshotSet({
    files: [valid, invalid],
    slot: 'APP_IPHONE_67',
    locale: 'en-US',
    expected: { width: 1290, height: 2796 },
    source_fidelity_verified: false,
    full_resolution_reviewed: false,
    storefront_scale_reviewed: false,
  })
  assert.equal(report.status, 'failed')
  assert.equal(report.asc_ready, false)
  assert.deepEqual(report.errors[0].codes, ['wrong-dimensions', 'alpha-channel', 'non-sequential-name'])
  assert.deepEqual(report.warnings, [
    'source-fidelity-not-verified',
    'full-resolution-visual-review-required',
    'storefront-scale-visual-review-required',
  ])
}))

test('marks a technically valid and reviewed set as ASC ready', async () => withTemp(async root => {
  const file = path.join(root, '01-opening.png')
  await sharp({ create: { width: 1290, height: 2796, channels: 3, background: '#111111' } }).png().toFile(file)
  const report = await validateScreenshotSet({
    files: [file],
    slot: 'APP_IPHONE_67',
    locale: 'en-US',
    expected: { width: 1290, height: 2796 },
    source_fidelity_verified: true,
    full_resolution_reviewed: true,
    storefront_scale_reviewed: true,
  })
  assert.equal(report.status, 'passed')
  assert.equal(report.asc_ready, true)
  assert.deepEqual(report.warnings, [])
}))

test('renders a full-resolution ordered set with source integrity and upload manifests', async () => withTemp(async root => {
  const source = path.join(root, 'raw-ui.png')
  await sharp({ create: { width: 390, height: 844, channels: 3, background: '#3158d8' } }).png().toFile(source)
  const result = await renderScreenshotSet({
    output_dir: path.join(root, 'production'),
    slot: 'IPHONE_69_1290X2796',
    locale: 'en-US',
    theme: { background: '#07112c', foreground: '#ffffff', muted: '#b9bfd1', accent: '#235cff' },
    frames: [
      { id: 'opening', layout: 'device-bottom', headline: ['One clear outcome'], source_path: source },
      { id: 'detail', layout: 'detail-focus', headline: ['Proof up close'], source_path: source },
    ],
  })
  assert.equal(result.final_output, true)
  assert.equal(result.width, 1290)
  assert.equal(result.height, 2796)
  assert.equal(result.frames[0].source_sha256.length, 64)
  assert.equal(result.frames[0].transform, 'proportional-fit')
  assert.equal(result.frames[1].transform, 'cover-crop')
  const uploadOrder = JSON.parse(await fs.readFile(path.join(result.output_dir, 'upload-order.json'), 'utf8'))
  assert.deepEqual(uploadOrder.files, ['01-opening.png', '02-detail.png'])
  const manifest = JSON.parse(await fs.readFile(result.render_manifest, 'utf8'))
  assert.equal(manifest.frames[0].source_sha256, result.frames[0].source_sha256)
  assert.equal(manifest.copy_validation.status, 'passed')
  for (const frame of result.frames) {
    const metadata = await sharp(frame.path).metadata()
    assert.equal(metadata.width, 1290)
    assert.equal(metadata.height, 2796)
    assert.equal(metadata.channels, 3)
    assert.equal(metadata.space, 'srgb')
  }
  const validation = await validateScreenshotSet({
    files: result.frames.map(frame => frame.path),
    slot: result.slot,
    locale: result.locale,
    expected: { width: result.width, height: result.height },
    render_manifest: result.render_manifest,
    full_resolution_reviewed: true,
    storefront_scale_reviewed: true,
  })
  assert.equal(validation.source_fidelity.verified, true)
  assert.equal(validation.source_fidelity.method, 'manifest-hash-and-interior-pixel-equality')
  assert.equal(validation.asc_ready, true)

  await sharp({ create: { width: 390, height: 844, channels: 3, background: '#d8315b' } }).png().toFile(source)
  const tampered = await validateScreenshotSet({
    files: result.frames.map(frame => frame.path),
    slot: result.slot,
    locale: result.locale,
    expected: { width: result.width, height: result.height },
    render_manifest: result.render_manifest,
    full_resolution_reviewed: true,
    storefront_scale_reviewed: true,
  })
  assert.equal(tampered.status, 'failed')
  assert.equal(tampered.asc_ready, false)
  assert.equal(tampered.source_fidelity.frames[0].reason, 'source-hash-changed')
}))

test('renders product-specific art direction without falling back to the preset template', async () => withTemp(async root => {
  const source = path.join(root, 'year-grid.png')
  await sharp({ create: { width: 390, height: 844, channels: 3, background: '#f7f5ef' } }).png().toFile(source)
  const result = await renderPreview({
    output_dir: path.join(root, 'art-directed'),
    width: 430,
    height: 932,
    frames: [{
      id: 'remaining-year',
      layout: 'art-directed',
      headline: ['106 days', 'are still yours.'],
      body: ['Make the rest visible.'],
      source_path: source,
      art_direction: {
        concept: 'Turn the product year grid into the campaign structure instead of adding generic decoration.',
        background: { type: 'solid', colors: ['#f3ebdd'] },
        copy: { x: 0.08, y: 0.11, width: 0.84, headline_size: 0.095, foreground: '#141414', muted: '#5e574e' },
        source: { x: 0.5, y: 0.44, width: 0.42, radius: 0.035, shadow: false },
        motif: { type: 'dot-grid', x: -0.04, y: 0.04, width: 1.08, height: 0.58, columns: 19, rows: 19, progress: 0.71, color: '#141414', secondary_color: '#c9c0b2', opacity: 0.12 },
      },
    }],
  })
  assert.equal(result.frames[0].layout, 'art-directed')
  assert.equal(result.frames[0].placement.left, 215)
  assert.equal(result.frames[0].placement.top, 410)
  assert.match(result.frames[0].concept, /year grid/)
  assert.equal(result.copy_validation.status, 'passed')
  assert.equal((await sharp(result.frames[0].path).metadata()).channels, 3)
}))

test('rejects unsupported production slots', async () => withTemp(async root => {
  await assert.rejects(() => renderScreenshotSet({ output_dir: path.join(root, 'out'), slot: 'UNKNOWN', frames: [] }), /Unsupported screenshot slot/)
}))

test('measures localized copy in pixels using production typography', async () => {
  const report = await validateScreenshotCopy({
    slot: 'IPHONE_69_1290X2796',
    locale: 'tr-TR',
    frames: [{ id: 'focus', layout: 'device-bottom', headline: ['Odağını koru'], body: ['Dikkat dağıtanları sessize al.'] }],
  })
  assert.equal(report.status, 'passed')
  assert.equal(report.width, 1290)
  assert.equal(report.frames[0].headline[0].fits, true)
  assert.ok(report.frames[0].headline[0].width > 0)
  assert.ok(report.frames[0].available_width > report.frames[0].headline[0].width)
})

test('reports exact headline overflow and refuses rendering before writing files', async () => withTemp(async root => {
  const longHeadline = 'Dikkatini dağıtan uygulamaları tek dokunuşla anında ve tamamen engelle'
  const report = await validateScreenshotCopy({
    width: 430,
    height: 932,
    locale: 'tr-TR',
    frames: [{ id: 'overflow', layout: 'device-bottom', headline: [longHeadline] }],
  })
  assert.equal(report.status, 'failed')
  assert.deepEqual(report.errors[0].codes, ['headline-overflow'])
  assert.equal(report.frames[0].headline[0].fits, false)
  assert.ok(report.frames[0].headline[0].width > report.frames[0].available_width)

  const source = path.join(root, 'source.png')
  const output = path.join(root, 'must-not-exist')
  await sharp({ create: { width: 390, height: 844, channels: 3, background: '#3158d8' } }).png().toFile(source)
  await assert.rejects(() => renderPreview({
    output_dir: output,
    frames: [{ id: 'overflow', layout: 'device-bottom', headline: [longHeadline], source_path: source }],
  }), /copy preflight failed/i)
  await assert.rejects(() => fs.access(output))
}))
