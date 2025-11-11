const { getFile } = require('./helper_github');

exports.handler = async function(event){
  const q = event.queryStringParameters || {};
  const namever = q.p;
  if (!namever) return { statusCode:400, body: 'missing p param' };
  const [name, version] = namever.split('@');
  if (!name || !version) return { statusCode:400, body:'bad format' };

  const dbRaw = await getFile('db.json');
  if (!dbRaw) return { statusCode:404, body:'no db' };
  const db = JSON.parse(dbRaw.content);
  if (!db.packages || !db.packages[name] || !db.packages[name].versions[version]) return { statusCode:404, body:'package not found' };

  const path = db.packages[name].versions[version].path;
  const fileRaw = await getFile(path);
  if (!fileRaw) return { statusCode:404, body:'file not found' };
  const meta = JSON.parse(fileRaw.content);
  const b64 = meta.b64;
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename: meta.filename, b64 })
  };
};

