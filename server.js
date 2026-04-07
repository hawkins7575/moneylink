const dns = require('dns');
// Force use of reliable DNS to bypass local SRV resolution issues
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');
const compression = require('compression');

// Models
const User = require('./models/User');
const Category = require('./models/Category');
const Item = require('./models/Item');
const Post = require('./models/Post');
const Shortcut = require('./models/Shortcut');

const app = express();
// ✅ 파비콘 프록시: 외부 404 에러 로그가 콘솔에 남지 않도록 서버에서 중계
app.get('/api/favicon', async (req, res) => {
    const domain = req.query.domain;
    if (!domain) return res.status(400).send('Domain is required');

    const providers = [
        `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
        `https://icons.duckduckgo.com/ip3/${domain}.ico`
    ];

    for (const url of providers) {
        try {
            const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 3000 });
            if (response.status === 200) {
                res.set('Content-Type', response.headers['content-type'] || 'image/x-icon');
                res.set('Cache-Control', 'public, max-age=86400'); // 1일 캐싱
                return res.send(response.data);
            }
        } catch (e) {
            // 실패 시 다음 공급자로 이동
        }
    }

    // 모든 시도 실패 시 404 대신 투명 이미지나 빈 응답을 주어 브라우저 에러 로그 방지
    res.status(204).end();
});

const PORT = process.env.PORT || 8086;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mymoney';

// Middleware
app.use(compression());
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// ✅ 정적 파일 서빙 (CSS, JS, 이미지 등)
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB Connection caching for Serverless (Official Global Pattern)
let cached = global.mongoose;

if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
}

async function connectToDatabase() {
    if (cached.conn) {
        return cached.conn;
    }

    if (!cached.promise) {
        const opts = {
            bufferCommands: false,
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        };

        console.log('🔄 Establishing new MongoDB connection (Serverless Cache)...');
        cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
            console.log('✅ Connected to MongoDB Successfully');
            return mongoose;
        });
    }

    try {
        cached.conn = await cached.promise;
    } catch (e) {
        cached.promise = null;
        throw e;
    }

    return cached.conn;
}

// Middleware to ensure DB connection
app.use(async (req, res, next) => {
    try {
        await connectToDatabase();
        next();
    } catch (err) {
        console.error('Database connection failed:', err);
        res.status(500).json({ error: 'Database connection failed', details: err.message });
    }
});

// API: Get All Data (Full State)
app.get('/api/data', async (req, res) => {
    try {
        const [usersDB, categories, items, posts, shortcuts] = await Promise.all([
            User.find({}).lean(),
            Category.find({}).lean(),
            Item.find({}).lean(),
            Post.find({}).lean(),
            Shortcut.find({}).lean()
        ]);

        const fullData = {
            usersDB,
            categories,
            items,
            newsData: posts.filter(p => p.postType === 'news'),
            boardData: posts.filter(p => p.postType === 'board'),
            communityData: posts.filter(p => p.postType === 'community'),
            shortcuts
        };

        res.json(fullData);
    } catch (err) {
        console.error('Error fetching data from MongoDB:', err);
        res.status(500).json({ error: 'Failed to fetch data' });
    }
});

// API: Save All Data (Sync)
app.post('/api/data', async (req, res) => {
    try {
        const { usersDB, categories, items, newsData, boardData, communityData, shortcuts } = req.body;

        // ✅ 보호 로직: 전송받은 데이터가 비어있으면 DB를 삭제하지 않음
        if (!items || items.length === 0) {
            console.warn('⚠️ Empty item list received. Sync rejected to protect database.');
            return res.status(400).json({ error: '데이터 보호: 빈 데이터는 동기화할 수 없습니다.' });
        }

        console.log(`Syncing database: ${items.length} items...`);

        if (usersDB) { await User.deleteMany({}); if(usersDB.length > 0) await User.insertMany(usersDB); }
        if (categories) { await Category.deleteMany({}); if(categories.length > 0) await Category.insertMany(categories); }
        if (items) { await Item.deleteMany({}); if(items.length > 0) await Item.insertMany(items); }
        
        // 게시판 데이터 개별 업데이트 (누락 방지)
        if (newsData) {
            await Post.deleteMany({ postType: 'news' });
            if (newsData.length > 0) await Post.insertMany(newsData.map(p => ({ ...p, postType: 'news' })));
        }
        if (boardData) {
            await Post.deleteMany({ postType: 'board' });
            if (boardData.length > 0) await Post.insertMany(boardData.map(p => ({ ...p, postType: 'board' })));
        }
        if (communityData) {
            await Post.deleteMany({ postType: 'community' });
            if (communityData.length > 0) await Post.insertMany(communityData.map(p => ({ ...p, postType: 'community' })));
        }
        
        if (shortcuts) { await Shortcut.deleteMany({}); if(shortcuts.length > 0) await Shortcut.insertMany(shortcuts); }

        console.log('Database synced successfully to MongoDB');
        res.json({ success: true });
    } catch (err) {
        console.error('Error syncing to MongoDB:', err);
        res.status(500).json({ error: 'Failed to sync database', details: err.message });
    }
});

// API: Fetch Metadata (URL info)
app.get('/api/fetch-meta', async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).json({ error: 'URL is required' });

    console.log(`Fetching metadata for: ${targetUrl}`);
    try {
        const response = await axios.get(targetUrl, {
            timeout: 5000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36'
            },
            maxRedirects: 3
        });

        const html = response.data;
        const $ = cheerio.load(html);

        const title = $('title').text().trim() || 
                      $('meta[property="og:title"]').attr('content') || '';
        
        const description = $('meta[name="description"]').attr('content') || 
                            $('meta[property="og:description"]').attr('content') || '';

        res.json({ title, description });
    } catch (err) {
        console.warn(`Metadata fetch failed for ${targetUrl}:`, err.message);
        res.json({ title: '', description: '' });
    }
});

// SPA Fallback - index.html (API 경로 제외)
app.get('*', (req, res) => {
    if (!req.path.startsWith('/api/')) {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    }
});

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Professional MongoDB Server running at http://localhost:${PORT}`);
        console.log('Press Ctrl+C to stop');
    });
}

module.exports = app;
