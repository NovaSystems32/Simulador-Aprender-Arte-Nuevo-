import "server-only";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { conSesion } from "./contexto";
import { asignaciones, cursoIntegrantes, cursos, evaluaciones, evaluacionPreguntas, intentos } from "./schema";
import type { ConfigAutomatica, Evaluacion, EstadoEvaluacion } from "../types";

export function evaluacionDesdeFila(fila: typeof evaluaciones.$inferSelect): Evaluacion {
  return {
    id: fila.id,
    nombre: fila.nombre,
    descripcion: fila.descripcion,
    curso_id: fila.cursoId,
    tipo: fila.tipo,
    fecha_apertura: fila.fechaApertura ? fila.fechaApertura.toISOString() : null,
    fecha_cierre: fila.fechaCierre ? fila.fechaCierre.toISOString() : null,
    duracion_minutos: fila.duracionMinutos,
    cantidad_preguntas: fila.cantidadPreguntas,
    orden_aleatorio_preguntas: fila.ordenAleatorioPreguntas,
    orden_aleatorio_opciones: fila.ordenAleatorioOpciones,
    intentos_max: fila.intentosMax,
    puntaje_aprobacion: Number(fila.puntajeAprobacion),
    mostrar_resultado_inmediato: fila.mostrarResultadoInmediato,
    permitir_revision: fila.permitirRevision,
    mostrar_resoluciones: fila.mostrarResoluciones,
    permitir_calculadora: fila.permitirCalculadora,
    permitir_hoja_formulas: fila.permitirHojaFormulas,
    descuento_por_incorrecta: fila.descuentoPorIncorrecta,
    config_automatica: (fila.configAutomatica as ConfigAutomatica | null) ?? null,
    estado: fila.estado,
    creado_por: fila.creadoPor ?? "",
    is_demo: fila.isDemo,
    created_at: fila.createdAt.toISOString(),
  };
}

export interface DatosEvaluacionComun {
  nombre: string;
  descripcion: string | null;
  cursoId: string;
  fechaApertura: Date | null;
  fechaCierre: Date | null;
  duracionMinutos: number;
  ordenAleatorioPreguntas: boolean;
  ordenAleatorioOpciones: boolean;
  intentosMax: number;
  puntajeAprobacion: number;
  mostrarResultadoInmediato: boolean;
  permitirRevision: boolean;
  mostrarResoluciones: boolean;
  permitirCalculadora: boolean;
  permitirHojaFormulas: boolean;
  descuentoPorIncorrecta: boolean;
}

/**
 * Crea la evaluación y, en la misma transacción, la asociación de preguntas
 * (manual) o la config automática, y auto-asigna el curso de origen (si no
 * queda "asignado" desde el vamos, sus estudiantes no ven la evaluación).
 */
export async function crearEvaluacionManual(
  usuarioActualId: string,
  comun: DatosEvaluacionComun,
  preguntaIds: string[]
): Promise<string> {
  return conSesion(usuarioActualId, async (tx) => {
    const filas = await tx
      .insert(evaluaciones)
      .values({
        nombre: comun.nombre,
        descripcion: comun.descripcion,
        cursoId: comun.cursoId,
        tipo: "manual",
        fechaApertura: comun.fechaApertura,
        fechaCierre: comun.fechaCierre,
        duracionMinutos: comun.duracionMinutos,
        cantidadPreguntas: preguntaIds.length,
        ordenAleatorioPreguntas: comun.ordenAleatorioPreguntas,
        ordenAleatorioOpciones: comun.ordenAleatorioOpciones,
        intentosMax: comun.intentosMax,
        puntajeAprobacion: String(comun.puntajeAprobacion),
        mostrarResultadoInmediato: comun.mostrarResultadoInmediato,
        permitirRevision: comun.permitirRevision,
        mostrarResoluciones: comun.mostrarResoluciones,
        permitirCalculadora: comun.permitirCalculadora,
        permitirHojaFormulas: comun.permitirHojaFormulas,
        descuentoPorIncorrecta: comun.descuentoPorIncorrecta,
        configAutomatica: null,
        estado: "borrador",
        creadoPor: usuarioActualId,
      })
      .returning({ id: evaluaciones.id });
    const evaluacionId = filas[0].id;

    await tx.insert(evaluacionPreguntas).values(
      preguntaIds.map((preguntaId, indice) => ({ evaluacionId, preguntaId, orden: indice + 1 }))
    );

    await tx.insert(asignaciones).values({ evaluacionId, cursoId: comun.cursoId }).onConflictDoNothing();

    return evaluacionId;
  });
}

