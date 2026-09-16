import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import sharp from 'sharp'

export const DIRECTION_AXES = ['image_making_method', 'palette', 'composition', 'device_treatment']

const normalized = value => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ')

const safeChildPath = value => {
  const resolved = path.resolve(value)
  const roots = [os.tmpdir(), ...(process.platform === 'win32' ? [] : ['/tmp']), path.resolve(process.env.NICEAPPS_OUTPUT_ROOT || process.cwd())]
  const allowed = roots.some(root => {
    const relative = path.relative(path.resolve(root), resolved)
    return relative && !relative.startsWith('..') && !path.isAbsolute(relative)
  })
  if (!allowed) throw new Error('path must be a child of the current project or operating-system temporary directory')
  return resolved
}

export function evaluateDirectionChange(rejected, candidate, { minimumChangedAxes = 3 } = {}) {
  const axes = DIRECTION_AXES.map(axis => ({
    axis,
    rejected: rejected[axis],
    candidate: candidate[axis],
    changed: normalized(rejected[axis]) !== normalized(candidate[axis]),
  }))
  const changedAxes = axes.filter(item => item.changed).map(item => item.axis)
  const requiredChanged = ['image_making_method', 'composition'].filter(axis => changedAxes.includes(axis))
  const passed = changedAxes.length >= minimumChangedAxes && requiredChanged.length === 2
  return {
    candidate_id: candidate.id,
    candidate_name: candidate.name,
    passed,
    changed_axes: changedAxes,
    unchanged_axes: axes.filter(item => !item.changed).map(item => item.axis),
    requirements: { minimum_changed_axes: minimumChangedAxes, mandatory_changed_axes: ['image_making_method', 'composition'] },
    blocked_reasons: passed ? [] : [
      ...(changedAxes.length < minimumChangedAxes ? [`Only ${changedAxes.length} of ${DIRECTION_AXES.length} core axes changed`] : []),
      ...(!changedAxes.includes('image_making_method') ? ['Image-making method did not change'] : []),
      ...(!changedAxes.includes('composition') ? ['Composition system did not change'] : []),
    ],
  }
}

export async function recordDirectionFeedback(input) {
  const file = safeChildPath(input.feedback_file)
  let document = { version: 1, project_id: input.project_id, rejected_directions: [] }
  try {
    const existing = JSON.parse(await fs.readFile(file, 'utf8'))
    if (existing?.version === 1 && Array.isArray(existing.rejected_directions)) document = existing
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
  const entry = {
    direction_id: input.direction_id,
    rejected_at: new Date().toISOString(),
    reason: input.reason,
    avoid: input.avoid || [],
    preserve: input.preserve || [],
    fingerprint: input.fingerprint,
  }
  document.project_id = input.project_id
  document.rejected_directions = document.rejected_directions.filter(item => item.direction_id !== input.direction_id)
  document.rejected_directions.push(entry)
  await fs.mkdir(path.dirname(file), { recursive: true })
  await fs.writeFile(file, `${JSON.stringify(document, null, 2)}\n`)
  return { feedback_file: file, recorded: entry, rejected_direction_count: document.rejected_directions.length }
}

export async function compareDirectionPreviews(input) {
  const evaluations = input.candidates.map(candidate => evaluateDirectionChange(input.rejected, candidate, { minimumChangedAxes: input.minimum_changed_axes }))
  const width = 360
  const height = 780
  const gap = 20
  const labelHeight = 88
  const layers = []
  for (const [index, candidate] of input.candidates.entries()) {
    const previewPath = path.resolve(candidate.preview_path)
    const preview = await sharp(previewPath).resize({ width, height, fit: 'cover' }).png().toBuffer()
    const evaluation = evaluations[index]
    const label = Buffer.from(`<svg width="${width}" height="${labelHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#151515"/><text x="16" y="34" fill="#fff" font-family="Arial,sans-serif" font-size="22" font-weight="700">${String(candidate.name).replaceAll('&', '&amp;').replaceAll('<', '&lt;')}</text><text x="16" y="66" fill="${evaluation.passed ? '#69db7c' : '#ff8787'}" font-family="Arial,sans-serif" font-size="16">${evaluation.passed ? 'Distinct direction' : 'Too close to rejected direction'}</text></svg>`)
    const left = gap + index * (width + gap)
    layers.push({ input: preview, left, top: gap })
    layers.push({ input: label, left, top: gap + height })
  }
  const boardWidth = gap + input.candidates.length * (width + gap)
  const boardHeight = gap * 2 + height + labelHeight
  const image = await sharp({ create: { width: boardWidth, height: boardHeight, channels: 3, background: '#0b0b0b' } }).composite(layers).removeAlpha().png().toBuffer()
  if (input.output_path) {
    const outputPath = safeChildPath(input.output_path)
    await fs.mkdir(path.dirname(outputPath), { recursive: true })
    await fs.writeFile(outputPath, image)
  }
  return {
    image,
    width: boardWidth,
    height: boardHeight,
    evaluations,
    all_distinct: evaluations.every(item => item.passed),
    next_step: evaluations.every(item => item.passed)
      ? 'Show the opening previews to the user and wait for a selection before expanding a full set.'
      : 'Replace blocked candidates with directions that change both image-making method and composition.',
  }
}
