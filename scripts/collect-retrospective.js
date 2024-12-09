import got from 'got'
import * as https from 'node:https'
import { buildRFC822Date, overwriteConfig, composeFeedItem, getFeedContent, overwriteFeedContent, getConfig, generateRetroRequestUrl, parseRetrospectiveContent, generateRetroUIUrl } from '../utils/index.js'
const staticDnsAgent = (resolvconf) => new https.Agent({
  lookup: (hostname, opts, cb) => {
    console.log(resolvconf[0].address)
    console.log(hostname)
    console.log(opts)
  console.log(  cb(null, resolvconf[0].address, resolvconf[0].family))
  }
});
var resolvConf=[]
resolvConf.push({
  address: '82.67.8.211', 
  family: 4,
})
// Collect new retrospective
const { retrospective: currentConfig, breakDelimiter } = getConfig()
const url = generateRetroRequestUrl(currentConfig.nextDay)

try {
  const content = await got(url).text()
  const html =await got("https://bonjourlafuite.eu.org/feed.xml",{agent: staticDnsAgent(resolvConf)}).text()
  console.log(html)
  const data = parseRetrospectiveContent(content)
  const retrospective = composeFeedItem({
    title: data.title,
    description: `<![CDATA[<p>${data.description}</p>]]>`,
    pubDate: buildRFC822Date(data.lastDay),
    link: generateRetroUIUrl(data.nextDay),
    guid: generateRetroUIUrl(data.nextDay)
  })
  // Add the new item to the feed
  const feedContent = getFeedContent()
  const [before, after] = feedContent.split(breakDelimiter)
  const updatedFeedContent = `${before}${breakDelimiter}${retrospective}${after}`
  overwriteFeedContent(updatedFeedContent)

  // Overwrite config with new dates
  const config = getConfig()
  overwriteConfig({
    ...config,
    retrospective: {
      lastDay: data.lastDay,
      nextDay: data.nextDay
    }
  })
} catch (error) {
  console.log(error)
  console.log("Retrospective not found or generated and error, so we're not updating the feed.")
  console.log("Configuration for the retrospective won't be updated either.")
}
