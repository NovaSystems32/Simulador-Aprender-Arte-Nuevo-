import "server-only";
import { cookies } from "next/headers";
import { authAdmin } from "./admin";

export const NOMBRE_COOKIE_SESION = "session";
/** Máximo que permite Firebase para una cookie de sesión: 14 días. */
export const DURACION_SESION_MS = 1000 * 60 * 60 * 24 * 14;

/**
 * Cambia el idToken (de corta duración, ~1h) devuelto por el login por una
 * cookie de sesión de larga duración, y la deja seteada (httpOnly, segura).
 */
export async function crearCookieDeSesion(idToken: string): Promise<void> {
  const cookieSesion = await authAdmin.createSessionCookie(idToken, { expiresIn: DURACION_SESION_MS });
  const cookieStore = await cookies();
  cookieStore.set(NOMBRE_COOKIE_SESION, cookieSesion, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DURACION_SESION_MS / 1000,
  });
}

export async function borrarCookieDeSesion(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(NOMBRE_COOKIE_SESION);
}

export interface UsuarioSesion {
  uid: string;
  email: string | null;
}

/** Verifica la cookie de sesión contra Firebase. Devuelve null si no hay sesión o es inválida/expiró. */
export async function obtenerUsuarioActual(): Promise<UsuarioSesion | null> {
  const cookieStore = await cookies();
  const cookieSesion = cookieStore.get(NOMBRE_COOKIE_SESION)?.value;
  if (!cookieSesion) return null;

  try {
    // segundo argumento true = chequea también si la sesión fue revocada
    // (por ejemplo, al desactivar la cuenta de un usuario desde el panel).
    const decoded = await authAdmin.verifySessionCookie(cookieSesion, true);
    return { uid: decoded.uid, email: decoded.email ?? null };
  } catch {
    return null;
  }
}
