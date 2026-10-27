"use client";

import { useRef, useState } from "react";
import { InlineMath, BlockMath } from "react-katex";
import { segmentarFormulas } from "./VistaPreviaMatematica";
import { BotonInsertarEcuacion, EditorEcuaciones, type ResultadoEcuacion } from "./EditorEcuaciones";

/** Si la selección actual es exactamente una ecuación completa ($...$ o $$...$$), la devuelve para editarla; si no, null. */
function detectarEcuacionSeleccionada(seleccion: string): { tex: string; modo: "linea" | "bloque" } | null {
  if (/^\$\$[^$]+\$\$$/.test(seleccion)) return { tex: seleccion.slice(2, -2), modo: "bloque" };
  if (/^\$[^$]+\$$/.test(seleccion)) return { tex: seleccion.slice(1, -1), modo: "linea" };
  return null;
}

export function CampoTextoConEcuaciones({
  id,
  name,
  label,
  value,
  onChange,
  required,
  rows = 3,
  ayuda,
  placeholder,
}: {
  id: string;
  name: string;
  label: string;
  value: string;
  onChange: (valor: string) => void;
  required?: boolean;
  rows?: number;
  ayuda?: string;
  placeholder?: string;
}) {
  const refCampo = useRef<HTMLTextAreaElement>(null);
  const [editorAbierto, setEditorAbierto] = useState(false);
  const [rangoAEditar, setRangoAEditar] = useState<{ inicio: number; fin: number } | null>(null);
  const [texInicial, setTexInicial] = useState("");
  const [modoInicial, setModoInicial] = useState<"linea" | "bloque">("linea");
  const [esEdicionExistente, setEsEdicionExistente] = useState(false);

  /**
   * Botón de la barra de herramientas: si el docente seleccionó (con el
   * mouse o el teclado) una ecuación ya insertada dentro del textarea, la
   * abre para editarla; si no, inserta una nueva en la posición del cursor.
   */
  function abrirEditorDesdeBoton() {
    const campo = refCampo.current;
    const inicio = campo?.selectionStart ?? value.length;
    const fin = campo?.selectionEnd ?? value.length;
    const seleccion = value.slice(inicio, fin);
    const ecuacionExistente = detectarEcuacionSeleccionada(seleccion);

    setRangoAEditar({ inicio, fin });
    setTexInicial(ecuacionExistente?.tex ?? "");
    setModoInicial(ecuacionExistente?.modo ?? "linea");
    setEsEdicionExistente(!!ecuacionExistente);
    setEditorAbierto(true);
  }

  /** Abre el editor precargado con una ecuación ya insertada (doble clic en la vista previa). */
  function abrirEditorExistente(inicio: number, fin: number, tex: string, modo: "linea" | "bloque") {
    setRangoAEditar({ inicio, fin });
    setTexInicial(tex);
    setModoInicial(modo);
    setEsEdicionExistente(true);
    setEditorAbierto(true);
  }

  function alInsertar({ textoConDelimitadores }: ResultadoEcuacion) {
    const rango = rangoAEditar ?? { inicio: value.length, fin: value.length };
    const nuevoValor = value.slice(0, rango.inicio) + textoConDelimitadores + value.slice(rango.fin);
    onChange(nuevoValor);
    setEditorAbierto(false);
    const posicionCursor = rango.inicio + textoConDelimitadores.length;
    window.setTimeout(() => {
      refCampo.current?.focus();
      refCampo.current?.setSelectionRange(posicionCursor, posicionCursor);
    }, 0);
  }

  /** Quita del texto la ecuación que se estaba editando, sin tocar el resto. */
  function alEliminar() {
    const rango = rangoAEditar;
    if (!rango) return;
    const nuevoValor = value.slice(0, rango.inicio) + value.slice(rango.fin);
    onChange(nuevoValor);
    setEditorAbierto(false);
    window.setTimeout(() => {
      refCampo.current?.focus();
      refCampo.current?.setSelectionRange(rango.inicio, rango.inicio);
    }, 0);
  }

  const segmentos = value ? segmentarFormulas(value) : [];

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium text-slate-700">
          {label}
        </label>
        <BotonInsertarEcuacion onClick={abrirEditorDesdeBoton} />
      </div>
      <textarea
        id={id}
        name={name}
        ref={refCampo}
        required={required}
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="campo-texto"
      />
      {ayuda && <p className="text-xs text-slate-500">{ayuda}</p>}
      {segmentos.length > 0 && (
        <div className="rounded-lg bg-lila-50 p-3 text-sm">
          <p className="mb-1 text-xs font-medium text-lila-700">Vista previa (doble clic en una ecuación para editarla)</p>
          <span>
            {segmentos.map((s, indice) => {
              if (s.tipo === "texto") return <span key={indice}>{s.contenido}</span>;
              const comun = {
                onDoubleClick: () => abrirEditorExistente(s.inicio, s.fin, s.tex, s.modo),
                title: "Doble clic para editar esta ecuación",
                className: "cursor-pointer rounded px-0.5 outline-dashed outline-1 outline-transparent hover:outline-amarillo-600",
                tabIndex: 0,
                role: "button" as const,
                "aria-label": "Editar ecuación",
                onKeyDown: (e: React.KeyboardEvent) => {
                  if (e.key === "Enter") abrirEditorExistente(s.inicio, s.fin, s.tex, s.modo);
                },
              };
              return s.modo === "bloque" ? (
                <span key={indice} {...comun}>
                  <BlockMath math={s.tex} />
                </span>
              ) : (
                <span key={indice} {...comun}>
                  <InlineMath math={s.tex} />
                </span>
              );
            })}
          </span>
        </div>
      )}

      {editorAbierto && (
        <EditorEcuaciones
          texInicial={texInicial}
          modoInicial={modoInicial}
          puedeEliminar={esEdicionExistente}
          onInsertar={alInsertar}
          onEliminar={alEliminar}
          onCancelar={() => setEditorAbierto(false)}
        />
      )}
    </div>
  );
}
