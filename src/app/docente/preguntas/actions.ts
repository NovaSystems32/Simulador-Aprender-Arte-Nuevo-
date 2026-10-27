"use server";

import { revalidatePath } from "next/cache";
import { exigirPerfil } from "@/lib/auth";
import { registrarAuditoria } from "@/lib/auditoria";
import {
  actualizarPreguntaFila,
  cambiarEstadoPreguntaFila,
  eliminarPreguntaFila,
  insertarPreguntaConReintento,
  obtenerPreguntaPorId,
  obtenerResumenEliminacionPregunta as obtenerResumenEliminacionDb,
} from "@/lib/db/preguntas";
import { obtenerUsoPregunta, textoAvisoUso } from "@/lib/preguntas-uso";
import type {
  CapacidadEvaluada,
  EjeMatematico,
  EstadoPregunta,
  NivelDificultad,
  OpcionLetra,
} from "@/lib/types";

export interface EstadoFormularioPregunta {
  error: string | null;
  ok: boolean;
  /** Mensaje de confirmación; solo se informa DESPUÉS de verificar que la base devolvió la fila guardada. */
  mensaje?: string;
  /** Código de la pregunta confirmada (p. ej. NUM-017). */
  codigo?: string;
}

interface ErrorBase {
  code?: string;
  message?: string;
  detail?: string | null;
  hint?: string | null;
}

/** Invalida la lista, la vista y la edición de preguntas (docente y admin) para que se relean de Neon. */
function revalidarBanco() {
  revalidatePath("/docente/preguntas", "layout");
  revalidatePath("/admin/preguntas", "layout");
}

/**
 * Traduce un error de Postgres (Neon, vía node-postgres) a un mensaje claro en
 * español. El detalle técnico completo (código, mensaje, detalle y
 * sugerencia) NO se muestra en pantalla: queda en el log del servidor para
 * diagnóstico.
 */
function mensajeDeError(accion: string, error: ErrorBase): string {
  console.error(`[preguntas] Error al ${accion}:`, {
    codigo: error.code,
    mensaje: error.message,
    detalle: error.detail,
    sugerencia: error.hint,
  });
  const texto = (error.message ?? "").toLowerCase();

  if (error.code === "42501" || texto.includes("row-level security")) {
    return `No tenés permiso para ${accion}. Solo docentes y administradores pueden hacerlo.`;
  }
  if (error.code === "23505") {
    return "Otra persona guardó una pregunta al mismo tiempo y el código quedó repetido. Intentá guardar de nuevo.";
  }
  if (error.code === "23502") return "Falta completar un dato obligatorio de la pregunta.";
  if (error.code === "22P02" || error.code === "22P05") {
    return "Alguno de los valores elegidos no es válido (eje, capacidad, dificultad, estado o respuesta correcta). Revisá el formulario.";
  }
  if (error.code === "23503") return "La pregunta hace referencia a un dato que ya no existe.";
  if (texto.includes("fetch failed") || texto.includes("network") || texto.includes("timeout")) {
    return "No se pudo conectar con la base de datos. Revisá tu conexión y probá de nuevo en unos minutos.";
  }
  return `No se pudo ${accion}. Probá de nuevo; si el problema sigue, avisá a un administrador.`;
}

function leerCamposPregunta(formData: FormData) {
  return {
    enunciado: String(formData.get("enunciado") ?? "").trim(),
    recurso_url: String(formData.get("recurso_url") ?? "").trim() || null,
    recurso_alt: String(formData.get("recurso_alt") ?? "").trim() || null,
    opcion_a: String(formData.get("opcion_a") ?? "").trim(),
    opcion_b: String(formData.get("opcion_b") ?? "").trim(),
    opcion_c: String(formData.get("opcion_c") ?? "").trim(),
    opcion_d: String(formData.get("opcion_d") ?? "").trim(),
    respuesta_correcta: String(formData.get("respuesta_correcta") ?? "") as OpcionLetra,
    explicacion: String(formData.get("explicacion") ?? "").trim(),
    eje: String(formData.get("eje") ?? "") as EjeMatematico,
    contenido: String(formData.get("contenido") ?? "").trim(),
    capacidad: String(formData.get("capacidad") ?? "") as CapacidadEvaluada,
    dificultad: String(formData.get("dificultad") ?? "") as NivelDificultad,
    estado: String(formData.get("estado") ?? "borrador") as EstadoPregunta,
  };
}

