"use client";

function construirUrl(base: string, params: Record<string, string | undefined>) {
  const usp = new URLSearchParams();
  for (const [clave, valor] of Object.entries(params)) {
    if (valor) usp.set(clave, valor);
  }
  const query = usp.toString();
  return query ? `${base}?${query}` : base;
}

export function BotonesExportar({
  curso,
  evaluacion,
  estudiante,
}: {
  curso?: string;
  evaluacion?: string;
  estudiante?: string;
}) {
  const hayFiltroGeneral = Boolean(curso || evaluacion);

  return (
    <div className="flex flex-wrap gap-2">
      <a
        href={construirUrl("/api/reportes/csv", { curso, evaluacion })}
        className="rounded-lg border border-borde px-3 py-2 text-sm font-medium text-texto hover:bg-lila-50"
      >
        Exportar CSV
      </a>
      <a
        href={construirUrl("/api/reportes/pdf", { curso, evaluacion })}
        className="rounded-lg border border-borde px-3 py-2 text-sm font-medium text-texto hover:bg-lila-50"
      >
        Exportar PDF
      </a>
      <a
        href={hayFiltroGeneral ? construirUrl("/api/reportes/excel/general", { curso, evaluacion }) : undefined}
        aria-disabled={!hayFiltroGeneral}
        title={hayFiltroGeneral ? undefined : "Elegí un curso o una evaluación para exportar el informe general"}
        className={`rounded-lg px-3 py-2 text-sm font-medium ${
          hayFiltroGeneral ? "btn-primario" : "cursor-not-allowed border border-borde text-texto-secundario opacity-60"
        }`}
      >
        Exportar Excel (informe general)
      </a>
      <a
        href={estudiante ? construirUrl("/api/reportes/excel/estudiante", { estudiante, evaluacion }) : undefined}
        aria-disabled={!estudiante}
        title={estudiante ? undefined : "Seleccioná un estudiante para exportar su informe individual"}
        className={`rounded-lg px-3 py-2 text-sm font-medium ${
          estudiante ? "btn-secundario" : "cursor-not-allowed border border-borde text-texto-secundario opacity-60"
        }`}
      >
        Exportar Excel (informe por estudiante)
      </a>
    </div>
  );
}
