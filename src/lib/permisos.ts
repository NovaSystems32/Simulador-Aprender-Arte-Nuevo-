import type { RolUsuario } from "./types";

/** Mapa de prefijos de ruta protegidos a los roles que pueden acceder. Lógica pura, testeable. */
export const PREFIJO_ROLES_PERMITIDOS: Record<string, RolUsuario[]> = {
  "/estudiante": ["estudiante"],
  // El admin también puede navegar el área docente (banco de preguntas,
  // evaluaciones y reportes); las políticas RLS acotan qué ve cada uno.
  "/docente": ["docente", "admin"],
  "/admin": ["admin"],
};

/** Encuentra el prefijo protegido más específico que matchea un pathname, si existe. */
export function prefijoProtegidoDe(pathname: string): string | null {
  return Object.keys(PREFIJO_ROLES_PERMITIDOS).find((prefijo) => pathname.startsWith(prefijo)) ?? null;
}

/** True si un rol (activo) puede acceder a un pathname dado. Rutas no protegidas siempre son accesibles. */
export function rolPuedeAcceder(pathname: string, rol: RolUsuario | null, activo: boolean): boolean {
  const prefijo = prefijoProtegidoDe(pathname);
  if (!prefijo) return true;
  if (!rol || !activo) return false;
  return PREFIJO_ROLES_PERMITIDOS[prefijo].includes(rol);
}

/**
 * Ruta de inicio según el rol. Vive acá (no en auth.ts) a propósito: es
 * lógica pura sin dependencias de servidor, así se puede importar desde
 * tests sin arrastrar la capa de datos (que sí exige "server-only").
 */
export function rutaInicioPorRol(rol: RolUsuario): string {
  if (rol === "admin") return "/admin";
  if (rol === "docente") return "/docente";
  return "/estudiante";
}
