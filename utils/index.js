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
export function md2html (md) {
  return remark.remark().use(remarkHtml).processSync(md).toString()
}
const cleancontent=(txt)=>{

}
export function buildTitleDate (timestamp) {
  const [date, time] = new Date(timestamp).toISOString().split('T')
  // Format: YYYY-MM-DD HH:MM:SS
  return `${date} ${time.slice(0, 8)}`
}

export function getConfig () {
  return JSON.parse(readFileSync(configFile, 'utf8'))
}

export function overwriteConfig (config) {
  writeFileSync(configFile, JSON.stringify(config, null, 2))
}

export function composeFeedItem ({ title, description, pubDate, link, guid }) {
 // console.log(pubDate)
  console.log(title)
  return `
    <item>
      <title>${title.replace("\r\n","").replaceAll("&","").replaceAll("<br>","")}</title>
      <description>${description}</description>
      <pubDate>${pubDate}</pubDate>
      <link>${link}</link>
      <guid>${guid}</guid>
    </item>
  `
}

export function getFeedContent () {
  return readFileSync(xmlFile, 'utf8')
}

export function getWebsiteTemplate () {
  return readFileSync(websiteTemplate, 'utf8')
}

export function overwriteFeedContent (content) {
  writeFileSync(xmlFile, content)
}

export function overwriteWebsiteContent (content) {
  writeFileSync(websiteFile, content)
}

export function getFeedHash () {
  const xml = getFeedContent()
  return createHash('sha256').update(xml).digest('hex')
}

// @see: https://whitep4nth3r.com/blog/how-to-format-dates-for-rss-feeds-rfc-822/
export function addLeadingZero (num) {
  num = num.toString()
  while (num.length < 2) num = '0' + num
  return num
}

export function buildRFC822Date (dateString) {
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

export async function generateRetroRequestUrl () {
  console.log(JSON.parse(await got.get("https://thomas-iniguez-visioli.github.io/retro-weekly/feed.json").text()))
  return JSON.parse(await got.get("https://thomas-iniguez-visioli.github.io/retro-weekly/feed.json").text()).items
}

export function generateRetroUIUrl (dateString) {
  return `https://thomas-iniguez-visioli.github.io/retro-weekly/${dateString}/`
}

export function parseRetrospectiveContent (data) {
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
