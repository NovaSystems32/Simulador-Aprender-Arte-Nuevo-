import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";

/**
 * Conexión a Neon (datos de negocio). Usa el driver `neon-serverless`
 * (WebSocket, no HTTP) porque necesitamos transacciones reales: cada
 * request fija variables de sesión (`SET LOCAL app.usuario_id = ...`)
 * antes de consultar, para que las políticas RLS sepan quién es el
 * usuario actual (ver contexto.ts). Es compatible con Edge runtime.
 *
 * DATABASE_URL debe ser la connection string del rol de runtime
 * (`app_runtime`, sujeto a RLS), nunca la del rol administrador.
 */
function crearPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("Falta la variable de entorno DATABASE_URL (conexión Neon de runtime).");
  }
  return new Pool({ connectionString });
}

declare global {
  var __pool: Pool | undefined;
}

// En desarrollo, Next.js recarga módulos en caliente; reutilizamos el pool
// en globalThis para no abrir una conexión nueva en cada recarga.
const pool = globalThis.__pool ?? crearPool();
if (process.env.NODE_ENV !== "production") {
  globalThis.__pool = pool;
}

export const db = drizzle(pool, { schema });
export type Db = typeof db;
