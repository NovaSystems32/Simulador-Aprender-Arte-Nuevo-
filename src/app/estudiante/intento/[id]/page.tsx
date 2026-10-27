import { exigirPerfil } from "@/lib/auth";
import { TomarEvaluacionClient } from "./TomarEvaluacionClient";

export default async function PaginaTomarEvaluacion({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await exigirPerfil(["estudiante"]);
  const { id } = await params;

  return <TomarEvaluacionClient intentoId={id} />;
}
