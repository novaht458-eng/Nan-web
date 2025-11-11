// netlify/functions/generateApi.js
const { getFile, putFile } = require('./helper_github');
const crypto = require('crypto');

module.exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'only POST' };
  try {
    const body = JSON.parse(event.body || '{}');
    const { username, password, apikey } = body;
    const dbRaw = await getFile('db.json');
    let db = dbRaw ? JSON.parse(dbRaw.content) : { users: {}, packages: {} };
    const user = db.users[username];
    if (!user) return { statusCode: 401, body: JSON.stringify({ error: 'usuario no existe' }) };

    // Si envian apikey valida y no usada, devuelvela
    if (apikey) {
      const found = (user.apikeys || []).find(a => a.key === apikey && !a.used);
      if (found) return { statusCode: 200, body: JSON.stringify({ ok:true, apikey: found.key }) };
    }

    // verificar password si existe usuario
    if (!password) return { statusCode:401, body: JSON.stringify({ error:'falta password' }) };
    const hash = require('crypto').createHash('sha256').update(user.salt + password).digest('hex');
    if (hash !== user.hash) return { statusCode:401, body: JSON.stringify({ error:'credenciales invalidas' }) };

    // generar apikey con prefijo nann_
    const key = 'nann_' + crypto.randomBytes(16).toString('hex');
    user.apikeys = user.apikeys || [];
    user.apikeys.push({ key, used: false, created: new Date().toISOString() });

    await putFile('db.json', JSON.stringify(db, null, 2), `generate apikey for ${username}`);

    return { statusCode:200, body: JSON.stringify({ ok:true, apikey: key }) };
  } catch (err) {
    return { statusCode:500, body: JSON.stringify({ error: 'error interno', detail: err.message }) };
  }
};
