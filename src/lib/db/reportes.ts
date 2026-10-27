import "server-only";
import { and, asc, desc, eq, inArray, ne } from "drizzle-orm";
import { conSesion } from "./contexto";
import {
  asignaciones,
  cursoIntegrantes,
  cursos,
  evaluaciones,
  intentoPreguntas,
  intentos,
  perfiles,
  preguntas,
  respuestasEstudiante,
  resultadoDesglose,
} from "./schema";
import { evaluacionDesdeFila } from "./evaluaciones";
import type { Intento } from "../types";

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

export interface AlcanceReporte {
  evaluacionIds: string[];
  cursoIdsInvolucrados: string[];
  tituloReporte: string;
}

/**
 * Resuelve a qué evaluación(es)/curso(s) se refiere el reporte pedido,
 * verificando en el mismo paso que quien lo pide tiene acceso: las lecturas
 * de `evaluaciones`/`cursos`/`asignaciones` ya están acotadas por RLS a
 * "docente de ese curso o admin", así que una fila ausente (null / lista
 * vacía) ES la señal de "no autorizado", sin necesitar un chequeo manual
 * aparte ni un cliente que bypasee RLS.
 */
export async function resolverAlcanceReporte(
  actorId: string,
  filtros: { cursoId?: string | null; evaluacionId?: string | null }
): Promise<AlcanceReporte | { error: string; status: number }> {
  return conSesion(actorId, async (tx) => {
    if (filtros.evaluacionId) {
      const filas = await tx.select().from(evaluaciones).where(eq(evaluaciones.id, filtros.evaluacionId)).limit(1);
      if (!filas[0]) return { error: "No administrás esta evaluación (o no existe).", status: 404 };
      const ev = evaluacionDesdeFila(filas[0]);

      const filasAsignacion = await tx
        .select({ cursoId: asignaciones.cursoId })
        .from(asignaciones)
        .where(eq(asignaciones.evaluacionId, ev.id));
      const cursoIdsInvolucrados = Array.from(new Set([ev.curso_id, ...filasAsignacion.map((a) => a.cursoId)]));

      return { evaluacionIds: [ev.id], cursoIdsInvolucrados, tituloReporte: ev.nombre };
    }

    if (!filtros.cursoId) return { error: "Indicá un curso o una evaluación.", status: 400 };

    const filasCurso = await tx.select().from(cursos).where(eq(cursos.id, filtros.cursoId)).limit(1);
    if (!filasCurso[0]) return { error: "No administrás este curso (o no existe).", status: 404 };
    const curso = filasCurso[0];

    const [porOrigen, filasAsignacion] = await Promise.all([
      tx.select({ id: evaluaciones.id }).from(evaluaciones).where(eq(evaluaciones.cursoId, filtros.cursoId)),
      tx.select({ evaluacionId: asignaciones.evaluacionId }).from(asignaciones).where(eq(asignaciones.cursoId, filtros.cursoId)),
    ]);
    const evaluacionIds = Array.from(
      new Set([...porOrigen.map((e) => e.id), ...filasAsignacion.map((a) => a.evaluacionId)])
    );

    return {
      evaluacionIds,
      cursoIdsInvolucrados: [filtros.cursoId],
      tituloReporte: `${curso.nombre} "${curso.division}"`,
    };
  });
}

export interface EstudianteInfo {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
}

export async function listarEstudiantesDeCursos(actorId: string, cursoIds: string[]): Promise<EstudianteInfo[]> {
  return conSesion(actorId, async (tx) => {
    if (cursoIds.length === 0) return [];
    const filas = await tx
      .select({ id: perfiles.id, nombre: perfiles.nombre, apellido: perfiles.apellido, email: perfiles.email })
      .from(cursoIntegrantes)
      .innerJoin(perfiles, eq(perfiles.id, cursoIntegrantes.perfilId))
      .where(and(inArray(cursoIntegrantes.cursoId, cursoIds), eq(cursoIntegrantes.rolEnCurso, "estudiante")));

    const porId = new Map<string, EstudianteInfo>();
    for (const f of filas) porId.set(f.id, f);
    return Array.from(porId.values()).sort((a, b) => a.apellido.localeCompare(b.apellido));
  });
}

