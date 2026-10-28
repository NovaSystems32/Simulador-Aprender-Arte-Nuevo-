"use server";

import { redirect } from "next/navigation";
import { restablecerContrasena } from "@/lib/firebase/rest";

export interface EstadoNuevaClave {
  error: string | null;
}

export async function actualizarContrasena(
  oobCode: string,
  _estadoPrevio: EstadoNuevaClave,
  formData: FormData
): Promise<EstadoNuevaClave> {
  const password = String(formData.get("password") ?? "");
  const confirmacion = String(formData.get("confirmacion") ?? "");

  if (password.length < 8) return { error: "La contraseña debe tener al menos 8 caracteres." };
  if (password !== confirmacion) return { error: "Las contraseñas no coinciden." };

  try {
    await restablecerContrasena(oobCode, password);
  } catch {
    return { error: "El enlace expiró o no es válido. Solicitá uno nuevo." };
  }

  redirect("/login?recuperada=1");
}
