#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { apiBase, fetchCatalog, importAppStore, searchCatalog } from './catalog.js'
import { buildScreenshotIndex, getScreenshotSet, screenshotAnnotationSummary, searchScreenshots } from './screenshots.js'
import { createReferenceBoard } from './reference-board.js'
import { compareDirectionPreviews, recordDirectionFeedback } from './directions.js'
import { validateScreenshotCopy, validateScreenshotSet } from './rendering.js'

const server = new McpServer({ name: 'niceapps-creative-studio', version: '0.8.0' })

const themeSchema = z.object({
  background: z.string().default('#111315'),
  foreground: z.string().default('#f7f5ef'),
  muted: z.string().default('#b8b7b2'),
  accent: z.string().default('#7d5cff'),
}).default({})

const artDirectionSchema = z.object({
  concept: z.string().min(1).max(500).describe('Product-specific visual idea and the evidence or reference principle behind it'),
  background: z.object({
    type: z.enum(['solid', 'linear-gradient']).default('solid'),
    colors: z.array(z.string()).min(1).max(4),
    angle: z.number().min(-360).max(360).optional(),
    image_path: z.string().min(1).optional(),
    fit: z.enum(['cover', 'contain']).default('cover'),
    position: z.enum(['centre', 'top', 'bottom', 'left', 'right']).default('centre'),
  }).optional(),
  copy: z.object({
    x: z.number().min(0).max(1), y: z.number().min(0).max(1), width: z.number().min(0.1).max(1),
    align: z.enum(['left', 'center', 'right']).default('left'),
    headline_size: z.number().min(0.03).max(0.2).default(0.092),
    headline_line_height: z.number().min(0.8).max(1.8).default(1.04),
    headline_weight: z.number().int().min(300).max(900).default(700),
    body_size: z.number().min(0.015).max(0.1).default(0.035),
    body_line_height: z.number().min(0.8).max(2).default(1.3),
    body_gap: z.number().min(0).max(0.2).default(0.035),
    letter_spacing: z.number().min(-10).max(20).default(-1.2),
    foreground: z.string().optional(), muted: z.string().optional(),
  }).optional(),
  source: z.object({
    x: z.number().min(0).max(1), y: z.number().min(0).max(1), width: z.number().min(0.1).max(1),
    height: z.number().min(0.1).max(1).optional(),
    fit: z.enum(['contain', 'cover']).default('contain'),
    position: z.enum(['centre', 'top', 'bottom', 'left', 'right']).default('centre'),
    radius: z.number().min(0).max(0.2).default(0.045), shadow: z.boolean().default(true),
  }).optional(),
  motif: z.object({
    type: z.enum(['dot-grid', 'grid', 'rings']),
    x: z.number().min(-0.5).max(1.5).default(0), y: z.number().min(-0.5).max(1.5).default(0),
    width: z.number().min(0.05).max(2).default(1), height: z.number().min(0.05).max(2).default(1),
    color: z.string(), secondary_color: z.string().optional(), opacity: z.number().min(0).max(1).default(1),
    columns: z.number().int().min(2).max(80).optional(), rows: z.number().int().min(2).max(80).optional(),
    count: z.number().int().min(2).max(40).optional(), size: z.number().min(0.05).max(0.5).optional(),
    progress: z.number().min(0).max(1).optional(),
  }).optional(),
}).superRefine((direction, context) => {
  if (direction.copy && direction.copy.x + direction.copy.width > 1) context.addIssue({
    code: z.ZodIssueCode.custom, message: 'copy x + width must stay within the canvas', path: ['copy', 'width'],
  })
  if (direction.source && direction.source.x + direction.source.width > 1) context.addIssue({
    code: z.ZodIssueCode.custom, message: 'source x + width must stay within the canvas', path: ['source', 'width'],
  })
  if (direction.source?.height && direction.source.y + direction.source.height > 1) context.addIssue({
    code: z.ZodIssueCode.custom, message: 'source y + height must stay within the canvas', path: ['source', 'height'],
  })
})

