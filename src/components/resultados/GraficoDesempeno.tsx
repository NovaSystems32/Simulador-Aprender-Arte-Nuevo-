"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function GraficoDesempeno({ datos }: { datos: { etiqueta: string; porcentaje: number }[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={datos} margin={{ top: 10, right: 10, left: -10, bottom: 40 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="etiqueta" angle={-25} textAnchor="end" interval={0} height={70} tick={{ fontSize: 12 }} />
          <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
          <Tooltip formatter={(v) => [`${v}%`, "Porcentaje logrado"]} />
          {/* Azul institucional (--color-lila-600 en globals.css); recharts no puede leer
              variables CSS en `fill`, así que se repite el valor acá. */}
          <Bar dataKey="porcentaje" fill="#2871cd" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
