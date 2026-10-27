import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { obtenerPerfilActual } from "@/lib/auth";
import {
  listarCursosDeEstudianteParaReporte,
  listarDesglosePorIntentos,
  listarIntentosDeEstudianteParaReporte,
  listarPreguntasDeIntentos,
  listarRespuestasDeIntentos,
  obtenerEstudiantePorId,
} from "@/lib/db/reportes";
import { EJES, CAPACIDADES, DIFICULTADES } from "@/lib/types";
import { ETIQUETA_ESTADO_INTENTO } from "@/lib/reportes";

const ETIQUETA_EJE = Object.fromEntries(EJES.map((e) => [e.value, e.label]));
const ETIQUETA_CAPACIDAD = Object.fromEntries(CAPACIDADES.map((c) => [c.value, c.label]));
const ETIQUETA_DIFICULTAD = Object.fromEntries(DIFICULTADES.map((d) => [d.value, d.label]));

const ESTILO_ENCABEZADO = {
  font: { bold: true, color: { argb: "FFFFFFFF" } },
  fill: { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FF174277" } },
};

function encabezar(hoja: ExcelJS.Worksheet) {
  hoja.getRow(1).eachCell((c) => Object.assign(c, ESTILO_ENCABEZADO));
  hoja.views = [{ state: "frozen", ySplit: 1 }];
  if (hoja.rowCount > 0 && hoja.columnCount > 0) {
    hoja.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: hoja.columnCount } };
  }
}

