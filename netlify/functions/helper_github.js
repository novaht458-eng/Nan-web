const fetch = require('node-fetch');
const owner = process.env.GITHUB_OWNER;
const repo  = process.env.GITHUB_REPO;
const token = process.env.GITHUB_TOKEN;
const base = 'https://api.github.com';

function ghHeaders(){
  return {
    'Authorization': `token ${token}`,
    'User-Agent': 'nan-registry',
    'Accept': 'application/vnd.github.v3+json'
  };
}

async function getFile(path){
  const url = `${base}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`;
  const res = await fetch(url, { headers: ghHeaders() });
  if (res.status === 404) return null;
  const j = await res.json();
  if (j.content) return { sha: j.sha, content: Buffer.from(j.content, 'base64').toString('utf8') };
  return null;
}

async function putFile(path, contentStr, message){
  const url = `${base}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`;
  const body = {
    message: message || `update ${path}`,
    content: Buffer.from(contentStr, 'utf8').toString('base64')
  };
  const existing = await getFile(path);
  if (existing && existing.sha) body.sha = existing.sha;
  const res = await fetch(url, { method:'PUT', headers: ghHeaders(), body: JSON.stringify(body) });
  return res.json();
}

module.exports = { getFile, putFile };
