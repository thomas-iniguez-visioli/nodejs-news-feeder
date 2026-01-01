import { describe, it } from 'node:test'
import { strictEqual, throws } from 'node:assert/strict'
import XMLGenerator from '../XMLGenerator.js'

describe('XMLGenerator', () => {
  const mockComposeFeedItem = ({ title }) => `<item><title>${title}</title></item>`

  it('should generate a formatted XML feed with items', () => {
    const items = [
      { title: 'Item 1' },
      { title: 'Item 2' }
    ]
    const feedHeader = '<rss><channel>'
    const delimiter = '<!-- Items -->'
    
    const generator = new XMLGenerator(mockComposeFeedItem)
    const xml = generator.generate(items, feedHeader, delimiter)

    const expectedXml = `<rss>
  <channel>
    <!-- Items -->
    <item>
      <title>Item 1</title>
    </item>
    <item>
      <title>Item 2</title>
    </item>
  </channel>
</rss>`
    // Normalize whitespace for comparison
    const normalize = (str) => str.replace(/\s+/g, ' ').trim()
    strictEqual(normalize(xml), normalize(expectedXml))
  })

  it('should handle an empty items array', () => {
    const items = []
    const feedHeader = '<rss><channel>'
    const delimiter = '<!-- Items -->'
    
    const generator = new XMLGenerator(mockComposeFeedItem)
    const xml = generator.generate(items, feedHeader, delimiter)

    const expectedXml = `<rss>
  <channel>
    <!-- Items -->
  </channel>
</rss>`
    const normalize = (str) => str.replace(/\s+/g, ' ').trim()
    strictEqual(normalize(xml), normalize(expectedXml))
  })

  it('should throw an error if composeFeedItem is not provided', () => {
    const generator = new XMLGenerator()
    throws(() => generator.generate([], '', ''), /composeFeedItem function is required/)
  })
})
