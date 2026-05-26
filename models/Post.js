const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
    id: { type: Number, required: true, unique: true },
    title: { type: String, required: true },
    content: { type: String, required: true }, // HTML content
    timestamp: { type: Number, required: true },
    postType: { type: String, enum: ['news', 'board', 'community', 'feedback'], required: true },
    author: { type: String, default: '익명' },
    email: { type: String, default: '' },
    views: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    dislikes: { type: Number, default: 0 },
    comments: [
        {
            author: String,
            content: String,
            timestamp: { type: Number, default: Date.now }
        }
    ]
}, { timestamps: true });

module.exports = mongoose.model('Post', postSchema);
