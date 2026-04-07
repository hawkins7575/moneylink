const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

const mongoose = require('mongoose');
require('dotenv').config();

const Item = require('./models/Item');

async function check() {
    await mongoose.connect(process.env.MONGODB_URI);
    const count = await Item.countDocuments({});
    console.log(`TOTAL_ITEMS:${count}`);
    process.exit(0);
}
check();
