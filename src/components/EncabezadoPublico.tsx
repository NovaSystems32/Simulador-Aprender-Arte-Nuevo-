import Link from "next/link";
import { Logo } from "@/components/Logo";
import { NOMBRE_APP, NOMBRE_INSTITUCION } from "@/lib/marca";

export function EncabezadoPublico() {
  return (
    <header className="border-b border-borde bg-blanco">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <Link href="/" className="flex items-center gap-3">
          <Logo tamano="sm" />
          <span className="flex flex-col leading-tight">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-amarillo-600">
              {NOMBRE_INSTITUCION}
            </span>
            <span className="text-lg font-bold text-lila-800">{NOMBRE_APP}</span>
          </span>
        </Link>
        <Link href="/login" className="btn-primario">
          Iniciar sesión
        </Link>
      </div>
    </header>
  );
}
