"use server";

import { revalidatePath } from "next/cache";
import { exigirPerfil } from "@/lib/auth";
import { actualizarNombreInstitucion, upsertConfiguracion } from "@/lib/db/configuracion";
import { obtenerInstitucionDePerfil } from "@/lib/db/usuarios";

export interface EstadoConfiguracion {
  error: string | null;
  guardado?: boolean;
}

export async function guardarConfiguracion(
  _estadoPrevio: EstadoConfiguracion,
  formData: FormData
): Promise<EstadoConfiguracion> {
  const perfil = await exigirPerfil(["admin"]);
  const nombreInstitucion = String(formData.get("nombre_institucion") ?? "").trim();
  const puntajeAprobacionDefault = Number(formData.get("puntaje_aprobacion_default") ?? 60);

  if (!nombreInstitucion) return { error: "El nombre de la institución es obligatorio." };

  try {
    const institucionId = await obtenerInstitucionDePerfil(perfil.id, perfil.id);

    if (institucionId) {
      await actualizarNombreInstitucion(perfil.id, institucionId, nombreInstitucion);
    }

    await upsertConfiguracion(perfil.id, {
      institucionId: institucionId ?? null,
      clave: "puntaje_aprobacion_default",
      valor: { valor: puntajeAprobacionDefault },
    });
  } catch (err) {
    const detalle = err instanceof Error ? err.message : "error desconocido";
    return { error: `No se pudo guardar: ${detalle}` };
  }

  revalidatePath("/admin/configuracion");
  return { error: null, guardado: true };
}
