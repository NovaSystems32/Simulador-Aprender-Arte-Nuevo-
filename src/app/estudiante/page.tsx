import Link from "next/link";
import { exigirPerfil } from "@/lib/auth";
import { listarEvaluacionesAsignadasAEstudiante } from "@/lib/db/evaluaciones";
import { listarResumenIntentosEstudiante } from "@/lib/db/intentos";

export default async function PanelEstudiante() {
  const perfil = await exigirPerfil(["estudiante"]);

  const [evaluaciones, intentos] = await Promise.all([
    listarEvaluacionesAsignadasAEstudiante(perfil.id),
    listarResumenIntentosEstudiante(perfil.id),
  ]);

  const ahora = new Date();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-lila-800">Hola, {perfil.nombre}</h1>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-slate-800">Evaluaciones asignadas</h2>
        {evaluaciones.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-slate-500">
            No tenés evaluaciones asignadas por el momento.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {evaluaciones.map((ev) => {
              const intentosEv = intentos.filter((i) => i.evaluacion_id === ev.id);
              const usados = intentosEv.filter((i) => i.estado === "entregado" || i.estado === "expirado").length;
              const enCurso = intentosEv.some((i) => i.estado === "en_curso");
              const cerrada = ev.fecha_cierre ? new Date(ev.fecha_cierre) < ahora : false;
              const noAbrio = ev.fecha_apertura ? new Date(ev.fecha_apertura) > ahora : false;
              const sinIntentos = usados >= ev.intentos_max && !enCurso;

              return (
                <div key={ev.id} className="rounded-xl border border-slate-200 bg-white p-5">
                  <h3 className="font-semibold text-lila-800">{ev.nombre}</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {ev.cantidad_preguntas} preguntas · {ev.duracion_minutos} minutos · {usados}/{ev.intentos_max} intentos usados
                  </p>
                  {noAbrio && (
                    <p className="mt-2 text-xs text-advertencia">
                      Se habilita el {new Date(ev.fecha_apertura!).toLocaleString("es-AR")}
                    </p>
                  )}
                  {cerrada && <p className="mt-2 text-xs text-error">Esta evaluación ya cerró.</p>}
                  {sinIntentos && !cerrada && (
                    <p className="mt-2 text-xs text-slate-500">Ya usaste todos tus intentos.</p>
                  )}
                  {!cerrada && !noAbrio && !sinIntentos && (
                    <Link
                      href={`/estudiante/evaluacion/${ev.id}`}
                      className="mt-3 inline-block rounded-lg bg-lila-600 px-4 py-2 text-sm font-semibold text-white hover:bg-lila-800"
                    >
                      {enCurso ? "Continuar evaluación" : "Ver instrucciones"}
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Link href="/estudiante/historial" className="w-fit text-sm font-medium text-lila-600 hover:underline">
        Ver mi historial de intentos →
      </Link>
    </div>
  );
}
