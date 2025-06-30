const mongoose = require('mongoose');

const tokenBlocklistSchema = new mongoose.Schema({
    jti: {
        type: String,
        required: true,
        unique: true,
    },
    expiresAt: {
        type: Date,
        required: true,
        // Automatically remove the document from the collection when it expires
        // This keeps the collection from growing indefinitely
        expires: 0, 
    },
});

const TokenBlocklist = mongoose.model('TokenBlocklist', tokenBlocklistSchema);

module.exports = TokenBlocklist;