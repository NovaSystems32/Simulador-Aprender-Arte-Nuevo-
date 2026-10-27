import { describe, expect, it } from "vitest";
import { prefijoProtegidoDe, rolPuedeAcceder, rutaInicioPorRol } from "@/lib/permisos";

describe("prefijoProtegidoDe", () => {
  it("identifica los prefijos protegidos", () => {
    expect(prefijoProtegidoDe("/estudiante/historial")).toBe("/estudiante");
    expect(prefijoProtegidoDe("/docente/preguntas")).toBe("/docente");
    expect(prefijoProtegidoDe("/admin/usuarios")).toBe("/admin");
  });

  it("no marca como protegidas las rutas públicas", () => {
    expect(prefijoProtegidoDe("/")).toBeNull();
    expect(prefijoProtegidoDe("/login")).toBeNull();
    expect(prefijoProtegidoDe("/no-autorizado")).toBeNull();
  });
});

describe("rolPuedeAcceder", () => {
  it("un estudiante solo puede entrar a /estudiante", () => {
    expect(rolPuedeAcceder("/estudiante/historial", "estudiante", true)).toBe(true);
    expect(rolPuedeAcceder("/docente/preguntas", "estudiante", true)).toBe(false);
    expect(rolPuedeAcceder("/admin/usuarios", "estudiante", true)).toBe(false);
  });

  it("un docente puede entrar a /docente pero no a /admin ni /estudiante", () => {
    expect(rolPuedeAcceder("/docente/evaluaciones", "docente", true)).toBe(true);
    expect(rolPuedeAcceder("/admin/usuarios", "docente", true)).toBe(false);
    expect(rolPuedeAcceder("/estudiante", "docente", true)).toBe(false);
  });

  it("un admin puede entrar a /admin y también a /docente, pero no a /estudiante", () => {
    expect(rolPuedeAcceder("/admin/configuracion", "admin", true)).toBe(true);
    expect(rolPuedeAcceder("/docente/reportes", "admin", true)).toBe(true);
    expect(rolPuedeAcceder("/estudiante", "admin", true)).toBe(false);
  });

  it("una cuenta inactiva no puede acceder aunque el rol coincida", () => {
    expect(rolPuedeAcceder("/docente", "docente", false)).toBe(false);
  });

  it("sin sesión (rol null) no puede acceder a rutas protegidas", () => {
    expect(rolPuedeAcceder("/estudiante", null, false)).toBe(false);
  });

  it("las rutas públicas son accesibles para cualquiera, incluso sin sesión", () => {
    expect(rolPuedeAcceder("/login", null, false)).toBe(true);
    expect(rolPuedeAcceder("/", null, false)).toBe(true);
  });
});

describe("rutaInicioPorRol", () => {
  it("redirige a cada rol a su panel correspondiente", () => {
    expect(rutaInicioPorRol("admin")).toBe("/admin");
    expect(rutaInicioPorRol("docente")).toBe("/docente");
    expect(rutaInicioPorRol("estudiante")).toBe("/estudiante");
  });
});
