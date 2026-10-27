import Link from "next/link";
import { exigirPerfil } from "@/lib/auth";
import { listarCursosVisibles } from "@/lib/db/cursos";

export default async function PaginaCursos() {
  const perfil = await exigirPerfil(["docente", "admin"]);
  const cursos = await listarCursosVisibles(perfil.id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-lila-800">Mis cursos</h1>
        <Link href="/docente/cursos/nuevo" className="rounded-lg bg-lila-600 px-4 py-2 text-sm font-semibold text-white hover:bg-lila-800">
          Nuevo curso
        </Link>
      </div>

      {cursos.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
          {perfil.nombre}, todavía no creaste ningún curso.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cursos.map((curso) => (
            <Link
              key={curso.id}
              href={`/docente/cursos/${curso.id}`}
              className="rounded-xl border border-slate-200 bg-white p-5 hover:border-lila-600 hover:shadow-sm"
            >
              <h2 className="font-semibold text-lila-800">
                {curso.nombre} &quot;{curso.division}&quot;
              </h2>
              <p className="mt-1 text-sm text-slate-500">Ciclo lectivo {curso.anio_lectivo}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
