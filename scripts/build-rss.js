import { buildRFC822Date, overwriteFeedContent, getFeedContent, getConfig, overwriteConfig } from '../utils/index.js'

const xmlDoc = getFeedContent()
const config = getConfig()
const now = new Date()

// Get the serialized XML string from the document
const xmlString = xmlDoc.documentElement.outerHTML

// Vérifie si le fichier a été modifié depuis le dernier check
// Pour cela, on compare le contenu actuel du flux avec celui du dernier check, s'il existe
// On suppose que le contenu du flux RSS change si l'un des items/articles change
// Si vous avez une fonction pour récupérer le contenu précédent, remplacez ici.
// Sinon, on peut utiliser un champ dans config : lastFeedContent ou autre
// Ici, on suppose qu'on a `lastFeedContent` dans config (à adapter selon votre logique)

const hasChanged = !config.lastFeedContent || config.lastFeedContent.length !== xmlString.length

if (hasChanged) {
  // Replace lastBuildDate with current date in the feed
  const lastBuildDateRegex = /<lastBuildDate>.*<\/lastBuildDate>/g
  console.log(xmlString.substring(0, 200))
  const [before, after] = xmlString.split(lastBuildDateRegex)
  const updatedXml = `${before}<lastBuildDate>${buildRFC822Date(now.toISOString())}</lastBuildDate>${after}`

  overwriteFeedContent(updatedXml)
  overwriteConfig({ 
    ...config, 
    lastCheckTimestamp: now.getTime(),
    lastFeedContent: updatedXml // sauvegarde le contenu mis à jour
  })
} else {
  // Ne change rien, la date reste inchangée
}
