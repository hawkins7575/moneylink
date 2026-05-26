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
const Curation = require('./models/Curation');

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

// ✅ 실시간 금융 지표 API (Yahoo Finance 연동 & 60초 인메모리 캐싱)
let tickerCache = null;
let lastTickerFetchTime = 0;
const TICKER_CACHE_DURATION = 60000; // 60초 캐시 유지

app.get('/api/ticker', async (req, res) => {
    const now = Date.now();
    
    // 캐시가 유효하면 즉시 캐시 데이터 반환
    if (tickerCache && (now - lastTickerFetchTime < TICKER_CACHE_DURATION)) {
        return res.json(tickerCache);
    }
    
    const symbols = {
        KOSPI: '^KS11',
        SP500: '^GSPC',
        NASDAQ: '^IXIC',
        USD_KRW: 'USDKRW=X',
        BTC_USD: 'BTC-USD'
    };
    
    const tickerData = {};
    const promises = Object.entries(symbols).map(async ([key, symbol]) => {
        try {
            const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
            const response = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                },
                timeout: 5000
            });
            
            const result = response.data?.chart?.result?.[0];
            if (!result) throw new Error('No chart data found');
            
            const meta = result.meta;
            const currentPrice = meta.regularMarketPrice;
            const prevClose = meta.chartPreviousClose || meta.previousClose || currentPrice;
            const change = currentPrice - prevClose;
            const changePercent = prevClose ? (change / prevClose) * 100 : 0;
            
            tickerData[key] = {
                name: key === 'SP500' ? 'S&P 500' : key === 'USD_KRW' ? '원/달러 환율' : key === 'BTC_USD' ? '비트코인' : key,
                symbol: symbol,
                price: parseFloat(currentPrice.toFixed(key === 'BTC_USD' ? 0 : 2)),
                change: parseFloat(change.toFixed(2)),
                changePercent: parseFloat(changePercent.toFixed(2))
            };
        } catch (error) {
            console.error(`Error fetching ticker for ${key} (${symbol}):`, error.message);
            if (tickerCache && tickerCache[key]) {
                tickerData[key] = tickerCache[key];
            } else {
                tickerData[key] = {
                    name: key === 'SP500' ? 'S&P 500' : key === 'USD_KRW' ? '원/달러 환율' : key === 'BTC_USD' ? '비트코인' : key,
                    symbol: symbol,
                    price: 0,
                    change: 0,
                    changePercent: 0,
                    error: true
                };
            }
        }
    });
    
    await Promise.all(promises);
    
    tickerCache = tickerData;
    lastTickerFetchTime = now;
    
    res.json(tickerData);
});

// ✅ 정적 파일 서빙 (CSS, JS, 이미지 등) 및 초고속 로딩을 위한 브라우저 정적 캐싱 설정 (30일)
app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: '30d',
    immutable: true,
    setHeaders: (res, filePath) => {
        if (path.extname(filePath) === '.html') {
            res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
        } else {
            res.setHeader('Cache-Control', 'public, max-age=2592000, immutable'); // 30일 캐싱
        }
    }
}));

// MongoDB Connection caching for Serverless (Official Global Pattern)
let cached = global.mongoose;

if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
}

