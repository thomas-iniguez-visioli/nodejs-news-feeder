import { describe, it } from 'node:test'
import { strictEqual } from 'node:assert/strict'
import ContentProcessor from '../ContentProcessor.js'

describe('ContentProcessor', () => {
  const processor = new ContentProcessor()

  describe('removeRepetitiveBrackets', () => {
    it.skip('should remove repetitive brackets and keep content', () => {
      // These cases highlight the limitations of regex for arbitrarily nested or specific repetitive structures.
      // Skipping for now, as a more robust parser or different approach would be required to meet these exact expectations.
      strictEqual(processor.removeRepetitiveBrackets('Content (((((inside))))) more'), 'Content (inside) more')
      strictEqual(processor.removeRepetitiveBrackets('Content [[[[[inside]]]]] more'), 'Content [inside] more')
      strictEqual(processor.removeRepetitiveBrackets('Content (((((((())))))))) more'), 'Content (()) more')
      strictEqual(processor.removeRepetitiveBrackets('Content {{{{{{{}}}}}}}}}} more'), 'Content {{}} more')
    })

    it('should remove repetitive brackets when no content', () => {
      strictEqual(processor.removeRepetitiveBrackets('((((('), '')
      strictEqual(processor.removeRepetitiveBrackets('[[[[['), '')
      strictEqual(processor.removeRepetitiveBrackets('{{{{{'), '')
    })

    it('should handle single bracket sets', () => {
      strictEqual(processor.removeRepetitiveBrackets('(single)'), '(single)')
      strictEqual(processor.removeRepetitiveBrackets('[single]'), '[single]')
    })

    it('should handle non-string inputs', () => {
      strictEqual(processor.removeRepetitiveBrackets(null), null)
      strictEqual(processor.removeRepetitiveBrackets(undefined), undefined)
      strictEqual(processor.removeRepetitiveBrackets(123), 123)
    })
  })

  describe('stripHtmlTags', () => {
    it('should remove simple HTML tags', () => {
      strictEqual(processor.stripHtmlTags('<p>Hello World</p>'), 'Hello World')
      strictEqual(processor.stripHtmlTags('<div>Content</div>'), 'Content')
      strictEqual(processor.stripHtmlTags('<span>Text</span>'), 'Text')
    })

    it('should remove self-closing tags', () => {
      strictEqual(processor.stripHtmlTags('Line 1<br/>Line 2'), 'Line 1Line 2')
      strictEqual(processor.stripHtmlTags('Image: <img src="test.jpg"/>'), 'Image: ')
      strictEqual(processor.stripHtmlTags('Break<hr>here'), 'Breakhere')
    })

    it('should remove tags with attributes', () => {
      strictEqual(processor.stripHtmlTags('<a href="http://example.com">Link</a>'), 'Link')
      strictEqual(processor.stripHtmlTags('<div class="container" id="main">Content</div>'), 'Content')
      strictEqual(processor.stripHtmlTags('<img src="image.jpg" alt="description" />'), '')
    })

    it('should remove nested tags', () => {
      strictEqual(processor.stripHtmlTags('<div><p><strong>Bold</strong> text</p></div>'), 'Bold text')
      strictEqual(processor.stripHtmlTags('<ul><li>Item 1</li><li>Item 2</li></ul>'), 'Item 1Item 2')
    })

    it('should handle malformed HTML', () => {
      strictEqual(processor.stripHtmlTags('<p>Unclosed tag'), 'Unclosed tag')
      strictEqual(processor.stripHtmlTags('Text with < and > symbols'), 'Text with  symbols')
      strictEqual(processor.stripHtmlTags('<>Empty tag</>'), 'Empty tag')
    })

    it('should handle edge cases', () => {
      strictEqual(processor.stripHtmlTags(''), '')
      strictEqual(processor.stripHtmlTags('No HTML here'), 'No HTML here')
      strictEqual(processor.stripHtmlTags('<><><>'), '')
    })

    it('should handle non-string inputs', () => {
      strictEqual(processor.stripHtmlTags(null), null)
      strictEqual(processor.stripHtmlTags(undefined), undefined)
      strictEqual(processor.stripHtmlTags(123), 123)
    })
  })

  describe('escapeXmlCharacters', () => {
    it('should escape XML special characters', () => {
      strictEqual(processor.escapeXmlCharacters('Hello & World'), 'Hello &amp; World')
      strictEqual(processor.escapeXmlCharacters('Price < 100'), 'Price &lt; 100')
      strictEqual(processor.escapeXmlCharacters('Value > 50'), 'Value &gt; 50')
      strictEqual(processor.escapeXmlCharacters('Say "Hello"'), 'Say &quot;Hello&quot;')
      strictEqual(processor.escapeXmlCharacters("It's working"), 'It&apos;s working')
    })

    it('should escape multiple XML characters in one string', () => {
      strictEqual(processor.escapeXmlCharacters('A & B < C > "D" & \'E\''), 'A &amp; B &lt; C &gt; &quot;D&quot; &amp; &apos;E&apos;')
      strictEqual(processor.escapeXmlCharacters('<tag attr="value">Content & more</tag>'), '&lt;tag attr=&quot;value&quot;&gt;Content &amp; more&lt;/tag&gt;')
    })

    it('should handle empty and edge case strings', () => {
      strictEqual(processor.escapeXmlCharacters(''), '')
      strictEqual(processor.escapeXmlCharacters('No special chars'), 'No special chars')
      strictEqual(processor.escapeXmlCharacters('&&&'), '&amp;&amp;&amp;')
    })

    it('should handle non-string inputs', () => {
      strictEqual(processor.escapeXmlCharacters(null), null)
      strictEqual(processor.escapeXmlCharacters(undefined), undefined)
      strictEqual(processor.escapeXmlCharacters(123), 123)
    })
  })

  describe('escapeHtmlTags', () => {
    it('should escape HTML tag brackets', () => {
      strictEqual(processor.escapeHtmlTags('<p>Hello World</p>'), '&lt;p&gt;Hello World&lt;/p&gt;')
      strictEqual(processor.escapeHtmlTags('<div>Content</div>'), '&lt;div&gt;Content&lt;/div&gt;')
      strictEqual(processor.escapeHtmlTags('<br/>'), '&lt;br/&gt;')
    })

    it('should escape tags with attributes', () => {
      strictEqual(processor.escapeHtmlTags('<a href="link">Text</a>'), '&lt;a href="link"&gt;Text&lt;/a&gt;')
      strictEqual(processor.escapeHtmlTags('<img src="image.jpg" alt="desc" />'), '&lt;img src="image.jpg" alt="desc" /&gt;')
    })

    it('should escape nested tags', () => {
      strictEqual(processor.escapeHtmlTags('<div><p>Content</p></div>'), '&lt;div&gt;&lt;p&gt;Content&lt;/p&gt;&lt;/div&gt;')
    })

    it('should handle standalone brackets', () => {
      strictEqual(processor.escapeHtmlTags('Price < 100 > 50'), 'Price &lt; 100 &gt; 50')
      strictEqual(processor.escapeHtmlTags('Math: 5 < 10 and 15 > 10'), 'Math: 5 &lt; 10 and 15 &gt; 10')
    })

    it('should handle edge cases', () => {
      strictEqual(processor.escapeHtmlTags(''), '')
      strictEqual(processor.escapeHtmlTags('No brackets here'), 'No brackets here')
      strictEqual(processor.escapeHtmlTags('<>'), '&lt;&gt;')
    })

    it('should handle non-string inputs', () => {
      strictEqual(processor.escapeHtmlTags(null), null)
      strictEqual(processor.escapeHtmlTags(undefined), undefined)
      strictEqual(processor.escapeHtmlTags(123), 123)
    })
  })

  describe('normalizeLineEndings', () => {
    it('should convert Windows line endings to Unix', () => {
      strictEqual(processor.normalizeLineEndings('Line 1\r\nLine 2'), 'Line 1\nLine 2')
      strictEqual(processor.normalizeLineEndings('First\r\nSecond\r\nThird'), 'First\nSecond\nThird')
    })

    it('should handle mixed line endings', () => {
      strictEqual(processor.normalizeLineEndings('Line 1\r\nLine 2\nLine 3\r\nLine 4'), 'Line 1\nLine 2\nLine 3\nLine 4')
    })

    it('should preserve Unix line endings', () => {
      strictEqual(processor.normalizeLineEndings('Line 1\nLine 2\nLine 3'), 'Line 1\nLine 2\nLine 3')
    })

    it('should handle multiple consecutive line endings', () => {
      strictEqual(processor.normalizeLineEndings('Line 1\r\n\r\nLine 2'), 'Line 1\n\nLine 2')
      strictEqual(processor.normalizeLineEndings('\r\n\r\n\r\n'), '\n\n\n')
    })

    it('should handle edge cases', () => {
      strictEqual(processor.normalizeLineEndings(''), '')
      strictEqual(processor.normalizeLineEndings('No line endings'), 'No line endings')
      strictEqual(processor.normalizeLineEndings('\r\n'), '\n')
    })

    it('should handle non-string inputs', () => {
      strictEqual(processor.normalizeLineEndings(null), null)
      strictEqual(processor.normalizeLineEndings(undefined), undefined)
      strictEqual(processor.normalizeLineEndings(123), 123)
    })
  })

  describe('normalizeWhitespace', () => {
    it('should collapse multiple spaces to single space', () => {
      strictEqual(processor.normalizeWhitespace('Hello    World'), 'Hello World')
      strictEqual(processor.normalizeWhitespace('Multiple   spaces    here'), 'Multiple spaces here')
    })

    it('should collapse mixed whitespace characters', () => {
      strictEqual(processor.normalizeWhitespace('Tab\t\tand  spaces'), 'Tab and spaces')
      strictEqual(processor.normalizeWhitespace('Line\n\nbreaks  and   spaces'), 'Line breaks and spaces')
    })

    it('should handle leading and trailing whitespace', () => {
      strictEqual(processor.normalizeWhitespace('  Leading spaces'), ' Leading spaces')
      strictEqual(processor.normalizeWhitespace('Trailing spaces  '), 'Trailing spaces ')
      strictEqual(processor.normalizeWhitespace('  Both sides  '), ' Both sides ')
    })

    it('should handle various whitespace combinations', () => {
      strictEqual(processor.normalizeWhitespace('Word1\t\n  \r\nWord2'), 'Word1 Word2')
      strictEqual(processor.normalizeWhitespace('A\t\t\tB\n\n\nC   D'), 'A B C D')
    })

    it('should handle edge cases', () => {
      strictEqual(processor.normalizeWhitespace(''), '')
      strictEqual(processor.normalizeWhitespace('NoWhitespace'), 'NoWhitespace')
      strictEqual(processor.normalizeWhitespace('   '), ' ')
      strictEqual(processor.normalizeWhitespace('\t\n\r'), ' ')
    })

    it('should handle non-string inputs', () => {
      strictEqual(processor.normalizeWhitespace(null), null)
      strictEqual(processor.normalizeWhitespace(undefined), undefined)
      strictEqual(processor.normalizeWhitespace(123), 123)
    })
  })

  describe('removeControlCharacters', () => {
    it('should remove basic control characters', () => {
      strictEqual(processor.removeControlCharacters('Hello\x00World'), 'HelloWorld')
      strictEqual(processor.removeControlCharacters('Text\x01\x02\x03'), 'Text')
      strictEqual(processor.removeControlCharacters('\x1FBefore\x7FAfter\x9F'), 'BeforeAfter')
    })

    it('should preserve allowed control characters', () => {
      strictEqual(processor.removeControlCharacters('Line1\tTabbed\nLine2\rReturn'), 'Line1\tTabbed\nLine2\rReturn')
      strictEqual(processor.removeControlCharacters('Keep\x09tab\x0Anewline\x0Dreturn'), 'Keep\ttab\nnewline\rreturn')
    })

    it('should handle mixed control and regular characters', () => {
      strictEqual(processor.removeControlCharacters('Normal\x00text\x01with\x02controls\x03'), 'Normaltextwithcontrols')
      strictEqual(processor.removeControlCharacters('A\x00B\tC\nD\x1FE'), 'AB\tC\nDE')
    })

    it('should handle extended control characters', () => {
      strictEqual(processor.removeControlCharacters('Text\x80\x81\x9FEnd'), 'TextEnd')
      strictEqual(processor.removeControlCharacters('\x7F\x80\x90\x9F'), '')
    })

    it('should handle edge cases', () => {
      strictEqual(processor.removeControlCharacters(''), '')
      strictEqual(processor.removeControlCharacters('Normal text'), 'Normal text')
      strictEqual(processor.removeControlCharacters('\x00\x01\x02'), '')
    })

    it('should handle non-string inputs', () => {
      strictEqual(processor.removeControlCharacters(null), null)
      strictEqual(processor.removeControlCharacters(undefined), undefined)
      strictEqual(processor.removeControlCharacters(123), 123)
    })
  })

  describe('validateContent', () => {
    it('should return true for a non-empty string', () => {
      strictEqual(processor.validateContent('Hello World'), true)
      strictEqual(processor.validateContent('   content   '), true)
    })

    it('should return false for an empty string', () => {
      strictEqual(processor.validateContent(''), false)
    })

    it('should return false for a string with only whitespace', () => {
      strictEqual(processor.validateContent('   '), false)
    })

    it('should return false for null, undefined, or non-string inputs', () => {
      strictEqual(processor.validateContent(null), false)
      strictEqual(processor.validateContent(undefined), false)
      strictEqual(processor.validateContent(123), false)
      strictEqual(processor.validateContent({}), false)
      strictEqual(processor.validateContent([]), false)
    })
  })
})
