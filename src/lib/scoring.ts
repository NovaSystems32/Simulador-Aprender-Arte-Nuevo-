import type {
  CapacidadEvaluada,
  EjeMatematico,
  NivelDificultad,
  OpcionLetra,
  ResultadoDesglose,
  TipoAgrupacionResultado,
} from "./types";

export interface PreguntaParaCorregir {
  pregunta_id: string;
  respuesta_correcta: OpcionLetra;
  eje: EjeMatematico;
  contenido: string;
  capacidad: CapacidadEvaluada;
  dificultad: NivelDificultad;
}

export interface RespuestaParaCorregir {
  pregunta_id: string;
  opcion_seleccionada: OpcionLetra | null;
}

export interface ResultadoCorreccion {
  correctas: number;
  incorrectas: number;
  sin_responder: number;
  puntaje_obtenido: number;
  porcentaje_obtenido: number;
  aprobado: boolean;
  desglose: ResultadoDesglose[];
}

/**
 * Corrige un intento comparando las preguntas presentadas contra las
 * respuestas dadas por el estudiante. Es una función pura: no toca la base
 * de datos ni el estado global, por lo que puede probarse de forma aislada.
 */
export function corregirIntento(
  preguntas: PreguntaParaCorregir[],
  respuestas: RespuestaParaCorregir[],
  opciones: {
    puntajeAprobacion: number;
    descuentoPorIncorrecta: boolean;
  }
): ResultadoCorreccion {
  const respuestaPorPregunta = new Map(
    respuestas.map((r) => [r.pregunta_id, r.opcion_seleccionada])
  );

  let correctas = 0;
  let incorrectas = 0;
  let sinResponder = 0;

  const agrupadores: Record<TipoAgrupacionResultado, Map<string, { correctas: number; total: number }>> = {
    eje: new Map(),
    contenido: new Map(),
    capacidad: new Map(),
    dificultad: new Map(),
  };

  const sumar = (tipo: TipoAgrupacionResultado, clave: string, esCorrecta: boolean) => {
    const mapa = agrupadores[tipo];
    const actual = mapa.get(clave) ?? { correctas: 0, total: 0 };
    actual.total += 1;
    if (esCorrecta) actual.correctas += 1;
    mapa.set(clave, actual);
  };

  for (const pregunta of preguntas) {
    const seleccionada = respuestaPorPregunta.get(pregunta.pregunta_id) ?? null;
    const esCorrecta = seleccionada !== null && seleccionada === pregunta.respuesta_correcta;

    if (seleccionada === null) {
      sinResponder += 1;
    } else if (esCorrecta) {
      correctas += 1;
    } else {
      incorrectas += 1;
    }

    sumar("eje", pregunta.eje, esCorrecta);
    sumar("contenido", pregunta.contenido, esCorrecta);
    sumar("capacidad", pregunta.capacidad, esCorrecta);
    sumar("dificultad", pregunta.dificultad, esCorrecta);
  }

  const totalPreguntas = preguntas.length;
  const porcentajeObtenido = totalPreguntas === 0 ? 0 : (correctas / totalPreguntas) * 100;

  const puntajeObtenido = opciones.descuentoPorIncorrecta
    ? Math.max(0, correctas - incorrectas * 0.25)
    : correctas;

  const desglose: ResultadoDesglose[] = [];
  for (const tipo of Object.keys(agrupadores) as TipoAgrupacionResultado[]) {
    for (const [clave, { correctas: c, total }] of agrupadores[tipo]) {
      desglose.push({
        tipo_agrupacion: tipo,
        clave,
        correctas: c,
        total,
        porcentaje: total === 0 ? 0 : Math.round((c / total) * 10000) / 100,
      });
    }
  }

  return {
    correctas,
    incorrectas,
    sin_responder: sinResponder,
    puntaje_obtenido: Math.round(puntajeObtenido * 100) / 100,
    porcentaje_obtenido: Math.round(porcentajeObtenido * 100) / 100,
    aprobado: porcentajeObtenido >= opciones.puntajeAprobacion,
    desglose,
  };
}

/** Mensajes educativos y respetuosos según el porcentaje logrado en un agrupador */
export function mensajeDesempeno(porcentaje: number): string {
  if (porcentaje >= 80) return "Contenido logrado";
  if (porcentaje >= 50) return "Contenido en proceso";
  if (porcentaje > 0) return "Necesitás seguir practicando";
  return "Revisá el procedimiento utilizado";
}
