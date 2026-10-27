// Crea el primer administrador del simulador: un usuario en Supabase Auth +
// su perfil (rol "admin") en Neon. Pensado para correrse UNA sola vez, a
// mano, después de completar .env.local con las credenciales reales de
// Supabase y Neon. No escribe ningún email ni contraseña en ningún archivo.
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
import { createClient } from "@supabase/supabase-js";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, "..", ".env.local") });

async function preguntar(rl, etiqueta, valorEnv) {
  if (valorEnv) return valorEnv;
  const respuesta = await rl.question(etiqueta);
  return respuesta.trim();
}

async function main() {
  const { NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL_ADMIN } = process.env;

  const faltantes = [];
  if (!NEXT_PUBLIC_SUPABASE_URL) faltantes.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!SUPABASE_SERVICE_ROLE_KEY) faltantes.push("SUPABASE_SERVICE_ROLE_KEY");
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

  const supabaseAdmin = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log(`Creando usuario en Supabase Auth (${email})...`);
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { rol: "admin", nombre, apellido },
  });
  if (error || !data.user) {
    console.error(`No se pudo crear el usuario en Supabase Auth: ${error?.message ?? "error desconocido"}`);
    process.exit(1);
  }

  console.log("Insertando el perfil de administrador en Neon...");
  const { Client } = pg;
  const client = new Client({ connectionString: DATABASE_URL_ADMIN, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    await client.query(
      `insert into perfiles (id, rol, nombre, apellido, email) values ($1, 'admin', $2, $3, $4)`,
      [data.user.id, nombre, apellido, email]
    );
  } catch (err) {
    console.error(`No se pudo crear el perfil en Neon (se revierte el alta en Supabase Auth): ${err.message}`);
    await supabaseAdmin.auth.admin.deleteUser(data.user.id).catch(() => {});
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
