import { createClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase con la service role key. SOLO debe importarse desde código
 * que corre en el servidor (Route Handlers). Ignora RLS por completo, por eso
 * es el único lugar donde el flujo de rendición de examen puede filtrar la
 * respuesta correcta antes de enviar la respuesta al estudiante.
 */
export function crearClienteAdmin() {
  if (typeof window !== "undefined") {
    throw new Error("crearClienteAdmin() no debe ejecutarse en el navegador.");
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
