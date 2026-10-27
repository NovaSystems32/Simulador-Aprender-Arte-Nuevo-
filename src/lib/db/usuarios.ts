import "server-only";
import { and, asc, desc, eq } from "drizzle-orm";
import { conSesion } from "./contexto";
import { cursoIntegrantes, cursos, intentos, perfiles } from "./schema";
import type { Perfil, RolUsuario } from "../types";

export function perfilDesdeFila(fila: typeof perfiles.$inferSelect): Perfil {
  return {
    id: fila.id,
    institucion_id: fila.institucionId,
    rol: fila.rol,
    nombre: fila.nombre,
    apellido: fila.apellido,
    email: fila.email,
    activo: fila.activo,
    is_demo: fila.isDemo,
    created_at: fila.createdAt.toISOString(),
    updated_at: fila.updatedAt.toISOString(),
  };
}

/**
 * Inserta el perfil en Neon para un usuario que ya fue creado en Supabase
 * Auth. Debe llamarse SIEMPRE justo después de un
 * `supabaseAdmin.auth.admin.createUser()` exitoso; si esta inserción
 * falla, quien llama debe revertir borrando ese usuario de Supabase Auth
 * (no hay transacción real entre los dos sistemas, así que la atomicidad
 * se simula con esta transacción compensatoria).
 */
export async function crearPerfil(
  adminActualId: string,
  datos: { id: string; email: string; nombre: string; apellido: string; rol: RolUsuario }
): Promise<void> {
  await conSesion(adminActualId, async (tx) => {
    await tx.insert(perfiles).values({
      id: datos.id,
      email: datos.email,
      nombre: datos.nombre,
      apellido: datos.apellido,
      rol: datos.rol,
    });
  });
}

export interface PerfilResumen {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
}

/** Lista perfiles por rol (p.ej. para elegir un docente titular, o estudiantes disponibles para un curso). */
export async function listarPerfilesPorRol(usuarioActualId: string, rol: RolUsuario): Promise<PerfilResumen[]> {
  return conSesion(usuarioActualId, async (tx) => {
    return tx
      .select({ id: perfiles.id, nombre: perfiles.nombre, apellido: perfiles.apellido, email: perfiles.email })
      .from(perfiles)
      .where(eq(perfiles.rol, rol))
      .orderBy(asc(perfiles.nombre));
  });
}

export async function obtenerInstitucionDePerfil(usuarioActualId: string, perfilId: string): Promise<string | null> {
  return conSesion(usuarioActualId, async (tx) => {
    const filas = await tx
      .select({ institucionId: perfiles.institucionId })
      .from(perfiles)
      .where(eq(perfiles.id, perfilId))
      .limit(1);
    return filas[0]?.institucionId ?? null;
  });
}

export async function listarPerfiles(usuarioActualId: string): Promise<Perfil[]> {
  return conSesion(usuarioActualId, async (tx) => {
    const filas = await tx.select().from(perfiles).orderBy(desc(perfiles.createdAt));
    return filas.map(perfilDesdeFila);
  });
}

export async function obtenerPerfilCompleto(usuarioActualId: string, perfilId: string): Promise<Perfil | null> {
  return conSesion(usuarioActualId, async (tx) => {
    const filas = await tx.select().from(perfiles).where(eq(perfiles.id, perfilId)).limit(1);
    return filas[0] ? perfilDesdeFila(filas[0]) : null;
  });
}

export async function obtenerPerfilBasico(adminActualId: string, perfilId: string) {
  return conSesion(adminActualId, async (tx) => {
    const filas = await tx
      .select({
        nombre: perfiles.nombre,
        apellido: perfiles.apellido,
        email: perfiles.email,
        rol: perfiles.rol,
      })
      .from(perfiles)
      .where(eq(perfiles.id, perfilId))
      .limit(1);
    return filas[0] ?? null;
  });
}

export async function actualizarActivo(adminActualId: string, perfilId: string, activo: boolean) {
  await conSesion(adminActualId, async (tx) => {
    await tx.update(perfiles).set({ activo }).where(eq(perfiles.id, perfilId));
  });
}

export async function cambiarRolPerfil(adminActualId: string, perfilId: string, rol: RolUsuario) {
  await conSesion(adminActualId, async (tx) => {
    await tx.update(perfiles).set({ rol }).where(eq(perfiles.id, perfilId));
  });
}

export async function actualizarDatosPerfil(
  adminActualId: string,
  perfilId: string,
  datos: { nombre: string; apellido: string }
) {
  await conSesion(adminActualId, async (tx) => {
    await tx
      .update(perfiles)
      .set({ nombre: datos.nombre, apellido: datos.apellido, updatedAt: new Date() })
      .where(eq(perfiles.id, perfilId));
  });
}

export interface ResumenEliminacion {
  nombre: string;
  apellido: string;
  email: string;
  rol: RolUsuario;
  cursoDivision: string | null;
  evaluacionesRealizadas: number;
  resultadosAsociados: number;
  cantidadIntentos: number;
}

export async function obtenerResumenEliminacion(
  adminActualId: string,
  perfilId: string
): Promise<ResumenEliminacion | null> {
  return conSesion(adminActualId, async (tx) => {
    const filasPerfil = await tx
      .select({
        nombre: perfiles.nombre,
        apellido: perfiles.apellido,
        email: perfiles.email,
        rol: perfiles.rol,
      })
      .from(perfiles)
      .where(eq(perfiles.id, perfilId))
      .limit(1);
    const perfil = filasPerfil[0];
    if (!perfil) return null;

    const filasCurso = await tx
      .select({ nombre: cursos.nombre, division: cursos.division })
      .from(cursoIntegrantes)
      .innerJoin(cursos, eq(cursos.id, cursoIntegrantes.cursoId))
      .where(and(eq(cursoIntegrantes.perfilId, perfilId), eq(cursoIntegrantes.rolEnCurso, "estudiante")))
      .limit(1);

    const filasIntentos = await tx
      .select({ evaluacionId: intentos.evaluacionId, estado: intentos.estado })
      .from(intentos)
      .where(eq(intentos.estudianteId, perfilId));

    const finalizados = filasIntentos.filter((i) => i.estado === "entregado" || i.estado === "expirado");
    const evaluacionesRealizadas = new Set(finalizados.map((i) => i.evaluacionId)).size;
    const resultadosAsociados = filasIntentos.filter((i) => i.estado === "entregado").length;

    return {
      nombre: perfil.nombre,
      apellido: perfil.apellido,
      email: perfil.email,
      rol: perfil.rol,
      cursoDivision: filasCurso[0] ? `${filasCurso[0].nombre} / ${filasCurso[0].division}` : null,
      evaluacionesRealizadas,
      resultadosAsociados,
      cantidadIntentos: filasIntentos.length,
    };
  });
}

/**
 * Borra el perfil y todo lo que cuelga de él en Neon (curso_integrantes,
 * intentos -> intento_preguntas/respuestas_estudiante/resultado_desglose
 * en cascada; preguntas.autor_id, evaluaciones.creado_por y
 * cursos.docente_titular_id quedan en NULL). Quien llama debe borrar el
 * usuario en Supabase Auth SOLO si esto termina sin lanzar: si se borra
 * primero Auth y esto falla después, quedaría un auth.users sin perfil Y
 * sin los datos que deberían haberse limpiado.
 */
export async function eliminarPerfilEnCascada(adminActualId: string, perfilId: string): Promise<void> {
  await conSesion(adminActualId, async (tx) => {
    await tx.delete(perfiles).where(eq(perfiles.id, perfilId));
  });
}
