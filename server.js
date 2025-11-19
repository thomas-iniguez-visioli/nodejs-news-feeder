import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import rateLimit from 'express-rate-limit';

const app = express();
const port = 3000;
const postsFilePath = path.join(process.cwd(), 'manual-posts.json');

// Set up rate limiter: limit each IP to 100 requests per 15 minutes
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    standardHeaders: true, // Return rate limit info in the RateLimit-* headers
    legacyHeaders: false, // Disable the X-RateLimit-* headers
});

app.use(express.json());
app.use(express.static(process.cwd()));
app.get('/', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'add-post.html'));
});

app.get('/api/posts', async (req, res) => {
    try {
        const posts = await fs.readFile(postsFilePath, 'utf-8');
        res.json(JSON.parse(posts));
    } catch (error) {
        if (error.code === 'ENOENT') {
            res.json([]);
        } else {
            res.status(500).send('Error reading posts');
        }
    }
});

app.post('/api/posts', apiLimiter, async (req, res) => {
    try {
        let posts = [];
        try {
            const existingPosts = await fs.readFile(postsFilePath, 'utf-8');
            posts = JSON.parse(existingPosts);
        } catch (error) {
            if (error.code !== 'ENOENT') throw error;
        }

        const newPost = {
            ...req.body,
            id: Date.now(),
            published_at: req.body.published_at ? new Date(req.body.published_at).toISOString() : new Date().toISOString()
        };

        posts.push(newPost);

        await fs.writeFile(postsFilePath, JSON.stringify(posts, null, 2));
        res.status(201).json(newPost);
    } catch (error) {
        res.status(500).send('Error saving post');
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
