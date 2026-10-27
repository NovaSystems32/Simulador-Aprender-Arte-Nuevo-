import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { obtenerPerfilActual } from "@/lib/auth";
import {
  listarDesglosePorIntentos,
  listarEstudiantesDeCursos,
  listarInfoPreguntas,
  listarIntentosPorEvaluacionesYEstudiantes,
  listarNombresEvaluaciones,
  listarPreguntasDeIntentos,
  listarRespuestasDeIntentos,
  resolverAlcanceReporte,
} from "@/lib/db/reportes";
import { CAPACIDADES, DIFICULTADES, EJES } from "@/lib/types";
import { agregarPorTipo, calcularEstadisticas, calcularPreguntasConMasErrores, ETIQUETA_ESTADO_INTENTO } from "@/lib/reportes";
import type { Intento } from "@/lib/types";

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
  const cursoId = searchParams.get("curso");
  const evaluacionId = searchParams.get("evaluacion");
  if (!cursoId && !evaluacionId) {
    return NextResponse.json({ error: "Indicá un curso o una evaluación." }, { status: 400 });
  }

  const alcance = await resolverAlcanceReporte(perfil.id, { cursoId, evaluacionId });
  if ("error" in alcance) return NextResponse.json({ error: alcance.error }, { status: alcance.status });
  const { evaluacionIds, cursoIdsInvolucrados, tituloReporte } = alcance;
  if (evaluacionIds.length === 0) {
    return NextResponse.json({ error: "No hay evaluaciones para exportar con ese filtro." }, { status: 404 });
  }

  const [estudiantes, nombreEvaluacion] = await Promise.all([
    listarEstudiantesDeCursos(perfil.id, cursoIdsInvolucrados),
    listarNombresEvaluaciones(perfil.id, evaluacionIds),
  ]);

  const todosLosIntentos: Intento[] = await listarIntentosPorEvaluacionesYEstudiantes(
    perfil.id,
    evaluacionIds,
    estudiantes.map((e) => e.id)
  );

  // Un estudiante puede tener varios intentos por evaluación: se toma el
  // "representativo" (entregado > expirado > en_curso, y dentro de un mismo
  // estado el número de intento más alto) para la fila de resumen por
  // estudiante — el detalle completo de intentos no se pierde, solo se
  // resume acá para que cada fila sea un estudiante×evaluación.
  const PRIORIDAD_ESTADO: Record<string, number> = { entregado: 3, expirado: 2, en_curso: 1, no_iniciado: 0 };
  const representativoPorPar = new Map<string, Intento>();
  for (const intento of todosLosIntentos) {
    const clave = `${intento.estudiante_id}::${intento.evaluacion_id}`;
    const actual = representativoPorPar.get(clave);
    if (
      !actual ||
      PRIORIDAD_ESTADO[intento.estado] > PRIORIDAD_ESTADO[actual.estado] ||
      (PRIORIDAD_ESTADO[intento.estado] === PRIORIDAD_ESTADO[actual.estado] &&
        intento.numero_intento > actual.numero_intento)
    ) {
      representativoPorPar.set(clave, intento);
    }
  }

  const finalizados = todosLosIntentos.filter((i) => i.estado === "entregado" || i.estado === "expirado");
  const stats = calcularEstadisticas(finalizados);

  const idsIntentosFinalizados = finalizados.map((i) => i.id);
  let desglose: { tipo_agrupacion: string; clave: string; correctas: number; total: number }[] = [];
  let preguntasError: ReturnType<typeof calcularPreguntasConMasErrores> = [];
  if (idsIntentosFinalizados.length > 0) {
    const [desgloseData, preguntasIntento, respuestas, infoPorId] = await Promise.all([
      listarDesglosePorIntentos(perfil.id, idsIntentosFinalizados),
      listarPreguntasDeIntentos(perfil.id, idsIntentosFinalizados),
      listarRespuestasDeIntentos(perfil.id, idsIntentosFinalizados),
      listarInfoPreguntas(perfil.id),
    ]);
    desglose = desgloseData;
    preguntasError = calcularPreguntasConMasErrores(idsIntentosFinalizados, preguntasIntento, respuestas, infoPorId);
  }

  const porEje = agregarPorTipo(desglose, "eje", ETIQUETA_EJE);
  const porCapacidad = agregarPorTipo(desglose, "capacidad", ETIQUETA_CAPACIDAD);
  const porDificultad = agregarPorTipo(desglose, "dificultad", ETIQUETA_DIFICULTAD);

  // ---------------------------------------------------------------------
  // Construcción del libro
  // ---------------------------------------------------------------------
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Simulador Aprender Arte Nuevo";
  workbook.created = new Date();

  const resumen = workbook.addWorksheet("Resumen");
  resumen.columns = [
    { header: "Indicador", key: "indicador", width: 34 },
    { header: "Valor", key: "valor", width: 20 },
  ];
  resumen.addRows([
    { indicador: "Reporte", valor: tituloReporte },
    { indicador: "Estudiantes", valor: estudiantes.length },
    { indicador: "Evaluaciones incluidas", valor: evaluacionIds.length },
    { indicador: "Intentos finalizados", valor: stats.totalIntentos },
    { indicador: "Promedio (%)", valor: stats.promedio },
    { indicador: "Porcentaje de aprobación (%)", valor: stats.porcentajeAprobacion },
    { indicador: "Puntaje más alto (%)", valor: stats.mejor },
    { indicador: "Puntaje más bajo (%)", valor: stats.peor },
    { indicador: "Tiempo promedio (min)", valor: stats.tiempoPromedioMin },
    { indicador: "Generado el", valor: new Date() },
  ]);
  resumen.getColumn("valor").numFmt = undefined;
  resumen.getCell("B10").numFmt = "dd/mm/yyyy hh:mm";
  resumen.getRow(1).font = { bold: true };

  const hojaResultados = workbook.addWorksheet("Resultados por estudiante");
  hojaResultados.columns = [
    { header: "Apellido", key: "apellido", width: 18 },
    { header: "Nombre", key: "nombre", width: 18 },
    { header: "Correo", key: "email", width: 32 },
    { header: "Evaluación", key: "evaluacion", width: 32 },
    { header: "Estado", key: "estado", width: 20 },
    { header: "Intento N°", key: "intento", width: 10 },
    { header: "Puntaje", key: "puntaje", width: 12 },
    { header: "Porcentaje", key: "porcentaje", width: 12 },
    { header: "Correctas", key: "correctas", width: 12 },
    { header: "Incorrectas", key: "incorrectas", width: 12 },
    { header: "Sin responder", key: "sin_responder", width: 14 },
    { header: "Aprobado", key: "aprobado", width: 12 },
    { header: "Tiempo (min)", key: "tiempo", width: 14 },
    { header: "Fecha de entrega", key: "fecha", width: 20 },
  ];
  for (const est of estudiantes) {
    for (const evalId of evaluacionIds) {
      const rep = representativoPorPar.get(`${est.id}::${evalId}`);
      hojaResultados.addRow({
        apellido: est.apellido,
        nombre: est.nombre,
        email: est.email,
        evaluacion: nombreEvaluacion.get(evalId) ?? "—",
        estado: rep ? (ETIQUETA_ESTADO_INTENTO[rep.estado] ?? rep.estado) : "Pendiente",
        intento: rep?.numero_intento ?? "—",
        puntaje: rep?.puntaje_obtenido ?? "—",
        porcentaje: rep?.porcentaje_obtenido ?? "—",
        correctas: rep?.correctas ?? "—",
        incorrectas: rep?.incorrectas ?? "—",
        sin_responder: rep?.sin_responder ?? "—",
        aprobado: rep ? (rep.aprobado ? "Sí" : rep.estado === "en_curso" ? "—" : "No") : "—",
        tiempo: rep?.tiempo_utilizado_segundos ? Math.round(rep.tiempo_utilizado_segundos / 60) : "—",
        fecha: rep?.fecha_entrega ? new Date(rep.fecha_entrega) : "—",
      });
    }
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
  for (const [agrupacion, filas] of [
    ["Eje", porEje],
    ["Capacidad", porCapacidad],
    ["Dificultad", porDificultad],
  ] as const) {
    for (const f of filas) {
      hojaContenidos.addRow({ agrupacion, detalle: f.etiqueta, correctas: f.correctas, total: f.total, porcentaje: f.porcentaje });
    }
  }
  hojaContenidos.getColumn("porcentaje").numFmt = '0.00"%"';
  encabezar(hojaContenidos);

  const hojaPreguntas = workbook.addWorksheet("Preguntas con más errores");
  hojaPreguntas.columns = [
    { header: "Código", key: "codigo", width: 14 },
    { header: "Enunciado", key: "enunciado", width: 60 },
    { header: "Incorrectas", key: "incorrectas", width: 14 },
    { header: "Total de respuestas", key: "total", width: 18 },
    { header: "Porcentaje de error", key: "porcentaje_error", width: 18 },
  ];
  for (const p of preguntasError) {
    hojaPreguntas.addRow({
      codigo: p.codigo,
      enunciado: p.enunciado,
      incorrectas: p.incorrectas,
      total: p.total,
      porcentaje_error: Math.round((p.incorrectas / p.total) * 10000) / 100,
    });
  }
  hojaPreguntas.getColumn("porcentaje_error").numFmt = '0.00"%"';
  encabezar(hojaPreguntas);

  const buffer = await workbook.xlsx.writeBuffer();
  const nombreArchivo = `reporte-general-${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${nombreArchivo}"`,
    },
  });
}
