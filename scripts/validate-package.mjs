import { readFile } from 'node:fs/promises'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'

const plugin = JSON.parse(await readFile('plugins/niceapps-creative-studio/.codex-plugin/plugin.json', 'utf8'))
const marketplace = JSON.parse(await readFile('.agents/plugins/marketplace.json', 'utf8'))
const server = JSON.parse(await readFile('server.json', 'utf8'))
const skill = await readFile('plugins/niceapps-creative-studio/skills/screenshot-studio/SKILL.md', 'utf8')

if (plugin.name !== 'niceapps-creative-studio') throw new Error('Unexpected plugin name')
if (plugin.version !== server.version) throw new Error('Plugin and MCP registry versions differ')
if (!marketplace.plugins.some(entry => entry.name === plugin.name)) throw new Error('Plugin is absent from marketplace')
if (!skill.startsWith('---\nname: screenshot-studio\n')) throw new Error('Screenshot skill frontmatter is invalid')
if (skill.includes('[TODO:')) throw new Error('Screenshot skill contains a placeholder')

const transport = new StdioClientTransport({ command: process.execPath, args: ['src/index.js'] })
const client = new Client({ name: 'package-validator', version: '1.0.0' })
await client.connect(transport)
try {
  const { tools } = await client.listTools()
  const names = tools.map(tool => tool.name)
  if (names.length !== 10) throw new Error(`Expected 10 public tools, found ${names.length}`)
  for (const forbidden of ['render_preview', 'render_screenshot_set']) {
    if (names.includes(forbidden)) throw new Error(`${forbidden} must not be public`)
  }
  console.log(`Validated plugin, skill, registry metadata, and ${names.length}-tool MCP surface.`)
} finally {
  await client.close()
}
