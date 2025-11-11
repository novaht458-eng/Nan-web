const { getFile, putFile } = require('./helper_github');
const crypto = require('crypto');

exports.handler = async function(event){
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'only POST' };
  const body = JSON.parse(event.body || '{}');
  const { username, email, password } = body;
  if (!username || !email || !password) return { statusCode:400, body: JSON.stringify({error:'faltan campos'}) };

  const dbRaw = await getFile('db.json');
  let db = dbRaw ? JSON.parse(dbRaw.content) : { users: {}, packages: {} };

  if (db.users[username]) return { statusCode:409, body: JSON.stringify({error:'usuario existe'}) };

  const salt = crypto.randomBytes(8).toString('hex');
  const hash = crypto.createHash('sha256').update(salt + password).digest('hex');
  db.users[username] = { email, salt, hash, apikeys: [], created: new Date().toISOString() };

  await putFile('db.json', JSON.stringify(db, null, 2), `user ${username} registered`);
  return { statusCode: 200, body: JSON.stringify({ ok:true }) };
};
