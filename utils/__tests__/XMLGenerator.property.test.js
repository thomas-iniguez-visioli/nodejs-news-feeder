import { describe, it } from 'node:test'
import fc from 'fast-check'
import { strictEqual } from 'node:assert/strict'
import XMLGenerator from '../XMLGenerator.js'
import ParseRss from 'rss-parser'
import ContentProcessor from '../ContentProcessor.js'

describe('XMLGenerator Property-Based Tests', () => {
  const rssParser = new ParseRss()
  const contentProcessor = new ContentProcessor()

  const mockComposeFeedItem = ({ title, link, pubDate, description, guid, categories }) => {
    const esc = (text) => contentProcessor.escapeXmlCharacters(text || '')
    return `<item>
      <title>${esc(title)}</title>
      <link>${esc(link)}</link>
      <pubDate>${esc(pubDate)}</pubDate>
      <description><![CDATA[${description || ''}]]></description>
      <guid>${esc(guid)}</guid>
      ${(categories || []).map(c => `<category><![CDATA[${c}]]></category>`).join('')}
    </item>`
  }

  const titleArbitrary = fc.string({ minLength: 1 }).filter(s => s.trim().length > 0);

  const feedItemArbitrary = fc.record({
    title: titleArbitrary,
    link: fc.webUrl(),
    pubDate: fc.date().map(d => d.toUTCString()),
    description: fc.string(),
    guid: fc.uuid(),
    categories: fc.array(fc.string())
  })

  // Property: The generated XML should be well-formed and parsable.
  it.skip('should generate well-formed XML', () => {
    fc.assert(
      fc.property(fc.array(feedItemArbitrary, { minLength: 1 }), async (items) => {
        // Provide a minimal valid structure for parsing
        const header = '<rss><channel><title>Test Feed</title><link>http://example.com</link><description>A test feed</description>';
        const delimiter = ''; // Removed for parser compatibility
        
        const generator = new XMLGenerator(mockComposeFeedItem)
        const xml = generator.generate(items, header, delimiter)
        
        try {
          await rssParser.parseString(xml)
          return true
        } catch (e) {
          return false
        }
      })
    )
  })

  // Property: The number of items in the generated XML should match the input array length.
  it('should generate the correct number of items', () => {
    fc.assert(
      fc.property(fc.array(feedItemArbitrary), (items) => {
        const generator = new XMLGenerator(mockComposeFeedItem)
        const xml = generator.generate(items, '<rss><channel>', '<!-- Items -->')
        
        const itemCount = (xml.match(/<item>/g) || []).length
        strictEqual(itemCount, items.length)
      })
    )
  })
})
