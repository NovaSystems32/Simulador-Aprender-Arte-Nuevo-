import { exigirPerfil } from "@/lib/auth";
import { PanelLayout, type EnlaceNav } from "@/components/layout/PanelLayout";
import { NOMBRE_INSTITUCION } from "@/lib/marca";

const ENLACES: EnlaceNav[] = [
  { href: "/admin", label: "Panel", icono: "dashboard" },
  { href: "/admin/usuarios", label: "Usuarios", icono: "usuarios" },
  { href: "/admin/cursos", label: "Cursos", icono: "cursos" },
  { href: "/admin/preguntas", label: "Banco de preguntas", icono: "preguntas" },
  { href: "/docente/reportes", label: "Reportes", icono: "reportes" },
  { href: "/admin/gestion-datos", label: "Gestión de datos", icono: "historial" },
  { href: "/admin/configuracion", label: "Configuración", icono: "configuracion" },
];

export default async function LayoutAdmin({ children }: { children: React.ReactNode }) {
  const perfil = await exigirPerfil(["admin"]);

  return (
    <PanelLayout enlaces={ENLACES} perfil={perfil} marcaAgua={`Instituto ${NOMBRE_INSTITUCION} — Simulador educativo independiente`}>
      {children}
    </PanelLayout>
  );
}
