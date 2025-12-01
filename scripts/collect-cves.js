import { buildRFC822Date, composeFeedItem, getFeedContent, overwriteFeedContent, getConfig } from '../utils/index.js'
import { fetchAllCVEs, processCVEItem, formatCVEForFeed } from '../utils/cve-api.js'

const { lastCheckTimestamp, breakDelimiter, cve } = getConfig()

try {
  console.log('Démarrage de la collecte des CVE...')
  console.log(`Dernière vérification: ${new Date(lastCheckTimestamp).toISOString()}`)

  // Récupérer la clé API depuis les variables d'environnement
  const apiKey = process.env.NVD_API_KEY || cve.apiKey

  // Récupérer toutes les CVE depuis la dernière vérification
  let allCVEs = []
  try {
    allCVEs = await fetchAllCVEs(
      lastCheckTimestamp,
      cve.maxResults,
      cve.apiEndpoint,
      cve.resultsPerPage,
      apiKey
    )
    console.log(`${allCVEs.length} CVE récupérées depuis l'API`)
  } catch (error) {
    console.error('Erreur lors de la récupération des CVE depuis l\'API:', error.message)
    console.error('Détails:', error.stack)
    throw new Error(`Échec de la récupération des CVE: ${error.message}`)
  }

  // Traiter chaque CVE et créer les entrées de flux
  const processedCVEs = []
  let skippedCount = 0
  let processingErrors = 0

  for (const cveItem of allCVEs) {
    try {
      const processed = processCVEItem(cveItem)
      
      if (processed) {
        processedCVEs.push(processed)
      } else {
        skippedCount++
      }
    } catch (error) {
      processingErrors++
      const cveId = cveItem?.cve?.id || 'ID inconnu'
      console.error(`Erreur lors du traitement de la CVE ${cveId}:`, error.message)
      // Continuer le traitement des autres CVE
    }
  }

  console.log(`${processedCVEs.length} CVE traitées avec succès`)
  if (skippedCount > 0) {
    console.log(`${skippedCount} CVE ignorées (données invalides ou incomplètes)`)
  }
  if (processingErrors > 0) {
    console.warn(`${processingErrors} erreurs de traitement rencontrées`)
  }

  // Formater les CVE en entrées de flux RSS
  const feedItems = []
  let formattingErrors = 0

  for (const cve of processedCVEs) {
    try {
      const formatted = formatCVEForFeed(cve)
      
      const feedItem = composeFeedItem({
        title: formatted.title,
        description: formatted.description,
        pubDate: buildRFC822Date(formatted.pubDate),
        link: formatted.link,
        guid: formatted.guid
      })
      
      feedItems.push(feedItem)
    } catch (error) {
      formattingErrors++
      console.error(`Erreur lors du formatage de la CVE ${cve.id}:`, error.message)
      // Continuer le formatage des autres CVE
    }
  }

  const relevantCVEs = feedItems.join('')

  if (formattingErrors > 0) {
    console.warn(`${formattingErrors} erreurs de formatage rencontrées`)
  }

  // Mettre à jour le flux si des CVE ont été trouvées
  if (relevantCVEs) {
    try {
      const feedContent = getFeedContent()
      const [before, after] = feedContent.split(breakDelimiter)
      
      // Vérifier que le break delimiter existe dans le feed
      if (!after) {
        throw new Error('Break delimiter introuvable dans le flux RSS')
      }
      
      const updatedFeedContent = `${before}${breakDelimiter}${relevantCVEs}${after}`
      
      // Validation basique XML avant écriture
      if (!updatedFeedContent.includes('<?xml') || !updatedFeedContent.includes('</rss>')) {
        throw new Error('Le contenu du flux mis à jour semble invalide')
      }
      
      overwriteFeedContent(updatedFeedContent)
      
      console.log(`${feedItems.length} CVE ajoutées au flux RSS`)
    } catch (error) {
      console.error('Erreur lors de la mise à jour du flux RSS:', error.message)
      console.error('Détails:', error.stack)
      console.error('Le flux RSS n\'a pas été modifié pour préserver son intégrité')
      throw new Error(`Échec de la mise à jour du flux: ${error.message}`)
    }
  } else {
    console.log('Aucune nouvelle CVE à ajouter au flux')
  }

  console.log('Collecte des CVE terminée avec succès')
  console.log(`Résumé: ${allCVEs.length} récupérées, ${processedCVEs.length} traitées, ${feedItems.length} ajoutées au flux`)
} catch (error) {
  console.error('Erreur fatale lors de la collecte des CVE:', error.message)
  console.error('Stack trace:', error.stack)
  process.exit(1)
}
