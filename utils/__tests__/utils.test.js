import { describe, it } from 'node:test'
import { strictEqual } from 'node:assert/strict'
import { 
  buildRFC822Date,
  escapeXmlCharacters,
  stripHtmlTags,
  escapeHtmlTags,
  normalizeLineEndings,
  normalizeWhitespace,
  removeControlCharacters
} from '../index.js'

describe('Utils', () => {
  describe('buildRFC822Date', () => {
    it('should return a date in RFC822 format', () => {
      strictEqual(buildRFC822Date('2021-11-29T00:00:00.000Z'), 'Mon, 29 Nov 2021 01:00:00 BST')
      strictEqual(buildRFC822Date('2021-09-08T00:00:00.000+01:00'), 'Wed, 08 Sep 2021 01:00:00 BST')
    })
  })

  describe('escapeXmlCharacters', () => {
    it('should escape XML special characters', () => {
      strictEqual(escapeXmlCharacters('Hello & World'), 'Hello &amp; World')
      strictEqual(escapeXmlCharacters('Price < 100'), 'Price &lt; 100')
      strictEqual(escapeXmlCharacters('Value > 50'), 'Value &gt; 50')
      strictEqual(escapeXmlCharacters('Say "Hello"'), 'Say &quot;Hello&quot;')
      strictEqual(escapeXmlCharacters("It's working"), 'It&apos;s working')
    })

    it('should escape multiple XML characters in one string', () => {
      strictEqual(escapeXmlCharacters('A & B < C > "D" & \'E\''), 'A &amp; B &lt; C &gt; &quot;D&quot; &amp; &apos;E&apos;')
      strictEqual(escapeXmlCharacters('<tag attr="value">Content & more</tag>'), '&lt;tag attr=&quot;value&quot;&gt;Content &amp; more&lt;/tag&gt;')
    })

    it('should handle empty and edge case strings', () => {
      strictEqual(escapeXmlCharacters(''), '')
      strictEqual(escapeXmlCharacters('No special chars'), 'No special chars')
      strictEqual(escapeXmlCharacters('&&&'), '&amp;&amp;&amp;')
    })

    it('should handle non-string inputs', () => {
      strictEqual(escapeXmlCharacters(null), null)
      strictEqual(escapeXmlCharacters(undefined), undefined)
      strictEqual(escapeXmlCharacters(123), 123)
    })
  })

  describe('stripHtmlTags', () => {
    it('should remove simple HTML tags', () => {
      strictEqual(stripHtmlTags('<p>Hello World</p>'), 'Hello World')
      strictEqual(stripHtmlTags('<div>Content</div>'), 'Content')
      strictEqual(stripHtmlTags('<span>Text</span>'), 'Text')
    })

    it('should remove self-closing tags', () => {
      strictEqual(stripHtmlTags('Line 1<br/>Line 2'), 'Line 1Line 2')
      strictEqual(stripHtmlTags('Image: <img src="test.jpg"/>'), 'Image: ')
      strictEqual(stripHtmlTags('Break<hr>here'), 'Breakhere')
    })

    it('should remove tags with attributes', () => {
      strictEqual(stripHtmlTags('<a href="http://example.com">Link</a>'), 'Link')
      strictEqual(stripHtmlTags('<div class="container" id="main">Content</div>'), 'Content')
      strictEqual(stripHtmlTags('<img src="image.jpg" alt="description" />'), '')
    })

    it('should remove nested tags', () => {
      strictEqual(stripHtmlTags('<div><p><strong>Bold</strong> text</p></div>'), 'Bold text')
      strictEqual(stripHtmlTags('<ul><li>Item 1</li><li>Item 2</li></ul>'), 'Item 1Item 2')
    })

    it('should handle malformed HTML', () => {
      strictEqual(stripHtmlTags('<p>Unclosed tag'), 'Unclosed tag')
      strictEqual(stripHtmlTags('Text with < and > symbols'), 'Text with  symbols')
      strictEqual(stripHtmlTags('<>Empty tag</>'), 'Empty tag')
    })

    it('should handle edge cases', () => {
      strictEqual(stripHtmlTags(''), '')
      strictEqual(stripHtmlTags('No HTML here'), 'No HTML here')
      strictEqual(stripHtmlTags('<><><>'), '')
    })

    it('should handle non-string inputs', () => {
      strictEqual(stripHtmlTags(null), null)
      strictEqual(stripHtmlTags(undefined), undefined)
      strictEqual(stripHtmlTags(123), 123)
    })
  })

  describe('escapeHtmlTags', () => {
    it('should escape HTML tag brackets', () => {
      strictEqual(escapeHtmlTags('<p>Hello World</p>'), '&lt;p&gt;Hello World&lt;/p&gt;')
      strictEqual(escapeHtmlTags('<div>Content</div>'), '&lt;div&gt;Content&lt;/div&gt;')
      strictEqual(escapeHtmlTags('<br/>'), '&lt;br/&gt;')
    })

    it('should escape tags with attributes', () => {
      strictEqual(escapeHtmlTags('<a href="link">Text</a>'), '&lt;a href="link"&gt;Text&lt;/a&gt;')
      strictEqual(escapeHtmlTags('<img src="image.jpg" alt="desc" />'), '&lt;img src="image.jpg" alt="desc" /&gt;')
    })

    it('should escape nested tags', () => {
      strictEqual(escapeHtmlTags('<div><p>Content</p></div>'), '&lt;div&gt;&lt;p&gt;Content&lt;/p&gt;&lt;/div&gt;')
    })

    it('should handle standalone brackets', () => {
      strictEqual(escapeHtmlTags('Price < 100 > 50'), 'Price &lt; 100 &gt; 50')
      strictEqual(escapeHtmlTags('Math: 5 < 10 and 15 > 10'), 'Math: 5 &lt; 10 and 15 &gt; 10')
    })

    it('should handle edge cases', () => {
      strictEqual(escapeHtmlTags(''), '')
      strictEqual(escapeHtmlTags('No brackets here'), 'No brackets here')
      strictEqual(escapeHtmlTags('<>'), '&lt;&gt;')
    })

    it('should handle non-string inputs', () => {
      strictEqual(escapeHtmlTags(null), null)
      strictEqual(escapeHtmlTags(undefined), undefined)
      strictEqual(escapeHtmlTags(123), 123)
    })
  })

  describe('normalizeLineEndings', () => {
    it('should convert Windows line endings to Unix', () => {
      strictEqual(normalizeLineEndings('Line 1\r\nLine 2'), 'Line 1\nLine 2')
      strictEqual(normalizeLineEndings('First\r\nSecond\r\nThird'), 'First\nSecond\nThird')
    })

    it('should handle mixed line endings', () => {
      strictEqual(normalizeLineEndings('Line 1\r\nLine 2\nLine 3\r\nLine 4'), 'Line 1\nLine 2\nLine 3\nLine 4')
    })

    it('should preserve Unix line endings', () => {
      strictEqual(normalizeLineEndings('Line 1\nLine 2\nLine 3'), 'Line 1\nLine 2\nLine 3')
    })

    it('should handle multiple consecutive line endings', () => {
      strictEqual(normalizeLineEndings('Line 1\r\n\r\nLine 2'), 'Line 1\n\nLine 2')
      strictEqual(normalizeLineEndings('\r\n\r\n\r\n'), '\n\n\n')
    })

    it('should handle edge cases', () => {
      strictEqual(normalizeLineEndings(''), '')
      strictEqual(normalizeLineEndings('No line endings'), 'No line endings')
      strictEqual(normalizeLineEndings('\r\n'), '\n')
    })

    it('should handle non-string inputs', () => {
      strictEqual(normalizeLineEndings(null), null)
      strictEqual(normalizeLineEndings(undefined), undefined)
      strictEqual(normalizeLineEndings(123), 123)
    })
  })

  describe('normalizeWhitespace', () => {
    it('should collapse multiple spaces to single space', () => {
      strictEqual(normalizeWhitespace('Hello    World'), 'Hello World')
      strictEqual(normalizeWhitespace('Multiple   spaces    here'), 'Multiple spaces here')
    })

    it('should collapse mixed whitespace characters', () => {
      strictEqual(normalizeWhitespace('Tab\t\tand  spaces'), 'Tab and spaces')
      strictEqual(normalizeWhitespace('Line\n\nbreaks  and   spaces'), 'Line breaks and spaces')
    })

    it('should handle leading and trailing whitespace', () => {
      strictEqual(normalizeWhitespace('  Leading spaces'), ' Leading spaces')
      strictEqual(normalizeWhitespace('Trailing spaces  '), 'Trailing spaces ')
      strictEqual(normalizeWhitespace('  Both sides  '), ' Both sides ')
    })

    it('should handle various whitespace combinations', () => {
      strictEqual(normalizeWhitespace('Word1\t\n  \r\nWord2'), 'Word1 Word2')
      strictEqual(normalizeWhitespace('A\t\t\tB\n\n\nC   D'), 'A B C D')
    })

    it('should handle edge cases', () => {
      strictEqual(normalizeWhitespace(''), '')
      strictEqual(normalizeWhitespace('NoWhitespace'), 'NoWhitespace')
      strictEqual(normalizeWhitespace('   '), ' ')
      strictEqual(normalizeWhitespace('\t\n\r'), ' ')
    })

    it('should handle non-string inputs', () => {
      strictEqual(normalizeWhitespace(null), null)
      strictEqual(normalizeWhitespace(undefined), undefined)
      strictEqual(normalizeWhitespace(123), 123)
    })
  })

  describe('removeControlCharacters', () => {
    it('should remove basic control characters', () => {
      strictEqual(removeControlCharacters('Hello\x00World'), 'HelloWorld')
      strictEqual(removeControlCharacters('Text\x01\x02\x03'), 'Text')
      strictEqual(removeControlCharacters('\x1FBefore\x7FAfter\x9F'), 'BeforeAfter')
    })

    it('should preserve allowed control characters', () => {
      strictEqual(removeControlCharacters('Line1\tTabbed\nLine2\rReturn'), 'Line1\tTabbed\nLine2\rReturn')
      strictEqual(removeControlCharacters('Keep\x09tab\x0Anewline\x0Dreturn'), 'Keep\ttab\nnewline\rreturn')
    })

    it('should handle mixed control and regular characters', () => {
      strictEqual(removeControlCharacters('Normal\x00text\x01with\x02controls\x03'), 'Normaltextwithcontrols')
      strictEqual(removeControlCharacters('A\x00B\tC\nD\x1FE'), 'AB\tC\nDE')
    })

    it('should handle extended control characters', () => {
      strictEqual(removeControlCharacters('Text\x80\x81\x9FEnd'), 'TextEnd')
      strictEqual(removeControlCharacters('\x7F\x80\x90\x9F'), '')
    })

    it('should handle edge cases', () => {
      strictEqual(removeControlCharacters(''), '')
      strictEqual(removeControlCharacters('Normal text'), 'Normal text')
      strictEqual(removeControlCharacters('\x00\x01\x02'), '')
    })

    it('should handle non-string inputs', () => {
      strictEqual(removeControlCharacters(null), null)
      strictEqual(removeControlCharacters(undefined), undefined)
      strictEqual(removeControlCharacters(123), 123)
    })
  })
})
