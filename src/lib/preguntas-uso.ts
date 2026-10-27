import "server-only";
import { sql } from "drizzle-orm";
import { conSesion } from "./db/contexto";

export interface UsoPregunta {
  /** Evaluaciones que incluyen la pregunta. */
  evaluaciones: number;
  /** Intentos (rendidos o en curso) que ya recibieron una copia de la pregunta. */
  intentos: number;
}

/**
 * Cuántas evaluaciones e intentos usan una pregunta. Se consulta a través de
 * dos funciones SECURITY DEFINER (`contar_uso_pregunta_*`, ver
 * db/migrations/0003_conteo_uso_preguntas.sql) que devuelven únicamente un
 * número: RLS le ocultaría a un docente los intentos de cursos ajenos, pero
 * el aviso tiene que ser exacto para todo el banco compartido sin exponer
 * contenido de evaluaciones/intentos de otros cursos.
 *
 * Los intentos NO se ven afectados por editar la pregunta: al iniciarse, cada
 * intento guarda su propia copia (enunciado, opciones, respuesta correcta y
 * explicación) en intento_preguntas. Editar `preguntas` solo cambia lo que verán
 * los intentos que se inicien DESPUÉS.
 */
export async function obtenerUsoPregunta(usuarioActualId: string, id: string): Promise<UsoPregunta> {
  return conSesion(usuarioActualId, async (tx) => {
    const [evFilas, itFilas] = await Promise.all([
      tx.execute(sql`select contar_uso_pregunta_evaluaciones(${id}) as c`),
      tx.execute(sql`select contar_uso_pregunta_intentos(${id}) as c`),
    ]);
    return {
      evaluaciones: Number((evFilas as unknown as { rows: { c: number }[] }).rows[0]?.c ?? 0),
      intentos: Number((itFilas as unknown as { rows: { c: number }[] }).rows[0]?.c ?? 0),
    };
  });
}

export function textoAvisoUso(uso: UsoPregunta): string | null {
  if (uso.evaluaciones === 0 && uso.intentos === 0) return null;
  const partes: string[] = [];
  if (uso.evaluaciones > 0) partes.push(`${uso.evaluaciones} evaluación${uso.evaluaciones === 1 ? "" : "es"}`);
  if (uso.intentos > 0) partes.push(`${uso.intentos} intento${uso.intentos === 1 ? "" : "s"} de estudiantes`);
  const historia =
    uso.intentos > 0
      ? "Los intentos ya realizados o en curso conservan el enunciado y las opciones originales; los resultados históricos no cambian. "
      : "";
  return `Esta pregunta se usa en ${partes.join(" y ")}. ${historia}Tus cambios se aplicarán a los intentos que se inicien a partir de ahora.`;
}
