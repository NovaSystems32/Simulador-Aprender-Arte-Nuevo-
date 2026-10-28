"use server";

import { revalidatePath } from "next/cache";
import { exigirPerfil } from "@/lib/auth";
import {
  agregarEstudiantesAlCurso as agregarEstudiantesAlCursoDb,
  agregarIntegranteACurso,
  crearCurso as crearCursoDb,
  quitarIntegrante as quitarIntegranteDb,
  quitarIntegrantes,
} from "@/lib/db/cursos";
import { crearPerfil } from "@/lib/db/usuarios";
import { authAdmin } from "@/lib/firebase/admin";

export interface EstadoFormulario {
  error: string | null;
  mensaje?: string | null;
}

export async function crearCurso(
  _estadoPrevio: EstadoFormulario,
  formData: FormData
): Promise<EstadoFormulario> {
  const perfil = await exigirPerfil(["docente", "admin"]);
  const nombre = String(formData.get("nombre") ?? "").trim();
  const division = String(formData.get("division") ?? "").trim();
  const anioLectivo = Number(formData.get("anio_lectivo") ?? new Date().getFullYear());

  if (!nombre || !division) return { error: "Completá el nombre y la división del curso." };

  try {
    await crearCursoDb(perfil.id, {
      nombre,
      division,
      anioLectivo,
      docenteTitularId: perfil.id,
      institucionId: perfil.institucion_id,
    });
  } catch (err) {
    const detalle = err instanceof Error ? err.message : "error desconocido";
    return { error: `No se pudo crear el curso: ${detalle}` };
  }

  revalidatePath("/docente/cursos");
  return { error: null, mensaje: "Curso creado correctamente." };
}

function generarPasswordTemporal(): string {
  return `Aprender${Math.floor(1000 + Math.random() * 9000)}!`;
}

export async function incorporarEstudianteNuevo(
  cursoId: string,
  _estadoPrevio: EstadoFormulario,
  formData: FormData
): Promise<EstadoFormulario> {
  const perfilActual = await exigirPerfil(["docente", "admin"]);
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const nombre = String(formData.get("nombre") ?? "").trim();
  const apellido = String(formData.get("apellido") ?? "").trim();

  if (!email || !nombre || !apellido) return { error: "Completá nombre, apellido y correo del estudiante." };

  const passwordTemporal = generarPasswordTemporal();

  // Paso 1: usuario en Firebase Auth.
  let uid: string;
  try {
    const usuario = await authAdmin.createUser({
      email,
      password: passwordTemporal,
      emailVerified: true,
      displayName: `${nombre} ${apellido}`,
    });
    uid = usuario.uid;
  } catch (err) {
    const detalle = err instanceof Error ? err.message : "error desconocido";
    return { error: `No se pudo crear el estudiante: ${detalle}` };
  }

  // Paso 2: perfil en Neon + alta en el curso. Si algo de esto falla,
  // revertimos el alta en Auth (transacción compensatoria).
  try {
    await crearPerfil(perfilActual.id, { id: uid, email, nombre, apellido, rol: "estudiante" });
    await agregarIntegranteACurso(perfilActual.id, cursoId, uid, "estudiante");
  } catch (err) {
    await authAdmin.deleteUser(uid).catch(() => {});
    const detalle = err instanceof Error ? err.message : "error desconocido";
    return { error: `Estudiante no se pudo incorporar (se revirtió el alta en Auth): ${detalle}` };
  }

  revalidatePath(`/docente/cursos/${cursoId}`);
  return {
    error: null,
    mensaje: `Estudiante agregado. Usuario: ${email} — Contraseña temporal: ${passwordTemporal} (pedile que la cambie en su primer ingreso).`,
  };
}

// Agregar un estudiante ya registrado se hace ahora en lote desde
// GestionEstudiantesCurso (ver agregarEstudiantesAlCurso más abajo), con
// búsqueda y selección múltiple en vez de un campo de correo uno por uno.

export async function quitarIntegrante(cursoId: string, perfilId: string) {
  const perfil = await exigirPerfil(["docente", "admin"]);
  await quitarIntegranteDb(perfil.id, cursoId, perfilId);
  revalidatePath(`/docente/cursos/${cursoId}`);
}

export interface ResultadoAccionCurso {
  ok: boolean;
  mensaje: string;
}

/** Alta masiva: agrega varios estudiantes ya registrados a un curso de una sola vez. */
export async function agregarEstudiantesAlCurso(
  cursoId: string,
  perfilIds: string[]
): Promise<ResultadoAccionCurso> {
  const perfil = await exigirPerfil(["docente", "admin"]);
  if (perfilIds.length === 0) return { ok: false, mensaje: "Seleccioná al menos un estudiante." };

  let agregados: number;
  try {
    agregados = await agregarEstudiantesAlCursoDb(perfil.id, cursoId, perfilIds);
  } catch (err) {
    const detalle = err instanceof Error ? err.message : "error desconocido";
    return { ok: false, mensaje: `No se pudo agregar a los estudiantes: ${detalle}` };
  }

  if (agregados === 0) {
    return { ok: false, mensaje: "Los estudiantes seleccionados ya estaban en el curso." };
  }

  revalidatePath(`/docente/cursos/${cursoId}`);
  const omitidos = perfilIds.length - agregados;
  return {
    ok: true,
    mensaje:
      omitidos > 0
        ? `Se agregaron ${agregados} estudiante(s) (${omitidos} ya estaban en el curso).`
        : `Se agregaron ${agregados} estudiante(s) al curso.`,
  };
}

/** Baja masiva: quita varios estudiantes de un curso de una sola vez. */
export async function quitarEstudiantesDelCurso(
  cursoId: string,
  perfilIds: string[]
): Promise<ResultadoAccionCurso> {
  const perfil = await exigirPerfil(["docente", "admin"]);
  if (perfilIds.length === 0) return { ok: false, mensaje: "Seleccioná al menos un estudiante." };

  try {
    await quitarIntegrantes(perfil.id, cursoId, perfilIds);
  } catch (err) {
    const detalle = err instanceof Error ? err.message : "error desconocido";
    return { ok: false, mensaje: `No se pudo quitar a los estudiantes: ${detalle}` };
  }

  revalidatePath(`/docente/cursos/${cursoId}`);
  return { ok: true, mensaje: `Se quitó a ${perfilIds.length} estudiante(s) del curso.` };
}
