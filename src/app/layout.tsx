import type { Metadata } from "next";
import { Nunito_Sans, Geist_Mono } from "next/font/google";
import { NOMBRE_APP, NOMBRE_INSTITUCION } from "@/lib/marca";
import "./globals.css";

const nunitoSans = Nunito_Sans({
  variable: "--font-nunito-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: NOMBRE_APP,
    template: `%s — ${NOMBRE_APP}`,
  },
  description: `Simulador educativo independiente de evaluaciones de Matemática, estilo Pruebas Aprender, para estudiantes de 6.º año. Instituto ${NOMBRE_INSTITUCION}.`,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es-AR"
      className={`${nunitoSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-fondo text-texto">{children}</body>
    </html>
  );
}
