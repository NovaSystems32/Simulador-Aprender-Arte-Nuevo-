import "server-only";
import { and, count, desc, eq, inArray, isNotNull } from "drizzle-orm";
import { conSesion } from "./contexto";
import { cursos, evaluaciones, intentos, perfiles, preguntas } from "./schema";

export interface ResumenAdmin {
  usuarios: number;
  cursos: number;
  evaluaciones: number;
  preguntas: number;
  intentosEntregados: number;
}

export async function obtenerResumenAdmin(usuarioActualId: string): Promise<ResumenAdmin> {
  return conSesion(usuarioActualId, async (tx) => {
    const [[u], [c], [e], [p], [i]] = await Promise.all([
      tx.select({ n: count() }).from(perfiles),
      tx.select({ n: count() }).from(cursos),
      tx.select({ n: count() }).from(evaluaciones),
      tx.select({ n: count() }).from(preguntas),
      tx.select({ n: count() }).from(intentos).where(inArray(intentos.estado, ["entregado", "expirado"])),
    ]);
    return { usuarios: u.n, cursos: c.n, evaluaciones: e.n, preguntas: p.n, intentosEntregados: i.n };
  });
}

export interface ResumenDocente {
  cantidadCursos: number;
  evaluacionesActivas: number;
  preguntasPropias: number;
  intentosRecientes: {
    id: string;
    porcentajeObtenido: number | null;
    estudianteNombre: string | null;
    estudianteApellido: string | null;
    evaluacionNombre: string | null;
  }[];
}

export interface NotificacionEstudiante {
  id: string;
  evaluacionNombre: string | null;
  porcentajeObtenido: number | null;
  aprobado: boolean | null;
  fechaEntrega: string;
}

export async function listarNotificacionesEstudiante(usuarioActualId: string): Promise<NotificacionEstudiante[]> {
  return conSesion(usuarioActualId, async (tx) => {
    const filas = await tx
      .select({
        id: intentos.id,
        evaluacionNombre: evaluaciones.nombre,
        porcentajeObtenido: intentos.porcentajeObtenido,
        aprobado: intentos.aprobado,
        fechaEntrega: intentos.fechaEntrega,
      })
      .from(intentos)
      .leftJoin(evaluaciones, eq(evaluaciones.id, intentos.evaluacionId))
      .where(and(eq(intentos.estudianteId, usuarioActualId), isNotNull(intentos.fechaEntrega)))
      .orderBy(desc(intentos.fechaEntrega))
      .limit(5);
    return filas
      .filter((f) => f.fechaEntrega)
      .map((f) => ({
        id: f.id,
        evaluacionNombre: f.evaluacionNombre,
        porcentajeObtenido: f.porcentajeObtenido != null ? Number(f.porcentajeObtenido) : null,
        aprobado: f.aprobado,
        fechaEntrega: f.fechaEntrega!.toISOString(),
      }));
  });
}

export interface NotificacionStaff {
  id: string;
  evaluacionId: string;
  evaluacionNombre: string | null;
  estudianteNombre: string | null;
  estudianteApellido: string | null;
  porcentajeObtenido: number | null;
  fechaEntrega: string;
}

export async function listarNotificacionesStaff(usuarioActualId: string): Promise<NotificacionStaff[]> {
  return conSesion(usuarioActualId, async (tx) => {
    const filas = await tx
      .select({
        id: intentos.id,
        evaluacionId: intentos.evaluacionId,
        evaluacionNombre: evaluaciones.nombre,
        estudianteNombre: perfiles.nombre,
        estudianteApellido: perfiles.apellido,
        porcentajeObtenido: intentos.porcentajeObtenido,
        fechaEntrega: intentos.fechaEntrega,
      })
      .from(intentos)
      .leftJoin(evaluaciones, eq(evaluaciones.id, intentos.evaluacionId))
      .leftJoin(perfiles, eq(perfiles.id, intentos.estudianteId))
      .where(isNotNull(intentos.fechaEntrega))
      .orderBy(desc(intentos.fechaEntrega))
      .limit(5);
    return filas
      .filter((f) => f.fechaEntrega)
      .map((f) => ({
        id: f.id,
        evaluacionId: f.evaluacionId,
        evaluacionNombre: f.evaluacionNombre,
        estudianteNombre: f.estudianteNombre,
        estudianteApellido: f.estudianteApellido,
        porcentajeObtenido: f.porcentajeObtenido != null ? Number(f.porcentajeObtenido) : null,
        fechaEntrega: f.fechaEntrega!.toISOString(),
      }));
  });
}

export async function obtenerResumenDocente(usuarioActualId: string): Promise<ResumenDocente> {
  return conSesion(usuarioActualId, async (tx) => {
    const [[cursosFila], [evaluacionesFila], [preguntasFila], intentosRecientes] = await Promise.all([
      tx.select({ n: count() }).from(cursos),
      tx.select({ n: count() }).from(evaluaciones).where(eq(evaluaciones.estado, "publicada")),
      tx.select({ n: count() }).from(preguntas).where(eq(preguntas.autorId, usuarioActualId)),
      tx
        .select({
          id: intentos.id,
          porcentajeObtenido: intentos.porcentajeObtenido,
          estudianteNombre: perfiles.nombre,
          estudianteApellido: perfiles.apellido,
          evaluacionNombre: evaluaciones.nombre,
        })
        .from(intentos)
        .innerJoin(perfiles, eq(perfiles.id, intentos.estudianteId))
        .innerJoin(evaluaciones, eq(evaluaciones.id, intentos.evaluacionId))
        .where(inArray(intentos.estado, ["entregado", "expirado"]))
        .orderBy(desc(intentos.fechaEntrega))
        .limit(6),
    ]);

    return {
      cantidadCursos: cursosFila.n,
      evaluacionesActivas: evaluacionesFila.n,
      preguntasPropias: preguntasFila.n,
      intentosRecientes: intentosRecientes.map((i) => ({
        id: i.id,
        porcentajeObtenido: i.porcentajeObtenido != null ? Number(i.porcentajeObtenido) : null,
        estudianteNombre: i.estudianteNombre,
        estudianteApellido: i.estudianteApellido,
        evaluacionNombre: i.evaluacionNombre,
      })),
    };
  });
}
