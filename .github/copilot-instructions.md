# Copilot Instructions for nodejs-news-feeder

## Project Overview

**nodejs-news-feeder** is an RSS feed aggregator that curates Node.js ecosystem news. It collects content from GitHub releases, discussions, issues, CVEs, and manual posts, processes them through a validation pipeline, and publishes via RSS and a static website.

### Architecture Diagram (High Level)

```
Data Sources (6 collectors)
    ↓
Content Processing (ContentProcessor, DuplicateFilter)
    ↓
RSS Building (build-rss.js)
    ↓
Validation & Formatting
    ↓
feed.xml + index.html (Published)
```

## Critical Components & Data Flows

### Data Collection Layer (`scripts/collect-*.js`)

- **6 independent collectors**: `releases`, `issues`, `discussions`, `manual-posts`, `cves`, `retrospective`
- All collectors use `getConfig()` to read `lastCheckTimestamp` - this prevents duplicate collection across runs
- Collectors append content to `feed.xml` at the `breakDelimiter` (default: `</channel>`)
- Pattern: Fetch → Filter by `lastCheckTimestamp` → Transform via `composeFeedItem()` → Append to RSS

**Key config fields** (in `config.json`):
- `lastCheckTimestamp`: Unix timestamp in milliseconds; incremented after each successful collection
- `issuesInScope`: Array of `{issue, team}` objects defining which GitHub repos to monitor
- `discussionsInScope`: Similar structure for discussions
- `reposPaginationLimit`, `releasePaginationLimit`, `commentsPaginationLimit`: API pagination limits

### Content Processing (`utils/ContentProcessor.js`)

Applied to **every feed item** title and description in `composeFeedItem()`:

1. `stripHtmlTags()` - Removes all HTML tags via repeated regex replacement
2. `normalizeLineEndings()` - Converts CRLF/CR to LF
3. `normalizeWhitespace()` - Collapses multiple spaces
4. `removeRepetitiveBrackets()` - Eliminates excessive `(((` or `[[[` patterns
5. `removeControlCharacters()` - Removes non-printable Unicode
6. `escapeXmlCharacters()` - Escapes `&<>"'` for XML compliance

**Important**: Order matters. Run title/description through all 6 steps in sequence.

### Deduplication (`utils/DuplicateFilter.js`)

- Filters items by normalized key: prioritizes `guid` > `link` > `title`
- Normalization: whitespace collapse + trim + lowercase
- Stateful: maintains Set of seen keys; must be instantiated fresh per filtering operation
- Used in `build-rss.js` before writing final feed

### RSS Structure

- Format: Standard RSS 2.0 with `<channel>`, `<item>` elements
- Key fields per item: `title`, `description` (CDATA-wrapped), `pubDate` (RFC822), `link`, `guid`, `source`, `categories`
- Root element: `<rss version="2.0">`
- Break point: Content inserted before `</channel>` closing tag

## Developer Workflows

### Testing

```bash
npm run test              # Run all tests in __tests__ folders
npm run test:watch       # Watch mode (useful during development)
npm run test:coverage    # Generate LCOV report
```

- Test framework: Node's native `node:test` module
- Assertion library: `node:assert/strict`
- Property-based testing: Uses `fast-check` (see `*.property.test.js` files)
- **TZ='Europe/Amsterdam'** is set for date-sensitive tests; always use environment variable when testing date functions
- Test files co-located: `utils/__tests__/` and `scripts/__tests__/`

### Building & Validation

```bash
npm run rss:build         # Collect all sources and regenerate feed.xml
npm run rss:format-check  # Validate XML formatting
npm run rss:format        # Auto-format feed.xml (output to log.txt)
npm run rss:validate      # Validate against W3C Feed Validator
npm run website:build     # Regenerate index.html from templates/index.html.ejs
```

### Code Quality

```bash
npm run lint              # Run StandardJS linter
npm run lint:fix          # Auto-fix linting issues
```

StandardJS rules: no semicolons, 2-space indents, trailing commas in multiline objects.

## Project-Specific Patterns

