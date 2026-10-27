import { notFound } from "next/navigation";
import { exigirPerfil } from "@/lib/auth";
import { obtenerPreguntaPorId } from "@/lib/db/preguntas";
import { AvisoUsoPregunta } from "@/components/preguntas/AvisoUsoPregunta";
import { FormularioEdicionAdmin } from "./FormularioEdicionAdmin";

export default async function PaginaEditarPreguntaAdmin({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const perfilActual = await exigirPerfil(["admin"]);
  const { id } = await params;

  const pregunta = await obtenerPreguntaPorId(perfilActual.id, id);
  if (!pregunta) notFound();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-lila-800">Editar pregunta {pregunta.codigo}</h1>
      <AvisoUsoPregunta preguntaId={pregunta.id} />
      <div className="max-w-3xl rounded-xl border border-slate-200 bg-white p-6">
        <FormularioEdicionAdmin pregunta={pregunta} />
      </div>
    </div>
  );
}