async function seedRecommendedCurations() {
    try {
        const count = await Curation.countDocuments({ curationType: 'recommended' });
        if (count > 0) return; // Already seeded

        console.log('🌱 Seeding recommended curations...');
        const items = await Item.find({}).lean();
        
        // Helper to find items by keyword in title or url
        const findIds = (keywords) => {
            return items
                .filter(item => keywords.some(kw => 
                    item.title.toLowerCase().includes(kw.toLowerCase()) || 
                    item.url.toLowerCase().includes(kw.toLowerCase())
                ))
                .map(item => item.id);
        };

        const defaultCurations = [
            {
                id: 10001,
                title: '매일 아침 10분 시장 체크 루틴',
                description: '미국 야간 증시의 종가 확인부터 뉴스 분석, 그리고 국내 개장 직전 주요 리서치를 선별하는 10분 속성 데일리 아침 루틴입니다.',
                itemIds: findIds(['investing', 'yahoo', '한경', '삼프로']),
                tags: ['#아침루틴', '#데일리', '#미국주식'],
                curationType: 'recommended',
                userId: 'admin'
            },
            {
                id: 10002,
                title: '실적 발표 시즌 필수 분석 코스',
                description: '기업의 어닝 시즌(Earnings Season)이 돌아왔을 때 꼭 짚어봐야 하는 분기 보고서 전자공시(DART) 분석과 컨센서스 추이 추적용 루틴입니다.',
                itemIds: findIds(['dart', 'fnguide', 'kind', 'deepsearch']),
                tags: ['#실적발표', '#재무제표', '#가치투자'],
                curationType: 'recommended',
                userId: 'admin'
            },
            {
                id: 10003,
                title: 'FOMC 및 글로벌 매크로 분석 루틴',
                description: '미국의 연방공개시장위원회(FOMC) 금리 결정일이나 주요 물가지표(CPI) 발표 직후, 글로벌 거시경제 지표와 채권 금리를 분석하는 탑다운 리서치 세트입니다.',
                itemIds: findIds(['fred', 'investing', 'fedwatch', '블룸버그']),
                tags: ['#FOMC', '#거시경제', '#채권'],
                curationType: 'recommended',
                userId: 'admin'
            },
            {
                id: 10004,
                title: '폭락장 대응 & 자산 배분 방어 루틴',
                description: '시장이 급격한 변동성을 겪으며 급락할 때 공포 지수(VIX) 및 달러 인덱스, 주요 원자재 가격 추이를 체크하며 리스크를 관리하는 긴급 방어 루틴입니다.',
                itemIds: findIds(['vix', 'gold', '달러', 'investing']),
                tags: ['#폭락장', '#리스크관리', '#자산배분'],
                curationType: 'recommended',
                userId: 'admin'
            }
        ];

        await Curation.insertMany(defaultCurations);
        console.log('✅ Recommended curations seeded successfully!');
    } catch (err) {
        console.error('❌ Failed to seed recommended curations:', err.message);
    }
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
            seedRecommendedCurations(); // Seed recommended curations
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
    // 🔥 확실한 데이터 갱신을 위해 브라우저와 CDN 캐싱을 원천 차단
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    try {
        const [usersDB, categories, items, posts, shortcuts, curations] = await Promise.all([
            User.find({}).lean(),
            Category.find({}).lean(),
            Item.find({}).lean(),
            Post.find({}).lean(),
            Shortcut.find({}).lean(),
            Curation.find({}).lean()
        ]);

        const fullData = {
            usersDB,
            categories,
            items,
            newsData: posts.filter(p => p.postType === 'news'),
            boardData: posts.filter(p => p.postType === 'board'),
            communityData: posts.filter(p => p.postType === 'community'),
            feedbackData: posts.filter(p => p.postType === 'feedback'),
            shortcuts,
            curations
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
        const { usersDB, categories, items, newsData, boardData, communityData, feedbackData, shortcuts, curations } = req.body;

        // ✅ 보호 로직: 전송받은 데이터가 비어있으면 DB를 삭제하지 않음
        if (!items || items.length === 0) {
            console.warn('⚠️ Empty item list received. Sync rejected to protect database.');
            return res.status(400).json({ error: '데이터 보호: 빈 데이터는 동기화할 수 없습니다.' });
        }

        console.log(`Syncing database: ${items.length} items...`);

        if (usersDB) { await User.deleteMany({}); if(usersDB.length > 0) await User.insertMany(usersDB); }
        if (categories) { await Category.deleteMany({}); if(categories.length > 0) await Category.insertMany(categories); }
        if (items) { await Item.deleteMany({}); if(items.length > 0) await Item.insertMany(items); }
        
        // 게시판 데이터 개별 업데이트 (누락 시 삭제 방지 위해 전송된 데이터가 있을 경우에만 실행)
        if (newsData && newsData.length > 0) {
            await Post.deleteMany({ postType: 'news' });
            await Post.insertMany(newsData.map(p => ({ ...p, postType: 'news' })));
        }
        if (boardData && boardData.length > 0) {
            await Post.deleteMany({ postType: 'board' });
            await Post.insertMany(boardData.map(p => ({ ...p, postType: 'board' })));
        }
        if (communityData && communityData.length > 0) {
            await Post.deleteMany({ postType: 'community' });
            await Post.insertMany(communityData.map(p => ({ ...p, postType: 'community' })));
        }
        if (feedbackData && feedbackData.length > 0) {
            await Post.deleteMany({ postType: 'feedback' });
            await Post.insertMany(feedbackData.map(p => ({ ...p, postType: 'feedback' })));
        }
        
        if (shortcuts && shortcuts.length > 0) {
            await Shortcut.deleteMany({});
            await Shortcut.insertMany(shortcuts);
        }

        if (curations) {
            await Curation.deleteMany({});
            if (curations.length > 0) {
                await Curation.insertMany(curations);
            }
        }

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

// ✅ SEO 동적 사이트맵(sitemap.xml) 엔드포인트
app.get('/sitemap.xml', async (req, res) => {
    try {
        const host = req.get('host');
        const protocol = req.protocol;
        const baseUrl = `${protocol}://${host}`;

        const posts = await Post.find({}).exec();

        let urls = '';
        
        // 메인 홈 추가
        urls += `
    <url>
        <loc>${baseUrl}/</loc>
        <changefreq>daily</changefreq>
        <priority>1.0</priority>
    </url>`;

        // 각 블로그 및 게시판 포스트 추가
        posts.forEach(p => {
            const routeType = p.postType === 'news' ? 'insight' : 'board';
            urls += `
    <url>
        <loc>${baseUrl}/${routeType}/${p.id}</loc>
        <lastmod>${new Date(p.updatedAt || p.timestamp).toISOString().split('T')[0]}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.8</priority>
    </url>`;
        });

        res.header('Content-Type', 'application/xml');
        res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`);
    } catch (err) {
        console.error('Error generating sitemap:', err);
        res.status(500).send('Error generating sitemap');
    }
});

// HTML 태그 제거 및 공백 정돈 함수
function stripHtml(html) {
    if (!html) return '';
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

// ✅ 블로그 인사이트 및 게시판 개별 글 SSR 상세 페이지 엔드포인트
app.get(['/insight/:id', '/board/:id'], async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) {
            return res.redirect('/');
        }

        const post = await Post.findOne({ id }).exec();
        if (!post) {
            return res.redirect('/');
        }

        const host = req.get('host');
        const protocol = req.protocol;
        const baseUrl = `${protocol}://${host}`;

        const routeType = req.path.startsWith('/insight/') ? 'insight' : 'board';
        const routeLabel = routeType === 'insight' ? '블로그 인사이트' : '커뮤니티 게시판';

        const rawContent = stripHtml(post.content);
        const seoDesc = rawContent.slice(0, 160) + (rawContent.length > 160 ? '...' : '');
        const dateFormatted = new Date(post.timestamp).toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const html = `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${post.title} - MoneyLink</title>
    <meta name="description" content="${seoDesc}">
    
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="article">
    <meta property="og:url" content="${baseUrl}/${routeType}/${post.id}">
    <meta property="og:title" content="${post.title} - MoneyLink">
    <meta property="og:description" content="${seoDesc}">
    <meta property="og:image" content="${baseUrl}/logo.png">
    
    <!-- Twitter -->
    <meta property="twitter:card" content="summary_large_image">
    <meta property="twitter:title" content="${post.title}">
    <meta property="twitter:description" content="${seoDesc}">

    <!-- Fonts & Icons -->
    <link rel="stylesheet" as="style" crossorigin href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard-dynamic-subset.min.css" />
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <style>
        :root {
            --surface: #f9fafb;
            --surface-card: #ffffff;
            --primary: #00083D;
            --primary-light: #001254;
            --on-surface: #111827;
            --on-surface-variant: #4b5563;
            --premium-gold: #D4AF37;
            --premium-gold-light: rgba(212, 175, 55, 0.08);
            --border-color: rgba(0, 0, 0, 0.06);
        }
        body {
            background-color: var(--surface);
            color: var(--on-surface-variant);
            font-family: 'Pretendard', sans-serif;
            margin: 0;
            padding: 0;
            line-height: 1.7;
            letter-spacing: -0.025em;
        }
        header {
            background: #ffffff;
            border-bottom: 1px solid var(--border-color);
            position: sticky;
            top: 0;
            z-index: 100;
        }
        .header-container {
            max-width: 800px;
            margin: 0 auto;
            padding: 1rem 1.5rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .logo {
            font-size: 1.25rem;
            font-weight: 900;
            color: var(--primary);
            text-decoration: none;
            letter-spacing: -0.05em;
            text-transform: uppercase;
        }
        .home-btn {
            background: var(--primary);
            color: #ffffff;
            border: none;
            padding: 0.5rem 1rem;
            border-radius: 8px;
            font-size: 0.85rem;
            font-weight: 700;
            cursor: pointer;
            text-decoration: none;
            transition: all 0.2s;
            box-shadow: 0 4px 10px rgba(0, 8, 61, 0.1);
            display: flex;
            align-items: center;
            gap: 0.35rem;
        }
        .home-btn:hover {
            background: var(--primary-light);
            transform: translateY(-2px);
        }
        .container {
            max-width: 800px;
            margin: 2rem auto;
            padding: 0 1.5rem;
            box-sizing: border-box;
        }
        .post-card {
            background: var(--surface-card);
            border: 1px solid var(--border-color);
            border-radius: 16px;
            padding: 2.5rem;
            box-shadow: 0 4px 20px rgba(0,0,0,0.02);
        }
        .breadcrumbs {
            font-size: 0.8rem;
            font-weight: 600;
            color: var(--premium-gold);
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 1rem;
        }
        h1 {
            font-size: 2.25rem;
            font-weight: 800;
            color: var(--on-surface);
            line-height: 1.3;
            margin: 0 0 1.5rem 0;
            letter-spacing: -0.04em;
        }
        .meta-info {
            display: flex;
            flex-wrap: wrap;
            gap: 1.25rem;
            font-size: 0.85rem;
            color: var(--on-surface-variant);
            border-bottom: 1px solid var(--border-color);
            padding-bottom: 1.5rem;
            margin-bottom: 2rem;
            opacity: 0.8;
        }
        .meta-item {
            display: flex;
            align-items: center;
            gap: 0.4rem;
        }
        .post-content {
            font-size: 1.05rem;
            color: var(--on-surface);
            line-height: 1.8;
            margin-bottom: 3rem;
        }
        .post-content img {
            max-width: 100%;
            border-radius: 12px;
            margin: 1.5rem 0;
            box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        }
        .cta-banner {
            background: linear-gradient(135deg, #f0f4ff 0%, #e0e7ff 100%);
            border: 1px solid rgba(0, 8, 61, 0.05);
            border-radius: 12px;
            padding: 2rem;
            text-align: center;
            margin-top: 3rem;
            box-shadow: 0 4px 15px rgba(0,0,0,0.02);
        }
        .cta-title {
            font-size: 1.2rem;
            font-weight: 800;
            color: var(--primary);
            margin: 0 0 0.5rem 0;
        }
        .cta-desc {
            font-size: 0.9rem;
            color: var(--on-surface-variant);
            margin: 0 0 1.5rem 0;
            line-height: 1.5;
        }
        .cta-btn {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            background: var(--primary);
            color: #ffffff;
            border: none;
            padding: 0.75rem 1.75rem;
            border-radius: 10px;
            font-size: 0.95rem;
            font-weight: 700;
            text-decoration: none;
            transition: all 0.2s;
            box-shadow: 0 6px 16px rgba(0, 8, 61, 0.15);
        }
        .cta-btn:hover {
            background: var(--primary-light);
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(0, 8, 61, 0.2);
        }
        footer {
            text-align: center;
            padding: 2rem 0;
            font-size: 0.8rem;
            color: var(--on-surface-variant);
            opacity: 0.6;
            border-top: 1px solid var(--border-color);
            margin-top: 4rem;
            background: #ffffff;
        }
        @media (max-width: 640px) {
            .post-card {
                padding: 1.5rem;
            }
            h1 {
                font-size: 1.75rem;
            }
        }
    </style>
</head>
<body>
    <header>
        <div class="header-container">
            <a href="/" class="logo">MoneyLink</a>
            <a href="/" class="home-btn"><i class="fa-solid fa-house"></i> 홈으로 이동</a>
        </div>
    </header>

    <div class="container">
        <article class="post-card">
            <div class="breadcrumbs">MONEYLINK INSIGHT &gt; ${routeLabel}</div>
            <h1>${post.title}</h1>
            
            <div class="meta-info">
                <div class="meta-item"><i class="fa-solid fa-user"></i> <span>작성자: ${post.author}</span></div>
                <div class="meta-item"><i class="fa-solid fa-calendar"></i> <span>날짜: ${dateFormatted}</span></div>
                <div class="meta-item"><i class="fa-solid fa-eye"></i> <span>조회수: ${post.views}</span></div>
                <div class="meta-item"><i class="fa-solid fa-thumbs-up"></i> <span>추천: ${post.likes}</span></div>
            </div>

            <div class="post-content">
                ${post.content}
            </div>

            <div class="cta-banner">
                <div class="cta-title">💡 투자 공부를 넘어, 나만의 매일 거래 루틴을 설계하세요</div>
                <div class="cta-desc">MoneyLink 금융 포털에서는 국내외 최고의 금융 사이트들을 모아 나만의 맞춤형 즐겨찾기 루틴(Routine)을 생성하고, 매일 원클릭으로 순회할 수 있는 워크스페이스를 제공합니다.</div>
                <a href="/" class="cta-btn">머니링크 대시보드 바로가기 <i class="fa-solid fa-arrow-right"></i></a>
            </div>
        </article>
    </div>

    <footer>
        <p>© 2026 MoneyLink Curation Portal. All rights reserved.</p>
    </footer>
</body>
</html>`;
        
        res.send(html);
    } catch (err) {
        console.error('Error serving SSR page:', err);
        res.redirect('/');
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
