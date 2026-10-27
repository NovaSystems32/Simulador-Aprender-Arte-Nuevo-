import { exigirPerfil } from "@/lib/auth";
import { PanelLayout, type EnlaceNav } from "@/components/layout/PanelLayout";
import { NOMBRE_INSTITUCION } from "@/lib/marca";

const ENLACES: EnlaceNav[] = [
  { href: "/docente", label: "Panel", icono: "dashboard" },
  { href: "/docente/preguntas", label: "Banco de preguntas", icono: "preguntas" },
  { href: "/docente/evaluaciones", label: "Evaluaciones", icono: "evaluaciones" },
  { href: "/docente/cursos", label: "Cursos", icono: "cursos" },
  { href: "/docente/reportes", label: "Reportes", icono: "reportes" },
];

export default async function LayoutDocente({ children }: { children: React.ReactNode }) {
  const perfil = await exigirPerfil(["docente", "admin"]);

  return (
    <PanelLayout enlaces={ENLACES} perfil={perfil} marcaAgua={`Instituto ${NOMBRE_INSTITUCION} — Simulador educativo independiente`}>
      {children}
    </PanelLayout>
  );
}
