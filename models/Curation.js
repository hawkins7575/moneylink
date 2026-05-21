const mongoose = require('mongoose');

const curationSchema = new mongoose.Schema({
    id: { type: Number, required: true, unique: true }, // Timestamp-based ID for compatibility
    title: { type: String, required: true },
    description: { type: String, default: '' },
    itemIds: [{ type: Number }], // Array of bookmark Item IDs contained in this curation
    tags: [{ type: String }], // Tags for curation classification (e.g. #가치투자, #아침루틴)
    curationType: { type: String, enum: ['recommended', 'personal'], default: 'personal' },
    userId: { type: String, default: 'admin' }
}, { timestamps: true });

module.exports = mongoose.model('Curation', curationSchema);
