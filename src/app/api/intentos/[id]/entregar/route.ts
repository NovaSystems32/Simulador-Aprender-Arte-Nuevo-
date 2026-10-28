import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { conSesion } from "@/lib/db/contexto";
import { evaluaciones, intentos } from "@/lib/db/schema";
import { finalizarIntento } from "@/lib/intentos-server";
import { obtenerUsuarioActual } from "@/lib/firebase/session";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const usuario = await obtenerUsuarioActual();
  if (!usuario) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const resultado = await conSesion(usuario.uid, async (tx) => {
    const filasIntento = await tx.select().from(intentos).where(eq(intentos.id, id)).limit(1);
    const intento = filasIntento[0];
    if (!intento || intento.estudianteId !== usuario.uid) {
      return { status: 404 as const, body: { error: "Intento no encontrado." } };
    }

    const actualizado = await finalizarIntento(tx, id);
    const filasEvaluacion = await tx
      .select({ mostrarResultadoInmediato: evaluaciones.mostrarResultadoInmediato })
      .from(evaluaciones)
      .where(eq(evaluaciones.id, actualizado.evaluacionId))
      .limit(1);

    return {
      status: 200 as const,
      body: {
        estado: actualizado.estado,
        mostrarResultado: filasEvaluacion[0]?.mostrarResultadoInmediato ?? true,
        porcentajeObtenido: actualizado.porcentajeObtenido != null ? Number(actualizado.porcentajeObtenido) : null,
        correctas: actualizado.correctas,
        incorrectas: actualizado.incorrectas,
        sinResponder: actualizado.sinResponder,
        aprobado: actualizado.aprobado,
      },
    };
  });

  return NextResponse.json(resultado.body, { status: resultado.status });
}
