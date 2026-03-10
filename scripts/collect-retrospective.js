import got from 'got'
import { JSDOM } from 'jsdom'
import { readFileSync, appendFileSync, existsSync } from 'node:fs'
import {
  buildRFC822Date,
  composeFeedItem,
  getFeedContent,
  overwriteFeedContent,
  getConfig // eslint-disable-line no-unused-vars
} from '../utils/index.js'
import DuplicateFilter from '../utils/DuplicateFilter.js'
import ContentProcessor from '../utils/ContentProcessor.js'
import ErrorHandler from '../utils/ErrorHandler.js'

const SITE_URL = 'https://bonjourlafuite.eu.org/'
const LINK_FILE = './link.txt'

const errorHandler = new ErrorHandler()
const contentProcessor = new ContentProcessor()

/**
 * Lit le fichier de liens déjà traités et retourne un Set pour perf O(1).
 * @returns {Set<string>}
 */
function getAlreadySeenLinks () {
  if (!existsSync(LINK_FILE)) return new Set()
  return new Set(
    readFileSync(LINK_FILE, 'utf8').split('\n').filter(Boolean)
  )
}

/**
 * Extrait les informations d'une entrée de la timeline.
 * @param {Element} entry - Élément DOM d'une entrée timeline.
 * @returns {object|null} - Données structurées ou null si invalide.
 */
function parseTimelineEntry (entry) {
  try {
    // --- Timestamp ---
    const timeEl = entry.querySelector('span.timestamp time')
    if (!timeEl) {
      errorHandler.logError(new Error('Pas de balise <time> trouvée'), { entry: entry.outerHTML.slice(0, 200) })
      return null
    }
    const timestamp = timeEl.getAttribute('datetime')

    // --- Titre ---
    const h2 = entry.querySelector('h2')
    if (!h2) {
      errorHandler.logError(new Error('Pas de <h2> trouvé'), { entry: entry.outerHTML.slice(0, 200) })
      return null
    }
    const rawTitle = h2.textContent.trim().replace(/\s+/g, ' ')
    // Capitalisation correcte : "Fuite de données chez NomEntreprise"
    const title = 'Fuite de données chez ' + rawTitle

    // --- Description enrichie ---
    // On récupère les paragraphes et la liste à puces si présente
    const paragraphs = Array.from(entry.querySelectorAll('p')).map(p => p.textContent.trim()).filter(Boolean)
    const listItems = Array.from(entry.querySelectorAll('ul li')).map(li => li.textContent.trim()).filter(Boolean)

    let description
    if (listItems.length > 0) {
      // Format : puces (ex: données exposées)
      description = listItems.join(' • ')
    } else if (paragraphs.length > 0) {
      description = paragraphs.join(' ')
    } else {
      description = `Fuite de données signalée pour : ${rawTitle}`
    }

    // --- Sources : toutes les URLs présentes dans l'entrée ---
    const anchorElements = Array.from(entry.querySelectorAll('a[href]'))
    const sources = anchorElements
      .map(a => {
        const href = (a.getAttribute('href') || '').trim()
        if (!href) return null
        // Exclure les ancres internes (#...) sans domaine
        if (href.startsWith('#')) return null
        return href.startsWith('http') ? href : `${SITE_URL}${href.replace(/^\//, '')}`
      })
      .filter(Boolean)
      // Normaliser les doublons d'images
      .map(url => url.replace('//img', '/img'))

    // Source principale = première URL externe ou fallback
    const primarySource = sources.find(s => s.startsWith('http') && !s.startsWith(SITE_URL)) ||
                          sources[0] ||
                          ''

    // Lien vers la page de détail sur bonjourlafuite
    const detailAnchor = entry.querySelector('a[href]')
    const detailHref = detailAnchor ? detailAnchor.getAttribute('href') : ''
    const link = detailHref
      ? (detailHref.startsWith('http') ? detailHref : `${SITE_URL}${detailHref.replace(/^\//, '')}`)
      : SITE_URL

    return {
      timestamp,
      title,
      description,
      primarySource,
      sources,
      link
    }
  } catch (err) {
    errorHandler.logError(err, { context: 'parseTimelineEntry' })
    return null
  }
}

