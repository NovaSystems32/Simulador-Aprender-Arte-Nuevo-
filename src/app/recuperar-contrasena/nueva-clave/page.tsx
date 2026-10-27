import { redirect } from "next/navigation";
import { crearClienteServidor } from "@/lib/supabase/server";
import { Logo } from "@/components/Logo";
import { FormularioNuevaClave } from "./FormularioNuevaClave";

export default async function PaginaNuevaClave() {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/recuperar-contrasena");
  }

  return (
    <main className="flex flex-1 items-center justify-center bg-fondo px-4 py-12">
      <div className="w-full max-w-sm rounded-2xl border border-borde bg-blanco p-8 shadow-sm">
        <div className="flex flex-col items-center text-center">
          <Logo tamano="md" />
          <h1 className="mt-4 text-xl font-bold text-lila-800">Elegí tu nueva contraseña</h1>
        </div>
        <div className="mt-6">
          <FormularioNuevaClave />
        </div>
      </div>
    </main>
  );
}
