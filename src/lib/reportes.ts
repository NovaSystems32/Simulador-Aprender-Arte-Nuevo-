// Agregaciones de reportes compartidas entre la página /docente/reportes y
// las exportaciones a Excel, para no repetir la misma cuenta de promedios,
// aprobación y preguntas con más error en dos lugares distintos.

export interface IntentoParaEstadisticas {
  porcentaje_obtenido: number | null;
  aprobado: boolean | null;
  tiempo_utilizado_segundos: number | null;
}

export interface Estadisticas {
  totalIntentos: number;
  promedio: number;
  aprobados: number;
  porcentajeAprobacion: number;
  mejor: number;
  peor: number;
  tiempoPromedioMin: number;
}

export function calcularEstadisticas(intentos: IntentoParaEstadisticas[]): Estadisticas {
  const total = intentos.length;
  const promedio = total
    ? Math.round((intentos.reduce((s, i) => s + (i.porcentaje_obtenido ?? 0), 0) / total) * 100) / 100
    : 0;
  const aprobados = intentos.filter((i) => i.aprobado).length;
  const porcentajeAprobacion = total ? Math.round((aprobados / total) * 10000) / 100 : 0;
  const mejor = total ? Math.max(...intentos.map((i) => i.porcentaje_obtenido ?? 0)) : 0;
  const peor = total ? Math.min(...intentos.map((i) => i.porcentaje_obtenido ?? 0)) : 0;
  const tiempoPromedioMin = total
    ? Math.round(intentos.reduce((s, i) => s + (i.tiempo_utilizado_segundos ?? 0), 0) / total / 60)
    : 0;

  return { totalIntentos: total, promedio, aprobados, porcentajeAprobacion, mejor, peor, tiempoPromedioMin };
}

export interface FilaDesglose {
  tipo_agrupacion: string;
  clave: string;
  correctas: number;
  total: number;
}

export function agregarPorTipo(
  desglose: FilaDesglose[],
  tipo: string,
  etiquetas: Record<string, string>
): { etiqueta: string; correctas: number; total: number; porcentaje: number }[] {
  const acumulado = new Map<string, { correctas: number; total: number }>();
  for (const fila of desglose.filter((d) => d.tipo_agrupacion === tipo)) {
    const actual = acumulado.get(fila.clave) ?? { correctas: 0, total: 0 };
    actual.correctas += fila.correctas;
    actual.total += fila.total;
    acumulado.set(fila.clave, actual);
  }
  return Array.from(acumulado.entries()).map(([clave, v]) => ({
    etiqueta: etiquetas[clave] ?? clave,
    correctas: v.correctas,
    total: v.total,
    porcentaje: v.total === 0 ? 0 : Math.round((v.correctas / v.total) * 10000) / 100,
  }));
}

export interface PreguntaConError {
  pregunta_id: string;
  codigo: string;
  enunciado: string;
  incorrectas: number;
  total: number;
}

export function calcularPreguntasConMasErrores(
  idsIntentos: string[],
  preguntasIntento: { pregunta_id: string; intento_id: string; respuesta_correcta: string }[],
  respuestas: { pregunta_id: string; intento_id: string; opcion_seleccionada: string | null }[],
  infoPreguntas: Map<string, { codigo: string; enunciado: string }>,
  limite = 10
): PreguntaConError[] {
  const clave = (intentoId: string, preguntaId: string) => `${intentoId}::${preguntaId}`;
  const respuestaPorClave = new Map(respuestas.map((r) => [clave(r.intento_id, r.pregunta_id), r.opcion_seleccionada]));

  const conteo = new Map<string, { incorrectas: number; total: number }>();
  for (const pi of preguntasIntento) {
    const seleccionada = respuestaPorClave.get(clave(pi.intento_id, pi.pregunta_id));
    const actual = conteo.get(pi.pregunta_id) ?? { incorrectas: 0, total: 0 };
    actual.total += 1;
    if (seleccionada !== pi.respuesta_correcta) actual.incorrectas += 1;
    conteo.set(pi.pregunta_id, actual);
  }

  return Array.from(conteo.entries())
    .map(([preguntaId, v]) => ({
      pregunta_id: preguntaId,
      codigo: infoPreguntas.get(preguntaId)?.codigo ?? "—",
      enunciado: infoPreguntas.get(preguntaId)?.enunciado ?? "",
      incorrectas: v.incorrectas,
      total: v.total,
    }))
    .sort((a, b) => b.incorrectas / b.total - a.incorrectas / a.total)
    .slice(0, limite);
}

export const ETIQUETA_ESTADO_INTENTO: Record<string, string> = {
  no_iniciado: "No iniciado",
  en_curso: "Iniciado",
  entregado: "Finalizado",
  expirado: "Finalizado (tiempo agotado)",
};