function validarCampos(campos: ReturnType<typeof leerCamposPregunta>): string | null {
  if (!campos.enunciado) return "El enunciado es obligatorio.";
  if (!campos.opcion_a || !campos.opcion_b || !campos.opcion_c || !campos.opcion_d) {
    return "Las cuatro opciones (A, B, C y D) son obligatorias.";
  }
  if (!["A", "B", "C", "D"].includes(campos.respuesta_correcta)) {
    return "Indicá cuál es la opción correcta.";
  }
  if (!campos.explicacion) return "La explicación de la resolución es obligatoria.";
  if (!campos.eje) return "Seleccioná el eje matemático.";
  if (!campos.contenido) return "Indicá el contenido específico.";
  if (!campos.capacidad) return "Seleccioná la capacidad evaluada.";
  if (!campos.dificultad) return "Seleccioná el nivel de dificultad.";
  if (campos.recurso_url && !/^https?:\/\//i.test(campos.recurso_url)) {
    return "La dirección de la imagen debe empezar con http:// o https://.";
  }
  return null;
}

export async function crearPregunta(
  _estadoPrevio: EstadoFormularioPregunta,
  formData: FormData
): Promise<EstadoFormularioPregunta> {
  const perfil = await exigirPerfil(["docente", "admin"]);
  const campos = leerCamposPregunta(formData);
  const error = validarCampos(campos);
  if (error) return { error, ok: false };

  try {
    const pregunta = await insertarPreguntaConReintento(perfil.id, {
      enunciado: campos.enunciado,
      recursoUrl: campos.recurso_url,
      recursoAlt: campos.recurso_alt,
      opcionA: campos.opcion_a,
      opcionB: campos.opcion_b,
      opcionC: campos.opcion_c,
      opcionD: campos.opcion_d,
      respuestaCorrecta: campos.respuesta_correcta,
      explicacion: campos.explicacion,
      eje: campos.eje,
      contenido: campos.contenido,
      capacidad: campos.capacidad,
      dificultad: campos.dificultad,
      autorId: perfil.id,
      estado: campos.estado,
    });
    revalidarBanco();
    return { error: null, ok: true, codigo: pregunta.codigo, mensaje: `Pregunta ${pregunta.codigo} guardada correctamente.` };
  } catch (err) {
    return { error: mensajeDeError("guardar la pregunta", err as ErrorBase), ok: false };
  }
}

export async function actualizarPregunta(
  id: string,
  _estadoPrevio: EstadoFormularioPregunta,
  formData: FormData
): Promise<EstadoFormularioPregunta> {
  const perfil = await exigirPerfil(["docente", "admin"]);
  const campos = leerCamposPregunta(formData);
  const error = validarCampos(campos);
  if (error) return { error, ok: false };

  let data;
  try {
    data = await actualizarPreguntaFila(perfil.id, id, {
      enunciado: campos.enunciado,
      recursoUrl: campos.recurso_url,
      recursoAlt: campos.recurso_alt,
      opcionA: campos.opcion_a,
      opcionB: campos.opcion_b,
      opcionC: campos.opcion_c,
      opcionD: campos.opcion_d,
      respuestaCorrecta: campos.respuesta_correcta,
      explicacion: campos.explicacion,
      eje: campos.eje,
      contenido: campos.contenido,
      capacidad: campos.capacidad,
      dificultad: campos.dificultad,
      estado: campos.estado,
    });
  } catch (err) {
    return { error: mensajeDeError("actualizar la pregunta", err as ErrorBase), ok: false };
  }

  // Una política RLS que bloquea el UPDATE (p.ej. si la fila ya no existe o
  // no pertenece a quien edita) no lanza error: simplemente no afecta filas.
  if (!data) {
    return {
      error:
        "No se guardaron los cambios: la pregunta ya no existe o tu cuenta no tiene permiso para modificarla. Recargá el Banco de preguntas e intentá de nuevo.",
      ok: false,
    };
  }

  revalidarBanco();
  // Aviso (no es un error): si la pregunta ya se usó, los intentos anteriores conservan su copia original.
  let aviso = "";
  try {
    aviso = textoAvisoUso(await obtenerUsoPregunta(perfil.id, id)) ?? "";
  } catch {
    // el aviso es informativo; si no se puede calcular, el guardado igualmente quedó confirmado
  }
  return {
    error: null,
    ok: true,
    codigo: data.codigo,
    mensaje: `Pregunta ${data.codigo} actualizada correctamente. ${aviso}`.trim(),
  };
}

