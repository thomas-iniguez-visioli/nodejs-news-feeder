import { execSync } from 'child_process'
import { getFeedHash } from '../utils/index.js'
process.exit(0)
const currentHash = getFeedHash()
try{
execSync('npm run rss:format>>log.txt')
}catch(error){console.log(error)}
const newHash = getFeedHash()

