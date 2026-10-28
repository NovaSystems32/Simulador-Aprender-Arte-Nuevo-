import { NextResponse } from "next/server";
import { listarIntentosReporte } from "@/lib/db/reportes";
import { obtenerUsuarioActual } from "@/lib/firebase/session";
import { generarCsv } from "@/lib/csv";

export async function GET(request: Request) {
  const usuario = await obtenerUsuarioActual();
  if (!usuario) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const cursoId = searchParams.get("curso");
  const evaluacionId = searchParams.get("evaluacion");

  const data = await listarIntentosReporte(usuario.uid, { cursoId, evaluacionId });

  const filas = data.map((f) => ({
    estudiante: `${f.estudiante?.nombre ?? ""} ${f.estudiante?.apellido ?? ""}`.trim(),
    email: f.estudiante?.email ?? "",
    evaluacion: f.evaluacion?.nombre ?? "",
    curso: f.evaluacion?.curso ? `${f.evaluacion.curso.nombre} ${f.evaluacion.curso.division}` : "",
    intento: f.numero_intento,
    estado: f.estado,
    correctas: f.correctas ?? 0,
    incorrectas: f.incorrectas ?? 0,
    sin_responder: f.sin_responder ?? 0,
    porcentaje: f.porcentaje_obtenido ?? 0,
    aprobado: f.aprobado ? "Sí" : "No",
    tiempo_minutos: f.tiempo_utilizado_segundos ? Math.round(f.tiempo_utilizado_segundos / 60) : 0,
    fecha_entrega: f.fecha_entrega ?? "",
  }));

  const csv = generarCsv(filas, [
    { clave: "estudiante", encabezado: "Estudiante" },
    { clave: "email", encabezado: "Correo" },
    { clave: "evaluacion", encabezado: "Evaluación" },
    { clave: "curso", encabezado: "Curso" },
    { clave: "intento", encabezado: "N° intento" },
    { clave: "estado", encabezado: "Estado" },
    { clave: "correctas", encabezado: "Correctas" },
    { clave: "incorrectas", encabezado: "Incorrectas" },
    { clave: "sin_responder", encabezado: "Sin responder" },
    { clave: "porcentaje", encabezado: "Porcentaje" },
    { clave: "aprobado", encabezado: "Aprobado" },
    { clave: "tiempo_minutos", encabezado: "Tiempo (min)" },
    { clave: "fecha_entrega", encabezado: "Fecha de entrega" },
  ]);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="reporte.csv"`,
    },
  });
}
