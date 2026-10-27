import { exigirPerfil } from "@/lib/auth";
import { listarCursosVisibles } from "@/lib/db/cursos";
import { listarEvaluacionesVisibles } from "@/lib/db/evaluaciones";
import {
  listarDesglosePorIntentos,
  listarEstudiantesVisibles,
  listarInfoPreguntas,
  listarIntentosReporte,
  listarPreguntasDeIntentos,
  listarRespuestasDeIntentos,
} from "@/lib/db/reportes";
import { CAPACIDADES, DIFICULTADES, EJES } from "@/lib/types";
import { agregarPorTipo, calcularEstadisticas, calcularPreguntasConMasErrores } from "@/lib/reportes";
import { GraficoDesempeno } from "@/components/resultados/GraficoDesempeno";
import { FiltrosReportes } from "./FiltrosReportes";
import { BotonesExportar } from "./BotonesExportar";

const ETIQUETA_EJE = Object.fromEntries(EJES.map((e) => [e.value, e.label]));
const ETIQUETA_CAPACIDAD = Object.fromEntries(CAPACIDADES.map((c) => [c.value, c.label]));
const ETIQUETA_DIFICULTAD = Object.fromEntries(DIFICULTADES.map((d) => [d.value, d.label]));

export default async function PaginaReportes({
  searchParams,
}: {
  searchParams: Promise<{ curso?: string; evaluacion?: string; estudiante?: string }>;
}) {
  const perfil = await exigirPerfil(["docente", "admin"]);
  const { curso: cursoIdFiltro, evaluacion: evaluacionIdFiltro, estudiante: estudianteIdFiltro } = await searchParams;

  const [cursos, estudiantesDisponibles, evaluaciones] = await Promise.all([
    listarCursosVisibles(perfil.id),
    listarEstudiantesVisibles(perfil.id, cursoIdFiltro),
    listarEvaluacionesVisibles(perfil.id),
  ]);

  const evaluacionesFiltradas = cursoIdFiltro ? evaluaciones.filter((e) => e.curso_id === cursoIdFiltro) : evaluaciones;

  const listaIntentos = await listarIntentosReporte(perfil.id, { cursoId: cursoIdFiltro, evaluacionId: evaluacionIdFiltro });

  const { totalIntentos, promedio, porcentajeAprobacion, mejor, peor, tiempoPromedioMin } =
    calcularEstadisticas(listaIntentos);

  const idsIntentos = listaIntentos.map((i) => i.id);
  let desglose: { tipo_agrupacion: string; clave: string; correctas: number; total: number }[] = [];
  let preguntasError: ReturnType<typeof calcularPreguntasConMasErrores> = [];
  if (idsIntentos.length > 0) {
    desglose = await listarDesglosePorIntentos(perfil.id, idsIntentos);
    const [preguntasIntento, respuestasTodas, infoPorId] = await Promise.all([
      listarPreguntasDeIntentos(perfil.id, idsIntentos),
      listarRespuestasDeIntentos(perfil.id, idsIntentos),
      listarInfoPreguntas(perfil.id),
    ]);
    preguntasError = calcularPreguntasConMasErrores(idsIntentos, preguntasIntento, respuestasTodas, infoPorId);
  }

  const porEje = agregarPorTipo(desglose, "eje", ETIQUETA_EJE);
  const porCapacidad = agregarPorTipo(desglose, "capacidad", ETIQUETA_CAPACIDAD);
  const porDificultad = agregarPorTipo(desglose, "dificultad", ETIQUETA_DIFICULTAD);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-lila-800">Reportes</h1>
        <BotonesExportar curso={cursoIdFiltro} evaluacion={evaluacionIdFiltro} estudiante={estudianteIdFiltro} />
      </div>

      <FiltrosReportes cursos={cursos} evaluaciones={evaluacionesFiltradas} estudiantes={estudiantesDisponibles} />

      <div className="grid grid-cols-2 gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-3 lg:grid-cols-6">
        <Dato etiqueta="Intentos" valor={String(totalIntentos)} />
        <Dato etiqueta="Promedio" valor={`${promedio}%`} />
        <Dato etiqueta="Aprobación" valor={`${porcentajeAprobacion}%`} />
        <Dato etiqueta="Mejor resultado" valor={`${mejor}%`} />
        <Dato etiqueta="Resultado más bajo" valor={`${peor}%`} />
        <Dato etiqueta="Tiempo promedio" valor={`${tiempoPromedioMin} min`} />
      </div>

      {totalIntentos === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
          No hay intentos entregados para los filtros seleccionados.
        </p>
      ) : (
        <>
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="mb-3 font-semibold text-lila-800">Rendimiento por eje matemático</h2>
            <GraficoDesempeno datos={porEje} />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <TablaSimple titulo="Rendimiento por capacidad evaluada" filas={porCapacidad} />
            <TablaSimple titulo="Rendimiento por dificultad" filas={porDificultad} />
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="mb-3 font-semibold text-lila-800">Preguntas con mayor porcentaje de error</h2>
            {preguntasError.length === 0 ? (
              <p className="text-sm text-slate-500">Sin datos suficientes.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-slate-100">
                {preguntasError.map((p) => (
                  <li key={p.pregunta_id} className="flex items-center justify-between gap-4 py-2 text-sm">
                    <span>
                      <span className="font-mono text-xs text-slate-400">{p.codigo}</span> {p.enunciado.slice(0, 80)}
                      {p.enunciado.length > 80 && "…"}
                    </span>
                    <span className="shrink-0 font-semibold text-error">
                      {Math.round((p.incorrectas / p.total) * 100)}% de error
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{etiqueta}</p>
      <p className="text-lg font-semibold text-slate-800">{valor}</p>
    </div>
  );
}

function TablaSimple({ titulo, filas }: { titulo: string; filas: { etiqueta: string; porcentaje: number }[] }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="mb-3 font-semibold text-lila-800">{titulo}</h2>
      {filas.length === 0 ? (
        <p className="text-sm text-slate-500">Sin datos.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {filas.map((f) => (
            <li key={f.etiqueta} className="flex items-center justify-between text-sm">
              <span className="text-slate-700">{f.etiqueta}</span>
              <span className="font-medium text-slate-600">{f.porcentaje}%</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
