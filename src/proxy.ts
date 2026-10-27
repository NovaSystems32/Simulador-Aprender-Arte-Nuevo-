import { createServerClient } from "@supabase/ssr";
import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { conSesion } from "@/lib/db/contexto";
import { perfiles } from "@/lib/db/schema";
import { prefijoProtegidoDe, rolPuedeAcceder } from "@/lib/permisos";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (prefijoProtegidoDe(pathname)) {
    if (!user) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirectTo", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // El rol/activo ya no vive en la misma base que la sesión de Supabase
    // Auth: se consulta Neon directamente (driver Edge-compatible), dentro
    // de una transacción con RLS activo para este mismo usuario.
    const perfil = await conSesion(user.id, async (tx) => {
      const filas = await tx
        .select({ rol: perfiles.rol, activo: perfiles.activo })
        .from(perfiles)
        .where(eq(perfiles.id, user.id))
        .limit(1);
      return filas[0];
    });

    if (!rolPuedeAcceder(pathname, perfil?.rol ?? null, perfil?.activo ?? false)) {
      return NextResponse.redirect(new URL("/no-autorizado", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
