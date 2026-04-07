const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const Category = require('./models/Category');
const Item = require('./models/Item');
const Post = require('./models/Post');
const Shortcut = require('./models/Shortcut');

async function checkDB() {
    try {
        console.log('Connecting to MongoDB Atlas...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected Successfully.\n');

        const counts = {
            users: await User.countDocuments({}),
            categories: await Category.countDocuments({}),
            items: await Item.countDocuments({}),
            posts: await Post.countDocuments({}),
            shortcuts: await Shortcut.countDocuments({})
        };

        console.log('--- Database Stats ---');
        console.log(`👤 Users: ${counts.users}`);
        console.log(`📂 Categories: ${counts.categories}`);
        console.log(`🔗 Items (Bookmarks): ${counts.items}`);
        console.log(`📝 Posts (Board/News): ${counts.posts}`);
        console.log(`⚡ Shortcuts: ${counts.shortcuts}`);
        console.log('----------------------\n');

        if (counts.items > 0) {
            const sampleItem = await Item.findOne({});
            console.log(`Sample Item: "${sampleItem.title}" (${sampleItem.url})`);
        } else {
            console.log('No items found in the database.');
        }

        await mongoose.disconnect();
    } catch (err) {
        console.error('Error checking DB:', err);
        process.exit(1);
    }
}

checkDB();
