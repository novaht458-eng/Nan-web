// netlify/functions/login.js
const { getFile } = require('./helper_github');
const crypto = require('crypto');

module.exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'only POST' };
  try {
    const body = JSON.parse(event.body || '{}');
    const { username, password } = body;
    if (!username || !password) return { statusCode: 400, body: JSON.stringify({ error: 'faltan campos' }) };

    const dbRaw = await getFile('db.json');
    if (!dbRaw) return { statusCode: 400, body: JSON.stringify({ error: 'no db' }) };
    const db = JSON.parse(dbRaw.content);

    const user = db.users[username];
    if (!user) return { statusCode: 401, body: JSON.stringify({ error: 'usuario no existe' }) };

    const hash = crypto.createHash('sha256').update(user.salt + password).digest('hex');
    if (hash !== user.hash) return { statusCode: 401, body: JSON.stringify({ error: 'credenciales invalidas' }) };

    // devolver primer apikey si existe
    const apikey = (user.apikeys && user.apikeys.length) ? user.apikeys[0] : null;

    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        message: 'Inicio de sesión correcto',
        user: username,
        apikey
      })
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: 'error interno', detail: err.message }) };
  }
};}
