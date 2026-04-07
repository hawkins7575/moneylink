const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

const mongoose = require('mongoose');
const fs = require('fs');
require('dotenv').config();

const User = require('./models/User');
const Category = require('./models/Category');
const Item = require('./models/Item');
const Post = require('./models/Post');
const Shortcut = require('./models/Shortcut');

async function restore() {
    try {
        console.log('Final restoration starting...');
        let raw = fs.readFileSync('./database.json', 'utf8');
        if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);
        const data = JSON.parse(raw);

        await mongoose.connect(process.env.MONGODB_URI);
        console.log('DB Connected.');

        // Clear all relevant collections
        await Promise.all([
            User.deleteMany({}),
            Category.deleteMany({}),
            Item.deleteMany({}),
            Post.deleteMany({}),
            Shortcut.deleteMany({})
        ]);
        console.log('Collections cleared.');

        // Restore Items
        if (data.items) {
            const cleanItems = data.items.map(({_id, __v, ...item}) => item);
            await Item.insertMany(cleanItems);
            console.log(`- Items: ${cleanItems.length}`);
        }

        // Restore Categories
        if (data.categories) {
            const cleanCats = data.categories.map(({_id, __v, ...cat}) => cat);
            await Category.insertMany(cleanCats);
            console.log(`- Categories: ${cleanCats.length}`);
        }

        // Restore Posts (Special handling for each type)
        const postsToInsert = [];
        if (data.newsData) data.newsData.forEach(({_id, __v, ...p}) => postsToInsert.push({...p, postType: 'news'}));
        if (data.boardData) data.boardData.forEach(({_id, __v, ...p}) => postsToInsert.push({...p, postType: 'board'}));
        if (data.communityData) data.communityData.forEach(({_id, __v, ...p}) => postsToInsert.push({...p, postType: 'community'}));
        
        if (postsToInsert.length > 0) {
            await Post.insertMany(postsToInsert);
            console.log(`- Posts total: ${postsToInsert.length}`);
        }

        // Restore Shortcuts (Express data)
        if (data.shortcuts) {
            const cleanShortcuts = data.shortcuts.map(({_id, __v, ...s}) => s);
            await Shortcut.insertMany(cleanShortcuts);
            console.log(`- Shortcuts: ${cleanShortcuts.length}`);
        }

        // Restore Users
        if (data.usersDB) {
            const cleanUsers = data.usersDB.map(({_id, __v, ...u}) => u);
            await User.insertMany(cleanUsers);
            console.log(`- Users: ${cleanUsers.length}`);
        }

        console.log('\n🌟 ALL DATA FINALLY RESTORED!');
        process.exit(0);
    } catch (err) {
        console.error('RESTORE FAILED:', err);
        process.exit(1);
    }
}
restore();
