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
  var fed =[...new Set(feed.map((i)=>{
    return JSON.stringify(i)
  }))].map((i)=>{
    return JSON.parse(i)
  }).filter(
    (val,i,arr)=>{
      return arr.filter(
        (arrVal,index) => 
          (val.title === arrVal.title)&&(i==index)
      
      ).flat().reduce(
  (accumulator, currentValue) => accumulator && currentValue,
  true,)
    }

  ).filter(
    (val,i,arr)=>
      {return arr.filter(
        (arrVal,index) => (val.guid === arrVal.guid)&&(i!=index)).flat().reduce(
  (accumulator, currentValue) => accumulator && currentValue,
  true,)
      }
  )
  console.log(fed)
  return fed
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
