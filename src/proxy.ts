import { NextResponse, type NextRequest } from "next/server";
import { NOMBRE_COOKIE_SESION } from "@/lib/firebase/cookie";
import { prefijoProtegidoDe } from "@/lib/permisos";

// Chequeo optimista: solo mira si hay cookie de sesión, sin verificarla
// (no se puede usar el SDK de administrador de Firebase acá — su dependencia
// jwks-rsa -> jose es ESM-only y el bundler de Next para el middleware no
// logra empaquetarla sin romper en runtime). La verificación real de la
// cookie Y el control de rol/activo contra Neon ya los hace `exigirPerfil`
// (src/lib/auth.ts) en cada layout protegido (admin/docente/estudiante) y en
// cada Route Handler de /api — ahí sí corren como función de servidor normal,
// sin este problema de bundling. Este middleware es solo una redirección
// temprana para el caso común (sin cookie en absoluto); una cookie presente
// pero inválida/expirada o de un rol sin permiso igual termina redirigida
// por esos chequeos reales un paso más adelante.
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!prefijoProtegidoDe(pathname)) {
    return NextResponse.next();
  }

  const cookieSesion = request.cookies.get(NOMBRE_COOKIE_SESION)?.value;
  if (!cookieSesion) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
