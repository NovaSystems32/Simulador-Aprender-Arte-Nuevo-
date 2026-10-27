import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { conSesion } from "@/lib/db/contexto";
import { evaluaciones, intentoPreguntas, intentos, respuestasEstudiante } from "@/lib/db/schema";
import { aPreguntasPublicas, finalizarIntento } from "@/lib/intentos-server";
import { crearClienteServidor } from "@/lib/supabase/server";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const resultado = await conSesion(user.id, async (tx) => {
    const filasIntento = await tx.select().from(intentos).where(eq(intentos.id, id)).limit(1);
    const intento = filasIntento[0];
    if (!intento || intento.estudianteId !== user.id) {
      return { status: 404 as const, body: { error: "Intento no encontrado." } };
    }

    if (intento.estado === "en_curso") {
      const inicio = intento.fechaInicio ?? new Date();
      const venceEn = inicio.getTime() + intento.tiempoLimiteSegundos * 1000;
      if (Date.now() >= venceEn) {
        const actualizado = await finalizarIntento(tx, id);
        return { status: 200 as const, body: { estado: actualizado.estado, entregadoAutomaticamente: true } };
      }

      const filasEvaluacion = await tx.select().from(evaluaciones).where(eq(evaluaciones.id, intento.evaluacionId)).limit(1);
      const evaluacion = filasEvaluacion[0];

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
        .where(eq(intentoPreguntas.intentoId, id));

      const respuestas = await tx
        .select({
          pregunta_id: respuestasEstudiante.preguntaId,
          opcion_seleccionada: respuestasEstudiante.opcionSeleccionada,
          marcada_para_revisar: respuestasEstudiante.marcadaParaRevisar,
        })
        .from(respuestasEstudiante)
        .where(eq(respuestasEstudiante.intentoId, id));

      return {
        status: 200 as const,
        body: {
          estado: "en_curso",
          evaluacion: {
            nombre: evaluacion?.nombre,
            permitirCalculadora: evaluacion?.permitirCalculadora,
            permitirHojaFormulas: evaluacion?.permitirHojaFormulas,
          },
          tiempoLimiteSegundos: intento.tiempoLimiteSegundos,
          tiempoRestanteSegundos: Math.max(
            0,
            intento.tiempoLimiteSegundos - Math.floor((Date.now() - inicio.getTime()) / 1000)
          ),
          preguntas: aPreguntasPublicas(preguntas),
          respuestas,
        },
      };
    }

    return { status: 200 as const, body: { estado: intento.estado } };
  });

  return NextResponse.json(resultado.body, { status: resultado.status });
}
