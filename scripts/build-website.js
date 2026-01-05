import { getFeedContent, overwriteWebsiteContent, getWebsiteTemplate } from '../utils/index.js'
import ejs from 'ejs'
import { rssParse } from '@ulisesgascon/rss-feed-parser'

const template = getWebsiteTemplate()
const feed = getFeedContent()
try{
const { metadata, items } = rssParse(feed.documentElement.outerHTML)
console .log(items)
const html = ejs.render(template, { metadata, items:items.map((e)=>{
  e.link.replace('https://thomas-iniguez-visioli.github.io/nodejs-news-feeder/','')
  return e 
}) })
overwriteWebsiteContent(html)
}catch(err){console.log(err)}