export async function duplicarPregunta(id: string): Promise<ResultadoAccionPregunta> {
  const perfil = await exigirPerfil(["docente", "admin"]);

  const original = await obtenerPreguntaPorId(perfil.id, id);
  if (!original) return { ok: false, mensaje: "No se encontró la pregunta a duplicar (puede que ya no exista)." };

  try {
    const copia = await insertarPreguntaConReintento(perfil.id, {
      enunciado: original.enunciado,
      recursoUrl: original.recurso_url,
      recursoAlt: original.recurso_alt,
      opcionA: original.opcion_a,
      opcionB: original.opcion_b,
      opcionC: original.opcion_c,
      opcionD: original.opcion_d,
      respuestaCorrecta: original.respuesta_correcta,
      explicacion: original.explicacion,
      eje: original.eje,
      contenido: original.contenido,
      capacidad: original.capacidad,
      dificultad: original.dificultad,
      cursoId: original.curso_id,
      autorId: perfil.id,
      estado: "borrador",
    });
    revalidarBanco();
    return { ok: true, mensaje: `Se creó la copia ${copia.codigo} (borrador).` };
  } catch (err) {
    return { ok: false, mensaje: mensajeDeError("duplicar la pregunta", err as ErrorBase) };
  }
}

export async function cambiarEstadoPregunta(id: string, estado: EstadoPregunta): Promise<ResultadoAccionPregunta> {
  const perfil = await exigirPerfil(["docente", "admin"]);
  let data;
  try {
    data = await cambiarEstadoPreguntaFila(perfil.id, id, estado);
  } catch (err) {
    return { ok: false, mensaje: mensajeDeError("cambiar el estado de la pregunta", err as ErrorBase) };
  }
  if (!data) {
    return {
      ok: false,
      mensaje: "No se cambió el estado: la pregunta ya no existe o tu cuenta no tiene permiso para modificarla.",
    };
  }

  revalidarBanco();
  return { ok: true, mensaje: `La pregunta ${data.codigo} pasó a estado «${estado}».` };
}

export interface ResultadoAccionPregunta {
  ok: boolean;
  mensaje: string;
}

export interface ResumenEliminacionPregunta {
  codigo: string;
  enunciadoResumido: string;
  evaluacionesQueLaUsan: number;
  intentosQueLaUsan: number;
  respuestasVinculadas: number;
  tieneUsoHistorico: boolean;
  /** Si existe, la eliminación está bloqueada para quien la consulta y este es el motivo. */
  bloqueo?: string;
}

/**
 * Resumen del impacto de eliminar una pregunta. Docentes y administradores pueden eliminar, pero a un
 * docente se le bloquea si la pregunta ya fue usada (evaluaciones, intentos o respuestas): borrarla
 * arrastra en cascada las copias históricas y los resultados de los estudiantes. En ese caso se debe
 * archivar. El administrador sí puede eliminarla, viendo el impacto.
 */
export async function obtenerResumenEliminacionPregunta(id: string): Promise<ResumenEliminacionPregunta> {
  const quien = await exigirPerfil(["docente", "admin"]);
  const resumen = await obtenerResumenEliminacionDb(quien.id, id);
  if (!resumen) throw new Error("No se encontró la pregunta.");

  return {
    ...resumen,
    tieneUsoHistorico: resumen.intentosQueLaUsan > 0,
    bloqueo:
      quien.rol !== "admin" &&
      (resumen.evaluacionesQueLaUsan > 0 || resumen.intentosQueLaUsan > 0 || resumen.respuestasVinculadas > 0)
        ? "Esta pregunta ya se usó en evaluaciones o intentos de estudiantes, por eso no se puede eliminar: se perderían copias históricas y resultados. Archivala para que no se use más (solo un administrador puede eliminarla definitivamente)."
        : undefined,
  };
}

/**
 * Docentes y administradores (un docente solo si la pregunta nunca se usó; ver
 * obtenerResumenEliminacionPregunta). Requiere escribir "ELIMINAR PREGUNTA". Si la pregunta
 * ya fue usada en intentos rendidos, borrarla arrastra (por ON DELETE CASCADE)
 * los snapshots de intento_preguntas y las respuestas_estudiante asociadas: el
 * llamador debe haber mostrado ese impacto antes de invocar esta acción.
 */
export async function eliminarPregunta(id: string, confirmacionTexto: string): Promise<ResultadoAccionPregunta> {
  const quien = await exigirPerfil(["docente", "admin"]);
  if (confirmacionTexto !== "ELIMINAR PREGUNTA") {
    return { ok: false, mensaje: 'Debés escribir exactamente "ELIMINAR PREGUNTA" para confirmar.' };
  }

  const resumen = await obtenerResumenEliminacionPregunta(id);
  if (resumen.bloqueo) return { ok: false, mensaje: resumen.bloqueo };

  try {
    await eliminarPreguntaFila(quien.id, id);
  } catch (err) {
    return { ok: false, mensaje: `No se pudo eliminar: ${(err as ErrorBase).message}` };
  }

  await registrarAuditoria({
    admin: quien,
    accion: quien.rol === "admin" ? "eliminar_pregunta_definitivo" : "eliminar_pregunta_docente",
    tablaAfectada: "preguntas",
    registroId: id,
    cantidadRegistros:
      1 + resumen.evaluacionesQueLaUsan + resumen.intentosQueLaUsan + resumen.respuestasVinculadas,
    detalle: { ...resumen, eliminadaPorRol: quien.rol },
  });

  revalidarBanco();
  return { ok: true, mensaje: `La pregunta ${resumen.codigo} fue eliminada definitivamente.` };
}

