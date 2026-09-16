import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import sharp from 'sharp'
import { compareDirectionPreviews, evaluateDirectionChange, recordDirectionFeedback } from '../src/directions.js'

const rejected = { image_making_method: 'cinematic product photography', palette: 'black ivory cobalt', composition: 'sculptural object with phone overlay', device_treatment: 'floating full device' }

test('blocks a cosmetic variation of a rejected direction', () => {
  const result = evaluateDirectionChange(rejected, { id: 'same', name: 'Same idea', ...rejected, palette: 'black ivory red' })
  assert.equal(result.passed, false)
  assert.match(result.blocked_reasons.join(' '), /Image-making method did not change/)
})

test('accepts a direction that changes method, composition, and treatment', () => {
  const result = evaluateDirectionChange(rejected, { id: 'paper', name: 'Paper editorial', image_making_method: 'cut-paper editorial collage', palette: 'warm white graphite orange', composition: 'oversized typography with frameless UI fragments', device_treatment: 'frameless layered UI' })
  assert.equal(result.passed, true)
  assert.equal(result.changed_axes.length, 4)
})

test('persists rejected direction feedback and creates a visual comparison board', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'niceapps-directions-'))
  try {
    const feedbackFile = path.join(root, 'feedback.json')
    const saved = await recordDirectionFeedback({ project_id: 'memento', direction_id: 'black-gallery', reason: 'User wants a genuinely different design', fingerprint: rejected, feedback_file: feedbackFile })
    assert.equal(saved.rejected_direction_count, 1)
    assert.equal(JSON.parse(await fs.readFile(feedbackFile, 'utf8')).rejected_directions[0].direction_id, 'black-gallery')
    const candidates = []
    for (const [index, method] of ['paper collage', 'sunlit lifestyle photography', 'bold typographic poster'].entries()) {
      const previewPath = path.join(root, `${index}.png`)
      await sharp({ create: { width: 390, height: 844, channels: 3, background: index === 0 ? '#f2eadf' : index === 1 ? '#88b7d8' : '#ff5d3b' } }).png().toFile(previewPath)
      candidates.push({ id: `candidate-${index}`, name: method, preview_path: previewPath, image_making_method: method, palette: `palette-${index}`, composition: `composition-${index}`, device_treatment: `treatment-${index}` })
    }
    const board = await compareDirectionPreviews({ rejected, candidates, minimum_changed_axes: 3 })
    assert.equal(board.all_distinct, true)
    assert.equal((await sharp(board.image).metadata()).channels, 3)
  } finally {
    await fs.rm(root, { recursive: true, force: true })
  }
})
