// Aplica todos los archivos .sql de db/migrations, en orden, contra la base
// de Neon indicada en DATABASE_URL_ADMIN (.env.local) — el rol administrador
// del proyecto, nunca el rol de runtime (app_runtime2).
//
// Uso:  npm run db:migrate
//
// Se corre dos veces en un setup nuevo: la primera vez crea toda la
// estructura (0002_rol_runtime.sql avisa que el rol "app_runtime2" todavía no
// existe y no hace nada); después de crear ese rol desde el panel de Neon,
// se vuelve a correr para que le otorgue los permisos (es idempotente).

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, "..", ".env.local") });

const { Client } = pg;

async function main() {
  const connectionString = process.env.DATABASE_URL_ADMIN;
  if (!connectionString) {
    console.error(
      "Falta DATABASE_URL_ADMIN en .env.local. Copiá .env.example y completá los valores de tu proyecto Neon."
    );
    process.exit(1);
  }

  const migrationsDir = path.join(__dirname, "..", "db", "migrations");
  const archivos = (await readdir(migrationsDir))
    .filter((f) => f.endsWith(".sql"))
    .sort();

  if (archivos.length === 0) {
    console.log("No hay migraciones para aplicar.");
    return;
  }

  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();

  try {
    for (const archivo of archivos) {
      console.log(`Aplicando ${archivo}...`);
      const sql = await readFile(path.join(migrationsDir, archivo), "utf8");
      await client.query(sql);
      console.log(`  OK ${archivo}`);
    }
    console.log("Migraciones aplicadas correctamente.");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("Error aplicando migraciones:", err.message);
  process.exit(1);
});