/**
 * Estudiantes para el selector de "Informe por estudiante": los de un curso
 * puntual, o todos los que RLS deje ver (los propios cursos si es docente,
 * todos si es admin) cuando no hay curso seleccionado.
 */
export async function listarEstudiantesVisibles(actorId: string, cursoIdFiltro?: string | null): Promise<EstudianteInfo[]> {
  return conSesion(actorId, async (tx) => {
    const condiciones = [eq(cursoIntegrantes.rolEnCurso, "estudiante")];
    if (cursoIdFiltro) condiciones.push(eq(cursoIntegrantes.cursoId, cursoIdFiltro));

    const filas = await tx
      .select({ id: perfiles.id, nombre: perfiles.nombre, apellido: perfiles.apellido, email: perfiles.email })
      .from(cursoIntegrantes)
      .innerJoin(perfiles, eq(perfiles.id, cursoIntegrantes.perfilId))
      .where(and(...condiciones));

    const porId = new Map<string, EstudianteInfo>();
    for (const f of filas) porId.set(f.id, f);
    return Array.from(porId.values()).sort((a, b) => a.apellido.localeCompare(b.apellido));
  });
}

export async function listarNombresEvaluaciones(actorId: string, evaluacionIds: string[]): Promise<Map<string, string>> {
  return conSesion(actorId, async (tx) => {
    if (evaluacionIds.length === 0) return new Map();
    const filas = await tx
      .select({ id: evaluaciones.id, nombre: evaluaciones.nombre })
      .from(evaluaciones)
      .where(inArray(evaluaciones.id, evaluacionIds));
    return new Map(filas.map((f) => [f.id, f.nombre]));
  });
}

export async function listarIntentosPorEvaluacionesYEstudiantes(
  actorId: string,
  evaluacionIds: string[],
  estudianteIds: string[]
): Promise<Intento[]> {
  return conSesion(actorId, async (tx) => {
    if (evaluacionIds.length === 0 || estudianteIds.length === 0) return [];
    const filas = await tx
      .select()
      .from(intentos)
      .where(and(inArray(intentos.evaluacionId, evaluacionIds), inArray(intentos.estudianteId, estudianteIds)));
    return filas.map(intentoDesdeFila);
  });
}

export interface FilaIntentoConJoins {
  id: string;
  numero_intento: number;
  estado: Intento["estado"];
  correctas: number | null;
  incorrectas: number | null;
  sin_responder: number | null;
  porcentaje_obtenido: number | null;
  aprobado: boolean | null;
  tiempo_utilizado_segundos: number | null;
  fecha_entrega: string | null;
  estudiante: { nombre: string; apellido: string; email: string } | null;
  evaluacion: { nombre: string; curso: { nombre: string; division: string } | null } | null;
}

