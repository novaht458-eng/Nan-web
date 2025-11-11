// netlify/functions/login.js

import { readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Método no permitido" };
  }

  try {
    const { username, password } = JSON.parse(event.body || "{}");
    if (!username || !password) {
      return { statusCode: 400, body: "Faltan datos" };
    }

    const usersFile = path.join(__dirname, "../../data/users.json");
    const data = await readFile(usersFile, "utf8");
    const users = JSON.parse(data);

    const user = users.find(u => u.username === username && u.password === password);
    if (!user) {
      return { statusCode: 401, body: "Usuario o contraseña incorrectos" };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: "Inicio de sesión correcto",
        user: username
      })
    };
  } catch (err) {
    return { statusCode: 500, body: "Error interno: " + err.message };
  }
}
