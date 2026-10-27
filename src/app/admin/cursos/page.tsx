import Link from "next/link";
import { exigirPerfil } from "@/lib/auth";
import { listarCursosConDocenteYConteo } from "@/lib/db/cursos";
import { listarPerfilesPorRol } from "@/lib/db/usuarios";
import { FormularioNuevoCursoAdmin } from "./FormularioNuevoCursoAdmin";

export default async function PaginaCursosAdmin() {
  const perfil = await exigirPerfil(["admin"]);

  const [filas, docentes] = await Promise.all([
    listarCursosConDocenteYConteo(perfil.id),
    listarPerfilesPorRol(perfil.id, "docente"),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-lila-800">Cursos</h1>

      <FormularioNuevoCursoAdmin docentes={docentes} />

      <div className="hidden overflow-x-auto rounded-xl border border-borde bg-blanco sm:block">
        <table className="w-full min-w-[500px] text-left text-sm">
          <thead className="border-b border-borde bg-lila-50 text-xs uppercase text-texto-secundario">
            <tr>
              <th className="px-4 py-3">Curso</th>
              <th className="px-4 py-3">Ciclo lectivo</th>
              <th className="px-4 py-3">Docente titular</th>
              <th className="px-4 py-3">Estudiantes</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filas.map((c) => (
              <tr key={c.id} className="border-b border-borde last:border-0">
                <td className="px-4 py-3 font-medium text-texto">
                  {c.nombre} &quot;{c.division}&quot;
                </td>
                <td className="px-4 py-3 text-texto-secundario">{c.anio_lectivo}</td>
                <td className="px-4 py-3 text-texto-secundario">
                  {c.docente ? `${c.docente.nombre} ${c.docente.apellido}` : "Sin asignar"}
                </td>
                <td className="px-4 py-3 text-texto-secundario">{c.estudiantes}</td>
                <td className="px-4 py-3">
                  <Link href={`/docente/cursos/${c.id}`} className="font-medium text-lila-600 hover:underline">
                    Ver / gestionar estudiantes
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 sm:hidden">
        {filas.map((c) => (
          <div key={c.id} className="tarjeta">
            <p className="font-medium text-texto">
              {c.nombre} &quot;{c.division}&quot;
            </p>
            <dl className="mt-2 grid grid-cols-2 gap-2 text-xs text-texto-secundario">
              <div>
                <dt className="text-texto-secundario/70">Ciclo lectivo</dt>
                <dd>{c.anio_lectivo}</dd>
              </div>
              <div>
                <dt className="text-texto-secundario/70">Docente titular</dt>
                <dd>{c.docente ? `${c.docente.nombre} ${c.docente.apellido}` : "Sin asignar"}</dd>
              </div>
              <div>
                <dt className="text-texto-secundario/70">Estudiantes</dt>
                <dd>{c.estudiantes}</dd>
              </div>
            </dl>
            <Link
              href={`/docente/cursos/${c.id}`}
              className="mt-3 inline-block text-sm font-medium text-lila-600 hover:underline"
            >
              Ver / gestionar estudiantes →
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
