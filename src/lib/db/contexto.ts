import "server-only";
import { sql } from "drizzle-orm";
import { db, type Db } from "./client";

export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

/**
 * Ejecuta `fn` dentro de una transacción Neon con la variable de sesión
 * `app.usuario_id` fijada vía `SET LOCAL` (usando `set_config` para evitar
 * cualquier interpolación de SQL). Las políticas RLS de db/migrations/
 * 0001_init.sql leen esa variable a través de `usuario_actual_id()`.
 *
 * `usuarioId` debe venir SIEMPRE de una sesión de Supabase Auth ya
 * validada en el servidor (nunca de un valor provisto por el cliente sin
 * verificar), porque es lo único que hace cumplir RLS por fila.
 *
 * Pasar `null` corresponde a "sin usuario autenticado": las políticas que
 * exigen `id = usuario_actual_id()` simplemente no matchean, y solo
 * quedan accesibles las filas con policy `using (true)` (p.ej. catálogos
 * públicos como `instituciones`/`configuraciones`).
 */
export async function conSesion<T>(usuarioId: string | null, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.usuario_id', ${usuarioId ?? ""}, true)`);
    return fn(tx);
  });
}
