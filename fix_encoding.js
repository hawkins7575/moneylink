const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

const mongoose = require('mongoose');
const fs = require('fs');
require('dotenv').config();

const Item = require('./models/Item');
const Post = require('./models/Post');
const Category = require('./models/Category');
const Shortcut = require('./models/Shortcut');

async function restore() {
    try {
        console.log('🔄 DECODING AND RE-RESTORING KOREAN TEXT...');
        
        // Read as buffer and convert to UTF8 string to avoid env issues
        const buffer = fs.readFileSync('./database.json');
        let raw = buffer.toString('utf8');
        
        // Strip BOM if present
        if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);
        
        const data = JSON.parse(raw);
        console.log('JSON Parse Success.');

        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected.');

        // Clean Items
        await Item.deleteMany({});
        if (data.items) {
            const cleanItems = data.items.map(({_id, __v, ...item}) => ({
                ...item,
                title: String(item.title || ''), // Ensure string
                description: String(item.description || '')
            }));
            await Item.insertMany(cleanItems);
            console.log(`- Items: ${cleanItems.length} (Restored with forced UTF8)`);
        }

        // Clean Posts
        await Post.deleteMany({});
        const posts = [];
        if (data.newsData) data.newsData.forEach(({_id, __v, ...p}) => posts.push({...p, postType: 'news'}));
        if (data.boardData) data.boardData.forEach(({_id, __v, ...p}) => posts.push({...p, postType: 'board'}));
        if (posts.length > 0) {
            await Post.insertMany(posts);
            console.log(`- Posts: ${posts.length}`);
        }

        // Shortcut
        if (data.shortcuts) {
            await Shortcut.deleteMany({});
            await Shortcut.insertMany(data.shortcuts.map(({_id, __v, ...s}) => s));
        }

        console.log('\n🌟 KOREAN TEXT RECOVERED SUCCESSFULLY!');
        process.exit(0);
    } catch (err) {
        console.error('RESTORE ERROR:', err);
        process.exit(1);
    }
}
restore();
