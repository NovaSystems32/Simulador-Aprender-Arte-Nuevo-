import type { DetailedHTMLProps, HTMLAttributes } from "react";
import type { MathfieldElement } from "mathlive";

// MathLive no publica una augmentación de JSX.IntrinsicElements para su
// elemento personalizado <math-field>; se declara acá para poder usarlo en
// TSX. El valor se maneja de forma imperativa (mathfield.value = ...) desde
// un ref, no como prop de React, así que alcanza con las props de HTML +
// algunos atributos propios del elemento. React 19 lee el namespace JSX
// desde el módulo "react" (React.JSX), no desde el global.
type PropsMathField = DetailedHTMLProps<HTMLAttributes<MathfieldElement>, MathfieldElement> & {
  "virtual-keyboard-mode"?: "auto" | "manual" | "onfocus" | "off";
  "math-virtual-keyboard-policy"?: "auto" | "manual" | "sandboxed";
  "menu-editable"?: boolean;
};

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "math-field": PropsMathField;
    }
  }
}
