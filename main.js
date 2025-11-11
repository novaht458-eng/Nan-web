const APIROOT = '/.netlify/functions';
const $ = id => document.getElementById(id);
const setMsg = (id, txt) => { const el = $(id); if(el) el.innerText = txt; };

let session = { user: null, apikey: null };

async function postJSON(path, body){
  const res = await fetch(APIROOT + '/' + path, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify(body)
  });
  return res.json().catch(()=>({ error: 'invalid json response' }));
}

/* Register */
$('btn-register').onclick = async () => {
  const data = { username: $('username').value.trim(), email: $('email').value.trim(), password: $('password').value };
  setMsg('auth-msg', 'Registrando...');
  const r = await postJSON('register', data);
  setMsg('auth-msg', r.ok ? 'Registrado. Inicia sesión.' : (r.error || JSON.stringify(r)));
};

/* Login (also returns or creates API) */
$('btn-login').onclick = async () => {
  const data = { username: $('username').value.trim(), password: $('password').value };
  setMsg('auth-msg','Iniciando sesión...');
  const r = await postJSON('generateApi', data);
  if (r.ok && r.apikey){
    session.user = data.username; session.apikey = r.apikey;
    $('api-key').hidden = false; $('publish').hidden = false;
    $('api-output').innerText = r.apikey;
    setMsg('auth-msg','Conectado');
  } else setMsg('auth-msg', r.error || JSON.stringify(r));
};

$('btn-genapi').onclick = async () => {
  if(!session.user) return setMsg('auth-msg','Inicia sesión primero');
  const r = await postJSON('generateApi', { username: session.user, apikey: session.apikey, password: '' });
  if(r.ok){ session.apikey = r.apikey; $('api-output').innerText = r.apikey; }
  setMsg('auth-msg', r.ok ? 'API Key generada' : (r.error || JSON.stringify(r)));
};

/* Publish */
$('btn-publish').onclick = async () => {
  if(!session.apikey) return setMsg('pub-msg','Inicia sesión y genera API Key');
  const file = $('pkg-file').files[0];
  if(!file) return setMsg('pub-msg','Selecciona zip/tar del paquete');
  setMsg('pub-msg','Leyendo archivo...');
  const b = await file.arrayBuffer();
  const base64 = btoa(String.fromCharCode(...new Uint8Array(b)));
  const body = {
    apikey: session.apikey,
    name: $('pkg-name').value.trim(),
    version: $('pkg-version').value.trim(),
    description: $('pkg-desc').value.trim(),
    file_b64: base64,
    filename: file.name
  };
  setMsg('pub-msg','Subiendo paquete...');
  const r = await postJSON('publish', body);
  setMsg('pub-msg', r.ok ? `Publicado ${r.name}@${r.version}` : (r.error || JSON.stringify(r)));
};

/* Install command */
$('btn-install').onclick = () => {
  const target = $('install-name').value.trim();
  if(!target) return setMsg('install-cmd','Pon paquete@versión');
  const site = location.hostname;
  setMsg('install-cmd', `curl -sL https://${site}/nan-install.sh | bash -s -- install ${target}`);
};
