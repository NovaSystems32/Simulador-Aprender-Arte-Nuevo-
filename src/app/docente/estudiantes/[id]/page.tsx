import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirPerfil } from "@/lib/auth";
import { listarCursosDeEstudiante } from "@/lib/db/cursos";
import { listarIntentosDeEstudianteConEvaluacion } from "@/lib/db/intentos";
import { obtenerPerfilCompleto } from "@/lib/db/usuarios";

const ETIQUETA_ESTADO_INTENTO: Record<string, string> = {
  no_iniciado: "No iniciado",
  en_curso: "En curso",
  entregado: "Entregado",
  expirado: "Expirado",
};

/**
 * Ficha de solo lectura de un estudiante, para docentes y administradores.
 * Un docente solo puede ver estudiantes que comparten al menos un curso con
 * él/ella: lo hace cumplir la política RLS `perfiles_select` (no una
 * verificación manual acá) — si no comparten curso, la consulta del perfil
 * directamente no devuelve filas y cae en notFound().
 */
export default async function PaginaEstudianteDocente({ params }: { params: Promise<{ id: string }> }) {
  const perfilActual = await exigirPerfil(["docente", "admin"]);
  const { id } = await params;

  const estudiante = await obtenerPerfilCompleto(perfilActual.id, id);
  if (!estudiante || estudiante.rol !== "estudiante") notFound();

  const [cursosEstudiante, intentos] = await Promise.all([
    listarCursosDeEstudiante(perfilActual.id, id),
    listarIntentosDeEstudianteConEvaluacion(perfilActual.id, id),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-lila-800">
          {estudiante.nombre} {estudiante.apellido}
        </h1>
        <Link href="/docente/cursos" className="btn-neutro">
          Volver a mis cursos
        </Link>
      </div>

      <div className="tarjeta grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <p className="text-xs text-texto-secundario">Correo</p>
          <p className="text-texto">{estudiante.email}</p>
        </div>
        <div>
          <p className="text-xs text-texto-secundario">Estado</p>
          <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${estudiante.activo ? "bg-exito-50 text-exito" : "bg-lila-100 text-texto-secundario"}`}>
            {estudiante.activo ? "Activo" : "Inactivo"}
          </span>
        </div>
      </div>

      <div className="tarjeta">
        <h2 className="text-lg font-bold text-lila-800">Cursos</h2>
        {cursosEstudiante.length > 0 ? (
          <ul className="mt-3 flex flex-col gap-2">
            {cursosEstudiante.map((curso, i) => (
              <li key={i} className="text-sm text-texto">
                {curso.nombre} / {curso.division} <span className="text-texto-secundario">({curso.anioLectivo})</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-texto-secundario">No está inscripto/a en ningún curso.</p>
        )}
      </div>

      <div className="tarjeta">
        <h2 className="text-lg font-bold text-lila-800">Evaluaciones y resultados</h2>
        {intentos.length > 0 ? (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="border-b border-borde text-xs uppercase text-texto-secundario">
                <tr>
                  <th className="py-2 pr-4">Evaluación</th>
                  <th className="py-2 pr-4">Estado</th>
                  <th className="py-2 pr-4">Puntaje</th>
                  <th className="py-2 pr-4">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {intentos.map((i) => (
                  <tr key={i.id} className="border-b border-borde last:border-0">
                    <td className="py-2 pr-4">{i.evaluacion_nombre ?? "—"}</td>
                    <td className="py-2 pr-4">{ETIQUETA_ESTADO_INTENTO[i.estado] ?? i.estado}</td>
                    <td className="py-2 pr-4">
                      {i.porcentaje_obtenido != null ? `${Math.round(i.porcentaje_obtenido)}%` : "—"}
                    </td>
                    <td className="py-2 pr-4 text-texto-secundario">
                      {new Date(i.created_at).toLocaleDateString("es-AR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-2 text-sm text-texto-secundario">Todavía no rindió ninguna evaluación.</p>
        )}
      </div>
    </div>
  );
}
