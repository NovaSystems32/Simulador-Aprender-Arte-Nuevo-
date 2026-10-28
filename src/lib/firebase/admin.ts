import "server-only";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

/**
 * Firebase Admin SDK, usado SOLO en servidor: verificar cookies de sesión,
 * crear/borrar usuarios (alta/baja desde el panel), revocar sesiones. Nunca
 * se importa desde código que corre en el navegador.
 */
function crearApp(): App {
  const existente = getApps();
  if (existente.length > 0) return existente[0];

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Faltan FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL o FIREBASE_PRIVATE_KEY (credenciales de la cuenta de servicio de Firebase)."
    );
  }

  return initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      // En .env.local los saltos de línea de la clave privada quedan como "\n"
      // literales; hay que convertirlos de vuelta a saltos de línea reales.
      privateKey: privateKey.replace(/\\n/g, "\n"),
    }),
  });
}

export const authAdmin = getAuth(crearApp());
