import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { NOMBRE_APP, NOMBRE_INSTITUCION, SUBTITULO_APP } from "@/lib/marca";
import { FormularioLogin } from "./FormularioLogin";

export const metadata: Metadata = {
  title: "Iniciar sesión",
};

export default async function PaginaLogin({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string; recuperada?: string; error?: string }>;
}) {
  const { redirectTo, recuperada, error } = await searchParams;

  return (
    <main className="relative flex flex-1 items-center justify-center overflow-hidden bg-fondo px-4 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-amarillo-100"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -right-20 h-80 w-80 rounded-full bg-lila-100"
      />

      <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-borde bg-blanco p-8 shadow-sm">
        <div aria-hidden className="absolute inset-x-0 top-0 h-1.5 bg-amarillo-600" />
        <div className="flex flex-col items-center text-center">
          <Logo tamano="lg" />
          <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-amarillo-600">
            {NOMBRE_INSTITUCION}
          </p>
          <h1 className="mt-1 text-xl font-bold text-lila-800">{NOMBRE_APP}</h1>
          <p className="mt-1 text-sm text-texto-secundario">{SUBTITULO_APP}</p>
        </div>

        {recuperada && (
          <p role="status" className="alerta-exito mt-4">
            Tu contraseña se actualizó correctamente. Iniciá sesión con la nueva contraseña.
          </p>
        )}
        {error === "enlace_invalido" && (
          <p role="alert" className="alerta-error mt-4">
            El enlace para recuperar la contraseña no es válido o expiró. Solicitá uno nuevo.
          </p>
        )}

        <div className="mt-6">
          <FormularioLogin redirectTo={redirectTo ?? ""} />
        </div>

        <p className="mt-4 text-center text-sm">
          <Link href="/recuperar-contrasena" className="text-lila-600 hover:underline">
            ¿Olvidaste tu contraseña?
          </Link>
        </p>

        <p className="mt-6 text-center text-sm text-texto-secundario">
          <Link href="/" className="text-lila-600 hover:underline">
            Volver al inicio
          </Link>
        </p>
      </div>
    </main>
  );
}
