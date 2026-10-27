import Link from "next/link";
import { exigirPerfil } from "@/lib/auth";
import { obtenerResumenAdmin } from "@/lib/db/dashboard";

export default async function PanelAdmin() {
  const perfil = await exigirPerfil(["admin"]);
  const resumen = await obtenerResumenAdmin(perfil.id);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-lila-800">Hola, {perfil.nombre}</h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <TarjetaEnlace href="/admin/usuarios" etiqueta="Usuarios" valor={String(resumen.usuarios)} />
        <TarjetaEnlace href="/admin/cursos" etiqueta="Cursos" valor={String(resumen.cursos)} />
        <TarjetaEnlace href="/docente/evaluaciones" etiqueta="Evaluaciones" valor={String(resumen.evaluaciones)} />
        <TarjetaEnlace href="/admin/preguntas" etiqueta="Preguntas" valor={String(resumen.preguntas)} />
        <TarjetaEnlace href="/docente/reportes" etiqueta="Intentos entregados" valor={String(resumen.intentosEntregados)} />
      </div>
      <p className="text-sm text-slate-500">
        Desde el menú superior podés administrar usuarios, cursos, el banco completo de preguntas y la
        configuración general de la institución. Los reportes detallados están disponibles en{" "}
        <Link href="/docente/reportes" className="text-lila-600 hover:underline">
          Reportes
        </Link>
        .
      </p>
    </div>
  );
}

function TarjetaEnlace({ href, etiqueta, valor }: { href: string; etiqueta: string; valor: string }) {
  return (
    <Link href={href} className="rounded-xl border border-slate-200 bg-white p-5 hover:border-lila-600 hover:shadow-sm">
      <p className="text-xs text-slate-400">{etiqueta}</p>
      <p className="mt-1 text-2xl font-bold text-lila-800">{valor}</p>
    </Link>
  );
}
