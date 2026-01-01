import { describe, it } from 'node:test'
import fc from 'fast-check'
import { strictEqual } from 'node:assert/strict'
import ContentProcessor from '../ContentProcessor.js'

describe('ContentProcessor Property-Based Tests', () => {
  const processor = new ContentProcessor()

  describe('normalizeLineEndings', () => {
    // Property: Applying normalizeLineEndings twice should yield the same result as applying it once (idempotence).
    it('should be idempotent (normalizeLineEndings(normalizeLineEndings(s)) === normalizeLineEndings(s))', () => {
      fc.assert(
        fc.property(fc.string(), (s) => {
          const result = processor.normalizeLineEndings(s)
          strictEqual(processor.normalizeLineEndings(result), result)
        })
      )
    })

    // Property: The output should not contain '\r\n'
    it('should not contain \\r\\n in the output', () => {
      fc.assert(
        fc.property(fc.string(), (s) => {
          const result = processor.normalizeLineEndings(s)
          if (typeof result === 'string') {
            return !result.includes('\r\n')
          }
          return true // Property holds for non-string inputs (which are returned unchanged)
        })
      )
    })
  })

  describe('normalizeWhitespace', () => {
    // Property: Applying normalizeWhitespace twice should yield the same result as applying it once (idempotence).
    it('should be idempotent (normalizeWhitespace(normalizeWhitespace(s)) === normalizeWhitespace(s))', () => {
      fc.assert(
        fc.property(fc.string(), (s) => {
          const result = processor.normalizeWhitespace(s)
          strictEqual(processor.normalizeWhitespace(result), result)
        })
      )
    })

    // Property: The output should not contain multiple consecutive whitespace characters, nor leading/trailing excessive whitespace.
    it('should not contain multiple consecutive spaces or excessive leading/trailing spaces', () => {
      fc.assert(
        fc.property(fc.string(), (s) => {
          const result = processor.normalizeWhitespace(s)
          if (typeof result !== 'string') return true // Skip non-string outputs

          // Check for multiple consecutive spaces
          if (result.includes('  ')) return false // Fails if multiple spaces

          // Check for excessive leading/trailing spaces
          // The normalizeWhitespace keeps one leading/trailing space if input had it.
          // So, compare with native String.prototype.normalizeWhitespace to validate.
          const expectedNormalized = s.replace(/\s+/g, ' ')
          const isResultTrimmed = result.length > 0 && (result[0] === ' ' || result[result.length - 1] === ' ') && expectedNormalized.trim() === result.trim()

          return !result.includes('  ') && (isResultTrimmed || expectedNormalized === result)
        })
      )
    })
  })

  describe('removeControlCharacters', () => {
    // Property: Applying removeControlCharacters twice should yield the same result (idempotence).
    it('should be idempotent (removeControlCharacters(removeControlCharacters(s)) === removeControlCharacters(s))', () => {
      fc.assert(
        fc.property(fc.string(), (s) => {
          const result = processor.removeControlCharacters(s)
          strictEqual(processor.removeControlCharacters(result), result)
        })
      )
    })

    // Property: The output should not contain any disallowed control characters.
    it('should not contain disallowed control characters in the output', () => {
      fc.assert(
        fc.property(fc.string(), (s) => {
          const result = processor.removeControlCharacters(s)
          if (typeof result !== 'string') return true // Property holds for non-string inputs

          // Regex to detect disallowed control characters
          const disallowedControlCharsRegex = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/;
          return !disallowedControlCharsRegex.test(result)
        })
      )
    })

    // Property: The output string length should be less than or equal to the input string length.
    it('output length should be less than or equal to input length', () => {
      fc.assert(
        fc.property(fc.string(), (s) => {
          const result = processor.removeControlCharacters(s)
          if (typeof result !== 'string' || typeof s !== 'string') return true; // Property holds for non-string inputs
          return result.length <= s.length
        })
      )
    })
  })
})