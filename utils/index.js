import { readFileSync, writeFileSync, existsSync} from 'fs'
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

  // Remove HTML tags (both opening and closing) using repeated replacement to avoid incomplete multi-character sanitization
  let previous;
  do {
    previous = text;
    text = text.replace(/<[^>]*>/g, '');
  } while (text !== previous);
  return text;
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

const getkeys = () => {
  if(existsSync(join(process.cwd(), "./blacklist.txt"))){
    return readFileSync(join(process.cwd(), "./blacklist.txt"), "utf-8").split("\n").map((key) => key.trim().replace(/\r/g, ""))
  }else{
    writeFileSync(join(process.cwd(), "./blacklist.txt"), "")
    return []
  }
}
/**
 * Main cleancontent function that orchestrates all cleaning operations
 * @param {any} text - The content to clean (will be converted to string)
 * @param {object} options - Configuration options
 * @returns {string} - Clean XML-safe string
 */
export function cleancontent(text, options = {}) {
  let validtext=text
  const keys=getkeys()
  console.log(keys)
  for(const key of keys){
    
    while (validtext.includes(key)){
      console.log(validtext.includes(key))  
      validtext=validtext.replace(key,"")
    }
  }

  return validtext
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

export function composeFeedItem({ title, description, pubDate, link, guid,source }) {
  // console.log(pubDate)
  console.log(source)

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
      <link>${cleancontent(link,{})}</link>
    
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
