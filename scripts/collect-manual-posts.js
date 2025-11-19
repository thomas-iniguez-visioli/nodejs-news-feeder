import { md2html, buildRFC822Date, composeFeedItem, getFeedContent, overwriteFeedContent, getConfig } from './utils/index.js';
import fs from 'fs/promises';
import path from 'path';

const { breakDelimiter } = getConfig();
const postsFilePath = path.join(process.cwd(), 'manual-posts.json');

async function getManualPosts() {
    try {
        const postsData = await fs.readFile(postsFilePath, 'utf-8');
        return JSON.parse(postsData);
    } catch (error) {
        if (error.code === 'ENOENT') {
            return [];
        }
        throw error;
    }
}

const manualPosts = await getManualPosts();

const relevantPosts = manualPosts.map(post => composeFeedItem({
    title: post.title,
    description: `<![CDATA[${md2html(post.description)}]]>`,
    pubDate: buildRFC822Date(post.published_at),
    link: post.link,
    guid: post.link
})).join('');

if (relevantPosts) {
    const feedContent = getFeedContent();
    const [before, after] = feedContent.split(breakDelimiter);
    const updatedFeedContent = `${before}${breakDelimiter}${relevantPosts}${after}`;
    overwriteFeedContent(updatedFeedContent);
}
