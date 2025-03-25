import { getFeedContent, overwriteWebsiteContent, getWebsiteTemplate } from '../utils/index.js'
import ejs from 'ejs'
import { rssParse } from '@ulisesgascon/rss-feed-parser'

const template = getWebsiteTemplate()
const feed = getFeedContent()
try{
const { metadata, items } = rssParse(feed)
console .log(items)
const html = ejs.render(template, { metadata, items })
overwriteWebsiteContent(html)
}catch(err){console.log(err)}