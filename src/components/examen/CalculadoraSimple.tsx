"use client";

import { useState } from "react";

/** Calculadora básica de 4 operaciones, para usar durante un simulacro que la permita. */
export function CalculadoraSimple({ onCerrar }: { onCerrar: () => void }) {
  const [pantalla, setPantalla] = useState("0");
  const [anterior, setAnterior] = useState<number | null>(null);
  const [operacion, setOperacion] = useState<string | null>(null);
  const [reiniciarAlEscribir, setReiniciarAlEscribir] = useState(false);

  function ingresarDigito(digito: string) {
    if (reiniciarAlEscribir || pantalla === "0") {
      setPantalla(digito === "," ? "0," : digito);
      setReiniciarAlEscribir(false);
    } else if (digito === "," && pantalla.includes(",")) {
      return;
    } else {
      setPantalla(pantalla + digito);
    }
  }

  function calcular(a: number, b: number, op: string): number {
    switch (op) {
      case "+":
        return a + b;
      case "−":
        return a - b;
      case "×":
        return a * b;
      case "÷":
        return b === 0 ? NaN : a / b;
      default:
        return b;
    }
  }

  function elegirOperacion(op: string) {
    const valorActual = Number(pantalla.replace(",", "."));
    if (anterior !== null && operacion && !reiniciarAlEscribir) {
      const resultado = calcular(anterior, valorActual, operacion);
      setPantalla(String(resultado).replace(".", ","));
      setAnterior(resultado);
    } else {
      setAnterior(valorActual);
    }
    setOperacion(op);
    setReiniciarAlEscribir(true);
  }

  function igual() {
    if (anterior === null || !operacion) return;
    const valorActual = Number(pantalla.replace(",", "."));
    const resultado = calcular(anterior, valorActual, operacion);
    setPantalla(String(resultado).replace(".", ","));
    setAnterior(null);
    setOperacion(null);
    setReiniciarAlEscribir(true);
  }

  function limpiar() {
    setPantalla("0");
    setAnterior(null);
    setOperacion(null);
    setReiniciarAlEscribir(false);
  }

  const botones = ["7", "8", "9", "÷", "4", "5", "6", "×", "1", "2", "3", "−", "0", ",", "=", "+"];

  return (
    <div className="w-64 rounded-xl border border-borde bg-blanco p-3 shadow-lg">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold text-texto-secundario">Calculadora</p>
        <button type="button" onClick={onCerrar} aria-label="Cerrar calculadora" className="text-texto-secundario hover:text-lila-700">
          ✕
        </button>
      </div>
      <div className="mb-2 rounded-md bg-lila-50 px-3 py-2 text-right text-xl font-mono">{pantalla}</div>
      <div className="mb-2 grid grid-cols-4 gap-1.5">
        {botones.map((b) => (
          <button
            key={b}
            type="button"
            onClick={() => {
              if (b === "=") igual();
              else if (["+", "−", "×", "÷"].includes(b)) elegirOperacion(b);
              else ingresarDigito(b);
            }}
            className={`rounded-md py-2 text-sm font-medium ${
              ["÷", "×", "−", "+", "="].includes(b) ? "bg-lila-600 text-white hover:bg-lila-800" : "bg-lila-50 hover:bg-lila-100"
            }`}
          >
            {b}
          </button>
        ))}
      </div>
      <button type="button" onClick={limpiar} className="btn-neutro w-full py-1.5 text-sm">
        Borrar (C)
      </button>
    </div>
  );
}
