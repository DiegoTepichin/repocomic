import type { CSSProperties } from "react";

/** The plain objects Satori renders; no React at runtime. */
export interface Element {
  type: string;
  key: null;
  props: Props;
}

export type Child = Element | string | number | null | false | undefined;

export interface Props {
  style?: CSSProperties;
  children?: Child | Child[];
  src?: string;
  width?: number;
  height?: number;
}

export function h(
  type: string,
  props: Omit<Props, "children"> = {},
  ...children: Child[]
): Element {
  const kept = children.filter((child) => child !== null && child !== false && child !== undefined);
  return { type, key: null, props: { ...props, children: kept.length === 1 ? kept[0] : kept } };
}

export const div = (style: CSSProperties, ...children: Child[]): Element =>
  h("div", { style: { display: "flex", ...style } }, ...children);
