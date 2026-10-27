"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirPerfil } from "@/lib/auth";
import {
  asignarCursoFila,
  cambiarEstadoEvaluacionFila,
  crearEvaluacionAutomatica as crearEvaluacionAutomaticaDb,
  crearEvaluacionManual as crearEvaluacionManualDb,
  quitarAsignacionFila,
} from "@/lib/db/evaluaciones";
import type { ConfigAutomatica, EstadoEvaluacion } from "@/lib/types";

export interface EstadoFormularioEvaluacion {
  error: string | null;
}

function leerConfiguracionComun(formData: FormData) {
  return {
    nombre: String(formData.get("nombre") ?? "").trim(),
    descripcion: String(formData.get("descripcion") ?? "").trim() || null,
    curso_id: String(formData.get("curso_id") ?? ""),
    fecha_apertura: String(formData.get("fecha_apertura") ?? "") || null,
    fecha_cierre: String(formData.get("fecha_cierre") ?? "") || null,
    duracion_minutos: Number(formData.get("duracion_minutos") ?? 0),
    orden_aleatorio_preguntas: formData.get("orden_aleatorio_preguntas") === "on",
    orden_aleatorio_opciones: formData.get("orden_aleatorio_opciones") === "on",
    intentos_max: Number(formData.get("intentos_max") ?? 1),
    puntaje_aprobacion: Number(formData.get("puntaje_aprobacion") ?? 60),
    mostrar_resultado_inmediato: formData.get("mostrar_resultado_inmediato") === "on",
    permitir_revision: formData.get("permitir_revision") === "on",
    mostrar_resoluciones: formData.get("mostrar_resoluciones") === "on",
    permitir_calculadora: formData.get("permitir_calculadora") === "on",
    permitir_hoja_formulas: formData.get("permitir_hoja_formulas") === "on",
    descuento_por_incorrecta: formData.get("descuento_por_incorrecta") === "on",
  };
}

function validarComun(campos: ReturnType<typeof leerConfiguracionComun>): string | null {
  if (!campos.nombre) return "El nombre de la evaluación es obligatorio.";
  if (!campos.curso_id) return "Seleccioná un curso.";
  if (!campos.duracion_minutos || campos.duracion_minutos <= 0) return "Indicá una duración válida en minutos.";
  if (!campos.intentos_max || campos.intentos_max <= 0) return "La cantidad máxima de intentos debe ser mayor a 0.";
  if (campos.puntaje_aprobacion < 0 || campos.puntaje_aprobacion > 100) {
    return "El puntaje de aprobación debe estar entre 0 y 100.";
  }
  return null;
}

function comunParaDb(campos: ReturnType<typeof leerConfiguracionComun>) {
  return {
    nombre: campos.nombre,
    descripcion: campos.descripcion,
    cursoId: campos.curso_id,
    fechaApertura: campos.fecha_apertura ? new Date(campos.fecha_apertura) : null,
    fechaCierre: campos.fecha_cierre ? new Date(campos.fecha_cierre) : null,
    duracionMinutos: campos.duracion_minutos,
    ordenAleatorioPreguntas: campos.orden_aleatorio_preguntas,
    ordenAleatorioOpciones: campos.orden_aleatorio_opciones,
    intentosMax: campos.intentos_max,
    puntajeAprobacion: campos.puntaje_aprobacion,
    mostrarResultadoInmediato: campos.mostrar_resultado_inmediato,
    permitirRevision: campos.permitir_revision,
    mostrarResoluciones: campos.mostrar_resoluciones,
    permitirCalculadora: campos.permitir_calculadora,
    permitirHojaFormulas: campos.permitir_hoja_formulas,
    descuentoPorIncorrecta: campos.descuento_por_incorrecta,
  };
}

export async function crearEvaluacionManual(
  _estadoPrevio: EstadoFormularioEvaluacion,
  formData: FormData
): Promise<EstadoFormularioEvaluacion> {
  const perfil = await exigirPerfil(["docente", "admin"]);
  const comun = leerConfiguracionComun(formData);
  const errorComun = validarComun(comun);
  if (errorComun) return { error: errorComun };

  const preguntaIds = formData.getAll("pregunta_ids").map(String);
  if (preguntaIds.length === 0) {
    return { error: "Seleccioná al menos una pregunta del banco." };
  }

  let evaluacionId: string;
  try {
    evaluacionId = await crearEvaluacionManualDb(perfil.id, comunParaDb(comun), preguntaIds);
  } catch (err) {
    const detalle = err instanceof Error ? err.message : "error desconocido";
    return { error: `No se pudo crear la evaluación: ${detalle}` };
  }

  revalidatePath("/docente/evaluaciones");
  redirect(`/docente/evaluaciones/${evaluacionId}`);
}

export async function crearEvaluacionAutomatica(
  _estadoPrevio: EstadoFormularioEvaluacion,
  formData: FormData
): Promise<EstadoFormularioEvaluacion> {
  const perfil = await exigirPerfil(["docente", "admin"]);
  const comun = leerConfiguracionComun(formData);
  const errorComun = validarComun(comun);
  if (errorComun) return { error: errorComun };

  const ejes = ["numeros_operaciones", "algebra_funciones", "geometria_medida", "estadistica_probabilidad"] as const;
  const distribucion: ConfigAutomatica["distribucion"] = [];
  let total = 0;
  for (const eje of ejes) {
    const cantidad = Number(formData.get(`cantidad_${eje}`) ?? 0);
    if (cantidad > 0) {
      distribucion.push({ eje, cantidad });
      total += cantidad;
    }
  }

  if (total === 0) {
    return { error: "Indicá al menos una pregunta en algún eje para la selección automática." };
  }

  let evaluacionId: string;
  try {
    evaluacionId = await crearEvaluacionAutomaticaDb(perfil.id, comunParaDb(comun), distribucion, total);
  } catch (err) {
    const detalle = err instanceof Error ? err.message : "error desconocido";
    return { error: `No se pudo crear la evaluación: ${detalle}` };
  }

  revalidatePath("/docente/evaluaciones");
  redirect(`/docente/evaluaciones/${evaluacionId}`);
}

export async function cambiarEstadoEvaluacion(id: string, estado: EstadoEvaluacion) {
  const perfil = await exigirPerfil(["docente", "admin"]);
  await cambiarEstadoEvaluacionFila(perfil.id, id, estado);
  revalidatePath("/docente/evaluaciones");
  revalidatePath(`/docente/evaluaciones/${id}`);
}

export async function asignarCurso(evaluacionId: string, cursoId: string) {
  const perfil = await exigirPerfil(["docente", "admin"]);
  await asignarCursoFila(perfil.id, evaluacionId, cursoId);
  revalidatePath(`/docente/evaluaciones/${evaluacionId}`);
}

export async function quitarAsignacion(evaluacionId: string, cursoId: string) {
  const perfil = await exigirPerfil(["docente", "admin"]);
  await quitarAsignacionFila(perfil.id, evaluacionId, cursoId);
  revalidatePath(`/docente/evaluaciones/${evaluacionId}`);
}