/** Usado por CSV y PDF: listado plano de intentos finalizados con estudiante/evaluación/curso, filtrado por curso o evaluación. RLS decide qué ve cada rol. */
export async function listarIntentosReporte(
  actorId: string,
  filtros: { cursoId?: string | null; evaluacionId?: string | null }
): Promise<FilaIntentoConJoins[]> {
  return conSesion(actorId, async (tx) => {
    const condiciones = [inArray(intentos.estado, ["entregado", "expirado"] as const)];
    if (filtros.evaluacionId) condiciones.push(eq(intentos.evaluacionId, filtros.evaluacionId));
    else if (filtros.cursoId) condiciones.push(eq(evaluaciones.cursoId, filtros.cursoId));

    const filas = await tx
      .select({
        id: intentos.id,
        numeroIntento: intentos.numeroIntento,
        estado: intentos.estado,
        correctas: intentos.correctas,
        incorrectas: intentos.incorrectas,
        sinResponder: intentos.sinResponder,
        porcentajeObtenido: intentos.porcentajeObtenido,
        aprobado: intentos.aprobado,
        tiempoUtilizadoSegundos: intentos.tiempoUtilizadoSegundos,
        fechaEntrega: intentos.fechaEntrega,
        estudianteNombre: perfiles.nombre,
        estudianteApellido: perfiles.apellido,
        estudianteEmail: perfiles.email,
        evaluacionNombre: evaluaciones.nombre,
        cursoNombre: cursos.nombre,
        cursoDivision: cursos.division,
      })
      .from(intentos)
      .innerJoin(evaluaciones, eq(evaluaciones.id, intentos.evaluacionId))
      .innerJoin(perfiles, eq(perfiles.id, intentos.estudianteId))
      .leftJoin(cursos, eq(cursos.id, evaluaciones.cursoId))
      .where(and(...condiciones));

    return filas.map((f) => ({
      id: f.id,
      numero_intento: f.numeroIntento,
      estado: f.estado,
      correctas: f.correctas,
      incorrectas: f.incorrectas,
      sin_responder: f.sinResponder,
      porcentaje_obtenido: f.porcentajeObtenido != null ? Number(f.porcentajeObtenido) : null,
      aprobado: f.aprobado,
      tiempo_utilizado_segundos: f.tiempoUtilizadoSegundos,
      fecha_entrega: f.fechaEntrega ? f.fechaEntrega.toISOString() : null,
      estudiante: { nombre: f.estudianteNombre, apellido: f.estudianteApellido, email: f.estudianteEmail },
      evaluacion: {
        nombre: f.evaluacionNombre,
        curso: f.cursoNombre && f.cursoDivision ? { nombre: f.cursoNombre, division: f.cursoDivision } : null,
      },
    }));
  });
}

export interface FilaDesgloseConId {
  intento_id: string;
  tipo_agrupacion: string;
  clave: string;
  correctas: number;
  total: number;
}

export async function listarDesglosePorIntentos(actorId: string, intentoIds: string[]): Promise<FilaDesgloseConId[]> {
  return conSesion(actorId, async (tx) => {
    if (intentoIds.length === 0) return [];
    const filas = await tx
      .select({
        intentoId: resultadoDesglose.intentoId,
        tipoAgrupacion: resultadoDesglose.tipoAgrupacion,
        clave: resultadoDesglose.clave,
        correctas: resultadoDesglose.correctas,
        total: resultadoDesglose.total,
      })
      .from(resultadoDesglose)
      .where(inArray(resultadoDesglose.intentoId, intentoIds));
    return filas.map((f) => ({
      intento_id: f.intentoId,
      tipo_agrupacion: f.tipoAgrupacion,
      clave: f.clave,
      correctas: f.correctas,
      total: f.total,
    }));
  });
}

export interface FilaPreguntaIntentoReporte {
  intento_id: string;
  pregunta_id: string;
  orden: number;
  enunciado: string;
  respuesta_correcta: string;
  eje: string;
  contenido: string;
  capacidad: string;
  dificultad: string;
}

export async function listarPreguntasDeIntentos(actorId: string, intentoIds: string[]): Promise<FilaPreguntaIntentoReporte[]> {
  return conSesion(actorId, async (tx) => {
    if (intentoIds.length === 0) return [];
    const filas = await tx
      .select({
        intentoId: intentoPreguntas.intentoId,
        preguntaId: intentoPreguntas.preguntaId,
        orden: intentoPreguntas.orden,
        enunciado: intentoPreguntas.enunciado,
        respuestaCorrecta: intentoPreguntas.respuestaCorrecta,
        eje: intentoPreguntas.eje,
        contenido: intentoPreguntas.contenido,
        capacidad: intentoPreguntas.capacidad,
        dificultad: intentoPreguntas.dificultad,
      })
      .from(intentoPreguntas)
      .where(inArray(intentoPreguntas.intentoId, intentoIds))
      .orderBy(asc(intentoPreguntas.orden));
    return filas.map((f) => ({
      intento_id: f.intentoId,
      pregunta_id: f.preguntaId,
      orden: f.orden,
      enunciado: f.enunciado,
      respuesta_correcta: f.respuestaCorrecta,
      eje: f.eje,
      contenido: f.contenido,
      capacidad: f.capacidad,
      dificultad: f.dificultad,
    }));
  });
}

