import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { conSesion } from "@/lib/db/contexto";
import { intentoPreguntas, intentos, respuestasEstudiante } from "@/lib/db/schema";
import { finalizarIntento } from "@/lib/intentos-server";
import { obtenerUsuarioActual } from "@/lib/firebase/session";
import type { OpcionLetra } from "@/lib/types";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const usuario = await obtenerUsuarioActual();
  if (!usuario) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const preguntaId = body?.preguntaId as string | undefined;
  const opcionSeleccionada = (body?.opcionSeleccionada ?? null) as OpcionLetra | null;
  const marcadaParaRevisar = Boolean(body?.marcadaParaRevisar);
  if (!preguntaId) return NextResponse.json({ error: "Falta preguntaId." }, { status: 400 });

  const resultado = await conSesion(usuario.uid, async (tx) => {
    const filasIntento = await tx.select().from(intentos).where(eq(intentos.id, id)).limit(1);
    const intento = filasIntento[0];
    if (!intento || intento.estudianteId !== usuario.uid) {
      return { status: 404 as const, body: { error: "Intento no encontrado." } };
    }
    if (intento.estado !== "en_curso") {
      return { status: 409 as const, body: { error: "Este intento ya fue entregado." } };
    }

    const inicio = intento.fechaInicio ?? new Date();
    if (Date.now() >= inicio.getTime() + intento.tiempoLimiteSegundos * 1000) {
      await finalizarIntento(tx, id);
      return { status: 409 as const, body: { error: "El tiempo de la evaluación se agotó." } };
    }

    const filasPreguntaValida = await tx
      .select({ id: intentoPreguntas.id })
      .from(intentoPreguntas)
      .where(and(eq(intentoPreguntas.intentoId, id), eq(intentoPreguntas.preguntaId, preguntaId)))
      .limit(1);
    if (!filasPreguntaValida[0]) {
      return { status: 400 as const, body: { error: "Esa pregunta no pertenece a este intento." } };
    }

    await tx
      .insert(respuestasEstudiante)
      .values({
        intentoId: id,
        preguntaId,
        opcionSeleccionada,
        marcadaParaRevisar,
        respondidaEn: new Date(),
      })
      .onConflictDoUpdate({
        target: [respuestasEstudiante.intentoId, respuestasEstudiante.preguntaId],
        set: { opcionSeleccionada, marcadaParaRevisar, respondidaEn: new Date() },
      });

    return { status: 200 as const, body: { ok: true } };
  });

  return NextResponse.json(resultado.body, { status: resultado.status });
}
