import { describe, it } from 'node:test'
import { ok, strictEqual } from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const formatJsPath = path.resolve(__dirname, '../format.js')

describe('format.js code cleanup verification', () => {
  const formatJsContent = readFileSync(formatJsPath, 'utf8')

  it('should not contain console.log or console.error statements', () => {
    ok(!formatJsContent.includes('console.log'), 'format.js should not contain console.log statements')
    ok(!formatJsContent.includes('console.error'), 'format.js should not contain console.error statements')
  })

  it('should use xmlDelimiter instead of breakDelimiter', () => {
    ok(!formatJsContent.includes('breakDelimiter'), 'format.js should not contain breakDelimiter')
    ok(formatJsContent.includes('xmlDelimiter'), 'format.js should contain xmlDelimiter')
  })

  it('should use getFilteredFeedItems instead of processFilteredFeed', () => {
    ok(!formatJsContent.includes('processFilteredFeed'), 'format.js should not contain processFilteredFeed')
    ok(formatJsContent.includes('getFilteredFeedItems'), 'format.js should contain getFilteredFeedItems')
  })
})
