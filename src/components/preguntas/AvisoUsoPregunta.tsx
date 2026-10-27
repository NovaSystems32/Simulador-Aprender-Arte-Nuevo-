import { obtenerPerfilActual } from "@/lib/auth";
import { obtenerUsoPregunta, textoAvisoUso } from "@/lib/preguntas-uso";

/** Aviso (Server Component) para el docente al editar una pregunta que ya está en evaluaciones o intentos. */
export async function AvisoUsoPregunta({ preguntaId }: { preguntaId: string }) {
  const perfil = await obtenerPerfilActual();
  if (!perfil) return null;
  const texto = textoAvisoUso(await obtenerUsoPregunta(perfil.id, preguntaId));
  if (!texto) return null;
  return (
    <p role="note" className="alerta-advertencia max-w-3xl">
      {texto}
    </p>
  );
}
