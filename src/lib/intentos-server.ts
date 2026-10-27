import "server-only";
import { sql } from "drizzle-orm";
import { eq } from "drizzle-orm";
import type { Tx } from "./db/contexto";
import { intentoPreguntas, intentos, respuestasEstudiante, resultadoDesglose } from "./db/schema";
import { barajarOpciones, ordenarPreguntasIntento, seleccionarPreguntasAutomaticas } from "./randomization";
import { corregirIntento, type PreguntaParaCorregir, type RespuestaParaCorregir } from "./scoring";
import type { Evaluacion, OpcionLetra, Pregunta, PreguntaIntentoPublica } from "./types";

interface FilaPreguntaSql {
  id: string;
  codigo: string;
  enunciado: string;
  recurso_url: string | null;
  recurso_alt: string | null;
  opcion_a: string;
  opcion_b: string;
  opcion_c: string;
  opcion_d: string;
  respuesta_correcta: OpcionLetra;
  explicacion: string;
  eje: Pregunta["eje"];
  contenido: string;
  capacidad: Pregunta["capacidad"];
  dificultad: Pregunta["dificultad"];
  curso_id: string | null;
  autor_id: string | null;
  estado: Pregunta["estado"];
  created_at: Date | string;
  updated_at: Date | string;
}

function preguntaDesdeFilaSql(f: FilaPreguntaSql): Pregunta {
  return {
    ...f,
    created_at: typeof f.created_at === "string" ? f.created_at : f.created_at.toISOString(),
    updated_at: typeof f.updated_at === "string" ? f.updated_at : f.updated_at.toISOString(),
  };
}

function filas<T>(resultado: unknown): T[] {
  return (resultado as { rows: T[] }).rows;
}

/**
 * Arma el snapshot inmutable de preguntas (con opciones ya barajadas) para
 * un nuevo intento. Lee el banco completo (automática) o las preguntas de
 * la evaluación (manual) a través de dos funciones SECURITY DEFINER (ver
 * db/migrations/0004_snapshot_examen.sql) porque quien dispara esto suele
 * ser un estudiante, que no tiene ningún acceso de lectura directo a
 * `preguntas` ni a `evaluacion_preguntas`.
 */
export async function armarSnapshotPreguntas(
  tx: Tx,
  evaluacion: Evaluacion
): Promise<
  {
    pregunta_id: string;
    orden: number;
    enunciado: string;
    recurso_url: string | null;
    recurso_alt: string | null;
    opciones: { letra: OpcionLetra; texto: string }[];
    respuesta_correcta: OpcionLetra;
    explicacion: string;
    eje: Pregunta["eje"];
    contenido: string;
    capacidad: Pregunta["capacidad"];
    dificultad: Pregunta["dificultad"];
  }[]
> {
  let preguntasBase: Pregunta[] = [];

  if (evaluacion.tipo === "automatica") {
    if (!evaluacion.config_automatica) {
      throw new Error("La evaluación automática no tiene configurada la distribución de preguntas.");
    }
    const resultado = await tx.execute(sql`select * from preguntas_activas_para_snapshot()`);
    const banco = filas<FilaPreguntaSql>(resultado).map(preguntaDesdeFilaSql);

    const { preguntas, errores } = seleccionarPreguntasAutomaticas(banco, evaluacion.config_automatica);
    if (errores.length > 0) {
      throw new Error(
        `No hay suficientes preguntas activas para armar la evaluación: ${errores
          .map((e) => `${e.eje} (pide ${e.solicitadas}, hay ${e.disponibles})`)
          .join(", ")}`
      );
    }
    preguntasBase = preguntas;
  } else {
    const resultado = await tx.execute(
      sql`select * from preguntas_de_evaluacion_para_snapshot(${evaluacion.id})`
    );
    preguntasBase = filas<FilaPreguntaSql>(resultado).map(preguntaDesdeFilaSql);
  }

  const ordenadas = ordenarPreguntasIntento(preguntasBase, evaluacion.orden_aleatorio_preguntas);

  return ordenadas.map((pregunta, indice) => {
    const opcionesBarajadas = barajarOpciones(pregunta, evaluacion.orden_aleatorio_opciones);
    const nuevaLetraCorrecta = opcionesBarajadas.find(
      (o) => o.letraOriginal === pregunta.respuesta_correcta
    )!.letra;

    return {
      pregunta_id: pregunta.id,
      orden: indice + 1,
      enunciado: pregunta.enunciado,
      recurso_url: pregunta.recurso_url,
      recurso_alt: pregunta.recurso_alt,
      opciones: opcionesBarajadas.map((o) => ({ letra: o.letra, texto: o.texto })),
      respuesta_correcta: nuevaLetraCorrecta,
      explicacion: pregunta.explicacion,
      eje: pregunta.eje,
      contenido: pregunta.contenido,
      capacidad: pregunta.capacidad,
      dificultad: pregunta.dificultad,
    };
  });
}

