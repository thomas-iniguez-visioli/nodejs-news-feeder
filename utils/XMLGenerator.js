import xmlFormat from 'xml-formatter'

class XMLGenerator {
  constructor(composeFeedItem) {
    this.composeFeedItem = composeFeedItem;
  }

  /**
   * Generates the final formatted RSS feed XML string.
   * @param {Array} items - The array of processed and sorted feed items.
   * @param {string} feedHeader - The part of the XML before the items.
   * @param {string} delimiter - The delimiter used to split the feed.
   * @returns {string} - The full, formatted RSS feed XML.
   */
  generate(items, feedHeader, delimiter) {
    console.log("delimiteur transmis"+delimiter)
    if (!this.composeFeedItem) {
      throw new Error('composeFeedItem function is required.');
    }

    const formattedFeedItems = items
      .map(({ title, link, pubDate, content, guid, source, categories }) =>
        this.composeFeedItem({
          title,
          description: content, // Pass raw content, composeFeedItem handles CDATA
          pubDate,
          link,
          guid,
          source,
          categories
        })
      )
      .join('');
//console.log(formattedFeedItems.includes("</rss>"))
    const updatedFeedContent = `<?xml version="1.0" encoding="UTF-8"?>${feedHeader}${delimiter}${formattedFeedItems}</channel></rss>`;
     // console.log(updatedFeedContent)
    return xmlFormat(updatedFeedContent, {
      indentation: '  ',
      collapseContent: true
    });
  }
}

export default XMLGenerator;