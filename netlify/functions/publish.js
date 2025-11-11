// netlify/functions/publish.js
const { getFile, putFile } = require('./helper_github');
const fetch = require('node-fetch');
const crypto = require('crypto');

module.exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') return { statusCode:405, body: 'only POST' };
  try {
    const data = JSON.parse(event.body || '{}');
    const { apikey, name, version, description, file_b64, filename, git_repo_url, git_token } = data;
    if (!apikey || !name || !version) return { statusCode:400, body: JSON.stringify({ error:'faltan campos' }) };

    const dbRaw = await getFile('db.json');
    if (!dbRaw) return { statusCode:400, body: JSON.stringify({ error:'no db' }) };
    let db = JSON.parse(dbRaw.content);

    // validar apikey no usada y obtener usuario
    let foundUser = null, foundKeyObj = null;
    for (const uname of Object.keys(db.users || {})) {
      const u = db.users[uname];
      if (!u.apikeys) continue;
      const keyObj = u.apikeys.find(k => k.key === apikey);
      if (keyObj) { foundUser = { name: uname, email: u.email }; foundKeyObj = keyObj; break; }
    }
    if (!foundUser) return { statusCode:403, body: JSON.stringify({ error:'apikey invalida' }) };
    if (foundKeyObj.used) return { statusCode:403, body: JSON.stringify({ error:'apikey usada' }) };

    // Si el upload viene desde repo, fetchear el zip/tar
    let finalB64 = file_b64;
    let usedFilename = filename || `${name}-${version}.zip`;

    if (git_repo_url && !finalB64) {
      // Intentamos descargar el archive URL. git_repo_url puede ser:
      // - URL directa a zip (ej: https://github.com/user/repo/archive/refs/heads/main.zip)
      // - GitHub repo https URL (ej: https://github.com/user/repo) -> convertimos a archive main
      let url = git_repo_url;
      if (!/\/archive\/refs\/heads\//.test(url) && url.includes('github.com')) {
        // asume branch main por defecto
        if (url.endsWith('/')) url = url.slice(0,-1);
        url = url + '/archive/refs/heads/main.zip';
      }
      const headers = git_token ? { 'Authorization': `token ${git_token}` } : {};
      const resp = await fetch(url, { headers });
      if (!resp.ok) return { statusCode:400, body: JSON.stringify({ error:'no se pudo descargar repo', status: resp.status }) };
      const buf = await resp.buffer();
      finalB64 = buf.toString('base64');
      // poner nombre de archivo del repo
      usedFilename = (url.split('/').slice(-1)[0]) || usedFilename;
    }

    if (!finalB64) return { statusCode:400, body: JSON.stringify({ error:'falta file_b64 o git_repo_url' }) };

    // Guardar contenido como .json con campo b64 (igual que antes)
    const path = `packages/${name}/${version}__${usedFilename}`;
    const fileWrapper = JSON.stringify({ filename: usedFilename, b64: finalB64, uploaded_by: foundUser.name, ts: new Date().toISOString() });

    await putFile(path + '.json', fileWrapper, `upload package ${name}@${version}`);

    // actualizar metadata en db
    db.packages = db.packages || {};
    db.packages[name] = db.packages[name] || { versions: {} };

    db.packages[name].versions[version] = {
      filename: usedFilename,
      path: `${path}.json`,
      description: description || '',
      uploaded_by: foundUser.name,
      ts: new Date().toISOString()
    };

    // marcar apikey como usada (single-use)
    for (const uname of Object.keys(db.users || {})) {
      const u = db.users[uname];
      if (!u.apikeys) continue;
      const keyObj = u.apikeys.find(k => k.key === apikey);
      if (keyObj) { keyObj.used = true; keyObj.used_at = new Date().toISOString(); keyObj.used_for = `${name}@${version}`; break; }
    }

    await putFile('db.json', JSON.stringify(db, null, 2), `publish ${name}@${version}`);

    return { statusCode:200, body: JSON.stringify({ ok:true, name, version }) };

  } catch (err) {
    return { statusCode:500, body: JSON.stringify({ error: 'error interno', detail: err.message }) };
  }
};
