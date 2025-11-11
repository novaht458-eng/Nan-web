const { getFile, putFile } = require('./helper_github');
const crypto = require('crypto');

exports.handler = async function(event){
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'only POST' };
  const body = JSON.parse(event.body || '{}');
  const { username, password, apikey } = body;

  const dbRaw = await getFile('db.json');
  if (!dbRaw) return { statusCode:400, body: JSON.stringify({error:'no db'}) };
  let db = JSON.parse(dbRaw.content);
  const user = db.users[username];
  if (!user) return { statusCode:401, body: JSON.stringify({error:'usuario no existe'}) };

  if (apikey && user.apikeys && user.apikeys.includes(apikey)) {
    return { statusCode:200, body: JSON.stringify({ ok:true, apikey }) };
  }

  if (!password) return { statusCode:401, body: JSON.stringify({error:'falta password'}) };
  const hash = crypto.createHash('sha256').update(user.salt + password).digest('hex');
  if (hash !== user.hash) return { statusCode:401, body: JSON.stringify({error:'credenciales invalidas'}) };

  const key = crypto.randomBytes(20).toString('hex');
  user.apikeys = user.apikeys || [];
  user.apikeys.push(key);
  await putFile('db.json', JSON.stringify(db, null, 2), `add apikey for ${username}`);
  return { statusCode:200, body: JSON.stringify({ ok:true, apikey: key }) };
};
