import { notFound } from "next/navigation";
import { exigirPerfil } from "@/lib/auth";
import { listarEstudiantesDelCurso, obtenerCursoPorId } from "@/lib/db/cursos";
import { listarPerfilesPorRol } from "@/lib/db/usuarios";
import { FormularioIncorporarEstudiante } from "./FormularioIncorporarEstudiante";
import { GestionEstudiantesCurso, type EstudianteFila } from "./GestionEstudiantesCurso";

export default async function PaginaDetalleCurso({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const perfil = await exigirPerfil(["docente", "admin"]);
  const { id } = await params;

  const curso = await obtenerCursoPorId(perfil.id, id);
  if (!curso) notFound();

  const [estudiantesCurso, todosLosEstudiantes]: [EstudianteFila[], EstudianteFila[]] = await Promise.all([
    listarEstudiantesDelCurso(perfil.id, id),
    listarPerfilesPorRol(perfil.id, "estudiante"),
  ]);

  const idsEnCurso = new Set(estudiantesCurso.map((e) => e.id));
  const estudiantesDisponibles: EstudianteFila[] = todosLosEstudiantes.filter((e) => !idsEnCurso.has(e.id));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-lila-800">
          {curso.nombre} &quot;{curso.division}&quot;
        </h1>
        <p className="text-texto-secundario">Ciclo lectivo {curso.anio_lectivo}</p>
      </div>

      <div className="tarjeta">
        <h2 className="mb-3 font-bold text-lila-800">Estudiantes del curso</h2>
        <GestionEstudiantesCurso
          cursoId={id}
          estudiantesCurso={estudiantesCurso}
          estudiantesDisponibles={estudiantesDisponibles}
        />
      </div>

      <FormularioIncorporarEstudiante cursoId={id} />
    </div>
  );
}
