import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { conSesion } from "@/lib/db/contexto";
import { authAdmin } from "@/lib/firebase/admin";
import { NOMBRE_COOKIE_SESION } from "@/lib/firebase/session";
import { perfiles } from "@/lib/db/schema";
import { prefijoProtegidoDe, rolPuedeAcceder } from "@/lib/permisos";

// A diferencia del viejo "middleware.ts" (Edge por defecto), en Next 16 el
// archivo "proxy.ts" corre siempre en runtime Node — por eso el SDK de
// administrador de Firebase (que usa módulos de Node como crypto) funciona
// acá sin configuración adicional.
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!prefijoProtegidoDe(pathname)) {
    return NextResponse.next();
  }

  const cookieSesion = request.cookies.get(NOMBRE_COOKIE_SESION)?.value;
  let uid: string | null = null;
  if (cookieSesion) {
    try {
      const decoded = await authAdmin.verifySessionCookie(cookieSesion, true);
      uid = decoded.uid;
    } catch {
      uid = null;
    }
  }

  if (!uid) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // El rol/activo vive en Neon, no en la cookie de sesión: se consulta
  // dentro de una transacción con RLS activo para este mismo usuario.
  const perfil = await conSesion(uid, async (tx) => {
    const filas = await tx
      .select({ rol: perfiles.rol, activo: perfiles.activo })
      .from(perfiles)
      .where(eq(perfiles.id, uid))
      .limit(1);
    return filas[0];
  });

  if (!rolPuedeAcceder(pathname, perfil?.rol ?? null, perfil?.activo ?? false)) {
    return NextResponse.redirect(new URL("/no-autorizado", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
