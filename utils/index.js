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
import ContentProcessor from './ContentProcessor.js'
import DuplicateFilter from './DuplicateFilter.js'
import ErrorHandler from './ErrorHandler.js'

export function md2html(md) {
  return remark.remark().use(remarkHtml).processSync(md).toString()
}

const contentProcessor = new ContentProcessor()
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

export function composeFeedItem({ title, description, pubDate, link, guid,source,categories=[] }) {
  let processedTitle = title;
  let processedDescription = description;
  let processedLink = link;

  // Apply ContentProcessor methods for title
  processedTitle = contentProcessor.stripHtmlTags(processedTitle);
  processedTitle = contentProcessor.normalizeLineEndings(processedTitle);
  processedTitle = contentProcessor.normalizeWhitespace(processedTitle);
  processedTitle = contentProcessor.removeRepetitiveBrackets(processedTitle);
  processedTitle = contentProcessor.removeControlCharacters(processedTitle);
  processedTitle = contentProcessor.escapeXmlCharacters(processedTitle); // Escape for XML output

  // Apply ContentProcessor methods for description
  processedDescription = contentProcessor.stripHtmlTags(processedDescription);
  processedDescription = contentProcessor.normalizeLineEndings(processedDescription);
  processedDescription = contentProcessor.normalizeWhitespace(processedDescription);
  processedDescription = contentProcessor.removeRepetitiveBrackets(processedDescription);
  processedDescription = contentProcessor.removeControlCharacters(processedDescription);
  // Description is CDATA wrapped, so don't escape it here, but rather wrap after processing
  // processedDescription = contentProcessor.escapeXmlCharacters(processedDescription);

  // Apply ContentProcessor methods for link (less aggressive cleaning for URLs)
  processedLink = contentProcessor.removeControlCharacters(processedLink);
  processedLink = contentProcessor.removeRepetitiveBrackets(processedLink); // Unlikely for links, but consistent
  processedLink = contentProcessor.escapeXmlCharacters(processedLink); // Escape for XML output

  return `
    <item>
      <title>${processedTitle}</title>
      <description><![CDATA[${processedDescription}]]></description>
      <pubDate>${pubDate}</pubDate>
      <link>${processedLink}</link>
      <guid>${contentProcessor.escapeXmlCharacters(guid)}</guid>${categories.map((c)=>{return "<category><![CDATA["+c+"]]></category>"}).join("\n")}
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
  //console.log(JSON.parse(await got.get("https://thomas-iniguez-visioli.github.io/retro-weekly/feed.json").text()))
  return JSON.parse(await got.get("https://thomas-iniguez-visioli.github.io/retro-weekly/feed.json").text()).items
}

export function generateRetroUIUrl(dateString) {
  return `https://thomas-iniguez-visioli.github.io/retro-weekly/${dateString}/`
}

export function parseRetrospectiveContent(data) {
  const [rawTitle, , description] = data.split('\n')
  const title = rawTitle.replace('# ', '').replaceAll('`', '').trim()
  const dates = title.split(dateRegex)
  //console.log(dates)
  return { title, description, lastDay: dates[1], nextDay: dates[3] }
}

// Filtrage centralisé des items RSS
export function filterFeedItems(items, { keywords = [], categories = [] } = {}) {
  const duplicateFilter = new DuplicateFilter(contentProcessor);
  const errorHandler = new ErrorHandler();

  const filteredByContent = items.filter(item => {
    // Exclure les entrées incomplètes
    if (!item.title || !item.link || !item.pubDate) {
      errorHandler.logError(new Error('Skipping incomplete item'), { item });
      return false;
    }
    // Filtrage par mot-clé
    if (keywords.length && !keywords.some(k => item.title.includes(k) || (item.description && item.description.includes(k)))) return false;
    // Filtrage par catégorie
    if (categories.length && (!item.categories || !item.categories.some(c => categories.includes(c)))) return false;
    
    return true;
  });

  // After filtering by content, apply duplicate filter
  return duplicateFilter.filter(filteredByContent);
}
