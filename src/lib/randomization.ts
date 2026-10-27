import type { ConfigAutomatica, OpcionLetra, Pregunta } from "./types";

/** Generador pseudoaleatorio con semilla, para que el armado de un intento sea reproducible en tests. */
export function crearGeneradorAleatorio(semilla: number): () => number {
  let estado = semilla % 2147483647;
  if (estado <= 0) estado += 2147483646;
  return () => {
    estado = (estado * 16807) % 2147483647;
    return (estado - 1) / 2147483646;
  };
}

/** Fisher-Yates determinístico usando un generador inyectado (o Math.random por defecto). */
export function mezclar<T>(items: T[], random: () => number = Math.random): T[] {
  const copia = [...items];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

const LETRAS: OpcionLetra[] = ["A", "B", "C", "D"];

export interface OpcionBarajada {
  letra: OpcionLetra;
  texto: string;
  letraOriginal: OpcionLetra;
}

/** Baraja las 4 opciones de una pregunta y devuelve el mapeo hacia la letra original (para poder corregir después). */
export function barajarOpciones(
  pregunta: Pick<Pregunta, "opcion_a" | "opcion_b" | "opcion_c" | "opcion_d">,
  aleatorio: boolean,
  random: () => number = Math.random
): OpcionBarajada[] {
  const originales: { letra: OpcionLetra; texto: string }[] = [
    { letra: "A", texto: pregunta.opcion_a },
    { letra: "B", texto: pregunta.opcion_b },
    { letra: "C", texto: pregunta.opcion_c },
    { letra: "D", texto: pregunta.opcion_d },
  ];

  const ordenadas = aleatorio ? mezclar(originales, random) : originales;

  return ordenadas.map((opcion, indice) => ({
    letra: LETRAS[indice],
    texto: opcion.texto,
    letraOriginal: opcion.letra,
  }));
}

export interface SeleccionAutomaticaError {
  eje: string;
  solicitadas: number;
  disponibles: number;
}

export interface ResultadoSeleccionAutomatica {
  preguntas: Pregunta[];
  errores: SeleccionAutomaticaError[];
}

/**
 * Selecciona preguntas al azar respetando la distribución configurada por eje
 * (y opcionalmente contenido/capacidad/dificultad). Si no hay suficientes
 * preguntas disponibles para algún grupo, lo reporta en `errores` en lugar de
 * fallar silenciosamente con menos preguntas de las pedidas.
 */
export function seleccionarPreguntasAutomaticas(
  bancoActivo: Pregunta[],
  config: ConfigAutomatica,
  random: () => number = Math.random
): ResultadoSeleccionAutomatica {
  const seleccionadas: Pregunta[] = [];
  const errores: SeleccionAutomaticaError[] = [];
  const usadas = new Set<string>();

  for (const grupo of config.distribucion) {
    const candidatas = bancoActivo.filter((p) => {
      if (usadas.has(p.id)) return false;
      if (p.eje !== grupo.eje) return false;
      if (grupo.contenido && p.contenido !== grupo.contenido) return false;
      if (grupo.capacidad && p.capacidad !== grupo.capacidad) return false;
      if (grupo.dificultad && p.dificultad !== grupo.dificultad) return false;
      return true;
    });

    if (candidatas.length < grupo.cantidad) {
      errores.push({ eje: grupo.eje, solicitadas: grupo.cantidad, disponibles: candidatas.length });
    }

    const elegidas = mezclar(candidatas, random).slice(0, grupo.cantidad);
    for (const pregunta of elegidas) {
      usadas.add(pregunta.id);
      seleccionadas.push(pregunta);
    }
  }

  return { preguntas: seleccionadas, errores };
}

/** Ordena (o no) las preguntas de un intento según la configuración de la evaluación. */
export function ordenarPreguntasIntento<T>(
  preguntas: T[],
  aleatorio: boolean,
  random: () => number = Math.random
): T[] {
  return aleatorio ? mezclar(preguntas, random) : preguntas;
}
