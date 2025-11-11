// netlify/functions/sendVerification.js
const { getFile, putFile } = require('./helper_github');
const crypto = require('crypto');
const fetch = require('node-fetch');

const SENDGRID_KEY = process.env.SENDGRID_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@example.com';

async function sendEmail(to, subject, html) {
  if (!SENDGRID_KEY) throw new Error('No SENDGRID_API_KEY set');
  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SENDGRID_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: EMAIL_FROM },
      subject,
      content: [{ type: 'text/html', value: html }]
    })
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`SendGrid error ${res.status}: ${txt}`);
  }
}

module.exports.handler = async function(event){
  if (event.httpMethod !== 'POST') return { statusCode:405, body: 'only POST' };
  try {
    const { username, email } = JSON.parse(event.body || '{}');
    if (!username || !email) return { statusCode:400, body: JSON.stringify({ ok:false, error:'faltan campos' }) };

    const dbRaw = await getFile('db.json');
    let db = dbRaw ? JSON.parse(dbRaw.content) : { users:{}, packages:{} };
    const user = db.users[username] || { email: email || '' };

    // crear código de 6 dígitos
    const code = ('' + Math.floor(100000 + Math.random()*900000));
    user.verification = { code, expires: new Date(Date.now()+1000*60*15).toISOString(), email };

    db.users[username] = user;
    await putFile('db.json', JSON.stringify(db, null, 2), `send verification to ${username}`);

    // enviar email (si está configurado)
    try {
      await sendEmail(email, 'Código de verificación NAN', `<p>Tu código: <strong>${code}</strong>. Caduca en 15 minutos.</p>`);
    } catch(e) {
      // se guarda el código igualmente; devuelvo advertencia
      return { statusCode:200, body: JSON.stringify({ ok:true, note: 'email_failed', detail: e.message }) };
    }

    return { statusCode:200, body: JSON.stringify({ ok:true }) };
  } catch (err) {
    return { statusCode:500, body: JSON.stringify({ ok:false, error: err.message }) };
  }
};