### 1. Configuration-Driven State

All dynamic configuration lives in `config.json`. Collectors must call `getConfig()` at runtime (not at module load) to pick up changes. After processing, call `overwriteConfig()` with updated state:

```javascript
const config = getConfig()
// ... process data ...
overwriteConfig({ ...config, lastCheckTimestamp: newTime })
```

### 2. Feed Item Composition

Always use `composeFeedItem()` from `utils/index.js`:

```javascript
composeFeedItem({
  title: '...',                    // Will be cleaned by ContentProcessor
  description: `<![CDATA[...]]>`,  // CDATA wraps HTML; ContentProcessor applied
  pubDate: buildRFC822Date(...),   // RFC822 format required
  link: '...',
  guid: '...',                     // Must be unique per item
  source: '...',                   // Optional
  categories: [...]                // Optional array
})
```

### 3. Date Handling

- Store timestamps in `config.json` as **milliseconds** (JavaScript `Date.getTime()`)
- RFC822 format for RSS: Use `buildRFC822Date(isoString)` from utils
- Title dates: Use `buildTitleDate(timestamp)` returns `YYYY-MM-DD HH:MM:SS` format
- Comparisons always in milliseconds: `new Date(item.timestamp).getTime() > lastCheckTimestamp`

### 4. Feed XML Manipulation

Direct string manipulation using `breakDelimiter` pattern:

```javascript
const feedContent = getFeedContent()  // Returns entire XML as string
const [before, after] = feedContent.split(breakDelimiter)  // Default: '</channel>'
const updated = `${before}${breakDelimiter}${newItems}${after}`
overwriteFeedContent(updated)
```

No XML library parsing—feed is managed as raw string due to CDATA preservation needs.

### 5. API Integration

- GitHub API: Uses `gh-got` library with paginated queries
- Environment variable `GITHUB_TOKEN` required for auth
- CVE API: `https://services.nvd.nist.gov/rest/json/cves/2.0` (configured in `config.json`)
- All HTTP calls support cacheable-request for performance

### 6. Manual Post Override

File: `manual-posts.json` - JSON array of hand-crafted feed items. Processed by `collect-manual-posts.js` and merged before duplication filtering.

## Files to Know

| File | Purpose |
|------|---------|
| [utils/index.js](utils/index.js) | Core utilities: `composeFeedItem()`, `buildRFC822Date()`, config I/O |
| [utils/ContentProcessor.js](utils/ContentProcessor.js) | Text sanitization pipeline |
| [utils/DuplicateFilter.js](utils/DuplicateFilter.js) | Deduplication by guid/link/title |
| [scripts/build-rss.js](scripts/build-rss.js) | Main orchestration: calls all collectors, builds final feed |
| [config.json](config.json) | State & configuration (timestamps, API limits, scoped repos) |
| [feed.xml](feed.xml) | Generated RSS feed (committed to repo) |
| [server.js](server.js) | Dev server for testing (port configurable) |

## Common Pitfalls

1. **Forgetting to update `lastCheckTimestamp`** → Duplicate items in next run
2. **Not applying ContentProcessor** → Malformed XML or unescaped content
3. **Wrong date format** → Items rejected by RSS validators
4. **Missing CDATA wrapping** → HTML in description breaks XML parsing
5. **Modifying feed.xml directly** → Overwritten next run; use collectors instead
6. **Not handling `null` in ContentProcessor** → Methods should return input unchanged if not string

## Environment & Dependencies

- **Node.js**: ≥22.0.0 (ES modules required)
- **Key packages**: `@octokit/graphql`, `cheerio`, `luxon`, `jsdom`, `standard`
- **Dev dependencies**: `fast-check` (property-based testing), `cross-env`
- **GitHub token**: Set `GITHUB_TOKEN` env var for API access

## Commands Quick Reference

```bash
# Collection (manual trigger)
npm run collect:releases collect:issues collect:discussions

# Full pipeline
npm run rss:build

# Validation
npm run rss:validate rss:format-check

# Testing
npm run test npm run test:coverage

# Linting
npm run lint:fix
```
