import "server-only";
import { and, count, eq, inArray } from "drizzle-orm";
import { conSesion } from "./contexto";
import {
  asignaciones,
  evaluaciones,
  evaluacionPreguntas,
  intentos,
  respuestasEstudiante,
  resultadoDesglose,
} from "./schema";

export interface ResumenHistorial {
  intentos: number;
  respuestas: number;
  resultados: number;
}

export async function contarIntentosRelacionados(
  actorId: string,
  filtro: { estudianteId?: string; evaluacionId?: string }
): Promise<ResumenHistorial> {
  return conSesion(actorId, async (tx) => {
    const condiciones = [];
    if (filtro.estudianteId) condiciones.push(eq(intentos.estudianteId, filtro.estudianteId));
    if (filtro.evaluacionId) condiciones.push(eq(intentos.evaluacionId, filtro.evaluacionId));

    const idsFilas = await tx
      .select({ id: intentos.id })
      .from(intentos)
      .where(condiciones.length > 0 ? and(...condiciones) : undefined);
    const ids = idsFilas.map((f) => f.id);

    let respuestas = 0;
    let resultados = 0;
    if (ids.length > 0) {
      const [[r], [d]] = await Promise.all([
        tx.select({ n: count() }).from(respuestasEstudiante).where(inArray(respuestasEstudiante.intentoId, ids)),
        tx.select({ n: count() }).from(resultadoDesglose).where(inArray(resultadoDesglose.intentoId, ids)),
      ]);
      respuestas = r.n;
      resultados = d.n;
    }

    return { intentos: ids.length, respuestas, resultados };
  });
}

export async function eliminarIntentosDeEstudiante(actorId: string, estudianteId: string): Promise<void> {
  await conSesion(actorId, async (tx) => {
    await tx.delete(intentos).where(eq(intentos.estudianteId, estudianteId));
  });
}

export async function eliminarIntentosDeEvaluacion(actorId: string, evaluacionId: string): Promise<void> {
  await conSesion(actorId, async (tx) => {
    await tx.delete(intentos).where(eq(intentos.evaluacionId, evaluacionId));
  });
}

export async function obtenerNombreEvaluacion(actorId: string, evaluacionId: string): Promise<string | null> {
  return conSesion(actorId, async (tx) => {
    const filas = await tx.select({ nombre: evaluaciones.nombre }).from(evaluaciones).where(eq(evaluaciones.id, evaluacionId)).limit(1);
    return filas[0]?.nombre ?? null;
  });
}

export interface ResumenEliminacionEvaluacion extends ResumenHistorial {
  asignaciones: number;
  preguntasVinculadas: number;
}

export async function obtenerResumenEliminacionEvaluacion(
  actorId: string,
  evaluacionId: string
): Promise<ResumenEliminacionEvaluacion> {
  return conSesion(actorId, async (tx) => {
    const [[a], [p]] = await Promise.all([
      tx.select({ n: count() }).from(asignaciones).where(eq(asignaciones.evaluacionId, evaluacionId)),
      tx.select({ n: count() }).from(evaluacionPreguntas).where(eq(evaluacionPreguntas.evaluacionId, evaluacionId)),
    ]);
    const historial = await contarIntentosRelacionados(actorId, { evaluacionId });
    return { asignaciones: a.n, preguntasVinculadas: p.n, ...historial };
  });
}

export async function eliminarEvaluacionCompleta(actorId: string, evaluacionId: string): Promise<void> {
  await conSesion(actorId, async (tx) => {
    await tx.delete(evaluaciones).where(eq(evaluaciones.id, evaluacionId));
  });
}

export async function obtenerResumenLimpiezaGeneral(actorId: string): Promise<ResumenHistorial> {
  return conSesion(actorId, async (tx) => {
    const [[i], [r], [d]] = await Promise.all([
      tx.select({ n: count() }).from(intentos),
      tx.select({ n: count() }).from(respuestasEstudiante),
      tx.select({ n: count() }).from(resultadoDesglose),
    ]);
    return { intentos: i.n, respuestas: r.n, resultados: d.n };
  });
}

export async function limpiarTodosLosIntentos(actorId: string): Promise<void> {
  await conSesion(actorId, async (tx) => {
    await tx.delete(intentos);
  });
}
