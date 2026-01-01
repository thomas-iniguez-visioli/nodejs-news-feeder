import { describe, it } from 'node:test'
import { deepStrictEqual, strictEqual } from 'node:assert/strict'
import DuplicateFilter from '../DuplicateFilter.js'
import ContentProcessor from '../ContentProcessor.js'

describe('DuplicateFilter', () => {
  const contentProcessor = new ContentProcessor()

  it('should remove duplicates based on guid', () => {
    const items = [
      { guid: '123', title: 'A' },
      { guid: '456', title: 'B' },
      { guid: '123', title: 'C' } // Duplicate guid
    ]
    const filter = new DuplicateFilter(contentProcessor)
    const filtered = filter.filter(items)
    deepStrictEqual(filtered, [
      { guid: '123', title: 'A' },
      { guid: '456', title: 'B' }
    ])
  })

  it('should remove duplicates based on link when guid is missing', () => {
    const items = [
      { link: 'http://example.com/a', title: 'A' },
      { link: 'http://example.com/b', title: 'B' },
      { link: 'http://example.com/a', title: 'C' } // Duplicate link
    ]
    const filter = new DuplicateFilter(contentProcessor)
    const filtered = filter.filter(items)
    deepStrictEqual(filtered, [
      { link: 'http://example.com/a', title: 'A' },
      { link: 'http://example.com/b', title: 'B' }
    ])
  })

  it('should remove duplicates based on title when guid and link are missing', () => {
    const items = [
      { title: 'Title A' },
      { title: 'Title B' },
      { title: 'Title A' } // Duplicate title
    ]
    const filter = new DuplicateFilter(contentProcessor)
    const filtered = filter.filter(items)
    deepStrictEqual(filtered, [
      { title: 'Title A' },
      { title: 'Title B' }
    ])
  })

  it('should preserve the first item encountered (most recent)', () => {
    const items = [
      { guid: '123', title: 'Newer A' },
      { guid: '456', title: 'B' },
      { guid: '123', title: 'Older A' } // Duplicate guid
    ]
    const filter = new DuplicateFilter(contentProcessor)
    const filtered = filter.filter(items)
    deepStrictEqual(filtered, [
      { guid: '123', title: 'Newer A' },
      { guid: '456', title: 'B' }
    ])
    strictEqual(filtered[0].title, 'Newer A')
  })

  it('should normalize keys before comparison', () => {
    const items = [
      { title: '  Title A  ' },
      { title: 'Title B' },
      { title: 'TITLE A' } // Duplicate title with different case and whitespace
    ]
    const filter = new DuplicateFilter(contentProcessor)
    const filtered = filter.filter(items)
    deepStrictEqual(filtered, [
      { title: '  Title A  ' },
      { title: 'Title B' }
    ])
  })

  it('should handle empty or invalid input', () => {
    const filter = new DuplicateFilter(contentProcessor)
    deepStrictEqual(filter.filter([]), [])
    deepStrictEqual(filter.filter(null), [])
    deepStrictEqual(filter.filter(undefined), [])
    deepStrictEqual(filter.filter('not an array'), [])
  })
})
