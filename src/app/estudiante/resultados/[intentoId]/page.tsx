import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { exigirPerfil } from "@/lib/auth";
import { obtenerEvaluacionPorId } from "@/lib/db/evaluaciones";
import { obtenerDesgloseIntento, obtenerIntentoPorId } from "@/lib/db/intentos";
import { NOMBRE_INSTITUCION } from "@/lib/marca";
import { mensajeDesempeno } from "@/lib/scoring";
import { CAPACIDADES, DIFICULTADES, EJES, type ResultadoDesglose } from "@/lib/types";
import { GraficoDesempeno } from "@/components/resultados/GraficoDesempeno";
import { BotonImprimir } from "@/components/resultados/BotonImprimir";
import { Logo } from "@/components/Logo";
import { PanelRevision } from "./PanelRevision";

const ETIQUETA_EJE = Object.fromEntries(EJES.map((e) => [e.value, e.label]));
const ETIQUETA_CAPACIDAD = Object.fromEntries(CAPACIDADES.map((c) => [c.value, c.label]));
const ETIQUETA_DIFICULTAD = Object.fromEntries(DIFICULTADES.map((d) => [d.value, d.label]));

function etiquetaDeClave(tipo: string, clave: string): string {
  if (tipo === "eje") return ETIQUETA_EJE[clave] ?? clave;
  if (tipo === "capacidad") return ETIQUETA_CAPACIDAD[clave] ?? clave;
  if (tipo === "dificultad") return ETIQUETA_DIFICULTAD[clave] ?? clave;
  return clave;
}

export default async function PaginaResultados({
  params,
}: {
  params: Promise<{ intentoId: string }>;
}) {
  const perfil = await exigirPerfil(["estudiante"]);
  const { intentoId } = await params;

  const it = await obtenerIntentoPorId(perfil.id, intentoId);
  if (!it) notFound();

  if (it.estado === "en_curso") {
    redirect(`/estudiante/intento/${intentoId}`);
  }

  const evaluacion = await obtenerEvaluacionPorId(perfil.id, it.evaluacion_id);
  if (!evaluacion) notFound();
  const desglose = await obtenerDesgloseIntento(perfil.id, intentoId);

  const porTipo = (tipo: string) => desglose.filter((d: ResultadoDesglose) => d.tipo_agrupacion === tipo);

  if (!evaluacion.mostrar_resultado_inmediato) {
    return (
      <div className="tarjeta mx-auto max-w-lg text-center">
        <h1 className="text-xl font-bold text-lila-800">Evaluación entregada</h1>
        <p className="mt-2 text-texto-secundario">
          Tu evaluación se entregó correctamente. El/la docente todavía no habilitó la visualización de resultados
          para esta evaluación.
        </p>
      </div>
    );
  }

  const minutos = Math.floor((it.tiempo_utilizado_segundos ?? 0) / 60);
  const segundos = (it.tiempo_utilizado_segundos ?? 0) % 60;

  return (
    <div className="flex flex-col gap-6">
      {/* Encabezado solo para impresión */}
      <div className="hidden items-center gap-3 border-b border-borde pb-4 print:flex">
        <Logo tamano="md" />
        <div>
          <p className="font-bold text-lila-800">Simulador Aprender Arte Nuevo — Instituto {NOMBRE_INSTITUCION}</p>
          <p className="text-sm text-texto-secundario">
            {perfil.nombre} {perfil.apellido} · {new Date().toLocaleDateString("es-AR")}
          </p>
        </div>
      </div>

      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-lila-800">{evaluacion.nombre}</h1>
          <p className="text-texto-secundario">Resultado del intento #{it.numero_intento}</p>
        </div>
        <BotonImprimir />
      </div>

      <div
        className={`imprimible rounded-2xl border-2 p-6 text-center ${
          it.aprobado ? "border-exito bg-exito-50" : "border-advertencia bg-advertencia-50"
        }`}
      >
        <p className="text-4xl font-extrabold text-lila-800">{it.porcentaje_obtenido}%</p>
        <p className={`mt-1 font-semibold ${it.aprobado ? "text-exito" : "text-advertencia"}`}>
          {it.aprobado ? "Evaluación aprobada" : "Evaluación no aprobada"}
        </p>
      </div>

      <div className="tarjeta imprimible grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Dato etiqueta="Correctas" valor={String(it.correctas)} />
        <Dato etiqueta="Incorrectas" valor={String(it.incorrectas)} />
        <Dato etiqueta="Sin responder" valor={String(it.sin_responder)} />
        <Dato etiqueta="Tiempo utilizado" valor={`${minutos}m ${segundos}s`} />
      </div>

      <div className="tarjeta imprimible">
        <h2 className="mb-3 font-semibold text-lila-800">Rendimiento por eje matemático</h2>
        <GraficoDesempeno
          datos={porTipo("eje").map((d) => ({ etiqueta: etiquetaDeClave("eje", d.clave), porcentaje: d.porcentaje }))}
        />
      </div>

      <SeccionDesglose titulo="Contenidos" filas={porTipo("contenido")} tipo="contenido" etiquetaDeClave={etiquetaDeClave} />
      <SeccionDesglose titulo="Capacidades evaluadas" filas={porTipo("capacidad")} tipo="capacidad" etiquetaDeClave={etiquetaDeClave} />
      <SeccionDesglose titulo="Nivel de dificultad" filas={porTipo("dificultad")} tipo="dificultad" etiquetaDeClave={etiquetaDeClave} />

      {evaluacion.permitir_revision && <PanelRevision intentoId={intentoId} />}
    </div>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div>
      <p className="text-xs text-texto-secundario">{etiqueta}</p>
      <p className="text-lg font-semibold text-texto">{valor}</p>
    </div>
  );
}

function SeccionDesglose({
  titulo,
  filas,
  tipo,
  etiquetaDeClave,
}: {
  titulo: string;
  filas: ResultadoDesglose[];
  tipo: string;
  etiquetaDeClave: (tipo: string, clave: string) => string;
}) {
  if (filas.length === 0) return null;
  return (
    <div className="tarjeta imprimible">
      <h2 className="mb-3 font-semibold text-lila-800">{titulo}</h2>
      <ul className="flex flex-col gap-3">
        {filas.map((f) => (
          <li key={f.clave}>
            <div className="flex items-center justify-between text-sm">
              <span className="text-texto">{etiquetaDeClave(tipo, f.clave)}</span>
              <span className="text-texto-secundario">
                {f.correctas}/{f.total} · {f.porcentaje}%
              </span>
            </div>
            <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-lila-100">
              <div className="h-full bg-lila-600" style={{ width: `${f.porcentaje}%` }} />
            </div>
            <p className="mt-1 text-xs font-medium text-lila-600">{mensajeDesempeno(f.porcentaje)}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
