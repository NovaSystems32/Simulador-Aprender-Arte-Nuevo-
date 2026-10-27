import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirPerfil } from "@/lib/auth";
import { listarCursosDePerfil } from "@/lib/db/cursos";
import { listarIntentosDeEstudianteConEvaluacion } from "@/lib/db/intentos";
import { obtenerPerfilCompleto } from "@/lib/db/usuarios";

const ETIQUETA_ROL: Record<string, string> = {
  admin: "Administrador",
  docente: "Docente",
  estudiante: "Estudiante",
};

const ETIQUETA_ESTADO_INTENTO: Record<string, string> = {
  no_iniciado: "No iniciado",
  en_curso: "En curso",
  entregado: "Entregado",
  expirado: "Expirado",
};

export default async function PaginaVerUsuario({ params }: { params: Promise<{ id: string }> }) {
  const perfilActual = await exigirPerfil(["admin"]);
  const { id } = await params;

  const perfil = await obtenerPerfilCompleto(perfilActual.id, id);
  if (!perfil) notFound();

  const [cursos, intentos] = await Promise.all([
    listarCursosDePerfil(perfilActual.id, id),
    listarIntentosDeEstudianteConEvaluacion(perfilActual.id, id),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-lila-800">
          {perfil.nombre} {perfil.apellido}
        </h1>
        <div className="flex gap-3">
          <Link href={`/admin/usuarios/${perfil.id}/editar`} className="btn-neutro">
            Editar
          </Link>
          <Link href="/admin/usuarios" className="btn-neutro">
            Volver
          </Link>
        </div>
      </div>

      <div className="tarjeta grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <p className="text-xs text-texto-secundario">Correo</p>
          <p className="text-texto">{perfil.email}</p>
        </div>
        <div>
          <p className="text-xs text-texto-secundario">Rol</p>
          <p className="text-texto">{ETIQUETA_ROL[perfil.rol] ?? perfil.rol}</p>
        </div>
        <div>
          <p className="text-xs text-texto-secundario">Estado</p>
          <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${perfil.activo ? "bg-exito-50 text-exito" : "bg-lila-100 text-texto-secundario"}`}>
            {perfil.activo ? "Activo" : "Inactivo"}
          </span>
        </div>
        <div>
          <p className="text-xs text-texto-secundario">Alta</p>
          <p className="text-texto">{new Date(perfil.created_at).toLocaleDateString("es-AR")}</p>
        </div>
      </div>

      <div className="tarjeta">
        <h2 className="text-lg font-bold text-lila-800">Cursos</h2>
        {cursos.length > 0 ? (
          <ul className="mt-3 flex flex-col gap-2">
            {cursos.map((c, i) => (
              <li key={i} className="text-sm text-texto">
                {c.nombre} / {c.division}{" "}
                <span className="text-texto-secundario">
                  ({c.anioLectivo}) — {c.rolEnCurso}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-texto-secundario">No está inscripto/a en ningún curso.</p>
        )}
      </div>

      {perfil.rol === "estudiante" && (
        <div className="tarjeta">
          <h2 className="text-lg font-bold text-lila-800">Historial de intentos</h2>
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
      )}
    </div>
  );
}