export async function listarRespuestasDeIntentos(
  actorId: string,
  intentoIds: string[]
): Promise<{ intento_id: string; pregunta_id: string; opcion_seleccionada: string | null }[]> {
  return conSesion(actorId, async (tx) => {
    if (intentoIds.length === 0) return [];
    const filas = await tx
      .select({
        intentoId: respuestasEstudiante.intentoId,
        preguntaId: respuestasEstudiante.preguntaId,
        opcionSeleccionada: respuestasEstudiante.opcionSeleccionada,
      })
      .from(respuestasEstudiante)
      .where(inArray(respuestasEstudiante.intentoId, intentoIds));
    return filas.map((f) => ({ intento_id: f.intentoId, pregunta_id: f.preguntaId, opcion_seleccionada: f.opcionSeleccionada }));
  });
}

export async function listarInfoPreguntas(actorId: string): Promise<Map<string, { codigo: string; enunciado: string }>> {
  return conSesion(actorId, async (tx) => {
    const filas = await tx.select({ id: preguntas.id, codigo: preguntas.codigo, enunciado: preguntas.enunciado }).from(preguntas);
    return new Map(filas.map((f) => [f.id, { codigo: f.codigo, enunciado: f.enunciado }]));
  });
}

export interface EstudianteConPerfil extends EstudianteInfo {
  rol: string;
}

export async function obtenerEstudiantePorId(actorId: string, estudianteId: string): Promise<EstudianteConPerfil | null> {
  return conSesion(actorId, async (tx) => {
    const filas = await tx
      .select({ id: perfiles.id, nombre: perfiles.nombre, apellido: perfiles.apellido, email: perfiles.email, rol: perfiles.rol })
      .from(perfiles)
      .where(eq(perfiles.id, estudianteId))
      .limit(1);
    return filas[0] ?? null;
  });
}

export interface IntentoConCursoEvaluacion extends Intento {
  evaluacion_nombre: string | null;
  curso_nombre: string | null;
  curso_division: string | null;
}

export async function listarIntentosDeEstudianteParaReporte(
  actorId: string,
  estudianteId: string,
  evaluacionId?: string | null
): Promise<IntentoConCursoEvaluacion[]> {
  return conSesion(actorId, async (tx) => {
    const condiciones = [eq(intentos.estudianteId, estudianteId), ne(intentos.estado, "no_iniciado")];
    if (evaluacionId) condiciones.push(eq(intentos.evaluacionId, evaluacionId));

    const filas = await tx
      .select({
        intento: intentos,
        evaluacionNombre: evaluaciones.nombre,
        cursoNombre: cursos.nombre,
        cursoDivision: cursos.division,
      })
      .from(intentos)
      .leftJoin(evaluaciones, eq(evaluaciones.id, intentos.evaluacionId))
      .leftJoin(cursos, eq(cursos.id, evaluaciones.cursoId))
      .where(and(...condiciones))
      .orderBy(desc(intentos.createdAt));

    return filas.map((f) => ({
      ...intentoDesdeFila(f.intento),
      evaluacion_nombre: f.evaluacionNombre,
      curso_nombre: f.cursoNombre,
      curso_division: f.cursoDivision,
    }));
  });
}

export async function listarCursosDeEstudianteParaReporte(
  actorId: string,
  estudianteId: string
): Promise<{ nombre: string; division: string }[]> {
  return conSesion(actorId, async (tx) => {
    return tx
      .select({ nombre: cursos.nombre, division: cursos.division })
      .from(cursoIntegrantes)
      .innerJoin(cursos, eq(cursos.id, cursoIntegrantes.cursoId))
      .where(and(eq(cursoIntegrantes.perfilId, estudianteId), eq(cursoIntegrantes.rolEnCurso, "estudiante")));
  });
}
