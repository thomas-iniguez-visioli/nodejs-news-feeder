import { execSync } from 'child_process'
import { getFeedHash } from '../utils/index.js'

const currentHash = getFeedHash()
execSync('npm run rss:format')
const newHash = getFeedHash()

