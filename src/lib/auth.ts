import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { conSesion } from "./db/contexto";
import { perfiles } from "./db/schema";
import { crearClienteServidor } from "./supabase/server";
import type { Perfil } from "./types";

/**
 * Devuelve el perfil del usuario autenticado o null si no hay sesión. Uso en
 * Server Components. La identidad viene de Supabase Auth (`auth.getUser()`,
 * validada contra el servidor de Supabase, nunca de una cookie leída a
 * ciegas); el perfil (rol, nombre, institución, etc.) vive en Neon y se lee
 * dentro de una transacción con RLS activo para ese mismo usuario.
 */
export async function obtenerPerfilActual(): Promise<Perfil | null> {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const perfil = await conSesion(user.id, async (tx) => {
    const filas = await tx.select().from(perfiles).where(eq(perfiles.id, user.id)).limit(1);
    return filas[0];
  });
  if (!perfil) return null;

  return {
    id: perfil.id,
    institucion_id: perfil.institucionId,
    rol: perfil.rol,
    nombre: perfil.nombre,
    apellido: perfil.apellido,
    email: perfil.email,
    activo: perfil.activo,
    is_demo: perfil.isDemo,
    created_at: perfil.createdAt.toISOString(),
    updated_at: perfil.updatedAt.toISOString(),
  } satisfies Perfil;
}

/** Exige un perfil con alguno de los roles indicados; si no, redirige. Uso en páginas server. */
export async function exigirPerfil(rolesPermitidos: Perfil["rol"][]): Promise<Perfil> {
  const perfil = await obtenerPerfilActual();
  if (!perfil || !perfil.activo) {
    redirect("/login");
  }
  if (!rolesPermitidos.includes(perfil.rol)) {
    redirect("/no-autorizado");
  }
  return perfil;
}
