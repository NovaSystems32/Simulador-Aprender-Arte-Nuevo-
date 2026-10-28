"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { conSesion } from "@/lib/db/contexto";
import { perfiles } from "@/lib/db/schema";
import { signInWithPassword } from "@/lib/firebase/rest";
import { crearCookieDeSesion } from "@/lib/firebase/session";
import { rutaInicioPorRol } from "@/lib/permisos";

export interface EstadoLogin {
  error: string | null;
}

export async function iniciarSesion(
  _estadoPrevio: EstadoLogin,
  formData: FormData
): Promise<EstadoLogin> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const redirectTo = String(formData.get("redirectTo") ?? "");

  if (!email || !password) {
    return { error: "Ingresá tu usuario y tu contraseña." };
  }

  let resultado;
  try {
    resultado = await signInWithPassword(email, password);
  } catch {
    return { error: "Usuario o contraseña incorrectos." };
  }

  const perfil = await conSesion(resultado.localId, async (tx) => {
    const filas = await tx
      .select({ rol: perfiles.rol, activo: perfiles.activo })
      .from(perfiles)
      .where(eq(perfiles.id, resultado.localId))
      .limit(1);
    return filas[0];
  });

  if (!perfil || !perfil.activo) {
    return { error: "Tu cuenta no está activa. Consultá con la institución." };
  }

  // Recién acá, con la cuenta confirmada activa, se fija la cookie de sesión.
  await crearCookieDeSesion(resultado.idToken);

  redirect(redirectTo && redirectTo.startsWith("/") ? redirectTo : rutaInicioPorRol(perfil.rol));
}
