// Crea el primer administrador del simulador: un usuario en Firebase Auth +
// su perfil (rol "admin") en Neon. Pensado para correrse UNA sola vez, a
// mano, después de completar .env.local con las credenciales reales de
// Firebase y Neon. No escribe ningún email ni contraseña en ningún archivo.
//
// Uso:  npm run db:crear-admin
//
// También podés pasar los datos por variables de entorno para no tipearlos
// en una terminal compartida (ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NOMBRE,
// ADMIN_APELLIDO); si falta alguna, el script la pide por consola.

import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, "..", ".env.local") });

async function preguntar(rl, etiqueta, valorEnv) {
  if (valorEnv) return valorEnv;
  const respuesta = await rl.question(etiqueta);
  return respuesta.trim();
}

async function main() {
  const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY, DATABASE_URL_ADMIN } = process.env;

  const faltantes = [];
  if (!FIREBASE_PROJECT_ID) faltantes.push("FIREBASE_PROJECT_ID");
  if (!FIREBASE_CLIENT_EMAIL) faltantes.push("FIREBASE_CLIENT_EMAIL");
  if (!FIREBASE_PRIVATE_KEY) faltantes.push("FIREBASE_PRIVATE_KEY");
  if (!DATABASE_URL_ADMIN) faltantes.push("DATABASE_URL_ADMIN");
  if (faltantes.length > 0) {
    console.error(`Faltan variables en .env.local: ${faltantes.join(", ")}. Copiá .env.example y completalas.`);
    process.exit(1);
  }

  const rl = createInterface({ input: stdin, output: stdout });
  let email, password, nombre, apellido;
  try {
    email = (await preguntar(rl, "Email del administrador: ", process.env.ADMIN_EMAIL)).toLowerCase();
    password = await preguntar(rl, "Contraseña (mínimo 8 caracteres): ", process.env.ADMIN_PASSWORD);
    nombre = await preguntar(rl, "Nombre: ", process.env.ADMIN_NOMBRE);
    apellido = await preguntar(rl, "Apellido: ", process.env.ADMIN_APELLIDO);
  } finally {
    rl.close();
  }

  if (!email || !email.includes("@")) {
    console.error("Email inválido.");
    process.exit(1);
  }
  if (!password || password.length < 8) {
    console.error("La contraseña debe tener al menos 8 caracteres.");
    process.exit(1);
  }
  if (!nombre || !apellido) {
    console.error("Nombre y apellido son obligatorios.");
    process.exit(1);
  }

  const app = initializeApp({
    credential: cert({
      projectId: FIREBASE_PROJECT_ID,
      clientEmail: FIREBASE_CLIENT_EMAIL,
      privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    }),
  });
  const authAdmin = getAuth(app);

  console.log(`Creando usuario en Firebase Auth (${email})...`);
  let uid;
  try {
    const usuario = await authAdmin.createUser({
      email,
      password,
      emailVerified: true,
      displayName: `${nombre} ${apellido}`,
    });
    uid = usuario.uid;
  } catch (err) {
    console.error(`No se pudo crear el usuario en Firebase Auth: ${err.message}`);
    process.exit(1);
  }

  console.log("Insertando el perfil de administrador en Neon...");
  const { Client } = pg;
  const client = new Client({ connectionString: DATABASE_URL_ADMIN, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    await client.query(
      `insert into perfiles (id, rol, nombre, apellido, email) values ($1, 'admin', $2, $3, $4)`,
      [uid, nombre, apellido, email]
    );
  } catch (err) {
    console.error(`No se pudo crear el perfil en Neon (se revierte el alta en Firebase Auth): ${err.message}`);
    await authAdmin.deleteUser(uid).catch(() => {});
    process.exit(1);
  } finally {
    await client.end();
  }

  console.log(`\nListo. ${nombre} ${apellido} <${email}> ya puede iniciar sesión como administrador.`);
}

main().catch((err) => {
  console.error("Error inesperado:", err.message);
  process.exit(1);
});
