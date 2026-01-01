import { describe, it } from 'node:test'
import { strictEqual, deepStrictEqual, throws } from 'node:assert/strict'
import { 
  buildRFC822Date,
  filterFeedItems,
  getFeedContent
} from '../index.js'
import * as fs from 'fs'

describe('Utils', () => {
    describe('buildRFC822Date', () => {
      it('should return a date in RFC822 format', () => {
        strictEqual(buildRFC822Date('2021-11-29T00:00:00.000Z'), 'Mon, 29 Nov 2021 01:00:00 BST')
        strictEqual(buildRFC822Date('2021-09-08T00:00:00.000+01:00'), 'Wed, 08 Sep 2021 01:00:00 BST')
      })
    })
  
    describe('filterFeedItems', () => {    const baseItems = [
      { title: 'Item 1', link: 'l1', pubDate: 'd1', description: 'Hello world', categories: ['cat1'] },
      { title: 'Item 2', link: 'l2', pubDate: 'd2', description: 'Another post', categories: ['cat2'] },
      { title: 'Item 3', link: 'l3', pubDate: 'd3', description: 'Hello again', categories: ['cat1', 'cat2'] }
    ]

    it('should filter by keyword in title', () => {
      const filtered = filterFeedItems(baseItems, { keywords: ['world'] })
      deepStrictEqual(filtered.map(i => i.title), ['Item 1'])
    })

    it('should filter by keyword in description', () => {
      const filtered = filterFeedItems(baseItems, { keywords: ['post'] })
      deepStrictEqual(filtered.map(i => i.title), ['Item 2'])
    })

    it('should filter by category', () => {
      const filtered = filterFeedItems(baseItems, { categories: ['cat2'] })
      deepStrictEqual(filtered.map(i => i.title), ['Item 2', 'Item 3'])
    })

    it('should filter by multiple keywords (OR logic)', () => {
      const filtered = filterFeedItems(baseItems, { keywords: ['world', 'post'] })
      deepStrictEqual(filtered.map(i => i.title), ['Item 1', 'Item 2'])
    })

    it('should combine keyword and category filters (AND logic)', () => {
      const filtered = filterFeedItems(baseItems, { keywords: ['Hello'], categories: ['cat1'] })
      deepStrictEqual(filtered.map(i => i.title), ['Item 1', 'Item 3'])
    })

    it('should remove incomplete items', () => {
      const items = [
        ...baseItems,
        { title: 'Incomplete 1', link: 'l4' }, // Missing pubDate
        { link: 'l5', pubDate: 'd5' } // Missing title
      ]
      const filtered = filterFeedItems(items)
      deepStrictEqual(filtered.map(i => i.title), ['Item 1', 'Item 2', 'Item 3'])
    })

    it('should use DuplicateFilter to remove duplicates after other filters', () => {
      const items = [
        { title: 'Dupe Item', link: 'd1', pubDate: 'pd1', categories: ['cat1'], description: 'd' },
        { title: 'Unique Item', link: 'u1', pubDate: 'pd2', categories: ['cat1'], description: 'd' },
        { title: 'Dupe Item', link: 'd1', pubDate: 'pd3', categories: ['cat1'], description: 'd' } // Duplicate of first
      ]
      const filtered = filterFeedItems(items, { categories: ['cat1'] })
      deepStrictEqual(filtered.map(i => i.title), ['Dupe Item', 'Unique Item'])
    })
  })
})
