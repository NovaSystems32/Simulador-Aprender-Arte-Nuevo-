declare module "react-katex" {
  import type { ComponentType, HTMLAttributes } from "react";

  export interface KatexProps extends HTMLAttributes<HTMLElement> {
    math: string;
    errorColor?: string;
    renderError?: (error: Error) => React.ReactNode;
  }

  export const InlineMath: ComponentType<KatexProps>;
  export const BlockMath: ComponentType<KatexProps>;
}
