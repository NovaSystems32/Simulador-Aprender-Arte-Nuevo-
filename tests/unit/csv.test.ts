import { describe, expect, it } from "vitest";
import { generarCsv, parsearCsv } from "@/lib/csv";

describe("generarCsv / parsearCsv", () => {
  it("genera un CSV con encabezado y filas, escapando comas y comillas", () => {
    const csv = generarCsv(
      [{ nombre: "Ana, Torres", nota: 8 }],
      [
        { clave: "nombre", encabezado: "Nombre" },
        { clave: "nota", encabezado: "Nota" },
      ]
    );
    expect(csv).toContain('"Ana, Torres"');
    expect(csv).toContain("Nombre,Nota");
  });

  it("hace un round-trip: lo que genera, lo puede volver a parsear", () => {
    const original = [
      { enunciado: "¿Cuánto es 2+2, aproximadamente?", opcion_a: "4", eje: "numeros_operaciones" },
      { enunciado: 'Frase con "comillas" y, coma', opcion_a: "otra", eje: "algebra_funciones" },
    ];
    const csv = generarCsv(original, [
      { clave: "enunciado", encabezado: "enunciado" },
      { clave: "opcion_a", encabezado: "opcion_a" },
      { clave: "eje", encabezado: "eje" },
    ]);

    const tabla = parsearCsv(csv);
    expect(tabla[0]).toEqual(["enunciado", "opcion_a", "eje"]);
    expect(tabla[1]).toEqual(["¿Cuánto es 2+2, aproximadamente?", "4", "numeros_operaciones"]);
    expect(tabla[2]).toEqual(['Frase con "comillas" y, coma', "otra", "algebra_funciones"]);
  });
});