export async function crearEvaluacionAutomatica(
  usuarioActualId: string,
  comun: DatosEvaluacionComun,
  distribucion: ConfigAutomatica["distribucion"],
  totalPreguntas: number
): Promise<string> {
  return conSesion(usuarioActualId, async (tx) => {
    const filas = await tx
      .insert(evaluaciones)
      .values({
        nombre: comun.nombre,
        descripcion: comun.descripcion,
        cursoId: comun.cursoId,
        tipo: "automatica",
        fechaApertura: comun.fechaApertura,
        fechaCierre: comun.fechaCierre,
        duracionMinutos: comun.duracionMinutos,
        cantidadPreguntas: totalPreguntas,
        ordenAleatorioPreguntas: comun.ordenAleatorioPreguntas,
        ordenAleatorioOpciones: comun.ordenAleatorioOpciones,
        intentosMax: comun.intentosMax,
        puntajeAprobacion: String(comun.puntajeAprobacion),
        mostrarResultadoInmediato: comun.mostrarResultadoInmediato,
        permitirRevision: comun.permitirRevision,
        mostrarResoluciones: comun.mostrarResoluciones,
        permitirCalculadora: comun.permitirCalculadora,
        permitirHojaFormulas: comun.permitirHojaFormulas,
        descuentoPorIncorrecta: comun.descuentoPorIncorrecta,
        configAutomatica: { distribucion },
        estado: "borrador",
        creadoPor: usuarioActualId,
      })
      .returning({ id: evaluaciones.id });
    const evaluacionId = filas[0].id;

    await tx.insert(asignaciones).values({ evaluacionId, cursoId: comun.cursoId }).onConflictDoNothing();

    return evaluacionId;
  });
}

export async function cambiarEstadoEvaluacionFila(
  usuarioActualId: string,
  id: string,
  estado: EstadoEvaluacion
): Promise<void> {
  await conSesion(usuarioActualId, async (tx) => {
    await tx.update(evaluaciones).set({ estado }).where(eq(evaluaciones.id, id));
  });
}

export async function asignarCursoFila(usuarioActualId: string, evaluacionId: string, cursoId: string): Promise<void> {
  await conSesion(usuarioActualId, async (tx) => {
    await tx.insert(asignaciones).values({ evaluacionId, cursoId }).onConflictDoNothing();
  });
}

export async function quitarAsignacionFila(usuarioActualId: string, evaluacionId: string, cursoId: string): Promise<void> {
  await conSesion(usuarioActualId, async (tx) => {
    await tx
      .delete(asignaciones)
      .where(and(eq(asignaciones.evaluacionId, evaluacionId), eq(asignaciones.cursoId, cursoId)));
  });
}

export interface EvaluacionConCurso extends Evaluacion {
  curso: { nombre: string; division: string } | null;
}

export async function listarEvaluacionesConCurso(usuarioActualId: string): Promise<EvaluacionConCurso[]> {
  return conSesion(usuarioActualId, async (tx) => {
    const filas = await tx
      .select({ evaluacion: evaluaciones, cursoNombre: cursos.nombre, cursoDivision: cursos.division })
      .from(evaluaciones)
      .leftJoin(cursos, eq(cursos.id, evaluaciones.cursoId))
      .orderBy(desc(evaluaciones.createdAt));
    return filas.map(({ evaluacion, cursoNombre, cursoDivision }) => ({
      ...evaluacionDesdeFila(evaluacion),
      curso: cursoNombre && cursoDivision ? { nombre: cursoNombre, division: cursoDivision } : null,
    }));
  });
}

/**
 * Evaluaciones visibles para un estudiante: publicadas, y cuyo curso es el
 * "de origen" (evaluaciones.curso_id) o fue sumado luego vía `asignaciones`.
 * Ninguna fuente sola alcanza para reflejar lo que el docente configuró.
 */
