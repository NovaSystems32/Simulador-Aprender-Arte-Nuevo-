import "server-only";
import { conSesion } from "./contexto";
import { auditoriaAdmin } from "./schema";
import type { Perfil } from "../types";

/**
 * Registra una acción administrativa sensible. Se llama siempre desde el
 * servidor, después de exigirPerfil(["admin"]) y de ejecutar la operación.
 * No guarda contraseñas, tokens ni respuestas correctas: "detalle" debe
 * limitarse a conteos y nombres/ids de referencia.
 *
 * A diferencia del proyecto original (donde esto lo insertaba un cliente
 * de service role que bypasea RLS), aquí el insert pasa por la política
 * `auditoria_admin_insert` (exige `es_admin()`), fijando la sesión con el
 * id del propio admin que ejecuta la acción.
 */
export async function registrarAuditoria(params: {
  admin: Perfil;
  accion: string;
  tablaAfectada: string;
  registroId?: string | null;
  cantidadRegistros: number;
  detalle?: Record<string, unknown>;
}) {
  try {
    await conSesion(params.admin.id, async (tx) => {
      await tx.insert(auditoriaAdmin).values({
        adminId: params.admin.id,
        adminEmail: params.admin.email,
        accion: params.accion,
        tablaAfectada: params.tablaAfectada,
        registroId: params.registroId ?? null,
        cantidadRegistros: params.cantidadRegistros,
        detalle: params.detalle ?? null,
      });
    });
  } catch (err) {
    console.error("No se pudo registrar auditoría:", err instanceof Error ? err.message : err);
  }
}
