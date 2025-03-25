import ParseRss from 'rss-parser'
import xmlFormat from 'xml-formatter'
import {
  composeFeedItem,
  getConfig,
  getFeedContent,
  overwriteFeedContent,buildRFC822Date
} from '../utils/index.js'

const { breakDelimiter } = getConfig()

const parser = new ParseRss()
const tribykey=(array,key)=>{
  var valid=[array[0]]
  array.forEach(element => {
    console.log(element[key])
    if(!valid.map((item)=>{return item[key]}).includes(element[key])){
      //console.log(valid)
      valid.push(element)
    }
  });
  return valid
}
const xml = getFeedContent()
const updaterrss=(feed)=>{
  var fed =tribykey(tribykey([...new Set(feed.map((i)=>{
    return JSON.stringify(i)
  }))].map((i)=>{
    return JSON.parse(i)
  }),"link"),"title").filter((item)=>{
    return !item.link.includes("Fuite de données")
  })
  //console.log(fed)
  return fed
}
try{
parser.parseString(xml).then((parsedXml) => {
  //console.log(parsedXml)
  const sortedItems = updaterrss(parsedXml.items).sort(
    (a, b) => new Date(b.isoDate) - new Date(a.isoDate)
  )
  const newXml = sortedItems
    .map(({ title, link, pubDate, content, guid }) =>
      composeFeedItem({
        title,
        description: `<![CDATA[${content}]]>`,
        pubDate:pubDate,
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
}).catch((err)=>{console.log(err)})}catch(error){console.log(error)}
