import "server-only";
import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";
import { conSesion, type Tx } from "./contexto";
import { preguntas } from "./schema";
import type { CapacidadEvaluada, EjeMatematico, EstadoPregunta, NivelDificultad, Pregunta } from "../types";

export function preguntaDesdeFila(fila: typeof preguntas.$inferSelect): Pregunta {
  return {
    id: fila.id,
    codigo: fila.codigo,
    enunciado: fila.enunciado,
    recurso_url: fila.recursoUrl,
    recurso_alt: fila.recursoAlt,
    opcion_a: fila.opcionA,
    opcion_b: fila.opcionB,
    opcion_c: fila.opcionC,
    opcion_d: fila.opcionD,
    respuesta_correcta: fila.respuestaCorrecta,
    explicacion: fila.explicacion,
    eje: fila.eje,
    contenido: fila.contenido,
    capacidad: fila.capacidad,
    dificultad: fila.dificultad,
    curso_id: fila.cursoId,
    autor_id: fila.autorId,
    estado: fila.estado,
    created_at: fila.createdAt.toISOString(),
    updated_at: fila.updatedAt.toISOString(),
  };
}

export interface FiltrosPreguntas {
  eje?: string;
  capacidad?: string;
  dificultad?: string;
  estado?: string;
  q?: string;
  /** Por defecto se ordena por fecha de creación descendente (banco de preguntas); pasar "codigo" para selectores de armado de evaluación. */
  ordenarPor?: "created_at" | "codigo";
}

export async function listarPreguntas(usuarioActualId: string, filtros: FiltrosPreguntas): Promise<Pregunta[]> {
  return conSesion(usuarioActualId, async (tx) => {
    const condiciones = [];
    if (filtros.eje) condiciones.push(eq(preguntas.eje, filtros.eje as EjeMatematico));
    if (filtros.capacidad) condiciones.push(eq(preguntas.capacidad, filtros.capacidad as CapacidadEvaluada));
    if (filtros.dificultad) condiciones.push(eq(preguntas.dificultad, filtros.dificultad as NivelDificultad));
    if (filtros.estado) condiciones.push(eq(preguntas.estado, filtros.estado as EstadoPregunta));
    if (filtros.q) {
      const patron = `%${filtros.q}%`;
      const condicionTexto = or(
        ilike(preguntas.enunciado, patron),
        ilike(preguntas.contenido, patron),
        ilike(preguntas.codigo, patron)
      );
      if (condicionTexto) condiciones.push(condicionTexto);
    }

    const filas = await tx
      .select()
      .from(preguntas)
      .where(condiciones.length > 0 ? and(...condiciones) : undefined)
      .orderBy(filtros.ordenarPor === "codigo" ? asc(preguntas.codigo) : desc(preguntas.createdAt));
    return filas.map(preguntaDesdeFila);
  });
}

export async function obtenerPreguntaPorId(usuarioActualId: string, id: string): Promise<Pregunta | null> {
  return conSesion(usuarioActualId, async (tx) => {
    const filas = await tx.select().from(preguntas).where(eq(preguntas.id, id)).limit(1);
    return filas[0] ? preguntaDesdeFila(filas[0]) : null;
  });
}

export async function obtenerIdPreguntaPorCodigo(usuarioActualId: string, codigo: string): Promise<string | null> {
  return conSesion(usuarioActualId, async (tx) => {
    const filas = await tx.select({ id: preguntas.id }).from(preguntas).where(eq(preguntas.codigo, codigo)).limit(1);
    return filas[0]?.id ?? null;
  });
}

const PREFIJOS_EJE: Record<EjeMatematico, string> = {
  numeros_operaciones: "NUM",
  algebra_funciones: "ALG",
  geometria_medida: "GEO",
  estadistica_probabilidad: "EST",
};

/**
 * Calcula el próximo código libre del eje (p. ej. NUM-017) mirando el número
 * más alto que existe entre TODO el banco compartido (no solo las preguntas
 * del autor actual): desde la migración 0005 cualquier docente ve el banco
 * completo, así que ya no hace falta un cliente "de servicio" aparte para
 * esto (a diferencia del proyecto original, donde sí lo necesitaba).
 */
async function generarCodigoEnTx(tx: Tx, eje: EjeMatematico): Promise<string> {
  const prefijo = PREFIJOS_EJE[eje];
  const filas = await tx
    .select({ codigo: preguntas.codigo })
    .from(preguntas)
    .where(ilike(preguntas.codigo, `${prefijo}-%`))
    .limit(5000);
  let maximo = 0;
  for (const fila of filas) {
    const numero = Number.parseInt(fila.codigo.slice(prefijo.length + 1), 10);
    if (Number.isFinite(numero) && numero > maximo) maximo = numero;
  }
  return `${prefijo}-${String(maximo + 1).padStart(3, "0")}`;
}

export interface DatosPregunta {
  enunciado: string;
  recursoUrl: string | null;
  recursoAlt: string | null;
  opcionA: string;
  opcionB: string;
  opcionC: string;
  opcionD: string;
  respuestaCorrecta: "A" | "B" | "C" | "D";
  explicacion: string;
  eje: EjeMatematico;
  contenido: string;
  capacidad: CapacidadEvaluada;
  dificultad: NivelDificultad;
  cursoId?: string | null;
  autorId: string | null;
  estado: EstadoPregunta;
}

