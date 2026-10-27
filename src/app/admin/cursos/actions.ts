"use server";

import { revalidatePath } from "next/cache";
import { exigirPerfil } from "@/lib/auth";
import { crearCurso } from "@/lib/db/cursos";

export interface EstadoFormulario {
  error: string | null;
}

export async function crearCursoAdmin(
  _estadoPrevio: EstadoFormulario,
  formData: FormData
): Promise<EstadoFormulario> {
  const perfil = await exigirPerfil(["admin"]);
  const nombre = String(formData.get("nombre") ?? "").trim();
  const division = String(formData.get("division") ?? "").trim();
  const anioLectivo = Number(formData.get("anio_lectivo") ?? new Date().getFullYear());
  const docenteTitularId = String(formData.get("docente_titular_id") ?? "") || null;

  if (!nombre || !division) return { error: "Completá el nombre y la división del curso." };

  try {
    await crearCurso(perfil.id, {
      nombre,
      division,
      anioLectivo,
      docenteTitularId,
      institucionId: null,
    });
  } catch (err) {
    const detalle = err instanceof Error ? err.message : "error desconocido";
    return { error: `No se pudo crear el curso: ${detalle}` };
  }

  revalidatePath("/admin/cursos");
  return { error: null };
}
