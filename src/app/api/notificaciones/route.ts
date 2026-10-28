import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { conSesion } from "@/lib/db/contexto";
import { listarNotificacionesEstudiante, listarNotificacionesStaff } from "@/lib/db/dashboard";
import { perfiles } from "@/lib/db/schema";
import { obtenerUsuarioActual } from "@/lib/firebase/session";

export interface Notificacion {
  id: string;
  titulo: string;
  descripcion: string;
  fecha: string;
  href: string;
}

/**
 * Notificaciones reales (no decorativas): últimos intentos entregados visibles según el rol.
 * RLS ya acota el resultado: un estudiante solo ve sus propios intentos, un docente los de sus
 * cursos, y un admin todos. No hay tabla de notificaciones: se deriva de datos existentes.
 */
export async function GET() {
  const usuario = await obtenerUsuarioActual();
  if (!usuario) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const rol = await conSesion(usuario.uid, async (tx) => {
    const filas = await tx.select({ rol: perfiles.rol }).from(perfiles).where(eq(perfiles.id, usuario.uid)).limit(1);
    return filas[0]?.rol ?? null;
  });
  if (!rol) return NextResponse.json({ notificaciones: [] });

  if (rol === "estudiante") {
    const datos = await listarNotificacionesEstudiante(usuario.uid);
    const notificaciones: Notificacion[] = datos.map((i) => ({
      id: i.id,
      titulo: i.evaluacionNombre ?? "Evaluación",
      descripcion: `Resultado disponible: ${i.porcentajeObtenido ?? 0}% — ${i.aprobado ? "aprobada" : "no aprobada"}`,
      fecha: i.fechaEntrega,
      href: `/estudiante/resultados/${i.id}`,
    }));
    return NextResponse.json({ notificaciones });
  }

  // docente y admin: últimos intentos entregados en su alcance (RLS lo acota)
  const datos = await listarNotificacionesStaff(usuario.uid);
  const notificaciones: Notificacion[] = datos.map((i) => ({
    id: i.id,
    titulo: i.estudianteNombre ? `${i.estudianteNombre} ${i.estudianteApellido}` : "Estudiante",
    descripcion: `${i.evaluacionNombre ?? "Evaluación"} — ${i.porcentajeObtenido ?? 0}%`,
    fecha: i.fechaEntrega,
    href: `/docente/evaluaciones/${i.evaluacionId}`,
  }));
  return NextResponse.json({ notificaciones });
}
