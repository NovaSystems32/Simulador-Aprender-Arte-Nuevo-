import { asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { conSesion } from "@/lib/db/contexto";
import { evaluaciones, intentoPreguntas, intentos, respuestasEstudiante } from "@/lib/db/schema";
import { obtenerUsuarioActual } from "@/lib/firebase/session";

/**
 * Devuelve las preguntas de un intento YA ENTREGADO junto con la respuesta
 * correcta y la explicación, para la revisión post-entrega. Solo accesible
 * si la evaluación tiene permitir_revision habilitado.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const usuario = await obtenerUsuarioActual();
  if (!usuario) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const resultado = await conSesion(usuario.uid, async (tx) => {
    const filasIntento = await tx.select().from(intentos).where(eq(intentos.id, id)).limit(1);
    const intento = filasIntento[0];
    if (!intento || intento.estudianteId !== usuario.uid) {
      return { status: 404 as const, body: { error: "Intento no encontrado." } };
    }
    if (intento.estado !== "entregado" && intento.estado !== "expirado") {
      return { status: 403 as const, body: { error: "La evaluación todavía no fue entregada." } };
    }

    const filasEvaluacion = await tx
      .select({ permitirRevision: evaluaciones.permitirRevision, mostrarResoluciones: evaluaciones.mostrarResoluciones })
      .from(evaluaciones)
      .where(eq(evaluaciones.id, intento.evaluacionId))
      .limit(1);
    const evaluacion = filasEvaluacion[0];
    if (!evaluacion?.permitirRevision) {
      return { status: 403 as const, body: { error: "El/la docente no habilitó la revisión de esta evaluación." } };
    }

    const preguntas = await tx
      .select({
        pregunta_id: intentoPreguntas.preguntaId,
        orden: intentoPreguntas.orden,
        enunciado: intentoPreguntas.enunciado,
        recurso_url: intentoPreguntas.recursoUrl,
        recurso_alt: intentoPreguntas.recursoAlt,
        opciones: intentoPreguntas.opciones,
        respuesta_correcta: intentoPreguntas.respuestaCorrecta,
        explicacion: intentoPreguntas.explicacion,
        contenido: intentoPreguntas.contenido,
      })
      .from(intentoPreguntas)
      .where(eq(intentoPreguntas.intentoId, id))
      .orderBy(asc(intentoPreguntas.orden));

    const respuestas = await tx
      .select({ preguntaId: respuestasEstudiante.preguntaId, opcionSeleccionada: respuestasEstudiante.opcionSeleccionada })
      .from(respuestasEstudiante)
      .where(eq(respuestasEstudiante.intentoId, id));

    const respuestaPorPregunta = new Map(respuestas.map((r) => [r.preguntaId, r.opcionSeleccionada]));

    return {
      status: 200 as const,
      body: {
        mostrarResoluciones: evaluacion.mostrarResoluciones,
        preguntas: preguntas.map((p) => ({
          ...p,
          respuesta_seleccionada: respuestaPorPregunta.get(p.pregunta_id) ?? null,
          explicacion: evaluacion.mostrarResoluciones ? p.explicacion : null,
        })),
      },
    };
  });

  return NextResponse.json(resultado.body, { status: resultado.status });
}
