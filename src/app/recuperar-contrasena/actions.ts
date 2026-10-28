"use server";

import { headers } from "next/headers";
import { enviarRestablecimiento } from "@/lib/firebase/rest";

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

  // No revelamos si el correo existe o no (evita enumeración de usuarios): siempre "enviado".
  try {
    await enviarRestablecimiento(email, `${origen}/recuperar-contrasena/nueva-clave`);
  } catch {
    // EMAIL_NOT_FOUND también cae acá a propósito, por la misma razón.
  }
  return { error: null, enviado: true };
}
