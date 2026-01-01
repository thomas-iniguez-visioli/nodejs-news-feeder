import ContentProcessor from './ContentProcessor.js'

class DuplicateFilter {
  constructor(contentProcessor) {
    this.seen = new Set();
    this.contentProcessor = contentProcessor || new ContentProcessor();
  }

  /**
   * Filters an array of feed items, removing duplicates based on guid, link, or title.
   * Preserves the most recent item when duplicates are found (assumes items are sorted newest first).
   * @param {Array} items - The array of feed items to filter.
   * @returns {Array} - The deduplicated array of feed items.
   */
  filter(items) {
    if (!Array.isArray(items)) {
      return [];
    }

    return items.filter(item => {
      // Create a unique key for the item, prioritizing guid, then link, then title.
      let key = '';
      if (item.guid) {
        key = item.guid;
      } else if (item.link) {
        key = item.link;
      } else if (item.title) {
        key = item.title;
      }

      // Normalize the key for consistent duplicate detection.
      const normalizedKey = this.contentProcessor.normalizeWhitespace(key).trim().toLowerCase();

      // If we've seen this key before, it's a duplicate.
      if (this.seen.has(normalizedKey)) {
        return false;
      }

      // Otherwise, add it to the set of seen keys and keep the item.
      this.seen.add(normalizedKey);
      return true;
    });
  }
}

export default DuplicateFilter;