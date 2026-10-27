import { obtenerPerfilActual } from "@/lib/auth";
import { obtenerIdPreguntaPorCodigo } from "@/lib/db/preguntas";
import { obtenerUsoPregunta, textoAvisoUso } from "@/lib/preguntas-uso";

/**
 * Banner del Banco de preguntas tras guardar. El texto de uso se calcula en el
 * servidor a partir del código (no se confía en texto que venga por la URL).
 */
export async function AvisoGuardadoPregunta({ codigo, accion }: { codigo: string; accion?: string }) {
  const actualizada = accion === "actualizada";
  let aviso: string | null = null;

  if (actualizada && /^[A-Z]{3}-\d{3,}$/.test(codigo)) {
    const perfil = await obtenerPerfilActual();
    if (perfil) {
      const id = await obtenerIdPreguntaPorCodigo(perfil.id, codigo);
      if (id) aviso = textoAvisoUso(await obtenerUsoPregunta(perfil.id, id));
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <p role="status" className="alerta-exito">
        Pregunta {codigo} {actualizada ? "actualizada" : "guardada"} correctamente.
      </p>
      {aviso && (
        <p role="note" className="alerta-advertencia">
          {aviso}
        </p>
      )}
    </div>
  );
}
