import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function PaginaNoAutorizado() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 bg-fondo px-4 py-16 text-center">
      <Logo tamano="md" />
      <h1 className="text-2xl font-bold text-lila-800">No tenés acceso a esta sección</h1>
      <p className="max-w-md text-texto-secundario">
        Tu usuario no tiene permisos para ver esta página. Si creés que es un error, consultá con tu
        docente o con la administración del sistema.
      </p>
      <Link href="/login" className="btn-primario">
        Volver a iniciar sesión
      </Link>
    </main>
  );
}
