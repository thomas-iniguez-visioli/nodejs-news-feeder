import ParseRss from 'rss-parser'
import XMLGenerator from '../utils/XMLGenerator.js'
import ErrorHandler from '../utils/ErrorHandler.js'
import {
  composeFeedItem,
  getConfig,
  getFeedContent,
  overwriteFeedContent,
  filterFeedItems
} from '../utils/index.js'

const { xmlDelimiter, processingLimit } = getConfig()
const errorHandler = new ErrorHandler()
const rssParser = new ParseRss()
const feedXmlContent = getFeedContent()

const getFilteredFeedItems = (feedItems) => {
  // Filtrage centralisé
  const filteredItems = filterFeedItems(feedItems)
  return filteredItems
}
try {
  rssParser.parseString(feedXmlContent).then((parsedXmlFeed) => {
    const processedItems = getFilteredFeedItems(parsedXmlFeed.items)
    const sortedItems = processedItems.sort(
      (a, b) => new Date(b.isoDate) - new Date(a.isoDate)
    ).slice(0, processingLimit)
    
    const xmlGenerator = new XMLGenerator(composeFeedItem);
    const [beforeDelimiter] = feedXmlContent.split(xmlDelimiter);
    const formattedXml = xmlGenerator.generate(sortedItems, beforeDelimiter, xmlDelimiter);

    overwriteFeedContent(formattedXml)
  }).catch((error) => {
    errorHandler.logError(error, 'Error parsing RSS feed');
  })
} catch (error) {
  errorHandler.logError(error, 'Error processing RSS feed');
}
