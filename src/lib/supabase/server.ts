import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Cliente Supabase para Server Components / Route Handlers, con la sesión del
 * usuario autenticado. Respeta RLS: nunca usar para leer datos que deban
 * ocultarse del usuario actual (para eso está admin.ts).
 */
export async function crearClienteServidor() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // set() puede fallar si se llama desde un Server Component sin
            // middleware que refresque la sesión; es seguro ignorarlo aquí.
          }
        },
      },
    }
  );
}
