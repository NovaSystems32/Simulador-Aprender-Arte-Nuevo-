"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { conSesion } from "@/lib/db/contexto";
import { perfiles } from "@/lib/db/schema";
import { rutaInicioPorRol } from "@/lib/permisos";
import { crearClienteServidor } from "@/lib/supabase/server";
import type { RolUsuario } from "@/lib/types";

export interface EstadoLogin {
  error: string | null;
}

export async function iniciarSesion(
  _estadoPrevio: EstadoLogin,
  formData: FormData
): Promise<EstadoLogin> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const redirectTo = String(formData.get("redirectTo") ?? "");

  if (!email || !password) {
    return { error: "Ingresá tu usuario y tu contraseña." };
  }

  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    return { error: "Usuario o contraseña incorrectos." };
  }

  const perfil = await conSesion(data.user.id, async (tx) => {
    const filas = await tx
      .select({ rol: perfiles.rol, activo: perfiles.activo })
      .from(perfiles)
      .where(eq(perfiles.id, data.user.id))
      .limit(1);
    return filas[0];
  });

  if (!perfil || !perfil.activo) {
    await supabase.auth.signOut();
    return { error: "Tu cuenta no está activa. Consultá con la institución." };
  }

  redirect(redirectTo && redirectTo.startsWith("/") ? redirectTo : rutaInicioPorRol(perfil.rol as RolUsuario));
}