export async function GET(request: Request) {
  const perfil = await obtenerPerfilActual();
  if (!perfil) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  if (!perfil.activo || (perfil.rol !== "docente" && perfil.rol !== "admin")) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const estudianteId = searchParams.get("estudiante");
  const evaluacionFiltro = searchParams.get("evaluacion");
  if (!estudianteId) return NextResponse.json({ error: "Falta indicar el estudiante." }, { status: 400 });

  // RLS (`perfiles_select`) ya exige que, si quien pide esto es docente (no
  // admin), comparta al menos un curso con el estudiante: si no, esta
  // lectura devuelve null, igual que si el estudiante no existiera.
  const estudiante = await obtenerEstudiantePorId(perfil.id, estudianteId);
  if (!estudiante || estudiante.rol !== "estudiante") {
    return NextResponse.json({ error: "No se encontró el estudiante (o no pertenece a tus cursos)." }, { status: 404 });
  }

  const listaIntentos = await listarIntentosDeEstudianteParaReporte(perfil.id, estudianteId, evaluacionFiltro);

  const finalizados = listaIntentos.filter((i) => i.estado === "entregado" || i.estado === "expirado");
  const idsFinalizados = finalizados.map((i) => i.id);

  let desglose: { intento_id: string; tipo_agrupacion: string; clave: string; correctas: number; total: number }[] = [];
  let detallePreguntas: Awaited<ReturnType<typeof listarPreguntasDeIntentos>> = [];
  let respuestasPorIntentoYPregunta = new Map<string, string | null>();

  if (idsFinalizados.length > 0) {
    const [desgloseData, preguntasData, respuestasData] = await Promise.all([
      listarDesglosePorIntentos(perfil.id, idsFinalizados),
      listarPreguntasDeIntentos(perfil.id, idsFinalizados),
      listarRespuestasDeIntentos(perfil.id, idsFinalizados),
    ]);
    desglose = desgloseData;
    detallePreguntas = preguntasData;
    respuestasPorIntentoYPregunta = new Map(
      respuestasData.map((r) => [`${r.intento_id}::${r.pregunta_id}`, r.opcion_seleccionada])
    );
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Simulador Aprender Arte Nuevo";
  workbook.created = new Date();

  const datos = workbook.addWorksheet("Datos del estudiante");
  datos.columns = [
    { header: "Campo", key: "campo", width: 22 },
    { header: "Valor", key: "valor", width: 34 },
  ];
  const cursosEstudiante = await listarCursosDeEstudianteParaReporte(perfil.id, estudianteId);
  const cursosTexto = cursosEstudiante.map((c) => `${c.nombre} "${c.division}"`).join(", ");
  datos.addRows([
    { campo: "Nombre", valor: estudiante.nombre },
    { campo: "Apellido", valor: estudiante.apellido },
    { campo: "Correo", valor: estudiante.email },
    { campo: "Curso(s)", valor: cursosTexto || "Sin curso" },
    { campo: "Generado el", valor: new Date() },
  ]);
  datos.getCell("B5").numFmt = "dd/mm/yyyy hh:mm";
  datos.getRow(1).font = { bold: true };

  const hojaResultados = workbook.addWorksheet("Resultados");
  hojaResultados.columns = [
    { header: "Evaluación", key: "evaluacion", width: 32 },
    { header: "Curso", key: "curso", width: 20 },
    { header: "Intento N°", key: "intento", width: 10 },
    { header: "Estado", key: "estado", width: 22 },
    { header: "Fecha de realización", key: "fecha", width: 20 },
    { header: "Puntaje", key: "puntaje", width: 12 },
    { header: "Porcentaje", key: "porcentaje", width: 12 },
    { header: "Correctas", key: "correctas", width: 12 },
    { header: "Incorrectas", key: "incorrectas", width: 12 },
    { header: "Sin responder", key: "sin_responder", width: 14 },
    { header: "Aprobado", key: "aprobado", width: 12 },
    { header: "Tiempo utilizado (min)", key: "tiempo", width: 18 },
  ];
  for (const i of listaIntentos) {
    hojaResultados.addRow({
      evaluacion: i.evaluacion_nombre ?? "—",
      curso: i.curso_nombre ? `${i.curso_nombre} "${i.curso_division}"` : "—",
      intento: i.numero_intento,
      estado: ETIQUETA_ESTADO_INTENTO[i.estado] ?? i.estado,
      fecha: i.fecha_entrega ? new Date(i.fecha_entrega) : i.fecha_inicio ? new Date(i.fecha_inicio) : "—",
      puntaje: i.puntaje_obtenido ?? "—",
      porcentaje: i.porcentaje_obtenido ?? "—",
      correctas: i.correctas ?? "—",
      incorrectas: i.incorrectas ?? "—",
      sin_responder: i.sin_responder ?? "—",
      aprobado: i.estado === "en_curso" ? "—" : i.aprobado ? "Sí" : "No",
      tiempo: i.tiempo_utilizado_segundos ? Math.round(i.tiempo_utilizado_segundos / 60) : "—",
    });
  }
  hojaResultados.getColumn("porcentaje").numFmt = '0.00"%"';
  hojaResultados.getColumn("fecha").numFmt = "dd/mm/yyyy hh:mm";
  encabezar(hojaResultados);

  const hojaContenidos = workbook.addWorksheet("Contenidos");
  hojaContenidos.columns = [
    { header: "Agrupación", key: "agrupacion", width: 16 },
    { header: "Detalle", key: "detalle", width: 34 },
    { header: "Correctas", key: "correctas", width: 12 },
    { header: "Total", key: "total", width: 12 },
    { header: "Porcentaje de acierto", key: "porcentaje", width: 20 },
  ];
  const etiquetasPorTipo: Record<string, Record<string, string>> = {
    eje: ETIQUETA_EJE,
    capacidad: ETIQUETA_CAPACIDAD,
    dificultad: ETIQUETA_DIFICULTAD,
  };
  for (const tipo of ["eje", "contenido", "capacidad", "dificultad"] as const) {
    const acumulado = new Map<string, { correctas: number; total: number }>();
    for (const d of desglose.filter((f) => f.tipo_agrupacion === tipo)) {
      const actual = acumulado.get(d.clave) ?? { correctas: 0, total: 0 };
      actual.correctas += d.correctas;
      actual.total += d.total;
      acumulado.set(d.clave, actual);
    }
    for (const [clave, v] of acumulado) {
      hojaContenidos.addRow({
        agrupacion: tipo === "eje" ? "Eje" : tipo === "contenido" ? "Contenido" : tipo === "capacidad" ? "Capacidad" : "Dificultad",
        detalle: etiquetasPorTipo[tipo]?.[clave] ?? clave,
        correctas: v.correctas,
        total: v.total,
        porcentaje: v.total === 0 ? 0 : Math.round((v.correctas / v.total) * 10000) / 100,
      });
    }
  }
  hojaContenidos.getColumn("porcentaje").numFmt = '0.00"%"';
  encabezar(hojaContenidos);

  const hojaDetalle = workbook.addWorksheet("Detalle de preguntas");
  hojaDetalle.columns = [
    { header: "Evaluación", key: "evaluacion", width: 28 },
    { header: "Intento N°", key: "intento", width: 10 },
    { header: "N° pregunta", key: "orden", width: 12 },
    { header: "Enunciado", key: "enunciado", width: 55 },
    { header: "Respuesta seleccionada", key: "seleccionada", width: 18 },
    { header: "Respuesta correcta", key: "correcta", width: 16 },
    { header: "¿Acertó?", key: "acerto", width: 10 },
    { header: "Eje", key: "eje", width: 20 },
    { header: "Contenido", key: "contenido", width: 24 },
    { header: "Capacidad", key: "capacidad", width: 24 },
    { header: "Dificultad", key: "dificultad", width: 12 },
  ];
  const evaluacionPorIntento = new Map(
    listaIntentos.map((i) => [i.id, { nombre: i.evaluacion_nombre ?? "—", numero: i.numero_intento }])
  );
  for (const pi of detallePreguntas) {
    const seleccionada = respuestasPorIntentoYPregunta.get(`${pi.intento_id}::${pi.pregunta_id}`) ?? null;
    const ev = evaluacionPorIntento.get(pi.intento_id);
    hojaDetalle.addRow({
      evaluacion: ev?.nombre ?? "—",
      intento: ev?.numero ?? "—",
      orden: pi.orden,
      enunciado: pi.enunciado,
      seleccionada: seleccionada ?? "Sin responder",
      correcta: pi.respuesta_correcta,
      acerto: seleccionada === pi.respuesta_correcta ? "Sí" : "No",
      eje: ETIQUETA_EJE[pi.eje as keyof typeof ETIQUETA_EJE] ?? pi.eje,
      contenido: pi.contenido,
      capacidad: ETIQUETA_CAPACIDAD[pi.capacidad as keyof typeof ETIQUETA_CAPACIDAD] ?? pi.capacidad,
      dificultad: ETIQUETA_DIFICULTAD[pi.dificultad as keyof typeof ETIQUETA_DIFICULTAD] ?? pi.dificultad,
    });
  }
  encabezar(hojaDetalle);

  const buffer = await workbook.xlsx.writeBuffer();
  const nombreArchivo = `${estudiante.apellido}-${estudiante.nombre}-resultados.xlsx`.replace(/\s+/g, "-");

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${nombreArchivo}"`,
    },
  });
}
