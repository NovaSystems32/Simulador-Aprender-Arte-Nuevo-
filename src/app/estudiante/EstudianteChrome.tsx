"use client";

import { usePathname } from "next/navigation";
import { PanelLayout, type EnlaceNav } from "@/components/layout/PanelLayout";

/**
 * La pantalla de rendición del examen (/estudiante/intento/[id]) debe ser limpia y sin
 * distracciones, así que no lleva el sidebar/header del panel — solo su propia barra superior
 * minimalista (ver TomarEvaluacionClient.tsx). El resto del área de estudiante sí usa el chrome
 * completo con menú lateral.
 */
export function EstudianteChrome({
  enlaces,
  perfil,
  marcaAgua,
  children,
}: {
  enlaces: EnlaceNav[];
  perfil: { nombre: string; apellido: string; rol: string };
  marcaAgua: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const esPantallaDeExamen = pathname.startsWith("/estudiante/intento/");

  if (esPantallaDeExamen) {
    return <div className="min-h-screen bg-fondo">{children}</div>;
  }

  return (
    <PanelLayout enlaces={enlaces} perfil={perfil} marcaAgua={marcaAgua}>
      {children}
    </PanelLayout>
  );
}
