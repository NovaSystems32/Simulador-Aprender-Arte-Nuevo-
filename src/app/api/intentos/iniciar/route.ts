import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { conSesion, type Tx } from "@/lib/db/contexto";
import { evaluaciones, intentoPreguntas, intentos, perfiles, respuestasEstudiante } from "@/lib/db/schema";
import { evaluacionDesdeFila } from "@/lib/db/evaluaciones";
import { aPreguntasPublicas, armarSnapshotPreguntas, finalizarIntento } from "@/lib/intentos-server";
import { crearClienteServidor } from "@/lib/supabase/server";
import type { Evaluacion } from "@/lib/types";

export async function POST(request: Request) {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const evaluacionId = body?.evaluacionId as string | undefined;
  if (!evaluacionId) return NextResponse.json({ error: "Falta evaluacionId." }, { status: 400 });

  try {
    const resultado = await conSesion(user.id, async (tx) => {
      const filasPerfil = await tx
        .select({ rol: perfiles.rol, activo: perfiles.activo })
        .from(perfiles)
        .where(eq(perfiles.id, user.id))
        .limit(1);
      const perfil = filasPerfil[0];
      if (!perfil || !perfil.activo || perfil.rol !== "estudiante") {
        return { status: 403 as const, body: { error: "Solo los estudiantes pueden rendir evaluaciones." } };
      }

      // La propia política RLS de `evaluaciones` (es_estudiante_de_curso u
      // originada vía `asignaciones`) ya hace cumplir "esta evaluación está
      // asignada a mi curso": si no hay fila, el estudiante no tiene acceso
      // (o no existe). Por eso no hace falta una verificación manual aparte.
      const filasEvaluacion = await tx.select().from(evaluaciones).where(eq(evaluaciones.id, evaluacionId)).limit(1);
      const evFila = filasEvaluacion[0];
      if (!evFila) {
        return { status: 404 as const, body: { error: "La evaluación no está disponible." } };
      }
      const ev: Evaluacion = evaluacionDesdeFila(evFila);
      if (ev.estado !== "publicada") {
        return { status: 404 as const, body: { error: "La evaluación no está disponible." } };
      }

      const ahora = new Date();
      if (ev.fecha_apertura && ahora < new Date(ev.fecha_apertura)) {
        return { status: 403 as const, body: { error: "La evaluación todavía no está abierta." } };
      }
      if (ev.fecha_cierre && ahora > new Date(ev.fecha_cierre)) {
        return { status: 403 as const, body: { error: "La evaluación ya cerró." } };
      }

      const intentosPrevios = await tx
        .select()
        .from(intentos)
        .where(and(eq(intentos.evaluacionId, ev.id), eq(intentos.estudianteId, user.id)))
        .orderBy(desc(intentos.numeroIntento));

      const enCurso = intentosPrevios.find((i) => i.estado === "en_curso");
      if (enCurso) {
        const inicio = enCurso.fechaInicio ?? enCurso.createdAt;
        const venceEn = inicio.getTime() + enCurso.tiempoLimiteSegundos * 1000;
        if (ahora.getTime() < venceEn) {
          return { status: 200 as const, body: await construirRespuestaIntento(tx, enCurso.id, ev) };
        }
        await finalizarIntento(tx, enCurso.id);
      }

      const finalizados = intentosPrevios.filter((i) => i.estado === "entregado" || i.estado === "expirado");
      if (finalizados.length >= ev.intentos_max) {
        return {
          status: 403 as const,
          body: { error: "Ya usaste todos los intentos disponibles para esta evaluación." },
        };
      }

      let snapshot;
      try {
        snapshot = await armarSnapshotPreguntas(tx, ev);
      } catch (e) {
        return {
          status: 500 as const,
          body: { error: e instanceof Error ? e.message : "Error armando la evaluación." },
        };
      }

      const filasNuevoIntento = await tx
        .insert(intentos)
        .values({
          evaluacionId: ev.id,
          estudianteId: user.id,
          numeroIntento: finalizados.length + 1,
          estado: "en_curso",
          fechaInicio: ahora,
          tiempoLimiteSegundos: ev.duracion_minutos * 60,
        })
        .returning();
      const nuevoIntento = filasNuevoIntento[0];

      await tx.insert(intentoPreguntas).values(
        snapshot.map((s) => ({
          intentoId: nuevoIntento.id,
          preguntaId: s.pregunta_id,
          orden: s.orden,
          enunciado: s.enunciado,
          recursoUrl: s.recurso_url,
          recursoAlt: s.recurso_alt,
          opciones: s.opciones,
          respuestaCorrecta: s.respuesta_correcta,
          explicacion: s.explicacion,
          eje: s.eje,
          contenido: s.contenido,
          capacidad: s.capacidad,
          dificultad: s.dificultad,
        }))
      );

      return { status: 200 as const, body: await construirRespuestaIntento(tx, nuevoIntento.id, ev) };
    });

    return NextResponse.json(resultado.body, { status: resultado.status });
  } catch (err) {
    const detalle = err instanceof Error ? err.message : "error desconocido";
    return NextResponse.json({ error: `No se pudo iniciar el intento: ${detalle}` }, { status: 500 });
  }
}

async function construirRespuestaIntento(tx: Tx, intentoId: string, evaluacion: Evaluacion) {
  const filasIntento = await tx.select().from(intentos).where(eq(intentos.id, intentoId)).limit(1);
  const intento = filasIntento[0];

  const preguntas = await tx
    .select({
      pregunta_id: intentoPreguntas.preguntaId,
      orden: intentoPreguntas.orden,
      enunciado: intentoPreguntas.enunciado,
      recurso_url: intentoPreguntas.recursoUrl,
      recurso_alt: intentoPreguntas.recursoAlt,
      opciones: intentoPreguntas.opciones,
      eje: intentoPreguntas.eje,
    })
    .from(intentoPreguntas)
    .where(eq(intentoPreguntas.intentoId, intentoId));

  const respuestas = await tx
    .select({
      pregunta_id: respuestasEstudiante.preguntaId,
      opcion_seleccionada: respuestasEstudiante.opcionSeleccionada,
      marcada_para_revisar: respuestasEstudiante.marcadaParaRevisar,
    })
    .from(respuestasEstudiante)
    .where(eq(respuestasEstudiante.intentoId, intentoId));

  const inicio = intento.fechaInicio ?? new Date();
  const tiempoRestante = Math.max(
    0,
    intento.tiempoLimiteSegundos - Math.floor((Date.now() - inicio.getTime()) / 1000)
  );

  return {
    intentoId,
    evaluacion: {
      nombre: evaluacion.nombre,
      permitirCalculadora: evaluacion.permitir_calculadora,
      permitirHojaFormulas: evaluacion.permitir_hoja_formulas,
    },
    tiempoLimiteSegundos: intento.tiempoLimiteSegundos,
    tiempoRestanteSegundos: tiempoRestante,
    preguntas: aPreguntasPublicas(preguntas),
    respuestas,
  };
}
