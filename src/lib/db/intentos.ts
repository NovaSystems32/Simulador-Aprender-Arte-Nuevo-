import "server-only";
import { and, desc, eq, ne } from "drizzle-orm";
import { conSesion } from "./contexto";
import { evaluaciones, intentos, resultadoDesglose } from "./schema";
import type { EstadoIntento, Intento, ResultadoDesglose } from "../types";

function intentoDesdeFila(fila: typeof intentos.$inferSelect): Intento {
  return {
    id: fila.id,
    evaluacion_id: fila.evaluacionId,
    estudiante_id: fila.estudianteId,
    numero_intento: fila.numeroIntento,
    estado: fila.estado,
    fecha_inicio: fila.fechaInicio ? fila.fechaInicio.toISOString() : null,
    fecha_entrega: fila.fechaEntrega ? fila.fechaEntrega.toISOString() : null,
    tiempo_limite_segundos: fila.tiempoLimiteSegundos,
    tiempo_utilizado_segundos: fila.tiempoUtilizadoSegundos,
    puntaje_obtenido: fila.puntajeObtenido != null ? Number(fila.puntajeObtenido) : null,
    porcentaje_obtenido: fila.porcentajeObtenido != null ? Number(fila.porcentajeObtenido) : null,
    correctas: fila.correctas,
    incorrectas: fila.incorrectas,
    sin_responder: fila.sinResponder,
    aprobado: fila.aprobado,
    created_at: fila.createdAt.toISOString(),
  };
}

/** RLS (`intentos_select`) decide si el intento es visible: propio estudiante, docente del curso, o admin. */
export async function obtenerIntentoPorId(usuarioActualId: string, id: string): Promise<Intento | null> {
  return conSesion(usuarioActualId, async (tx) => {
    const filas = await tx.select().from(intentos).where(eq(intentos.id, id)).limit(1);
    return filas[0] ? intentoDesdeFila(filas[0]) : null;
  });
}

export async function obtenerDesgloseIntento(usuarioActualId: string, intentoId: string): Promise<ResultadoDesglose[]> {
  return conSesion(usuarioActualId, async (tx) => {
    const filas = await tx.select().from(resultadoDesglose).where(eq(resultadoDesglose.intentoId, intentoId));
    return filas.map((f) => ({
      tipo_agrupacion: f.tipoAgrupacion,
      clave: f.clave,
      correctas: f.correctas,
      total: f.total,
      porcentaje: Number(f.porcentaje),
    }));
  });
}

export interface IntentoConEvaluacion {
  id: string;
  estado: EstadoIntento;
  porcentaje_obtenido: number | null;
  aprobado: boolean | null;
  created_at: string;
  evaluacion_nombre: string | null;
}

export interface ResumenIntento {
  evaluacion_id: string;
  estado: EstadoIntento;
  numero_intento: number;
}

export async function listarResumenIntentosEstudiante(estudianteId: string): Promise<ResumenIntento[]> {
  return conSesion(estudianteId, async (tx) => {
    const filas = await tx
      .select({ evaluacionId: intentos.evaluacionId, estado: intentos.estado, numeroIntento: intentos.numeroIntento })
      .from(intentos)
      .where(eq(intentos.estudianteId, estudianteId));
    return filas.map((f) => ({ evaluacion_id: f.evaluacionId, estado: f.estado, numero_intento: f.numeroIntento }));
  });
}

export interface IntentoHistorial {
  id: string;
  numero_intento: number;
  estado: EstadoIntento;
  porcentaje_obtenido: number | null;
  evaluacion_nombre: string | null;
}

export async function listarHistorialIntentosEstudiante(estudianteId: string): Promise<IntentoHistorial[]> {
  return conSesion(estudianteId, async (tx) => {
    const filas = await tx
      .select({
        id: intentos.id,
        numeroIntento: intentos.numeroIntento,
        estado: intentos.estado,
        porcentajeObtenido: intentos.porcentajeObtenido,
        evaluacionNombre: evaluaciones.nombre,
      })
      .from(intentos)
      .leftJoin(evaluaciones, eq(evaluaciones.id, intentos.evaluacionId))
      .where(and(eq(intentos.estudianteId, estudianteId), ne(intentos.estado, "no_iniciado")))
      .orderBy(desc(intentos.createdAt));

    return filas.map((f) => ({
      id: f.id,
      numero_intento: f.numeroIntento,
      estado: f.estado,
      porcentaje_obtenido: f.porcentajeObtenido != null ? Number(f.porcentajeObtenido) : null,
      evaluacion_nombre: f.evaluacionNombre ?? null,
    }));
  });
}

export async function listarIntentosDeEstudianteConEvaluacion(
  usuarioActualId: string,
  estudianteId: string
): Promise<IntentoConEvaluacion[]> {
  return conSesion(usuarioActualId, async (tx) => {
    const filas = await tx
      .select({
        id: intentos.id,
        estado: intentos.estado,
        porcentajeObtenido: intentos.porcentajeObtenido,
        aprobado: intentos.aprobado,
        createdAt: intentos.createdAt,
        evaluacionNombre: evaluaciones.nombre,
      })
      .from(intentos)
      .leftJoin(evaluaciones, eq(evaluaciones.id, intentos.evaluacionId))
      .where(eq(intentos.estudianteId, estudianteId))
      .orderBy(desc(intentos.createdAt));

    return filas.map((f) => ({
      id: f.id,
      estado: f.estado,
      porcentaje_obtenido: f.porcentajeObtenido != null ? Number(f.porcentajeObtenido) : null,
      aprobado: f.aprobado,
      created_at: f.createdAt.toISOString(),
      evaluacion_nombre: f.evaluacionNombre ?? null,
    }));
  });
}
