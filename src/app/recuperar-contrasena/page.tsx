import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { FormularioRecuperar } from "./FormularioRecuperar";

export const metadata: Metadata = {
  title: "Recuperar contraseña",
};

export default function PaginaRecuperarContrasena() {
  return (
    <main className="flex flex-1 items-center justify-center bg-fondo px-4 py-12">
      <div className="w-full max-w-sm rounded-2xl border border-borde bg-blanco p-8 shadow-sm">
        <div className="flex flex-col items-center text-center">
          <Logo tamano="md" />
          <h1 className="mt-4 text-xl font-bold text-lila-800">Recuperar contraseña</h1>
          <p className="mt-1 text-sm text-texto-secundario">
            Ingresá tu correo y te enviamos un enlace para elegir una nueva contraseña.
          </p>
        </div>

        <div className="mt-6">
          <FormularioRecuperar />
        </div>

        <p className="mt-6 text-center text-sm text-texto-secundario">
          <Link href="/login" className="text-lila-600 hover:underline">
            Volver a iniciar sesión
          </Link>
        </p>
      </div>
    </main>
  );
}
