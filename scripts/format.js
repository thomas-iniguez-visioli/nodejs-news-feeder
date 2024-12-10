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

parser.parseString(xml).then((parsedXml) => {
  const sortedItems = parsedXml.items.sort(
    (a, b) => new Date(b.isoDate) - new Date(a.isoDate)
  ).filter((value, index, array) => {
    console.log(value)
   var test=!array.map((v,i)=>{
    if(i==index){
      return true
    }
    if(v.link==value.link){return false}
  }).includes(false)
    console.log(test)
    if(test){array.splice(index,1)}
    return true
  })
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
