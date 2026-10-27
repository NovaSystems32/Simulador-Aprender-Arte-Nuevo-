import { exigirPerfil } from "@/lib/auth";
import { listarCursosVisibles } from "@/lib/db/cursos";
import { listarPreguntas } from "@/lib/db/preguntas";
import { FormularioNuevaEvaluacion } from "./FormularioNuevaEvaluacion";

export default async function PaginaNuevaEvaluacion() {
  const perfil = await exigirPerfil(["docente", "admin"]);

  const [cursos, preguntas] = await Promise.all([
    listarCursosVisibles(perfil.id),
    listarPreguntas(perfil.id, { estado: "activa", ordenarPor: "codigo" }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-lila-800">Nueva evaluación</h1>
      <FormularioNuevaEvaluacion
        cursos={cursos}
        preguntas={preguntas}
        docenteNombre={`${perfil.nombre} ${perfil.apellido}`}
      />
    </div>
  );
}