export interface FilaImportacion {
  enunciado: string;
  opcion_a: string;
  opcion_b: string;
  opcion_c: string;
  opcion_d: string;
  respuesta_correcta: string;
  explicacion: string;
  eje: string;
  contenido: string;
  capacidad: string;
  dificultad: string;
}

export interface ResultadoImportacion {
  insertadas: number;
  errores: { fila: number; motivo: string }[];
}

const EJES_VALIDOS: EjeMatematico[] = [
  "numeros_operaciones",
  "algebra_funciones",
  "geometria_medida",
  "estadistica_probabilidad",
];
const CAPACIDADES_VALIDAS: CapacidadEvaluada[] = [
  "reconocimiento_conceptos",
  "interpretacion_informacion",
  "resolucion_problemas",
  "comunicacion_matematica",
  "modelizacion",
  "aplicacion_procedimientos",
  "analisis_graficos_tablas",
  "argumentacion",
];
const DIFICULTADES_VALIDAS: NivelDificultad[] = ["inicial", "medio", "avanzado"];

export async function importarPreguntas(filas: FilaImportacion[]): Promise<ResultadoImportacion> {
  const perfil = await exigirPerfil(["docente", "admin"]);

  const resultado: ResultadoImportacion = { insertadas: 0, errores: [] };
  const validas: Array<{ indice: number; datos: Parameters<typeof insertarPreguntaConReintento>[1] }> = [];

  filas.forEach((fila, indice) => {
    const numeroFila = indice + 2; // +2: encabezado + índice 1-based
    const eje = fila.eje?.trim() as EjeMatematico;
    const capacidad = fila.capacidad?.trim() as CapacidadEvaluada;
    const dificultad = fila.dificultad?.trim() as NivelDificultad;
    const correcta = fila.respuesta_correcta?.trim().toUpperCase() as OpcionLetra;

    if (!fila.enunciado?.trim()) {
      resultado.errores.push({ fila: numeroFila, motivo: "Falta el enunciado." });
      return;
    }
    if (!fila.opcion_a?.trim() || !fila.opcion_b?.trim() || !fila.opcion_c?.trim() || !fila.opcion_d?.trim()) {
      resultado.errores.push({ fila: numeroFila, motivo: "Faltan una o más opciones (A-D)." });
      return;
    }
    if (!["A", "B", "C", "D"].includes(correcta)) {
      resultado.errores.push({ fila: numeroFila, motivo: `Respuesta correcta inválida: "${fila.respuesta_correcta}".` });
      return;
    }
    if (!fila.explicacion?.trim()) {
      resultado.errores.push({ fila: numeroFila, motivo: "Falta la explicación." });
      return;
    }
    if (!EJES_VALIDOS.includes(eje)) {
      resultado.errores.push({ fila: numeroFila, motivo: `Eje inválido: "${fila.eje}".` });
      return;
    }
    if (!fila.contenido?.trim()) {
      resultado.errores.push({ fila: numeroFila, motivo: "Falta el contenido." });
      return;
    }
    if (!CAPACIDADES_VALIDAS.includes(capacidad)) {
      resultado.errores.push({ fila: numeroFila, motivo: `Capacidad inválida: "${fila.capacidad}".` });
      return;
    }
    if (!DIFICULTADES_VALIDAS.includes(dificultad)) {
      resultado.errores.push({ fila: numeroFila, motivo: `Dificultad inválida: "${fila.dificultad}".` });
      return;
    }

    validas.push({
      indice,
      datos: {
        enunciado: fila.enunciado.trim(),
        recursoUrl: null,
        recursoAlt: null,
        opcionA: fila.opcion_a.trim(),
        opcionB: fila.opcion_b.trim(),
        opcionC: fila.opcion_c.trim(),
        opcionD: fila.opcion_d.trim(),
        respuestaCorrecta: correcta,
        explicacion: fila.explicacion.trim(),
        eje,
        contenido: fila.contenido.trim(),
        capacidad,
        dificultad,
        estado: "borrador",
        autorId: perfil.id,
      },
    });
  });

  for (const { indice, datos } of validas) {
    try {
      await insertarPreguntaConReintento(perfil.id, datos);
      resultado.insertadas += 1;
    } catch (err) {
      resultado.errores.push({ fila: indice + 2, motivo: mensajeDeError("importar la pregunta", err as ErrorBase) });
    }
  }

  revalidarBanco();
  return resultado;
}
