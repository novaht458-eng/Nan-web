// netlify/functions/verifyCode.js
const { getFile, putFile } = require('./helper_github');
const crypto = require('crypto');

module.exports.handler = async function(event){
  if (event.httpMethod !== 'POST') return { statusCode:405, body:'only POST' };
  try {
    const { username, code, password } = JSON.parse(event.body || '{}');
    if (!username || !code || !password) return { statusCode:400, body: JSON.stringify({ ok:false, error:'faltan campos' }) };

    const dbRaw = await getFile('db.json');
    let db = dbRaw ? JSON.parse(dbRaw.content) : { users:{}, packages:{} };
    const user = db.users[username];
    if (!user || !user.verification) return { statusCode:400, body: JSON.stringify({ ok:false, error:'no verification' }) };

    if (user.verification.code !== code) return { statusCode:400, body: JSON.stringify({ ok:false, error:'codigo invalido' }) };
    if (new Date() > new Date(user.verification.expires)) return { statusCode:400, body: JSON.stringify({ ok:false, error:'codigo expirado' }) };

    // crear cuenta (guarda salt+hash y apikey inicialnann_)
    const salt = crypto.randomBytes(8).toString('hex');
    const hash = crypto.createHash('sha256').update(salt + password).digest('hex');
    const apikey = 'nann_' + crypto.randomBytes(16).toString('hex');

    db.users[username] = {
      email: user.verification.email || user.email || '',
      salt, hash, apikeys:[{ key: apikey, used:false, created: new Date().toISOString() }],
      created: new Date().toISOString()
    };

    await putFile('db.json', JSON.stringify(db, null, 2), `create user ${username} via verify`);
    return { statusCode:200, body: JSON.stringify({ ok:true, apikey }) };
  } catch (err) {
    return { statusCode:500, body: JSON.stringify({ ok:false, error: err.message }) };
  }
};
