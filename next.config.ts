import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // firebase-admin (vía jwks-rsa -> jose, que es ESM-only) rompe si Next lo
  // empaqueta dentro del bundle del servidor/middleware: el bundler termina
  // haciendo require() de un módulo ESM y tira ERR_REQUIRE_ESM en runtime.
  // Sacarlo del bundling (require nativo de Node en tiempo de ejecución)
  // evita el problema.
  serverExternalPackages: ["firebase-admin"],
};

export default nextConfig;
