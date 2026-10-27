"use server";

import { headers } from "next/headers";
import { crearClienteServidor } from "@/lib/supabase/server";

export interface EstadoRecuperacion {
  error: string | null;
  enviado?: boolean;
}

export async function solicitarRecuperacion(
  _estadoPrevio: EstadoRecuperacion,
  formData: FormData
): Promise<EstadoRecuperacion> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Ingresá tu correo electrónico." };

  const listaHeaders = await headers();
  const origen = `${listaHeaders.get("x-forwarded-proto") ?? "http"}://${listaHeaders.get("host")}`;

  const supabase = await crearClienteServidor();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origen}/api/auth/callback?next=/recuperar-contrasena/nueva-clave`,
  });

  // No revelamos si el correo existe o no (evita enumeración de usuarios): siempre "enviado".
  if (error) {
    return { error: "No se pudo procesar la solicitud. Intentá de nuevo en unos minutos." };
  }
  return { error: null, enviado: true };
}
