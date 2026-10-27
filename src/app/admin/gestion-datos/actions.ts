"use server";

import { revalidatePath } from "next/cache";
import { exigirPerfil } from "@/lib/auth";
import { registrarAuditoria } from "@/lib/auditoria";
import {
  contarIntentosRelacionados,
  eliminarEvaluacionCompleta,
  eliminarIntentosDeEstudiante,
  eliminarIntentosDeEvaluacion,
  limpiarTodosLosIntentos,
  obtenerNombreEvaluacion,
  obtenerResumenEliminacionEvaluacion as obtenerResumenEliminacionEvaluacionDb,
  obtenerResumenLimpiezaGeneral as obtenerResumenLimpiezaGeneralDb,
} from "@/lib/db/gestion-datos";
import { obtenerPerfilBasico } from "@/lib/db/usuarios";

export interface ResultadoAccion {
  ok: boolean;
  mensaje: string;
}

// ---------------------------------------------------------------------
// Limpiar historial de un estudiante (conserva cuenta, curso, evaluaciones)
// ---------------------------------------------------------------------
export async function obtenerResumenHistorialEstudiante(perfilId: string) {
  const quienAdmin = await exigirPerfil(["admin"]);
  return contarIntentosRelacionados(quienAdmin.id, { estudianteId: perfilId });
}

export async function limpiarHistorialEstudiante(perfilId: string): Promise<ResultadoAccion> {
  const quienAdmin = await exigirPerfil(["admin"]);

  const perfil = await obtenerPerfilBasico(quienAdmin.id, perfilId);
  if (!perfil) return { ok: false, mensaje: "No se encontró el estudiante." };

  const resumen = await contarIntentosRelacionados(quienAdmin.id, { estudianteId: perfilId });
  try {
    await eliminarIntentosDeEstudiante(quienAdmin.id, perfilId);
  } catch (err) {
    const detalle = err instanceof Error ? err.message : "error desconocido";
    return { ok: false, mensaje: `No se pudo limpiar el historial: ${detalle}` };
  }

  await registrarAuditoria({
    admin: quienAdmin,
    accion: "limpiar_historial_estudiante",
    tablaAfectada: "intentos",
    registroId: perfilId,
    cantidadRegistros: resumen.intentos + resumen.respuestas + resumen.resultados,
    detalle: { email: perfil.email, ...resumen },
  });

  revalidatePath("/admin/gestion-datos");
  revalidatePath(`/admin/usuarios/${perfilId}`);
  return {
    ok: true,
    mensaje: `El historial de ${perfil.nombre} ${perfil.apellido} fue eliminado correctamente (${resumen.intentos} intento(s)).`,
  };
}

// ---------------------------------------------------------------------
// Limpiar historial de una evaluación (conserva la evaluación y sus preguntas)
// ---------------------------------------------------------------------
export async function obtenerResumenHistorialEvaluacion(evaluacionId: string) {
  const quienAdmin = await exigirPerfil(["admin"]);
  return contarIntentosRelacionados(quienAdmin.id, { evaluacionId });
}

export async function limpiarHistorialEvaluacion(evaluacionId: string): Promise<ResultadoAccion> {
  const quienAdmin = await exigirPerfil(["admin"]);

  const nombre = await obtenerNombreEvaluacion(quienAdmin.id, evaluacionId);
  if (!nombre) return { ok: false, mensaje: "No se encontró la evaluación." };

  const resumen = await contarIntentosRelacionados(quienAdmin.id, { evaluacionId });
  try {
    await eliminarIntentosDeEvaluacion(quienAdmin.id, evaluacionId);
  } catch (err) {
    const detalle = err instanceof Error ? err.message : "error desconocido";
    return { ok: false, mensaje: `No se pudo limpiar el historial: ${detalle}` };
  }

  await registrarAuditoria({
    admin: quienAdmin,
    accion: "limpiar_historial_evaluacion",
    tablaAfectada: "intentos",
    registroId: evaluacionId,
    cantidadRegistros: resumen.intentos + resumen.respuestas + resumen.resultados,
    detalle: { evaluacion: nombre, ...resumen },
  });

  revalidatePath("/admin/gestion-datos");
  return {
    ok: true,
    mensaje: `El historial de "${nombre}" fue eliminado correctamente (${resumen.intentos} intento(s)). La evaluación sigue disponible como no realizada.`,
  };
}