/**
 * Collecte les entrées de bonjourlafuite.eu.org et met à jour le feed.
 */
async function collectBonjourLaFuite () {
  console.log(`🔍 Collecte depuis ${SITE_URL} ...`)

  let html
  try {
    html = await got(SITE_URL, {
      timeout: { request: 30000 },
      retry: {
        limit: 3,
        methods: ['GET'],
        statusCodes: [408, 413, 429, 500, 502, 503, 504],
        calculateDelay: ({ retryCount }) => retryCount * 2000 // backoff linéaire : 2s, 4s, 6s
      },
      headers: {
        'User-Agent': 'nodejs-news-feeder/1.0 (github.com/thomas-iniguez-visioli/nodejs-news-feeder)'
      }
    }).text()
  } catch (err) {
    errorHandler.logError(err, { context: 'Téléchargement de bonjourlafuite.eu.org' })
    console.error('❌ Impossible de récupérer la page après plusieurs tentatives. Abandon.')
    return
  }

  const dom = new JSDOM(html)
  const document = dom.window.document
  const timelineEntries = document.querySelectorAll('div.timeline-entry')

  if (timelineEntries.length === 0) {
    console.warn('⚠️  Aucune entrée de timeline trouvée. La structure du site a peut-être changé.')
    return
  }

  console.log(`📋 ${timelineEntries.length} entrée(s) trouvée(s) sur la page.`)

  // Parser toutes les entrées valides
  const parsedEntries = Array.from(timelineEntries)
    .map(parseTimelineEntry)
    .filter(Boolean)

  // Déduplication intra-page (en mémoire, par source principale)
  const duplicateFilter = new DuplicateFilter(contentProcessor)
  const deduplicatedEntries = duplicateFilter.filter(
    parsedEntries.map(e => ({ ...e, guid: e.primarySource || e.link }))
  )

  // Filtrage par rapport aux liens déjà traités (link.txt)
  const alreadySeen = getAlreadySeenLinks()

  let newCount = 0
  let dupCount = 0

  const newItemsXmlStrings = deduplicatedEntries
    .filter(entry => {
      const key = entry.primarySource || entry.link
      if (alreadySeen.has(key)) {
        console.log(`⏩ Doublon ignoré : ${entry.title}`)
        dupCount++
        return false
      }
      // Enregistrer immédiatement pour éviter les doublons si le script est relancé
      appendFileSync(LINK_FILE, `\n${key}`)
      alreadySeen.add(key)
      return true
    })
    .map(entry => {
      const pubDate = buildRFC822Date(entry.timestamp)
      if (pubDate === 'Invalid DateTime') {
        console.warn(`⚠️  Date invalide pour : ${entry.title} (${entry.timestamp})`)
      }
      console.log(`✅ Nouveau : ${entry.title}`)
      newCount++
      return composeFeedItem({
        title: entry.title,
        description: `<![CDATA[<p>${entry.description}</p>]]>`,
        pubDate: buildRFC822Date(entry.timestamp),
        link: entry.link,
        source: entry.primarySource,
        guid: entry.primarySource || entry.link,
        categories: []
      })
    })

  // Mise à jour du feed XML
  if (newItemsXmlStrings.length === 0) {
    console.log('ℹ️  Aucun nouvel élément à ajouter au feed.')
  } else {
    const feedDocument = getFeedContent()
    const channel = feedDocument.querySelector('channel')

    if (!channel) {
      console.error('❌ Pas d\'élément <channel> dans feed.xml. Impossible d\'ajouter des items.')
      return
    }

    const feedContent = feedDocument.documentElement.outerHTML
    const breakDelimiter = '</channel>'
    const [before, after] = feedContent.split(breakDelimiter)
    const updatedFeedContent = `${before}${newItemsXmlStrings.join('')}${breakDelimiter}${after}`
    overwriteFeedContent(updatedFeedContent)
  }

  // Résumé
  console.log(`\n📊 Résumé : ${newCount} nouveau(x) item(s) ajouté(s), ${dupCount} doublon(s) ignoré(s).`)
}

collectBonjourLaFuite()
