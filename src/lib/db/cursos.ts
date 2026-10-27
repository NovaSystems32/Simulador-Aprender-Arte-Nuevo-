import "server-only";
import { and, asc, eq, inArray } from "drizzle-orm";
import { conSesion } from "./contexto";
import { cursoIntegrantes, cursos, perfiles } from "./schema";
import type { Curso } from "../types";

export function cursoDesdeFila(fila: typeof cursos.$inferSelect): Curso {
  return {
    id: fila.id,
    institucion_id: fila.institucionId,
    nombre: fila.nombre,
    division: fila.division,
    anio_lectivo: fila.anioLectivo,
    docente_titular_id: fila.docenteTitularId,
    activo: fila.activo,
    is_demo: fila.isDemo,
    created_at: fila.createdAt.toISOString(),
  };
}

export async function crearCurso(
  usuarioActualId: string,
  datos: { nombre: string; division: string; anioLectivo: number; docenteTitularId: string | null; institucionId: string | null }
): Promise<void> {
  await conSesion(usuarioActualId, async (tx) => {
    await tx.insert(cursos).values({
      nombre: datos.nombre,
      division: datos.division,
      anioLectivo: datos.anioLectivo,
      docenteTitularId: datos.docenteTitularId,
      institucionId: datos.institucionId,
    });
  });
}

export interface CursoConDocenteYConteo extends Curso {
  docente: { nombre: string; apellido: string } | null;
  estudiantes: number;
}

/** Listado para /admin/cursos: todos los cursos (RLS deja ver todo a un admin), con docente titular y conteo de estudiantes. */
export async function listarCursosConDocenteYConteo(usuarioActualId: string): Promise<CursoConDocenteYConteo[]> {
  return conSesion(usuarioActualId, async (tx) => {
    const filas = await tx
      .select({ curso: cursos, docenteNombre: perfiles.nombre, docenteApellido: perfiles.apellido })
      .from(cursos)
      .leftJoin(perfiles, eq(perfiles.id, cursos.docenteTitularId))
      .orderBy(asc(cursos.nombre));

    const conteos = await tx
      .select({ cursoId: cursoIntegrantes.cursoId })
      .from(cursoIntegrantes)
      .where(eq(cursoIntegrantes.rolEnCurso, "estudiante"));
    const cantidadPorCurso = new Map<string, number>();
    for (const c of conteos) cantidadPorCurso.set(c.cursoId, (cantidadPorCurso.get(c.cursoId) ?? 0) + 1);

    return filas.map(({ curso, docenteNombre, docenteApellido }) => ({
      ...cursoDesdeFila(curso),
      docente: docenteNombre && docenteApellido ? { nombre: docenteNombre, apellido: docenteApellido } : null,
      estudiantes: cantidadPorCurso.get(curso.id) ?? 0,
    }));
  });
}

/** Listado para /docente/cursos: los cursos visibles para el usuario actual según RLS (todos si es admin, propios si es docente). */
export async function listarCursosVisibles(usuarioActualId: string): Promise<Curso[]> {
  return conSesion(usuarioActualId, async (tx) => {
    const filas = await tx.select().from(cursos).orderBy(asc(cursos.nombre));
    return filas.map(cursoDesdeFila);
  });
}

export async function obtenerCursoPorId(usuarioActualId: string, cursoId: string): Promise<Curso | null> {
  return conSesion(usuarioActualId, async (tx) => {
    const filas = await tx.select().from(cursos).where(eq(cursos.id, cursoId)).limit(1);
    return filas[0] ? cursoDesdeFila(filas[0]) : null;
  });
}

export interface IntegranteCurso {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
}

export async function listarEstudiantesDelCurso(
  usuarioActualId: string,
  cursoId: string
): Promise<IntegranteCurso[]> {
  return conSesion(usuarioActualId, async (tx) => {
    const filas = await tx
      .select({ id: perfiles.id, nombre: perfiles.nombre, apellido: perfiles.apellido, email: perfiles.email })
      .from(cursoIntegrantes)
      .innerJoin(perfiles, eq(perfiles.id, cursoIntegrantes.perfilId))
      .where(and(eq(cursoIntegrantes.cursoId, cursoId), eq(cursoIntegrantes.rolEnCurso, "estudiante")));
    return filas;
  });
}

