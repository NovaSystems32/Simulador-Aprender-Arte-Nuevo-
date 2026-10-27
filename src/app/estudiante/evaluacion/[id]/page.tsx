import { notFound } from "next/navigation";
import { exigirPerfil } from "@/lib/auth";
import { obtenerEvaluacionPorId } from "@/lib/db/evaluaciones";
import { BotonComenzar } from "./BotonComenzar";

export default async function PaginaInstruccionesEvaluacion({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const perfil = await exigirPerfil(["estudiante"]);
  const { id } = await params;

  const evaluacion = await obtenerEvaluacionPorId(perfil.id, id);
  if (!evaluacion) notFound();

  const materiales: string[] = [];
  if (evaluacion.permitir_calculadora) materiales.push("Calculadora");
  if (evaluacion.permitir_hoja_formulas) materiales.push("Hoja de fórmulas");
  if (materiales.length === 0) materiales.push("Ninguno (no se permite calculadora ni hoja de fórmulas)");

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-lila-800">{evaluacion.nombre}</h1>
        {evaluacion.descripcion && <p className="mt-2 text-slate-600">{evaluacion.descripcion}</p>}
      </div>

      <dl className="grid grid-cols-2 gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-3">
        <div>
          <dt className="text-xs text-slate-400">Cantidad de preguntas</dt>
          <dd className="font-semibold text-slate-800">{evaluacion.cantidad_preguntas}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-400">Tiempo disponible</dt>
          <dd className="font-semibold text-slate-800">{evaluacion.duracion_minutos} minutos</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-400">Intentos permitidos</dt>
          <dd className="font-semibold text-slate-800">{evaluacion.intentos_max}</dd>
        </div>
        <div className="col-span-2 sm:col-span-3">
          <dt className="text-xs text-slate-400">Materiales permitidos</dt>
          <dd className="font-semibold text-slate-800">{materiales.join(", ")}</dd>
        </div>
      </dl>

      <div className="rounded-xl border border-amarillo-500 bg-lila-100 p-5 text-sm text-lila-800">
        <p className="font-semibold">Instrucciones</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Vas a ver una pregunta por pantalla, con cuatro opciones de respuesta.</li>
          <li>Podés navegar entre preguntas con los botones &quot;Anterior&quot; y &quot;Siguiente&quot;, o desde el panel de navegación.</li>
          <li>Podés marcar preguntas para revisar más tarde antes de entregar.</li>
          <li>Tus respuestas se guardan automáticamente a medida que avanzás.</li>
          <li>Si se agota el tiempo, la evaluación se entrega automáticamente con las respuestas que hayas guardado.</li>
        </ul>
      </div>

      <BotonComenzar evaluacionId={evaluacion.id} />
    </div>
  );
}
