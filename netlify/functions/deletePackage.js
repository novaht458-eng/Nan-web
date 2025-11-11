// netlify/functions/deletePackage.js
const { getFile, putFile, deleteFile } = require('./helper_github');

module.exports.handler = async function(event){
  if (event.httpMethod !== 'POST') return { statusCode:405, body:'only POST' };
  try {
    const { username, apikey, name, version } = JSON.parse(event.body || '{}');
    if (!username || !apikey || !name || !version) return { statusCode:400, body: JSON.stringify({ ok:false, error:'faltan campos' }) };

    const dbRaw = await getFile('db.json');
    if (!dbRaw) return { statusCode:400, body: JSON.stringify({ ok:false, error:'no db' }) };
    const db = JSON.parse(dbRaw.content);

    const user = db.users[username];
    if (!user) return { statusCode:403, body: JSON.stringify({ ok:false, error:'usuario no existe' }) };
    const keyobj = (user.apikeys||[]).find(k=>k.key===apikey);
    if (!keyobj) return { statusCode:403, body: JSON.stringify({ ok:false, error:'apikey invalida' }) };

    // comprobar que paquete pertenece al usuario
    if (!db.packages || !db.packages[name] || !db.packages[name].versions[version]) return { statusCode:404, body: JSON.stringify({ ok:false, error:'no existe' }) };
    const info = db.packages[name].versions[version];
    if ((info.uploaded_by || '') !== username) return { statusCode:403, body: JSON.stringify({ ok:false, error:'no owner' }) };

    // borrar archivo y metadata
    await deleteFile(info.path, `delete package ${name}@${version}`);
    delete db.packages[name].versions[version];
    // si carpeta versiones queda vacía, borrar la entrada
    if (Object.keys(db.packages[name].versions).length === 0) delete db.packages[name];

    await putFile('db.json', JSON.stringify(db, null, 2), `metadata remove ${name}@${version}`);
    return { statusCode:200, body: JSON.stringify({ ok:true }) };
  } catch (err) {
    return { statusCode:500, body: JSON.stringify({ ok:false, error: err.message }) };
  }
};
