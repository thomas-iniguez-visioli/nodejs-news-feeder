import got from 'got'
import ParseRss from 'rss-parser'
import { JSDOM } from 'jsdom'
import * as https from 'node:https'
import { readFileSync, appendFileSync, existsSync } from 'node:fs'
import { buildRFC822Date, overwriteConfig, composeFeedItem, getFeedContent, overwriteFeedContent, getConfig, generateRetroRequestUrl, parseRetrospectiveContent, generateRetroUIUrl, filterFeedItems } from '../utils/index.js'
const staticDnsAgent = (resolvconf) => new https.Agent({
  lookup: (hostname, opts, cb) => {
    //console.log(resolvconf[0].address)
    //console.log(hostname)
    //console.log(opts)
    cb(null, resolvconf, resolvconf[0].family)
  }, timeout: 30000000, keepAlive: true
});
var resolvConf = []
resolvConf.push({
  address: '82.67.8.211',
  family: 4,
})
// Collect new retrospective
const { retrospective: currentConfig } = getConfig()
const addfeed = async (url) => {
  const t = await got(url).text()
  const parser = new ParseRss()
  parser.parseString(t).then((parsedXml) => {
    // Filtrage amélioré
    const filteredItems = filterFeedItems(parsedXml.items)

    const feedDocument = getFeedContent()
    const channel = feedDocument.querySelector('channel')

    if (channel) {
      const firstItem = channel.querySelector('item');
      filteredItems.forEach((dat) => {
        // Vérification doublon dans le feed
        const existingGuids = Array.from(feedDocument.querySelectorAll('guid')).map(guidElement => guidElement.textContent);
        if (!existingGuids.includes(dat.guid)) {
          return true
        } else {
          console.log(`⏩ Doublon ignoré : ${dat.title}`)
          return false
        }
      }).map((dat) => {
        return composeFeedItem({
          title: dat.title,
          description: `<![CDATA[<p>${dat.content || dat.summary}</p>]]>`,
          pubDate: buildRFC822Date(dat.pubDate),
          link: dat.link,
          guid: dat.guid, categories: dat.categories || []
        })
      })

      // Insert items by appending XML before the closing </channel> tag
      const feedContent = feedDocument.documentElement.outerHTML
      const breakDelimiter = '</channel>'
      const [before, after] = feedContent.split(breakDelimiter)
      const updatedFeedContent = `${before}${newItemsXmlStrings.join('')}${breakDelimiter}${after}`
      overwriteFeedContent(updatedFeedContent)
    } else {
      console.error("No <channel> element found in feed.xml. Cannot add items.");
    }
  })
}
/*addfeed('https://cyber.gouv.fr/actualites/feed')
addfeed('https://cvefeed.io/rssfeed/latest.xml')
addfeed("https://www.cybermalveillance.gouv.fr/feed/atom-flux-complet")
addfeed("https://thomas-iniguez-visioli.github.io/retro-weekly/feed.xml")*/
try {
  //const content = await got(`https://raw.githubusercontent.com/thomas-iniguez-visioli/retro-weekly/main/retros/${url.url.split("/")[url.url.split("/").length-2]}.md`).text()
  var html = ""
  https.get("https://bonjourlafuite.eu.org/", {
    agent: staticDnsAgent(resolvConf)

  }, response => {
    response.setTimeout(3000000, function () {
      //console.log("temp")
    });
    response.on('timeout', function () { console.log("timeout") })
    response.on('data', (chunk) => {
      html += chunk;
      //console.log(html.length)
    })
    response.on("end", (da) => {
     // console.log(da)
      const buffer = html

      const dom = new JSDOM(buffer.toString())
      const parsedHtml = dom.window.document
      const timelineEntries = parsedHtml.querySelectorAll('div.timeline-entry');

      if (timelineEntries.length === 0) {
        console.warn('Aucune entrée de timeline trouvée sur https://bonjourlafuite.eu.org/. La structure du site a peut-être changé.');
        return; // Quitter le callback si aucune entrée n'est trouvée
      }

      const jsonData = Array.from(timelineEntries).map(entry => {
        const timestamp = entry.querySelector('span.timestamp time').getAttribute('datetime').toString();

        console.log(buildRFC822Date(timestamp))
        const title = "Fuite de données chez " + entry.querySelector('h2').textContent.trim().replaceAll("  ", " ");
        var content = entry.querySelector('p').textContent;
        const contentList = entry.querySelector('ul');
        if (contentList) {
          const contentItems = Array.from(contentList.querySelectorAll('li')).map(item => item.textContent);
          content = contentItems.join(', ');
        }
        const source = (() => {
          const linkElement = entry.querySelector('a:not([id])') || entry.querySelector('a');
          if (!linkElement) {
            return '';
          }

          const href = linkElement.getAttribute('href') || '';
          if (!href) {
            return '';
          }

          return href.startsWith('http') ? href : `https://bonjourlafuite.eu.org/${href}`;
        })();
        console.log(source)
        return {
          timestamp: timestamp,
          title,
          content,
          source: source.replaceAll("//img","/img"),
          link: "https://bonjourlafuite.eu.org/" + entry.querySelector('a').getAttribute('href')
        };
      })
      //console.log(JSON.stringify(jsonData,null,2));
      // Collect all new items
      const newItemsXmlStrings = jsonData.filter((dat) => {
        let already = []
        if (existsSync("./link.txt")) {
          already = readFileSync("./link.txt", 'utf8').split('\n').filter(Boolean); // Read as string, split by lines, filter empty
        }
        if (already.includes(dat.source)) {
          return false
        }
        appendFileSync("./link.txt", `\n${dat.source}`)
        return true
      }).map((dat) => {
        return composeFeedItem({
          title: dat.title,
          description: `<![CDATA[<p>${dat.content}</p>]]>`,
          pubDate: buildRFC822Date(dat.timestamp),
          link: dat.link, source: dat.source,
          guid: dat.source, categories: dat.categories || []
        });
      })

      // Get the current feed document
      const feedDocument = getFeedContent()
      const channel = feedDocument.querySelector('channel')

      if (channel) {
        // Insert items by appending XML before the closing </channel> tag
        const feedContent = feedDocument.documentElement.outerHTML
        const breakDelimiter = '</channel>'
        const [before, after] = feedContent.split(breakDelimiter)
        const updatedFeedContent = `${before}${newItemsXmlStrings.join('')}${breakDelimiter}${after}`
        overwriteFeedContent(updatedFeedContent)
      } else {
        console.error("No <channel> element found in feed.xml. Cannot add items.");
      }
    })
  })



  /* const data = parseRetrospectiveContent(content)
     console.log(data.nextDay)
   const retrospective = composeFeedItem({
     title: data.title,
     description: `<![CDATA[<p>${data.description}</p>]]>`,
     pubDate: buildRFC822Date(url.date_published),
     link: generateRetroUIUrl(data.nextDay),
     guid: data.nextDay
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
   })*/
} catch (error) {
  console.log(error)
  console.log("Retrospective not found or generated and error, so we're not updating the feed.")
  console.log("Configuration for the retrospective won't be updated either.")
}
// --- Nouvelle récupération améliorée ---
const feedUrls = [


];

