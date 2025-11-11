// netlify/functions/acceptRepo.js
const { getFile, putFile } = require('./helper_github');

module.exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') return { statusCode:405, body: 'only POST' };
  try {
    const { apikey, repo_url, repo_token } = JSON.parse(event.body || '{}');
    if (!apikey || !repo_url) return { statusCode:400, body: JSON.stringify({ error:'faltan campos' }) };

    const dbRaw = await getFile('db.json');
    if (!dbRaw) return { statusCode:400, body: JSON.stringify({ error:'no db' }) };
    const db = JSON.parse(dbRaw.content);

    const username = Object.keys(db.users || {}).find(u => (db.users[u].apikeys || []).some(k => k.key === apikey));
    if (!username) return { statusCode:403, body: JSON.stringify({ error:'apikey invalida' }) };

    const user = db.users[username];
    user.repos = user.repos || [];
    user.repos.push({ url: repo_url, token: repo_token || '', added: new Date().toISOString() });

    await putFile('db.json', JSON.stringify(db, null, 2), `user ${username} add repo`);

    return { statusCode:200, body: JSON.stringify({ ok:true }) };
  } catch (err) {
    return { statusCode:500, body: JSON.stringify({ error: err.message }) };
  }
};
