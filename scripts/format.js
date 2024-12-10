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
  ).map((value, index, array) => {
    console.log(value)
   var test=array.map((v,i)=>{
    if(i==index){
      return value
    }
    if(v.title==value.title){array.splice(index,1),i}else{return value}
  }).filter((val)=>val)
    console.log(test)
    if(test){}
    return test[0]
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
