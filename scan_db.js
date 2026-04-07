const fs = require('fs');
try {
    let raw = fs.readFileSync('./database.json', 'utf8');
    if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);
    const data = JSON.parse(raw);
    
    console.log('--- DATABASE.JSON SCAN ---');
    console.log('Categories:', data.categories?.length);
    console.log('Items:', data.items?.length);
    console.log('News:', data.newsData?.length);
    console.log('Board:', data.boardData?.length);
    console.log('Community:', data.communityData?.length);
    console.log('Shortcuts:', data.shortcuts?.length);
    console.log('Users:', data.usersDB?.length);
    console.log('Keys present:', Object.keys(data).join(', '));
} catch (e) {
    console.error('Scan error:', e.message);
}
