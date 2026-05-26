const mongoose = require('mongoose');
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
require('dotenv').config();

const Item = require('./models/Item');

const newSites = [
    {
        title: "TradingView (트레이딩뷰)",
        url: "https://kr.tradingview.com",
        category: "stock",
        type: "site",
        description: "전 세계 주식, 지수, 코인 등 최첨단 실시간 차트 분석 및 트레이딩 커뮤니티.",
        icon: "fa-solid fa-chart-area",
        userId: "admin",
        isPremium: true
    },
    {
        title: "Finviz (핀비즈)",
        url: "https://finviz.com",
        category: "stock",
        type: "site",
        description: "미국 주식 시장의 실시간 시황 맵(S&P 500 Map) 및 강력한 주식 스크리너 제공.",
        icon: "fa-solid fa-table-cells",
        userId: "admin",
        isPremium: false
    },
    {
        title: "한경 컨센서스",
        url: "http://consensus.hankyung.com",
        category: "stock",
        type: "site",
        description: "국내외 증권사들의 실시간 기업 리서치 리포트 및 산업 전망 무료 다운로드 센터.",
        icon: "fa-solid fa-file-pdf",
        userId: "admin",
        isPremium: false
    },
    {
        title: "CoinGecko (코인게코)",
        url: "https://www.coingecko.com/ko",
        category: "coin",
        type: "site",
        description: "글로벌 수만 개 가상자산 시세, 개발 활성도 및 소셜 지표 종합 추적 사이트.",
        icon: "fa-solid fa-frog",
        userId: "admin",
        isPremium: true
    },
    {
        title: "DefiLlama (디파이라마)",
        url: "https://defillama.com",
        category: "coin",
        type: "site",
        description: "탈중앙화 금융(DeFi)의 체인별 TVL(총 예치자산) 및 핵심 데이터 추적 플랫폼.",
        icon: "fa-solid fa-chart-column",
        userId: "admin",
        isPremium: false
    },
    {
        title: "L2BEAT (엘투비트)",
        url: "https://l2beat.com",
        category: "coin",
        type: "site",
        description: "이더리움 레이어 2(Layer 2) 생태계의 예치량 및 상세 보안 지표 실시간 대시보드.",
        icon: "fa-solid fa-layer-group",
        userId: "admin",
        isPremium: false
    }
];

async function run() {
    try {
        const mongoUri = process.env.MONGODB_URI;
        if (!mongoUri) {
            console.error("MONGODB_URI not found in env!");
            process.exit(1);
        }
        await mongoose.connect(mongoUri);
        console.log("Connected to MongoDB successfully.");

        // Find the highest id to increment
        const maxItem = await Item.findOne().sort('-id').exec();
        let currentId = maxItem ? maxItem.id : 1000;
        if (currentId < 1000) currentId = 1000;

        for (const site of newSites) {
            // Check if site already exists by URL
            const exists = await Item.findOne({ url: site.url }).exec();
            if (exists) {
                console.log(`Site already exists: ${site.title}`);
                continue;
            }
            currentId++;
            const item = new Item({
                id: currentId,
                ...site
            });
            await item.save();
            console.log(`Successfully added: ${site.title} (ID: ${currentId})`);
        }

        console.log("All sites checked and updated.");
        process.exit(0);
    } catch (err) {
        console.error("Error running script:", err);
        process.exit(1);
    }
}

run();
