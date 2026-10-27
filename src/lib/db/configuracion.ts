import "server-only";
import { and, eq } from "drizzle-orm";
import { conSesion } from "./contexto";
import { configuraciones, instituciones } from "./schema";

export async function obtenerInstitucion(actorId: string, institucionId: string) {
  return conSesion(actorId, async (tx) => {
    const filas = await tx.select().from(instituciones).where(eq(instituciones.id, institucionId)).limit(1);
    return filas[0] ?? null;
  });
}

export async function obtenerConfiguracion(actorId: string, institucionId: string, clave: string) {
  return conSesion(actorId, async (tx) => {
    const filas = await tx
      .select()
      .from(configuraciones)
      .where(and(eq(configuraciones.institucionId, institucionId), eq(configuraciones.clave, clave)))
      .limit(1);
    return filas[0] ?? null;
  });
}

export async function actualizarNombreInstitucion(actorId: string, institucionId: string, nombre: string): Promise<void> {
  await conSesion(actorId, async (tx) => {
    await tx.update(instituciones).set({ nombre }).where(eq(instituciones.id, institucionId));
  });
}

export async function upsertConfiguracion(
  actorId: string,
  datos: { institucionId: string | null; clave: string; valor: unknown }
): Promise<void> {
  await conSesion(actorId, async (tx) => {
    await tx
      .insert(configuraciones)
      .values({ institucionId: datos.institucionId, clave: datos.clave, valor: datos.valor })
      .onConflictDoUpdate({
        target: [configuraciones.institucionId, configuraciones.clave],
        set: { valor: datos.valor },
      });
  });
}
