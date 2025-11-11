// netlify/functions/generateApi.js
// Soporta:
//  - GET  /.netlify/functions/generateApi?user=USERNAME   -> devuelve primera apikey no usada (si existe) o {ok:false}
//  - POST /.netlify/functions/generateApi  { username, password } -> crea nueva apikey nann_... (requiere password)

const { getFile, putFile } = require('./helper_github');
const crypto = require('crypto');

module.exports.handler = async function(event) {
  try {
    // GET: devolver apikey existente (primera no usada)
    if (event.httpMethod === 'GET') {
      const qs = event.queryStringParameters || {};
      const username = qs.user;
      if (!username) return { statusCode:400, body: JSON.stringify({ ok:false, error: 'missing user' }) };

      const dbRaw = await getFile('db.json');
      if (!dbRaw) return { statusCode:200, body: JSON.stringify({ ok:false, error: 'no db' }) };
      const db = JSON.parse(dbRaw.content);
      const user = db.users && db.users[username];
      if (!user) return { statusCode:200, body: JSON.stringify({ ok:false, error:'user not found' }) };

      const keyObj = (user.apikeys||[]).find(k => !k.used);
      if (keyObj) return { statusCode:200, body: JSON.stringify({ ok:true, apikey: keyObj.key }) };
      return { statusCode:200, body: JSON.stringify({ ok:false, error:'no apikey' }) };
    }

    // POST: generar nueva apikey (requiere password)
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { username, password } = body;
      if (!username || !password) return { statusCode:400, body: JSON.stringify({ ok:false, error:'faltan campos' }) };

      const dbRaw = await getFile('db.json');
      let db = dbRaw ? JSON.parse(dbRaw.content) : { users: {}, packages: {} };
      const user = db.users && db.users[username];
      if (!user) return { statusCode:401, body: JSON.stringify({ ok:false, error:'usuario no existe' }) };

      const hash = crypto.createHash('sha256').update(user.salt + password).digest('hex');
      if (hash !== user.hash) return { statusCode:401, body: JSON.stringify({ ok:false, error:'credenciales invalidas' }) };

      const key = 'nann_' + crypto.randomBytes(16).toString('hex');
      user.apikeys = user.apikeys || [];
      user.apikeys.push({ key, used: false, created: new Date().toISOString() });

      await putFile('db.json', JSON.stringify(db, null, 2), `generate apikey for ${username}`);

      return { statusCode:200, body: JSON.stringify({ ok:true, apikey: key }) };
    }

    return { statusCode:405, body: 'Method not allowed' };
  } catch (err) {
    return { statusCode:500, body: JSON.stringify({ ok:false, error: err.message }) };
  }
};
