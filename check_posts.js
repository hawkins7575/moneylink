const mongoose = require('mongoose');
require('dotenv').config();
const Post = require('./models/Post');

async function check() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const news = await Post.countDocuments({ postType: 'news' });
        const board = await Post.countDocuments({ postType: 'board' });
        const community = await Post.countDocuments({ postType: 'community' });
        console.log(`NEWS:${news}, BOARD:${board}, COMMUNITY:${community}`);
        
        const sample = await Post.findOne({ postType: 'board' }).lean();
        console.log('Sample Board:', sample);
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
check();