/**
 * Inserta la pregunta generando un código libre del eje. Si dos personas
 * generan el mismo código a la vez, la restricción UNIQUE rechaza la
 * segunda (error Postgres 23505) y se reintenta con el código siguiente,
 * hasta 5 veces.
 */
export async function insertarPreguntaConReintento(
  usuarioActualId: string,
  datos: DatosPregunta
): Promise<Pregunta> {
  let ultimoError: unknown;
  for (let intento = 0; intento < 5; intento++) {
    const codigo = await conSesion(usuarioActualId, (tx) => generarCodigoEnTx(tx, datos.eje));
    try {
      return await conSesion(usuarioActualId, async (tx) => {
        const filas = await tx
          .insert(preguntas)
          .values({
            codigo,
            enunciado: datos.enunciado,
            recursoUrl: datos.recursoUrl,
            recursoAlt: datos.recursoAlt,
            opcionA: datos.opcionA,
            opcionB: datos.opcionB,
            opcionC: datos.opcionC,
            opcionD: datos.opcionD,
            respuestaCorrecta: datos.respuestaCorrecta,
            explicacion: datos.explicacion,
            eje: datos.eje,
            contenido: datos.contenido,
            capacidad: datos.capacidad,
            dificultad: datos.dificultad,
            cursoId: datos.cursoId ?? null,
            autorId: datos.autorId,
            estado: datos.estado,
          })
          .returning();
        return preguntaDesdeFila(filas[0]);
      });
    } catch (err) {
      const pgErr = err as { code?: string; message?: string };
      if (pgErr.code === "23505" && /codigo/i.test(pgErr.message ?? "")) {
        ultimoError = err;
        continue;
      }
      throw err;
    }
  }
  throw ultimoError;
}

export async function actualizarPreguntaFila(
  usuarioActualId: string,
  id: string,
  datos: Omit<DatosPregunta, "autorId">
): Promise<Pregunta | null> {
  return conSesion(usuarioActualId, async (tx) => {
    const filas = await tx
      .update(preguntas)
      .set({
        enunciado: datos.enunciado,
        recursoUrl: datos.recursoUrl,
        recursoAlt: datos.recursoAlt,
        opcionA: datos.opcionA,
        opcionB: datos.opcionB,
        opcionC: datos.opcionC,
        opcionD: datos.opcionD,
        respuestaCorrecta: datos.respuestaCorrecta,
        explicacion: datos.explicacion,
        eje: datos.eje,
        contenido: datos.contenido,
        capacidad: datos.capacidad,
        dificultad: datos.dificultad,
        estado: datos.estado,
        updatedAt: new Date(),
      })
      .where(eq(preguntas.id, id))
      .returning();
    return filas[0] ? preguntaDesdeFila(filas[0]) : null;
  });
}

export async function cambiarEstadoPreguntaFila(
  usuarioActualId: string,
  id: string,
  estado: EstadoPregunta
): Promise<{ id: string; codigo: string } | null> {
  return conSesion(usuarioActualId, async (tx) => {
    const filas = await tx
      .update(preguntas)
      .set({ estado })
      .where(eq(preguntas.id, id))
      .returning({ id: preguntas.id, codigo: preguntas.codigo });
    return filas[0] ?? null;
  });
}

function filaUnica<T>(resultado: unknown): T | undefined {
  return (resultado as { rows: T[] }).rows[0];
}

export interface ResumenEliminacionPregunta {
  codigo: string;
  enunciadoResumido: string;
  evaluacionesQueLaUsan: number;
  intentosQueLaUsan: number;
  respuestasVinculadas: number;
}

export async function obtenerResumenEliminacionPregunta(
  usuarioActualId: string,
  id: string
): Promise<ResumenEliminacionPregunta | null> {
  return conSesion(usuarioActualId, async (tx) => {
    const filas = await tx
      .select({ codigo: preguntas.codigo, enunciado: preguntas.enunciado })
      .from(preguntas)
      .where(eq(preguntas.id, id))
      .limit(1);
    const pregunta = filas[0];
    if (!pregunta) return null;

    const [ev, it, re] = await Promise.all([
      tx.execute(sql`select contar_uso_pregunta_evaluaciones(${id}) as c`),
      tx.execute(sql`select contar_uso_pregunta_intentos(${id}) as c`),
      tx.execute(sql`select contar_respuestas_vinculadas_pregunta(${id}) as c`),
    ]);

    return {
      codigo: pregunta.codigo,
      enunciadoResumido: pregunta.enunciado.length > 140 ? `${pregunta.enunciado.slice(0, 140)}…` : pregunta.enunciado,
      evaluacionesQueLaUsan: Number(filaUnica<{ c: number }>(ev)?.c ?? 0),
      intentosQueLaUsan: Number(filaUnica<{ c: number }>(it)?.c ?? 0),
      respuestasVinculadas: Number(filaUnica<{ c: number }>(re)?.c ?? 0),
    };
  });
}

export async function eliminarPreguntaFila(usuarioActualId: string, id: string): Promise<void> {
  await conSesion(usuarioActualId, async (tx) => {
    await tx.delete(preguntas).where(eq(preguntas.id, id));
  });
}