async function fetchAllFeeds(urls) {
  const parser = new ParseRss();
  const results = await Promise.all(urls.map(async (url) => {
    try {
      const t = await got(url).text();
      const parsedXml = await parser.parseString(t);
      return parsedXml.items.map((dat) => {
        // console.log(dat)
        return {
          title: dat.title,
          description: dat.content || dat.summary || '',
          pubDate: buildRFC822Date(dat.pubDate),
          link: dat.link,
          guid: dat.link, categories: dat.categories || []
        }
      })
    } catch (err) {
      console.log(`Erreur récupération feed ${url}:`, err.message);
      return [];
    }
  }));
  // Aplatir et filtrer les doublons
  const allItems = results.flat();
  const seen = new Set();
  return allItems.filter(item => {
    // console.log(item.title)
    if (!item.title || !item.link) return false;
    const key = item.guid || item.link;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function updateFeedWithAllItems() {
  const items = await fetchAllFeeds(feedUrls);

  const feedDocument = getFeedContent();
  const channel = feedDocument.querySelector('channel');

  if (channel) {
    const existingGuids = Array.from(feedDocument.querySelectorAll('guid')).map(guidElement => guidElement.textContent);

    const newItemsXmlStrings = items.filter((dat) => {
      // Check against link.txt for previously processed items
      let already = [];
      if (existsSync("./link.txt")) {
        already = readFileSync("./link.txt", 'utf8').split('\n').filter(Boolean); // Filter Boolean to remove empty strings
      }
      if (already.includes(dat.guid)) {
        return false;
      }
      appendFileSync("./link.txt", `\n${dat.guid}`);
      return true;
    }).filter((dat) => {
      // Only add to feed if not a duplicate based on GUID
      return !existingGuids.includes(dat.guid);
    }).map((dat) => {
      return composeFeedItem({
        title: dat.title,
        description: `<![CDATA[<p>${dat.description}</p>]]>`,
        pubDate: dat.pubDate,
        link: dat.link,
        guid: dat.guid, categories: dat.categories || []
      });
    });

    // Insert items by appending XML before the closing </channel> tag
    const feedContent = feedDocument.documentElement.outerHTML
    const breakDelimiter = '</channel>'
    const [before, after] = feedContent.split(breakDelimiter)
    const updatedFeedContent = `${before}${newItemsXmlStrings.join('')}${breakDelimiter}${after}`
    overwriteFeedContent(updatedFeedContent);
  } else {
    console.error("No <channel> element found in feed.xml. Cannot add items in updateFeedWithAllItems.");
  }
}

updateFeedWithAllItems();




