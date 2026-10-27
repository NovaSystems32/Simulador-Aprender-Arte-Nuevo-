"use server";

import { redirect } from "next/navigation";
import { crearClienteServidor } from "@/lib/supabase/server";

export interface EstadoNuevaClave {
  error: string | null;
}

export async function actualizarContrasena(
  _estadoPrevio: EstadoNuevaClave,
  formData: FormData
): Promise<EstadoNuevaClave> {
  const password = String(formData.get("password") ?? "");
  const confirmacion = String(formData.get("confirmacion") ?? "");

  if (password.length < 8) return { error: "La contraseña debe tener al menos 8 caracteres." };
  if (password !== confirmacion) return { error: "Las contraseñas no coinciden." };

  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "El enlace expiró. Solicitá uno nuevo." };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: "No se pudo actualizar la contraseña. Intentá de nuevo." };

  await supabase.auth.signOut();
  redirect("/login?recuperada=1");
}