const copyFrameShape = {
  id: z.string().regex(/^[a-z0-9-]+$/),
  layout: z.enum(['device-bottom', 'device-center', 'detail-focus', 'art-directed']),
  headline: z.array(z.string().max(200)).min(1).max(3),
  body: z.array(z.string().max(300)).max(3).optional(),
  art_direction: artDirectionSchema.optional(),
}
const requireArtDirection = (frame, context) => {
  if (frame.layout === 'art-directed' && !frame.art_direction) context.addIssue({
    code: z.ZodIssueCode.custom,
    message: 'art_direction is required for art-directed layouts',
    path: ['art_direction'],
  })
}
const copyFrameSchema = z.object(copyFrameShape).superRefine(requireArtDirection)

const frameSchema = z.object({
  ...copyFrameShape,
  source_path: z.string().min(1),
  detail_position: z.enum(['centre', 'top', 'bottom', 'left', 'right']).optional(),
}).superRefine(requireArtDirection)

const asToolResult = data => ({
  content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
  structuredContent: { result: data },
})

const directionFingerprintSchema = z.object({
  image_making_method: z.string().min(2).max(200),
  palette: z.string().min(2).max(200),
  composition: z.string().min(2).max(200),
  device_treatment: z.string().min(2).max(200),
})

server.registerTool('search_apps', {
  title: 'Search niceapps.club',
  description: 'Find screenshot references in the niceapps.club catalog. Results are candidates, not conversion evidence.',
  inputSchema: {
    query: z.string().default('').describe('Product, audience, feature, style, or communication terms'),
    category: z.string().default('').describe('Optional exact App Store category'),
    limit: z.number().int().min(1).max(20).default(8),
  },
}, async input => asToolResult(searchCatalog(await fetchCatalog(), input)))

server.registerTool('get_app', {
  title: 'Get niceapps.club app',
  description: 'Get one catalog app and its screenshot URLs by slug.',
  inputSchema: { slug: z.string().min(1) },
}, async ({ slug }) => {
  const app = (await fetchCatalog()).find(item => item.slug === slug)
  if (!app) throw new Error(`No niceapps.club app found for slug: ${slug}`)
  return asToolResult(app)
})

server.registerTool('search_screenshots', {
  title: 'Search curated screenshot patterns',
  description: 'Search human-reviewed screenshot-level annotations by communication job, visual style, composition, device treatment, and category. Results explain their text-match reasons and are references, not conversion evidence.',
  inputSchema: {
    query: z.string().default('').describe('Communication, visual, composition, or product terms'),
    category: z.string().default('').describe('Optional exact App Store category'),
    communication_job: z.array(z.string()).default([]),
    visual_style: z.array(z.string()).default([]),
    composition: z.array(z.string()).default([]),
    device_treatment: z.array(z.string()).default([]),
    exclude_slugs: z.array(z.string()).default([]).describe('App slugs to omit, usually including the target app'),
    per_app_limit: z.number().int().min(1).max(10).default(2).describe('Maximum results from one reference app'),
    limit: z.number().int().min(1).max(20).default(8),
  },
}, async input => {
  const index = buildScreenshotIndex(await fetchCatalog())
  return asToolResult({
    annotation_source: screenshotAnnotationSummary(),
    results: searchScreenshots(index, input),
  })
})

server.registerTool('get_screenshot_set', {
  title: 'Get an annotated screenshot set',
  description: 'Return the ordered, human-reviewed screenshot annotations for one niceapps.club app slug.',
  inputSchema: { slug: z.string().min(1) },
}, async ({ slug }) => {
  const set = getScreenshotSet(buildScreenshotIndex(await fetchCatalog()), slug)
  if (!set.length) throw new Error(`No approved screenshot annotations found for slug: ${slug}`)
  return asToolResult({ annotation_source: screenshotAnnotationSummary(), screenshots: set })
})

server.registerTool('get_reference_board', {
  title: 'View selected screenshot references',
  description: 'Fetch selected approved niceapps.club screenshots and return one visual comparison board. Use after retrieval and visually inspect the actual compositions before proposing art direction; annotations alone are insufficient.',
  inputSchema: {
    screenshot_ids: z.array(z.string().min(3)).min(1).max(6).describe('Approved screenshot IDs returned by search_screenshots or get_screenshot_set'),
  },
}, async ({ screenshot_ids }) => {
  const board = await createReferenceBoard(buildScreenshotIndex(await fetchCatalog()), screenshot_ids, { apiUrl: apiBase() })
  const result = {
    width: board.width,
    height: board.height,
    references: board.references,
    review_required: true,
    instruction: 'Inspect the actual board image. Translate hierarchy, crop, material, typography, and narrative principles; do not copy the reference artwork.',
  }
  return {
    content: [
      { type: 'text', text: JSON.stringify(result, null, 2) },
      { type: 'image', data: board.image.toString('base64'), mimeType: 'image/png' },
    ],
    structuredContent: { result },
  }
})