/** Convierte las filas de intento_preguntas (con la respuesta correcta) a la versión pública que ve el estudiante. */
export function aPreguntasPublicas(
  filas: {
    pregunta_id: string;
    orden: number;
    enunciado: string;
    recurso_url: string | null;
    recurso_alt: string | null;
    opciones: { letra: OpcionLetra; texto: string }[];
    eje: Pregunta["eje"];
  }[]
): PreguntaIntentoPublica[] {
  return filas
    .slice()
    .sort((a, b) => a.orden - b.orden)
    .map((f) => ({
      pregunta_id: f.pregunta_id,
      orden: f.orden,
      enunciado: f.enunciado,
      recurso_url: f.recurso_url,
      recurso_alt: f.recurso_alt,
      opciones: f.opciones,
      eje: f.eje,
    }));
}

/**
 * Corrige un intento en curso (o vencido) y persiste el resultado. Es
 * idempotente: si ya estaba entregado, no lo vuelve a corregir.
 */
export async function finalizarIntento(tx: Tx, intentoId: string) {
  const filasIntento = await tx.select().from(intentos).where(eq(intentos.id, intentoId)).limit(1);
  const intento = filasIntento[0];
  if (!intento) throw new Error("Intento no encontrado.");
  if (intento.estado === "entregado" || intento.estado === "expirado") return intento;

  const evaluacionResultado = await tx.execute(
    sql`select puntaje_aprobacion, descuento_por_incorrecta from evaluaciones where id = ${intento.evaluacionId}`
  );
  const evaluacion = filas<{ puntaje_aprobacion: string; descuento_por_incorrecta: boolean }>(
    evaluacionResultado
  )[0];
  if (!evaluacion) throw new Error("Evaluación no encontrada.");

  const preguntasIntento = await tx
    .select({
      preguntaId: intentoPreguntas.preguntaId,
      respuestaCorrecta: intentoPreguntas.respuestaCorrecta,
      eje: intentoPreguntas.eje,
      contenido: intentoPreguntas.contenido,
      capacidad: intentoPreguntas.capacidad,
      dificultad: intentoPreguntas.dificultad,
    })
    .from(intentoPreguntas)
    .where(eq(intentoPreguntas.intentoId, intentoId));

  const respuestas = await tx
    .select({
      preguntaId: respuestasEstudiante.preguntaId,
      opcionSeleccionada: respuestasEstudiante.opcionSeleccionada,
    })
    .from(respuestasEstudiante)
    .where(eq(respuestasEstudiante.intentoId, intentoId));

  const resultado = corregirIntento(
    preguntasIntento.map((p) => ({
      pregunta_id: p.preguntaId,
      respuesta_correcta: p.respuestaCorrecta,
      eje: p.eje,
      contenido: p.contenido,
      capacidad: p.capacidad,
      dificultad: p.dificultad,
    })) as PreguntaParaCorregir[],
    respuestas.map((r) => ({
      pregunta_id: r.preguntaId,
      opcion_seleccionada: r.opcionSeleccionada,
    })) as RespuestaParaCorregir[],
    {
      puntajeAprobacion: Number(evaluacion.puntaje_aprobacion),
      descuentoPorIncorrecta: evaluacion.descuento_por_incorrecta,
    }
  );

  const ahora = new Date();
  const inicio = intento.fechaInicio ?? ahora;
  const tiempoUtilizado = Math.min(
    Math.round((ahora.getTime() - inicio.getTime()) / 1000),
    intento.tiempoLimiteSegundos
  );

  const seVencio = ahora.getTime() - inicio.getTime() > intento.tiempoLimiteSegundos * 1000 + 5000;

  const filasActualizado = await tx
    .update(intentos)
    .set({
      estado: seVencio ? "expirado" : "entregado",
      fechaEntrega: ahora,
      tiempoUtilizadoSegundos: tiempoUtilizado,
      puntajeObtenido: String(resultado.puntaje_obtenido),
      porcentajeObtenido: String(resultado.porcentaje_obtenido),
      correctas: resultado.correctas,
      incorrectas: resultado.incorrectas,
      sinResponder: resultado.sin_responder,
      aprobado: resultado.aprobado,
    })
    .where(eq(intentos.id, intentoId))
    .returning();

  await tx.delete(resultadoDesglose).where(eq(resultadoDesglose.intentoId, intentoId));
  if (resultado.desglose.length > 0) {
    await tx.insert(resultadoDesglose).values(
      resultado.desglose.map((d) => ({
        intentoId,
        tipoAgrupacion: d.tipo_agrupacion,
        clave: d.clave,
        correctas: d.correctas,
        total: d.total,
        porcentaje: String(d.porcentaje),
      }))
    );
  }

  return filasActualizado[0];
}
