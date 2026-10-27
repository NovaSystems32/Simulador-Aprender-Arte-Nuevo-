import Link from "next/link";
import { exigirPerfil } from "@/lib/auth";
import { listarPreguntas } from "@/lib/db/preguntas";
import { FiltrosPreguntas } from "@/components/preguntas/FiltrosPreguntas";
import { TablaPreguntas } from "@/components/preguntas/TablaPreguntas";
import { AvisoGuardadoPregunta } from "@/components/preguntas/AvisoGuardadoPregunta";
import { ImportarExportarPreguntas } from "@/components/preguntas/ImportarExportarPreguntas";
import type { Pregunta } from "@/lib/types";

export default async function PaginaBancoPreguntasAdmin({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const perfil = await exigirPerfil(["admin"]);
  const filtros = await searchParams;

  let preguntas: Pregunta[];
  let errorCarga: string | null = null;
  try {
    preguntas = await listarPreguntas(perfil.id, filtros);
  } catch (err) {
    preguntas = [];
    errorCarga = err instanceof Error ? err.message : "error desconocido";
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-lila-800">Banco de preguntas (todas las instituciones)</h1>
          <p className="text-sm text-slate-600">Como administrador, ves el banco completo de todos los docentes.</p>
        </div>
        <Link
          href="/admin/preguntas/nueva"
          className="rounded-lg bg-lila-600 px-4 py-2 text-sm font-semibold text-white hover:bg-lila-800"
        >
          Nueva pregunta
        </Link>
      </div>

      {filtros.guardada && <AvisoGuardadoPregunta codigo={filtros.guardada} accion={filtros.accion} />}

      <FiltrosPreguntas />
      <ImportarExportarPreguntas preguntas={preguntas} />

      {errorCarga ? (
        <p className="rounded-md bg-error-50 px-3 py-2 text-sm text-error">
          No se pudo cargar el banco de preguntas: {errorCarga}
        </p>
      ) : (
        <TablaPreguntas preguntas={preguntas} basePath="/admin/preguntas" esAdmin />
      )}

      <p className="text-xs text-slate-400">{preguntas.length} pregunta(s) en total</p>
    </div>
  );
}
