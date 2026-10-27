"use server";

import { revalidatePath } from "next/cache";
import { exigirPerfil } from "@/lib/auth";
import { registrarAuditoria } from "@/lib/auditoria";
import {
  actualizarActivo,
  actualizarDatosPerfil,
  cambiarRolPerfil,
  crearPerfil,
  eliminarPerfilEnCascada,
  obtenerPerfilBasico,
  obtenerResumenEliminacion,
} from "@/lib/db/usuarios";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import type { RolUsuario } from "@/lib/types";

export interface ResultadoAccion {
  ok: boolean;
  mensaje: string;
}

export interface EstadoFormularioUsuario {
  error: string | null;
  mensaje?: string | null;
}

function generarPasswordTemporal(): string {
  return `Aprender${Math.floor(1000 + Math.random() * 9000)}!`;
}

export async function crearUsuario(
  _estadoPrevio: EstadoFormularioUsuario,
  formData: FormData
): Promise<EstadoFormularioUsuario> {
  const quienAdmin = await exigirPerfil(["admin"]);
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const nombre = String(formData.get("nombre") ?? "").trim();
  const apellido = String(formData.get("apellido") ?? "").trim();
  const rol = String(formData.get("rol") ?? "estudiante") as RolUsuario;

  if (!email || !nombre || !apellido) return { error: "Completá todos los campos." };

  const admin = crearClienteAdmin();
  const password = generarPasswordTemporal();

  // Paso 1: crear el usuario en Supabase Auth (proyecto nuevo, solo Auth).
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { rol, nombre, apellido },
  });

  if (error || !data.user) {
    return { error: `No se pudo crear el usuario: ${error?.message ?? "error desconocido"}` };
  }

  // Paso 2: insertar el perfil en Neon. Ya no hay un trigger que lo haga
  // solo (no existe cruzando bases distintas) — si este paso falla,
  // revertimos borrando el usuario de Auth para no dejar una cuenta sin
  // perfil (transacción compensatoria, no hay atomicidad real entre
  // Supabase Auth y Neon).
  try {
    await crearPerfil(quienAdmin.id, { id: data.user.id, email, nombre, apellido, rol });
  } catch (err) {
    await admin.auth.admin.deleteUser(data.user.id).catch(() => {
      // Si ni siquiera se puede revertir, queda un auth.users sin perfil:
      // detectable (no puede loguear, 0 filas en perfiles) y corregible a
      // mano borrando ese usuario desde el panel de Supabase.
    });
    const detalle = err instanceof Error ? err.message : "error desconocido";
    return { error: `No se pudo crear el perfil del usuario (se revirtió el alta en Auth): ${detalle}` };
  }

  revalidatePath("/admin/usuarios");
  return { error: null, mensaje: `Usuario creado: ${email} — Contraseña temporal: ${password}` };
}

export async function alternarActivo(perfilId: string, activo: boolean): Promise<ResultadoAccion> {
  const quienAdmin = await exigirPerfil(["admin"]);

  const perfil = await obtenerPerfilBasico(quienAdmin.id, perfilId);
  if (!perfil) return { ok: false, mensaje: "No se encontró el usuario." };

  await actualizarActivo(quienAdmin.id, perfilId, activo);

  await registrarAuditoria({
    admin: quienAdmin,
    accion: activo ? "reactivar_usuario" : "desactivar_usuario",
    tablaAfectada: "perfiles",
    registroId: perfilId,
    cantidadRegistros: 1,
    detalle: { email: perfil.email },
  });

  revalidatePath("/admin/usuarios");
  return {
    ok: true,
    mensaje: activo
      ? `${perfil.nombre} ${perfil.apellido} fue reactivado/a correctamente.`
      : `${perfil.nombre} ${perfil.apellido} fue desactivado/a correctamente.`,
  };
}

export async function cambiarRol(perfilId: string, rol: RolUsuario) {
  const quienAdmin = await exigirPerfil(["admin"]);
  await cambiarRolPerfil(quienAdmin.id, perfilId, rol);
  revalidatePath("/admin/usuarios");
}

