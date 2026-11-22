import db from './src/db.js';
const rows = db.prepare('SELECT id, key_value, discord_id, discord_username, plan, banned FROM license_keys').all();
console.log(JSON.stringify(rows, null, 2));
