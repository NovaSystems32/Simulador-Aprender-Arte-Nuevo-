import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirPerfil } from "@/lib/auth";
import { obtenerDetalleEvaluacion, obtenerEvaluacionPorId } from "@/lib/db/evaluaciones";
import { PanelAsignaciones } from "./PanelAsignaciones";
import { BotonesEstado } from "./BotonesEstado";

export default async function PaginaDetalleEvaluacion({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const perfilActual = await exigirPerfil(["docente", "admin"]);
  const { id } = await params;

  const ev = await obtenerEvaluacionPorId(perfilActual.id, id);
  if (!ev) notFound();

  const detalle = await obtenerDetalleEvaluacion(perfilActual.id, id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-lila-800">{ev.nombre}</h1>
          {ev.descripcion && <p className="mt-1 text-slate-600">{ev.descripcion}</p>}
        </div>
        <BotonesEstado evaluacionId={ev.id} estadoActual={ev.estado} />
      </div>

      <div className="grid grid-cols-2 gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-4">
        <Dato etiqueta="Tipo" valor={ev.tipo === "manual" ? "Manual" : "Automática"} />
        <Dato etiqueta="Preguntas" valor={String(ev.cantidad_preguntas)} />
        <Dato etiqueta="Duración" valor={`${ev.duracion_minutos} min`} />
        <Dato etiqueta="Aprobación" valor={`${ev.puntaje_aprobacion}%`} />
        <Dato etiqueta="Intentos máx." valor={String(ev.intentos_max)} />
        <Dato etiqueta="Intentos entregados" valor={String(detalle.entregados)} />
        <Dato etiqueta="Calculadora" valor={ev.permitir_calculadora ? "Sí" : "No"} />
        <Dato etiqueta="Descuento por error" valor={ev.descuento_por_incorrecta ? "Sí" : "No"} />
      </div>

      <PanelAsignaciones evaluacionId={ev.id} cursos={detalle.cursos} asignados={detalle.asignaciones} />

      <Link href={`/docente/reportes?evaluacion=${ev.id}`} className="w-fit text-sm font-medium text-lila-600 hover:underline">
        Ver reportes de esta evaluación →
      </Link>
    </div>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{etiqueta}</p>
      <p className="font-semibold text-slate-800">{valor}</p>
    </div>
  );
}