// ---------------------------------------------------------------------
// Eliminar una evaluación completa
// ---------------------------------------------------------------------
export async function obtenerResumenEliminacionEvaluacion(evaluacionId: string) {
  const quienAdmin = await exigirPerfil(["admin"]);
  return obtenerResumenEliminacionEvaluacionDb(quienAdmin.id, evaluacionId);
}

export async function eliminarEvaluacion(evaluacionId: string): Promise<ResultadoAccion> {
  const quienAdmin = await exigirPerfil(["admin"]);

  const nombre = await obtenerNombreEvaluacion(quienAdmin.id, evaluacionId);
  if (!nombre) return { ok: false, mensaje: "No se encontró la evaluación." };

  const resumen = await obtenerResumenEliminacionEvaluacionDb(quienAdmin.id, evaluacionId);
  try {
    await eliminarEvaluacionCompleta(quienAdmin.id, evaluacionId);
  } catch (err) {
    const detalle = err instanceof Error ? err.message : "error desconocido";
    return { ok: false, mensaje: `No se pudo eliminar la evaluación: ${detalle}` };
  }

  await registrarAuditoria({
    admin: quienAdmin,
    accion: "eliminar_evaluacion",
    tablaAfectada: "evaluaciones",
    registroId: evaluacionId,
    cantidadRegistros:
      1 + resumen.asignaciones + resumen.preguntasVinculadas + resumen.intentos + resumen.respuestas + resumen.resultados,
    detalle: { evaluacion: nombre, ...resumen },
  });

  revalidatePath("/admin/gestion-datos");
  revalidatePath("/docente/evaluaciones");
  return { ok: true, mensaje: `La evaluación "${nombre}" fue eliminada definitivamente.` };
}

// ---------------------------------------------------------------------
// Limpieza general de resultados (todo el sistema)
// ---------------------------------------------------------------------
export async function obtenerResumenLimpiezaGeneral() {
  const quienAdmin = await exigirPerfil(["admin"]);
  return obtenerResumenLimpiezaGeneralDb(quienAdmin.id);
}

export async function limpiarHistorialGeneral(confirmacionTexto: string): Promise<ResultadoAccion> {
  const quienAdmin = await exigirPerfil(["admin"]);
  if (confirmacionTexto !== "LIMPIAR HISTORIAL") {
    return { ok: false, mensaje: 'Debés escribir exactamente "LIMPIAR HISTORIAL" para confirmar.' };
  }

  const resumen = await obtenerResumenLimpiezaGeneralDb(quienAdmin.id);
  try {
    await limpiarTodosLosIntentos(quienAdmin.id);
  } catch (err) {
    const detalle = err instanceof Error ? err.message : "error desconocido";
    return { ok: false, mensaje: `No se pudo limpiar el historial: ${detalle}` };
  }

  await registrarAuditoria({
    admin: quienAdmin,
    accion: "limpiar_historial_general",
    tablaAfectada: "intentos",
    cantidadRegistros: resumen.intentos + resumen.respuestas + resumen.resultados,
    detalle: { ...resumen },
  });

  revalidatePath("/admin/gestion-datos");
  return {
    ok: true,
    mensaje: `El historial fue eliminado correctamente: ${resumen.intentos} intento(s), ${resumen.respuestas} respuesta(s), ${resumen.resultados} resultado(s). Usuarios, cursos, evaluaciones y el banco de preguntas quedaron intactos.`,
  };
}
