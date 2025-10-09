import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { createHash } from 'crypto'
import * as remark from 'remark'
import remarkHtml from 'remark-html'
import { DateTime } from 'luxon'
const dateRegex = /(\d*-\d*-\d*)/gm
const xmlFile = join(process.cwd(), 'feed.xml')
const configFile = join(process.cwd(), 'config.json')
const websiteFile = join(process.cwd(), 'index.html')
const websiteTemplate = join(process.cwd(), 'templates', 'index.html.ejs')
import got from 'got'
export function md2html(md) {
  return remark.remark().use(remarkHtml).processSync(md).toString()
}
// XML character escape mapping
const xmlEscapeMap = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;',
  "< ":"","<=":""
}

/**
 * Escapes XML special characters in text
 * @param {string} text - The text to escape
 * @returns {string} - Text with XML characters escaped
 */
export function escapeXmlCharacters(text) {
  if (typeof text !== 'string') {
    return text
  }

  return text.replace(/[&<>"']/g, (match) => xmlEscapeMap[match])
}

/**
 * Strips HTML tags from text completely
 * @param {string} text - The text to process
 * @returns {string} - Text with HTML tags removed
 */
export function stripHtmlTags(text) {
  if (typeof text !== 'string') {
    return text
  }

  // Remove HTML tags (both opening and closing)
  return text.replace(/<[^>]*>/g, '')
}

/**
 * Escapes HTML tags as text (converts < and > to entities)
 * @param {string} text - The text to process
 * @returns {string} - Text with HTML tags escaped as text
 */
export function escapeHtmlTags(text) {
  if (typeof text !== 'string') {
    return text
  }

  // Escape HTML tags by converting < and > to entities
  return text.replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/**
 * Normalizes line endings from \r\n to \n
 * @param {string} text - The text to process
 * @returns {string} - Text with normalized line endings
 */
export function normalizeLineEndings(text) {
  if (typeof text !== 'string') {
    return text
  }

  // Convert Windows line endings (\r\n) to Unix line endings (\n)
  return text.replace(/\r\n/g, '\n')
}

/**
 * Normalizes multiple consecutive whitespace characters to single spaces
 * @param {string} text - The text to process
 * @returns {string} - Text with normalized whitespace
 */
export function normalizeWhitespace(text) {
  if (typeof text !== 'string') {
    return text
  }

  // Replace multiple consecutive whitespace characters with single space
  return text.replace(/\s+/g, ' ')
}

/**
 * Removes control characters except tab, newline, and carriage return
 * @param {string} text - The text to process
 * @returns {string} - Text with control characters removed
 */
export function removeControlCharacters(text) {
  if (typeof text !== 'string') {
    return text
  }

  // Remove control characters (0x00-0x1F and 0x7F-0x9F) except tab (0x09), newline (0x0A), and carriage return (0x0D)
  return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '')
}

/**
 * Validates and converts input to string safely
 * @param {any} input - The input to validate and convert
 * @returns {string} - Safe string representation of the input
 */
export function validateAndConvertInput(input) {
  // Handle null and undefined inputs by returning empty string
  if (input === null || input === undefined) {
    return ''
  }

  // If already a string, return as-is
  if (typeof input === 'string') {
    return input
  }

  // Handle primitive types
  if (typeof input === 'number' || typeof input === 'boolean') {
    return String(input)
  }

  // Handle objects and arrays with circular reference detection
  if (typeof input === 'object') {
    try {
      // Use JSON.stringify with circular reference detection
      const seen = new WeakSet()
      const jsonString = JSON.stringify(input, (key, value) => {
        if (typeof value === 'object' && value !== null) {
          if (seen.has(value)) {
            return '[Circular Reference]'
          }
          seen.add(value)
        }
        return value
      })
      return jsonString || ''
    } catch (error) {
      // Fallback to toString if JSON.stringify fails
      try {
        return input.toString()
      } catch (toStringError) {
        return '[Object]'
      }
    }
  }

  // Handle functions and other types
  if (typeof input === 'function') {
    return '[Function]'
  }

  // Fallback: use String() constructor for any remaining cases
  try {
    return String(input)
  } catch (error) {
    return ''
  }
}

/**
 * Handles empty strings and whitespace-only strings
 * @param {string} text - The text to check
 * @returns {string} - Empty string if input is only whitespace, otherwise original text
 */
export function handleEmptyAndWhitespace(text) {
  if (typeof text !== 'string') {
    return ''
  }

  // Return empty string if text is empty or contains only whitespace
  if (text.trim() === '') {
    return ''
  }

  return text
}

/**
 * Normalizes encoding issues by handling common problematic characters
 * @param {string} text - The text to normalize
 * @returns {string} - Text with encoding issues resolved
 */
export function normalizeEncoding(text) {
  if (typeof text !== 'string') {
    return text
  }

  // Handle common encoding issues
  return text
    // Fix common UTF-8 encoding issues
    .replace(/â€™/g, "'")  // Right single quotation mark
    .replace(/â€œ/g, '"')  // Left double quotation mark
    .replace(/â€/g, '"')   // Right double quotation mark
    .replace(/â€"/g, '—')  // Em dash
    .replace(/â€"/g, '–')  // En dash
    .replace(/Â/g, '')     // Non-breaking space artifacts
    // Replace invalid UTF-8 sequences with replacement character
    .replace(/[\uFFFD]/g, '')
    // Normalize Unicode combining characters
    .normalize('NFC')
}

/**
 * Optimizes processing for very long strings by chunking if necessary
 * @param {string} text - The text to process
 * @param {Function} processingFunction - The function to apply to each chunk
 * @param {number} chunkSize - Maximum size of each chunk (default: 50000)
 * @returns {string} - Processed text
 */
export function optimizeForLongStrings(text, processingFunction, chunkSize = 50000) {
  if (typeof text !== 'string' || typeof processingFunction !== 'function') {
    return text
  }

  // If text is short enough, process normally
  if (text.length <= chunkSize) {
    return processingFunction(text)
  }

  // For very long strings, process in chunks to avoid performance issues
  const chunks = []
  for (let i = 0; i < text.length; i += chunkSize) {
    const chunk = text.slice(i, i + chunkSize)
    chunks.push(processingFunction(chunk))
  }

  return chunks.join('')
}

// Default configuration options for cleancontent function
const defaultOptions = {
  stripHtml: true,           // Strip HTML tags vs escape them
  normalizeWhitespace: true, // Normalize multiple spaces
  preserveLineBreaks: false, // Keep line breaks vs remove them
  maxLength: null,           // Truncate if longer than this
  encoding: 'utf8'           // Handle encoding normalization
}

/**
 * Merges user options with default options and validates configuration
 * @param {object} userOptions - User-provided configuration options
 * @returns {object} - Merged and validated configuration
 */
function mergeAndValidateOptions(userOptions = {}) {
  // Start with default options
  const options = { ...defaultOptions }

  // Handle invalid configuration gracefully
  if (userOptions === null || typeof userOptions !== 'object') {
    return options
  }

  // Merge user options, validating each option
  if (typeof userOptions.stripHtml === 'boolean') {
    options.stripHtml = userOptions.stripHtml
  }

  if (typeof userOptions.normalizeWhitespace === 'boolean') {
    options.normalizeWhitespace = userOptions.normalizeWhitespace
  }

  if (typeof userOptions.preserveLineBreaks === 'boolean') {
    options.preserveLineBreaks = userOptions.preserveLineBreaks
  }

  if (typeof userOptions.maxLength === 'number' && userOptions.maxLength > 0) {
    options.maxLength = userOptions.maxLength
  } else if (userOptions.maxLength === null || userOptions.maxLength === undefined) {
    options.maxLength = null
  }

  if (typeof userOptions.encoding === 'string' && userOptions.encoding.trim() !== '') {
    options.encoding = userOptions.encoding.trim()
  }

  return options
}

/**
 * Main processing pipeline that applies cleaning stages in correct order
 * @param {string} text - The text to process
 * @param {object} options - Configuration options
 * @returns {string} - Processed text
 */
function processTextPipeline(text, options) {
  let processedText = text

  // Stage 1: Input validation and conversion
  processedText = validateAndConvertInput(processedText)

  // Early return for empty or whitespace-only content (performance optimization)
  if (processedText.trim() === '') {
    return ''
  }

  // Stage 2: Encoding normalization
  if (options.encoding === 'utf8') {
    processedText = normalizeEncoding(processedText)
  }

  // Stage 3: Line ending normalization
  processedText = normalizeLineEndings(processedText)

  // Stage 4: HTML processing based on configuration
  if (options.stripHtml) {
    processedText = stripHtmlTags(processedText)
  } else {
    processedText = escapeHtmlTags(processedText)
  }

  // Stage 5: XML character escaping
  processedText = escapeXmlCharacters(processedText)

  // Stage 6: Control character removal
  processedText = removeControlCharacters(processedText)

  // Stage 7: Whitespace normalization based on configuration
  if (options.normalizeWhitespace) {
    processedText = normalizeWhitespace(processedText)
  }

  // Stage 8: Line break handling based on configuration
  if (!options.preserveLineBreaks) {
    // Remove line breaks by replacing them with spaces
    processedText = processedText.replace(/\n/g, ' ')
    // Clean up any double spaces that might have been created
    if (options.normalizeWhitespace) {
      processedText = normalizeWhitespace(processedText)
    }
  }

  return processedText
}

/**
 * Applies final cleanup including length limiting and trimming
 * @param {string} text - The text to finalize
 * @param {object} options - Configuration options
 * @returns {string} - Final cleaned text
 */
function applyFinalCleanup(text, options) {
  let finalText = text

  // Apply maximum length truncation if specified
  if (options.maxLength && typeof options.maxLength === 'number' && options.maxLength > 0) {
    if (finalText.length > options.maxLength) {
      finalText = finalText.substring(0, options.maxLength)
      // Try to truncate at word boundary if possible
      const lastSpaceIndex = finalText.lastIndexOf(' ')
      if (lastSpaceIndex > options.maxLength * 0.8) {
        finalText = finalText.substring(0, lastSpaceIndex)
      }
      // Add ellipsis to indicate truncation
      finalText = finalText.trim() + '...'
    }
  }

  // Final trimming of leading/trailing whitespace
  finalText = finalText.trim()

  // Ensure output is always a clean string (handle edge cases)
  if (typeof finalText !== 'string') {
    finalText = ''
  }

  return finalText
}

/**
 * Main cleancontent function that orchestrates all cleaning operations
 * @param {any} text - The content to clean (will be converted to string)
 * @param {object} options - Configuration options
 * @returns {string} - Clean XML-safe string
 */
export function cleancontent(text, options = {}) {
  return text
  // Merge and validate configuration options

}
export function buildTitleDate(timestamp) {
  const [date, time] = new Date(timestamp).toISOString().split('T')
  // Format: YYYY-MM-DD HH:MM:SS
  return `${date} ${time.slice(0, 8)}`
}

export function getConfig() {
  return JSON.parse(readFileSync(configFile, 'utf8'))
}

export function overwriteConfig(config) {
  writeFileSync(configFile, JSON.stringify(config, null, 2))
}

export function composeFeedItem({ title, description, pubDate, link, guid }) {
  // console.log(pubDate)
  console.log(title)

  // Clean title and description using cleancontent function
  const cleanTitle = cleancontent(title, {
    stripHtml: true,
    preserveLineBreaks: false,
    normalizeWhitespace: true
  })

  const cleanDescription = cleancontent(description, {
    stripHtml: true,
    preserveLineBreaks: false,
    normalizeWhitespace: true
  })

  return `
    <item>
      <title>${cleanTitle}</title>
      <description>${cleanDescription}</description>
      <pubDate>${pubDate}</pubDate>
      <link>${link}</link>
      <guid>${guid}</guid>
    </item>
  `
}

export function getFeedContent() {
  return readFileSync(xmlFile, 'utf8')
}

export function getWebsiteTemplate() {
  return readFileSync(websiteTemplate, 'utf8')
}

export function overwriteFeedContent(content) {
  writeFileSync(xmlFile, content)
}

export function overwriteWebsiteContent(content) {
  writeFileSync(websiteFile, content)
}

export function getFeedHash() {
  const xml = getFeedContent()
  return createHash('sha256').update(xml).digest('hex')
}

// @see: https://whitep4nth3r.com/blog/how-to-format-dates-for-rss-feeds-rfc-822/
export function addLeadingZero(num) {
  num = num.toString()
  while (num.length < 2) num = '0' + num
  return num
}

export function buildRFC822Date(dateString) {
  const dayStrings = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const monthStrings = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  const timeStamp = Date.parse(dateString)
  const date = new Date(timeStamp)

  const day = dayStrings[date.getDay()]
  const dayNumber = addLeadingZero(date.getDate())
  const month = monthStrings[date.getMonth()]
  const year = date.getFullYear()
  const time = `${addLeadingZero(date.getHours())}:${addLeadingZero(date.getMinutes())}:00`
  const timezone = date.getTimezoneOffset() === 0 ? 'GMT' : 'BST'
  //console.log(`${day}, ${dayNumber} ${month} ${year} ${time} ${timezone}`)
  // Wed, 02 Oct 2002 13:00:00 GMT
  return `${day}, ${dayNumber} ${month} ${year} ${time} ${timezone}`
}

export async function generateRetroRequestUrl() {
  console.log(JSON.parse(await got.get("https://thomas-iniguez-visioli.github.io/retro-weekly/feed.json").text()))
  return JSON.parse(await got.get("https://thomas-iniguez-visioli.github.io/retro-weekly/feed.json").text()).items
}

export function generateRetroUIUrl(dateString) {
  return `https://thomas-iniguez-visioli.github.io/retro-weekly/${dateString}/`
}

export function parseRetrospectiveContent(data) {
  const [rawTitle, , description] = data.split('\n')
  const title = rawTitle.replace('# ', '').replaceAll('`', '').trim()
  const dates = title.split(dateRegex)
  console.log(dates)
  return { title, description, lastDay: dates[1], nextDay: dates[3] }
}

// Filtrage centralisé des items RSS
export function filterFeedItems(items, { keywords = [], categories = [] } = {}) {
  const seen = new Set();
  return items.filter(item => {
    // Exclure les entrées incomplètes
    if (!item.title || !item.link || !item.pubDate) return false;
    // Filtrage par mot-clé
    if (keywords.length && !keywords.some(k => item.title.includes(k) || (item.description && item.description.includes(k)))) return false;
    // Filtrage par catégorie
    if (categories.length && (!item.categories || !item.categories.some(c => categories.includes(c)))) return false;
    // Doublons par guid ou lien ou titre
    const key = (item.guid || item.link || item.title).trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