export interface CursoResumen {
  nombre: string;
  division: string;
  anioLectivo: number;
}

export async function listarCursosDeEstudiante(usuarioActualId: string, estudianteId: string): Promise<CursoResumen[]> {
  return conSesion(usuarioActualId, async (tx) => {
    const filas = await tx
      .select({ nombre: cursos.nombre, division: cursos.division, anioLectivo: cursos.anioLectivo })
      .from(cursoIntegrantes)
      .innerJoin(cursos, eq(cursos.id, cursoIntegrantes.cursoId))
      .where(and(eq(cursoIntegrantes.perfilId, estudianteId), eq(cursoIntegrantes.rolEnCurso, "estudiante")));
    return filas;
  });
}

export interface CursoConRolEnCurso extends CursoResumen {
  rolEnCurso: string;
}

/** Todas las inscripciones de un perfil (como docente y/o como estudiante), a diferencia de listarCursosDeEstudiante que solo mira las de rol estudiante. */
export async function listarCursosDePerfil(usuarioActualId: string, perfilId: string): Promise<CursoConRolEnCurso[]> {
  return conSesion(usuarioActualId, async (tx) => {
    const filas = await tx
      .select({
        nombre: cursos.nombre,
        division: cursos.division,
        anioLectivo: cursos.anioLectivo,
        rolEnCurso: cursoIntegrantes.rolEnCurso,
      })
      .from(cursoIntegrantes)
      .innerJoin(cursos, eq(cursos.id, cursoIntegrantes.cursoId))
      .where(eq(cursoIntegrantes.perfilId, perfilId));
    return filas;
  });
}

export async function quitarIntegrante(usuarioActualId: string, cursoId: string, perfilId: string): Promise<void> {
  await conSesion(usuarioActualId, async (tx) => {
    await tx
      .delete(cursoIntegrantes)
      .where(and(eq(cursoIntegrantes.cursoId, cursoId), eq(cursoIntegrantes.perfilId, perfilId)));
  });
}

export async function quitarIntegrantes(usuarioActualId: string, cursoId: string, perfilIds: string[]): Promise<void> {
  await conSesion(usuarioActualId, async (tx) => {
    await tx
      .delete(cursoIntegrantes)
      .where(and(eq(cursoIntegrantes.cursoId, cursoId), inArray(cursoIntegrantes.perfilId, perfilIds)));
  });
}

/** Alta masiva, filtrando los que ya están inscriptos. Devuelve cuántos se agregaron realmente. */
export async function agregarEstudiantesAlCurso(
  usuarioActualId: string,
  cursoId: string,
  perfilIds: string[]
): Promise<number> {
  return conSesion(usuarioActualId, async (tx) => {
    const yaInscriptos = await tx
      .select({ perfilId: cursoIntegrantes.perfilId })
      .from(cursoIntegrantes)
      .where(and(eq(cursoIntegrantes.cursoId, cursoId), inArray(cursoIntegrantes.perfilId, perfilIds)));
    const idsExistentes = new Set(yaInscriptos.map((i) => i.perfilId));
    const nuevos = perfilIds.filter((id) => !idsExistentes.has(id));
    if (nuevos.length === 0) return 0;

    await tx
      .insert(cursoIntegrantes)
      .values(nuevos.map((perfilId) => ({ cursoId, perfilId, rolEnCurso: "estudiante" })));
    return nuevos.length;
  });
}

/** Agrega un estudiante recién creado (perfil ya insertado en la misma transacción) a un curso. */
export async function agregarIntegranteACurso(
  usuarioActualId: string,
  cursoId: string,
  perfilId: string,
  rolEnCurso: "docente" | "estudiante" = "estudiante"
): Promise<void> {
  await conSesion(usuarioActualId, async (tx) => {
    await tx.insert(cursoIntegrantes).values({ cursoId, perfilId, rolEnCurso });
  });
}
