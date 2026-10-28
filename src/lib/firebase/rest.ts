import "server-only";

/**
 * Llamadas a la API REST de Identity Toolkit (Firebase Auth) que el SDK de
 * administrador NO puede hacer (verificar una contraseña, enviar/canjear un
 * código de restablecimiento): esas operaciones solo existen del lado
 * "cliente" de Firebase. En vez de agregar el SDK cliente completo (pensado
 * para el navegador, con su propio manejo de tokens), se llaman directo por
 * REST desde los Server Actions — mismo resultado, sin JS de Firebase en el
 * bundle del navegador.
 *
 * Referencia: https://firebase.google.com/docs/reference/rest/auth
 */

const BASE_URL = "https://identitytoolkit.googleapis.com/v1";

function apiKey(): string {
  const key = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!key) throw new Error("Falta NEXT_PUBLIC_FIREBASE_API_KEY.");
  return key;
}

interface ErrorIdentityToolkit {
  error?: { message?: string };
}

async function llamar<T>(ruta: string, cuerpo: Record<string, unknown>): Promise<T> {
  const respuesta = await fetch(`${BASE_URL}/${ruta}?key=${apiKey()}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cuerpo),
    cache: "no-store",
  });
  const datos = await respuesta.json();
  if (!respuesta.ok) {
    const mensaje = (datos as ErrorIdentityToolkit).error?.message ?? "ERROR_DESCONOCIDO";
    throw new Error(mensaje);
  }
  return datos as T;
}

export interface ResultadoSignIn {
  idToken: string;
  localId: string;
  email: string;
}

/** Verifica email+contraseña. Lanza con el código de error de Firebase (p.ej. "INVALID_LOGIN_CREDENTIALS") si no son válidos. */
export async function signInWithPassword(email: string, password: string): Promise<ResultadoSignIn> {
  return llamar<ResultadoSignIn>("accounts:signInWithPassword", { email, password, returnSecureToken: true });
}

/**
 * Envía el correo de restablecimiento de contraseña. `continueUrl` es la
 * página propia a la que Firebase vuelve después de que el usuario hace clic
 * en el botón del correo (requiere que, en la consola de Firebase, la
 * plantilla "Restablecer contraseña" tenga configurada esa URL de acción
 * como propia; ver README).
 */
export async function enviarRestablecimiento(email: string, continueUrl: string): Promise<void> {
  await llamar("accounts:sendOobCode", { requestType: "PASSWORD_RESET", email, continueUrl });
}

/** Canjea el código del enlace de restablecimiento por una contraseña nueva. */
export async function restablecerContrasena(oobCode: string, newPassword: string): Promise<void> {
  await llamar("accounts:resetPassword", { oobCode, newPassword });
}
