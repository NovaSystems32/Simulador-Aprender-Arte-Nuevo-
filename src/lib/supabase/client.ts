"use client";

import { createBrowserClient } from "@supabase/ssr";

/** Cliente Supabase para componentes de cliente. Usa la anon key: nunca la service role. */
export function crearClienteNavegador() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