server.registerTool('record_direction_feedback', {
  title: 'Record rejected creative direction',
  description: 'Persist a rejected direction and the user’s reason so later iterations do not silently repeat the same image-making method, composition, palette, or device treatment.',
  inputSchema: {
    project_id: z.string().min(1).max(120),
    direction_id: z.string().regex(/^[a-z0-9-]+$/),
    reason: z.string().min(1).max(1000),
    avoid: z.array(z.string().min(1).max(300)).max(20).default([]),
    preserve: z.array(z.string().min(1).max(300)).max(20).default([]),
    fingerprint: directionFingerprintSchema,
    feedback_file: z.string().min(1).describe('JSON file beneath the current project or operating-system temporary directory'),
  },
}, async input => asToolResult(await recordDirectionFeedback(input)))

server.registerTool('compare_direction_previews', {
  title: 'Compare replacement direction previews',
  description: 'Build one visual board for two to four opening-frame previews and reject candidates that do not materially change the image-making method, composition, and enough core visual axes. Use before expanding any replacement into a full set.',
  inputSchema: {
    rejected: directionFingerprintSchema,
    minimum_changed_axes: z.number().int().min(2).max(4).default(3),
    output_path: z.string().min(1).optional(),
    candidates: z.array(z.object({
      id: z.string().regex(/^[a-z0-9-]+$/),
      name: z.string().min(1).max(120),
      preview_path: z.string().min(1),
      image_making_method: z.string().min(2).max(200),
      palette: z.string().min(2).max(200),
      composition: z.string().min(2).max(200),
      device_treatment: z.string().min(2).max(200),
    })).min(2).max(4),
  },
}, async input => {
  const comparison = await compareDirectionPreviews(input)
  const result = { ...comparison, image: undefined }
  return {
    content: [
      { type: 'text', text: JSON.stringify(result, null, 2) },
      { type: 'image', data: comparison.image.toString('base64'), mimeType: 'image/png' },
    ],
    structuredContent: { result },
  }
})

server.registerTool('validate_screenshot_copy', {
  title: 'Preflight screenshot copy',
  description: 'Rasterize localized screenshot copy with the same typography and target dimensions as the renderer, then report exact pixel widths and copy-to-source collisions before any files are written.',
  inputSchema: {
    slot: z.enum(['IPHONE_69_1290X2796']).optional(),
    width: z.number().int().min(320).max(1290).default(430),
    height: z.number().int().min(640).max(2796).default(932),
    locale: z.string().min(2).default('en-US'),
    frames: z.array(copyFrameSchema).min(1).max(10),
  },
}, async input => asToolResult(await validateScreenshotCopy(input)))

server.registerTool('validate_screenshot_set', {
  title: 'Validate App Store screenshot files',
  description: 'Validate local screenshot files for dimensions, format, opacity, readable image data, and deterministic sequence naming. Reports visual-review and source-fidelity gates separately.',
  inputSchema: {
    files: z.array(z.string().min(1)).min(1).max(10),
    slot: z.string().min(1),
    locale: z.string().min(2).default('en-US'),
    expected: z.object({ width: z.number().int().positive(), height: z.number().int().positive() }),
    render_manifest: z.string().min(1).optional().describe('Optional render manifest for automatic source hash and interior pixel-equality verification'),
    source_fidelity_verified: z.boolean().default(false),
    full_resolution_reviewed: z.boolean().default(false),
    storefront_scale_reviewed: z.boolean().default(false),
  },
}, async input => asToolResult(await validateScreenshotSet(input)))

server.registerTool('import_app_store', {
  title: 'Import App Store context',
  description: 'Load public App Store metadata and current screenshots from an App Store URL or Apple ID.',
  inputSchema: { input: z.string().min(1).describe('App Store URL or numeric Apple ID') },
}, async ({ input }) => asToolResult(await importAppStore(input)))

await server.connect(new StdioServerTransport())
