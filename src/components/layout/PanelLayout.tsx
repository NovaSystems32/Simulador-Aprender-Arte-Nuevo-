"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  ChevronsLeft,
  ChevronsRight,
  ClipboardList,
  GraduationCap,
  History,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  Settings,
  Users,
  X,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { NOMBRE_INSTITUCION } from "@/lib/marca";
import { NotificacionesBell } from "./NotificacionesBell";
import { cerrarSesion } from "./actions";

// Los componentes de ícono de lucide-react son funciones: no se pueden pasar como prop desde un
// Server Component (los layout.tsx de cada rol) hacia este Client Component. Por eso cada enlace
// viaja con una clave de texto, y el mapeo a los íconos reales vive acá, del lado del cliente.
const ICONOS = {
  dashboard: LayoutDashboard,
  preguntas: ListChecks,
  evaluaciones: ClipboardList,
  cursos: GraduationCap,
  reportes: BarChart3,
  usuarios: Users,
  configuracion: Settings,
  historial: History,
} as const;

export interface EnlaceNav {
  href: string;
  label: string;
  icono: keyof typeof ICONOS;
}

const ETIQUETA_ROL: Record<string, string> = {
  admin: "Administrador",
  docente: "Docente",
  estudiante: "Estudiante",
};

const CLAVE_COLAPSADO = "arte-nuevo:sidebar-colapsado";

export function PanelLayout({
  enlaces,
  perfil,
  marcaAgua,
  children,
}: {
  enlaces: EnlaceNav[];
  perfil: { nombre: string; apellido: string; rol: string };
  marcaAgua: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [colapsado, setColapsado] = useState(false);
  const [drawerAbierto, setDrawerAbierto] = useState(false);

  useEffect(() => {
    // Lectura única de una preferencia de UI en localStorage al montar: no hay forma de
    // "suscribirse" a este dato, por eso el setState directo acá es la excepción esperada.
    const guardado = localStorage.getItem(CLAVE_COLAPSADO);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (guardado === "1") setColapsado(true);
  }, []);

  useEffect(() => {
    // Cierra el drawer móvil cuando cambia la ruta (navegación por Link dentro del propio drawer).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDrawerAbierto(false);
  }, [pathname]);

  function alternarColapso() {
    setColapsado((v) => {
      localStorage.setItem(CLAVE_COLAPSADO, !v ? "1" : "0");
      return !v;
    });
  }

  const enlaceActivo = [...enlaces].sort((a, b) => b.href.length - a.href.length).find((e) => pathname === e.href || pathname.startsWith(`${e.href}/`));
  const tituloSeccion = enlaceActivo?.label ?? "Panel";

  const contenidoNav = (
    <nav className="flex flex-1 flex-col gap-1 px-3">
      {enlaces.map((enlace) => {
        const activo = enlace.href === enlaceActivo?.href;
        const Icono = ICONOS[enlace.icono];
        return (
          <Link
            key={enlace.href}
            href={enlace.href}
            aria-current={activo ? "page" : undefined}
            title={colapsado ? enlace.label : undefined}
            className={`flex items-center gap-3 rounded-lg border-l-4 px-3 py-2.5 text-sm font-medium transition-colors ${
              activo
                ? "border-amarillo-500 bg-lila-100 text-lila-700"
                : "border-transparent text-texto-secundario hover:bg-lila-50 hover:text-lila-700"
            }`}
          >
            <Icono size={20} aria-hidden className="shrink-0" />
            <span className={colapsado ? "sr-only lg:not-sr-only lg:hidden" : ""}>{enlace.label}</span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-screen">
      {/* Sidebar de escritorio */}
      <aside
        className={`no-imprimir sticky top-0 hidden h-screen shrink-0 flex-col border-r border-borde bg-blanco transition-[width] duration-200 md:flex ${
          colapsado ? "w-20" : "w-64"
        }`}
      >
        <div className={`flex items-center gap-2 px-4 py-4 ${colapsado ? "justify-center" : ""}`}>
          <Logo tamano="sm" />
          {!colapsado && (
            <span className="text-sm font-bold leading-tight text-lila-800">{NOMBRE_INSTITUCION}</span>
          )}
        </div>
        {contenidoNav}
        <button
          type="button"
          onClick={alternarColapso}
          aria-label={colapsado ? "Expandir menú" : "Contraer menú"}
          className="m-3 flex items-center justify-center gap-2 rounded-lg border border-borde py-2 text-xs font-medium text-texto-secundario hover:bg-lila-50"
        >
          {colapsado ? <ChevronsRight size={16} aria-hidden /> : <ChevronsLeft size={16} aria-hidden />}
          {!colapsado && "Contraer"}
        </button>
      </aside>

      {/* Drawer móvil */}
      {drawerAbierto && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={() => setDrawerAbierto(false)}
            className="absolute inset-0 bg-black/40"
          />
          <aside className="absolute left-0 top-0 flex h-full w-72 flex-col bg-blanco shadow-lg">
            <div className="flex items-center justify-between px-4 py-4">
              <div className="flex items-center gap-2">
                <Logo tamano="sm" />
                <span className="text-sm font-bold text-lila-800">{NOMBRE_INSTITUCION}</span>
              </div>
              <button
                type="button"
                onClick={() => setDrawerAbierto(false)}
                aria-label="Cerrar menú"
                className="rounded-md p-1 text-texto-secundario hover:bg-lila-50"
              >
                <X size={20} aria-hidden />
              </button>
            </div>
            {contenidoNav}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-imprimir sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-borde bg-blanco px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setDrawerAbierto(true)}
              aria-label="Abrir menú"
              className="rounded-md p-1.5 text-texto-secundario hover:bg-lila-50 md:hidden"
            >
              <Menu size={22} aria-hidden />
            </button>
            <h1 className="text-base font-bold text-lila-800 sm:text-lg">{tituloSeccion}</h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <NotificacionesBell />
            <div className="hidden text-right text-sm sm:block">
              <p className="font-medium text-texto">
                {perfil.nombre} {perfil.apellido}
              </p>
              <p className="text-xs text-texto-secundario">{ETIQUETA_ROL[perfil.rol] ?? perfil.rol}</p>
            </div>
            <form action={cerrarSesion}>
              <button
                type="submit"
                aria-label="Cerrar sesión"
                className="flex items-center gap-1.5 rounded-lg border border-borde px-2.5 py-1.5 text-sm font-medium text-texto-secundario hover:bg-lila-50 hover:text-lila-700"
              >
                <LogOut size={16} aria-hidden />
                <span className="hidden sm:inline">Cerrar sesión</span>
              </button>
            </form>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
        <footer className="no-imprimir mt-auto border-t border-borde bg-blanco px-4 py-4 text-center text-xs text-texto-secundario">
          {marcaAgua}
        </footer>
      </div>
    </div>
  );
}
