import ParseRss from 'rss-parser'
import xmlFormat from 'xml-formatter'
import {
  composeFeedItem,
  getConfig,
  getFeedContent,
  overwriteFeedContent
} from '../utils/index.js'

const { breakDelimiter } = getConfig()

const parser = new ParseRss()

const xml = getFeedContent()
const updaterrss=(feed)=>{
  console.log(feed.sort(
    (a, b) => new Date(b.isoDate) - new Date(a.isoDate)
  ).map(i=>{return i.title}))
  return feed
}
parser.parseString(xml).then((parsedXml) => {
  const sortedItems = updaterrss(parsedXml.items).sort(
    (a, b) => new Date(b.isoDate) - new Date(a.isoDate)
  )
  const newXml = sortedItems
    .map(({ title, link, pubDate, content, guid }) =>
      composeFeedItem({
        title,
        description: `<![CDATA[${content}]]>`,
        pubDate,
        link,
        guid
      })
    )
    .join('')

  const [before] = xml.split(breakDelimiter)
  const updatedFeedContent = `${before}${breakDelimiter}${newXml}</channel></rss>`

  const formattedXml = xmlFormat(updatedFeedContent, {
    indentation: '  ',
    collapseContent: true
  })

  overwriteFeedContent(formattedXml)
})
