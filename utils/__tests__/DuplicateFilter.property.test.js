import { describe, it } from 'node:test'
import fc from 'fast-check'
import { deepStrictEqual } from 'node:assert/strict'
import DuplicateFilter from '../DuplicateFilter.js'
import ContentProcessor from '../ContentProcessor.js'

describe('DuplicateFilter Property-Based Tests', () => {
  const contentProcessor = new ContentProcessor()

  // Arbitrary for a feed item
  const feedItemArbitrary = fc.record({
    guid: fc.oneof(fc.string(), fc.constant(undefined)),
    link: fc.oneof(fc.string(), fc.constant(undefined)),
    title: fc.oneof(fc.string(), fc.constant(undefined))
  })

  // Property: Filtering twice should be the same as filtering once (idempotence)
  it('should be idempotent', () => {
    fc.assert(
      fc.property(fc.array(feedItemArbitrary), (items) => {
        const filter1 = new DuplicateFilter(contentProcessor)
        const firstPass = filter1.filter(items)
        const filter2 = new DuplicateFilter(contentProcessor) // Fresh filter for second pass
        const secondPass = filter2.filter(firstPass)
        deepStrictEqual(secondPass, firstPass)
      })
    )
  })

  // Property: The output array size should be less than or equal to the input array size
  it('output size should be less than or equal to input size', () => {
    fc.assert(
      fc.property(fc.array(feedItemArbitrary), (items) => {
        const filter = new DuplicateFilter(contentProcessor)
        const filtered = filter.filter(items)
        return filtered.length <= items.length
      })
    )
  })

  // Property: All items in the output array should be unique based on the keying logic
  it('all items in the output should have unique keys', () => {
    fc.assert(
      fc.property(fc.array(feedItemArbitrary), (items) => {
        const filter = new DuplicateFilter(contentProcessor)
        const filtered = filter.filter(items)

        const seenKeys = new Set()
        for (const item of filtered) {
          let key = item.guid || item.link || item.title || ''
          const normalizedKey = contentProcessor.normalizeWhitespace(key).trim().toLowerCase()
          if (seenKeys.has(normalizedKey)) {
            return false // Found a duplicate key in the output
          }
          seenKeys.add(normalizedKey)
        }
        return true
      })
    )
  })

  // Property: The output array is a subset of the input array
  it('output should be a subset of the input', () => {
    fc.assert(
      fc.property(fc.array(feedItemArbitrary), (items) => {
        const filter = new DuplicateFilter(contentProcessor)
        const filtered = filter.filter(items)

        // Every item in `filtered` must also be in `items` (by reference)
        return filtered.every(filteredItem => items.includes(filteredItem))
      })
    )
  })
})
