import ParseRss from 'rss-parser'
import xmlFormat from 'xml-formatter'
import {
  composeFeedItem,
  getConfig,
  getFeedContent,
  overwriteFeedContent,
  buildRFC822Date,
  filterFeedItems
} from '../utils/index.js'

const { breakDelimiter } = getConfig()

const parser = new ParseRss()
const tribykey = (array, key) => {
  var valid = [array[0]]
  array.forEach(element => {
    console.log(element[key])
    if (!valid.map((item) => { return item[key] }).includes(element[key])) {
      //console.log(valid)
      valid.push(element)
    }
  });
  return valid
}
const xml = getFeedContent()
const updaterrss = (feed) => {
  // Filtrage centralisé
  var fed = filterFeedItems(feed)
   console.log(fed)
  //console.log(fed)
  return fed
}
try {
  parser.parseString(xml).then((parsedXml) => {
    //console.log(parsedXml)
    const sortedItems = updaterrss(parsedXml.items).sort(
      (a, b) => new Date(b.isoDate) - new Date(a.isoDate)
    )
    const newXml = sortedItems
      .map(({ title, link, pubDate, content, guid,source,categories }) =>
        composeFeedItem({
          title,
          description: `<![CDATA[${content}]]>`,
          pubDate: pubDate,
          link,
          guid,source,categories
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
  }).catch((err) => { console.log(err) })
} catch (error) { console.log(error) }
