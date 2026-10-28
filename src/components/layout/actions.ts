"use server";

import { redirect } from "next/navigation";
import { authAdmin } from "@/lib/firebase/admin";
import { borrarCookieDeSesion, obtenerUsuarioActual } from "@/lib/firebase/session";

export async function cerrarSesion() {
  const usuario = await obtenerUsuarioActual();
  await borrarCookieDeSesion();
  // Revoca los refresh tokens del usuario: además de borrar la cookie local,
  // invalida cualquier otra sesión activa con el mismo usuario (por ejemplo,
  // si la abrió en otro dispositivo y quiere cerrar todo).
  if (usuario) {
    await authAdmin.revokeRefreshTokens(usuario.uid).catch(() => {});
  }
  redirect("/login");
}
