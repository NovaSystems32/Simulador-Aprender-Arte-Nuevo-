import { redirect } from "next/navigation";
import { Logo } from "@/components/Logo";
import { FormularioNuevaClave } from "./FormularioNuevaClave";

/**
 * Firebase manda acá el enlace del correo de restablecimiento (configurado
 * como "Action URL" propia en la consola de Firebase, ver README), con
 * `oobCode` como parámetro — es el código de un solo uso que se canjea por
 * la contraseña nueva en actions.ts. Sin `oobCode` no hay nada que hacer acá.
 */
export default async function PaginaNuevaClave({
  searchParams,
}: {
  searchParams: Promise<{ oobCode?: string }>;
}) {
  const { oobCode } = await searchParams;
  if (!oobCode) {
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
          <FormularioNuevaClave oobCode={oobCode} />
        </div>
      </div>
    </main>
  );
}