export async function listarEvaluacionesAsignadasAEstudiante(estudianteId: string): Promise<Evaluacion[]> {
  return conSesion(estudianteId, async (tx) => {
    const filasCurso = await tx
      .select({ cursoId: cursoIntegrantes.cursoId })
      .from(cursoIntegrantes)
      .where(and(eq(cursoIntegrantes.perfilId, estudianteId), eq(cursoIntegrantes.rolEnCurso, "estudiante")));
    const cursoIds = filasCurso.map((c) => c.cursoId);
    if (cursoIds.length === 0) return [];

    const [porOrigen, filasAsignacion] = await Promise.all([
      tx
        .select()
        .from(evaluaciones)
        .where(and(inArray(evaluaciones.cursoId, cursoIds), eq(evaluaciones.estado, "publicada"))),
      tx.select({ evaluacionId: asignaciones.evaluacionId }).from(asignaciones).where(inArray(asignaciones.cursoId, cursoIds)),
    ]);

    const idsPorAsignacion = filasAsignacion.map((a) => a.evaluacionId);
    const porAsignacion =
      idsPorAsignacion.length > 0
        ? await tx
            .select()
            .from(evaluaciones)
            .where(and(inArray(evaluaciones.id, idsPorAsignacion), eq(evaluaciones.estado, "publicada")))
        : [];

    const porId = new Map<string, Evaluacion>();
    for (const fila of [...porOrigen, ...porAsignacion]) porId.set(fila.id, evaluacionDesdeFila(fila));

    return Array.from(porId.values()).sort((a, b) => {
      const fa = a.fecha_apertura ? new Date(a.fecha_apertura).getTime() : 0;
      const fb = b.fecha_apertura ? new Date(b.fecha_apertura).getTime() : 0;
      return fa - fb;
    });
  });
}

export async function listarEvaluacionesVisibles(usuarioActualId: string): Promise<Evaluacion[]> {
  return conSesion(usuarioActualId, async (tx) => {
    const filas = await tx.select().from(evaluaciones).orderBy(desc(evaluaciones.createdAt));
    return filas.map(evaluacionDesdeFila);
  });
}

export async function listarEvaluacionesResumen(usuarioActualId: string): Promise<{ id: string; nombre: string }[]> {
  return conSesion(usuarioActualId, async (tx) => {
    return tx.select({ id: evaluaciones.id, nombre: evaluaciones.nombre }).from(evaluaciones).orderBy(asc(evaluaciones.nombre));
  });
}

export async function obtenerEvaluacionPorId(usuarioActualId: string, id: string): Promise<Evaluacion | null> {
  return conSesion(usuarioActualId, async (tx) => {
    const filas = await tx.select().from(evaluaciones).where(eq(evaluaciones.id, id)).limit(1);
    return filas[0] ? evaluacionDesdeFila(filas[0]) : null;
  });
}

export interface AsignacionConCurso {
  curso_id: string;
  cursos: { nombre: string; division: string } | null;
}

export interface DetalleEvaluacion {
  cursos: { id: string; nombre: string; division: string; anio_lectivo: number }[];
  asignaciones: AsignacionConCurso[];
  entregados: number;
}

export async function obtenerDetalleEvaluacion(usuarioActualId: string, evaluacionId: string): Promise<DetalleEvaluacion> {
  return conSesion(usuarioActualId, async (tx) => {
    const [filasCursos, filasAsignaciones, filasIntentos] = await Promise.all([
      tx
        .select({ id: cursos.id, nombre: cursos.nombre, division: cursos.division, anioLectivo: cursos.anioLectivo })
        .from(cursos)
        .orderBy(cursos.nombre),
      tx
        .select({ cursoId: asignaciones.cursoId, cursoNombre: cursos.nombre, cursoDivision: cursos.division })
        .from(asignaciones)
        .innerJoin(cursos, eq(cursos.id, asignaciones.cursoId))
        .where(eq(asignaciones.evaluacionId, evaluacionId)),
      tx
        .select({ estado: intentos.estado })
        .from(intentos)
        .where(eq(intentos.evaluacionId, evaluacionId)),
    ]);

    return {
      cursos: filasCursos.map((c) => ({ id: c.id, nombre: c.nombre, division: c.division, anio_lectivo: c.anioLectivo })),
      asignaciones: filasAsignaciones.map((a) => ({
        curso_id: a.cursoId,
        cursos: { nombre: a.cursoNombre, division: a.cursoDivision },
      })),
      entregados: filasIntentos.filter((i) => i.estado === "entregado").length,
    };
  });
}