export async function actualizarDatosUsuario(
  perfilId: string,
  datos: { nombre: string; apellido: string }
): Promise<ResultadoAccion> {
  const quienAdmin = await exigirPerfil(["admin"]);
  const nombre = datos.nombre.trim();
  const apellido = datos.apellido.trim();
  if (!nombre || !apellido) return { ok: false, mensaje: "Nombre y apellido son obligatorios." };

  await actualizarDatosPerfil(quienAdmin.id, perfilId, { nombre, apellido });

  revalidatePath("/admin/usuarios");
  revalidatePath(`/admin/usuarios/${perfilId}`);
  return { ok: true, mensaje: "Los datos del usuario se actualizaron correctamente." };
}

export interface ResumenEliminacionEstudiante {
  nombre: string;
  apellido: string;
  email: string;
  cursoDivision: string | null;
  evaluacionesRealizadas: number;
  resultadosAsociados: number;
}

export async function obtenerResumenEliminacionEstudiante(
  perfilId: string
): Promise<ResumenEliminacionEstudiante> {
  const quienAdmin = await exigirPerfil(["admin"]);
  const resumen = await obtenerResumenEliminacion(quienAdmin.id, perfilId);
  if (!resumen) throw new Error("No se encontró el estudiante.");
  if (resumen.rol !== "estudiante") {
    throw new Error("Esta acción solo está disponible para cuentas de estudiante.");
  }
  return resumen;
}

export async function eliminarEstudianteDefinitivo(
  perfilId: string,
  confirmacionTexto: string
): Promise<ResultadoAccion> {
  const quienAdmin = await exigirPerfil(["admin"]);
  if (confirmacionTexto !== "ELIMINAR") {
    return { ok: false, mensaje: 'Debés escribir exactamente "ELIMINAR" para confirmar.' };
  }
  if (perfilId === quienAdmin.id) {
    return { ok: false, mensaje: "No podés eliminar tu propia cuenta de administradora." };
  }

  const resumen = await obtenerResumenEliminacion(quienAdmin.id, perfilId);
  if (!resumen) return { ok: false, mensaje: "No se encontró el estudiante." };
  if (resumen.rol !== "estudiante") {
    return { ok: false, mensaje: "Esta acción solo está disponible para cuentas de estudiante." };
  }

  // Paso 1: borrar en Neon (cascada completa: curso_integrantes, intentos,
  // intento_preguntas, respuestas_estudiante, resultado_desglose). Si esto
  // falla, no se toca Supabase Auth: mejor un usuario que sigue pudiendo
  // entrar que una cuenta de Auth borrada con datos huérfanos en Neon.
  try {
    await eliminarPerfilEnCascada(quienAdmin.id, perfilId);
  } catch (err) {
    const detalle = err instanceof Error ? err.message : "error desconocido";
    return { ok: false, mensaje: `No se pudo eliminar los datos del estudiante: ${detalle}` };
  }

  // Paso 2: solo si Neon se borró con éxito, borrar el usuario de Auth.
  const admin = crearClienteAdmin();
  const { error } = await admin.auth.admin.deleteUser(perfilId);
  if (error) {
    return {
      ok: false,
      mensaje: `Se borraron los datos pero no se pudo eliminar el acceso del estudiante: ${error.message}`,
    };
  }

  await registrarAuditoria({
    admin: quienAdmin,
    accion: "eliminar_estudiante_definitivo",
    tablaAfectada: "perfiles",
    registroId: perfilId,
    cantidadRegistros: 1 + resumen.cantidadIntentos,
    detalle: { email: resumen.email, intentos_eliminados: resumen.cantidadIntentos },
  });

  revalidatePath("/admin/usuarios");
  return { ok: true, mensaje: `${resumen.nombre} ${resumen.apellido} fue eliminado/a definitivamente.` };
}
