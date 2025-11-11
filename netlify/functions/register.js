// netlify/functions/register.js
const { getFile, putFile } = require('./helper_github');
const crypto = require('crypto');

module.exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'only POST' };
  try {
    const body = JSON.parse(event.body || '{}');
    const { username, password, email } = body;
    if (!username || !password) return { statusCode: 400, body: JSON.stringify({ error: 'faltan campos' }) };

    const dbRaw = await getFile('db.json');
    let db = dbRaw ? JSON.parse(dbRaw.content) : { users: {}, packages: {} };

    if (db.users[username]) return { statusCode: 409, body: JSON.stringify({ error: 'usuario existe' }) };

    const salt = crypto.randomBytes(8).toString('hex');
    const hash = crypto.createHash('sha256').update(salt + password).digest('hex');
    const apikey = crypto.randomBytes(20).toString('hex');

    db.users[username] = {
      email: email || '',
      salt,
      hash,
      apikeys: [apikey],
      created: new Date().toISOString()
    };

    await putFile('db.json', JSON.stringify(db, null, 2), `register ${username}`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        message: 'Registrado con éxito',
        autoLogin: true,
        user: username,
        apikey
      })
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: 'error interno', detail: err.message }) };
  }
};
