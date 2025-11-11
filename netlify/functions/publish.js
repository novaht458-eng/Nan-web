const { getFile, putFile } = require('./helper_github');

exports.handler = async function(event){
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'only POST' };
  const data = JSON.parse(event.body || '{}');
  const { apikey, name, version, description, file_b64, filename } = data;
  if (!apikey || !name || !version || !file_b64) return { statusCode:400, body: JSON.stringify({error:'faltan campos'}) };

  const dbRaw = await getFile('db.json');
  if (!dbRaw) return { statusCode:400, body: JSON.stringify({error:'no db'}) };
  let db = JSON.parse(dbRaw.content);

  const user = Object.values(db.users).find(u => (u.apikeys || []).includes(apikey) );
  if (!user) return { statusCode:403, body: JSON.stringify({error:'apikey invalida'}) };

  const path = `packages/${name}/${version}__${filename}`;
  const fileWrapper = JSON.stringify({ filename, b64:file_b64, uploaded_by: user.email, ts: new Date().toISOString() });
  await putFile(path + '.json', fileWrapper, `upload package ${name}@${version}`);

  db.packages = db.packages || {};
  db.packages[name] = db.packages[name] || { versions: {} };
  db.packages[name].versions[version] = {
    filename,
    path: `${path}.json`,
    description,
    uploaded_by: user.email,
    ts: new Date().toISOString()
  };
  await putFile('db.json', JSON.stringify(db, null, 2), `metadata package ${name}@${version}`);

  return { statusCode:200, body: JSON.stringify({ ok:true, name, version }) };
};
