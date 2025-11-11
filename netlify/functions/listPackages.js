// netlify/functions/listPackages.js
const { getFile } = require('./helper_github');

module.exports.handler = async function(event) {
  try {
    const dbRaw = await getFile('db.json');
    if (!dbRaw) return { statusCode:200, body: JSON.stringify({ ok:true, packages: {} }) };
    const db = JSON.parse(dbRaw.content);
    return { statusCode:200, body: JSON.stringify({ ok:true, packages: db.packages || {} }) };
  } catch (err) {
    return { statusCode:500, body: JSON.stringify({ ok:false, error: err.message }) };
  }
};
