// Constantes sin ninguna dependencia de firebase-admin. Viven en su propio
// archivo para poder importarse desde el middleware (src/proxy.ts) sin
// arrastrar el SDK de administrador: firebase-admin/auth tira de jwks-rsa ->
// jose (ESM-only), y el bundler de Next para el middleware no logra
// empaquetar eso sin romper (ERR_REQUIRE_ESM en runtime).
export const NOMBRE_COOKIE_SESION = "session";
/** Máximo que permite Firebase para una cookie de sesión: 14 días. */
export const DURACION_SESION_MS = 1000 * 60 * 60 * 24 * 14;
