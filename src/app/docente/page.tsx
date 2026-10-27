import Link from "next/link";
import { exigirPerfil } from "@/lib/auth";
import { obtenerResumenDocente } from "@/lib/db/dashboard";

export default async function PanelDocente() {
  const perfil = await exigirPerfil(["docente", "admin"]);
  const resumen = await obtenerResumenDocente(perfil.id);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-lila-800">Hola, {perfil.nombre}</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <TarjetaEnlace href="/docente/cursos" etiqueta="Cursos" valor={String(resumen.cantidadCursos)} />
        <TarjetaEnlace href="/docente/evaluaciones" etiqueta="Evaluaciones publicadas" valor={String(resumen.evaluacionesActivas)} />
        <TarjetaEnlace href="/docente/preguntas" etiqueta="Preguntas propias" valor={String(resumen.preguntasPropias)} />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-lila-800">Últimos intentos entregados</h2>
          <Link href="/docente/reportes" className="text-sm font-medium text-lila-600 hover:underline">
            Ver reportes completos →
          </Link>
        </div>
        {resumen.intentosRecientes.length === 0 ? (
          <p className="text-sm text-slate-500">Todavía no hay intentos entregados.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-slate-100">
            {resumen.intentosRecientes.map((i) => (
              <li key={i.id} className="flex items-center justify-between py-2 text-sm">
                <span>
                  {i.estudianteNombre} {i.estudianteApellido} — <span className="text-slate-500">{i.evaluacionNombre}</span>
                </span>
                <span className="font-semibold text-lila-800">{i.porcentajeObtenido}%</span>
              </li>
            ))}
          </ul>
        )}
      </div>
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
