import { createContext, useContext } from "react";
import { TEMPS } from "./timeline";

export const rowStart = (n: number, step: number, itemW: number, from: number, to: number) =>
  Math.round((from + to - (n - 1) * step - itemW) / 2);

export type Layout = {
  portrait: boolean;
  w: number;
  h: number;
  title: { x: number; y: number; size: number };
  bars: { x0: number; step: number; w: number; baseY: number };
  result: { y: number; labelX: number; labelY: number };
  stack: { x: number; y: number; w: number; h: number; horizontal: boolean; slots: number };
  code: { x: number; y: number; w: number; size: number; lineH: number };
  legend: { x: number; y: number } | null;
  caption: { y: number; size: number };
  big: { x: number; y: number; size: number };
};

export const LANDSCAPE: Layout = {
  portrait: false,
  w: 1920,
  h: 1080,
  title: { x: 80, y: 50, size: 44 },
  bars: { x0: rowStart(TEMPS.length, 100, 72, 160, 980), step: 100, w: 72, baseY: 720 },
  result: { y: 845, labelX: 60, labelY: 860 },
  stack: { x: 1000, y: 820, w: 200, h: 64, horizontal: false, slots: 6 },
  code: { x: 1250, y: 150, w: 640, size: 18, lineH: 29 },
  legend: { x: 1250, y: 520 },
  caption: { y: 975, size: 38 },
  big: { x: 80, y: 120, size: 48 },
};

export const PORTRAIT: Layout = {
  portrait: true,
  w: 1080,
  h: 1920,
  title: { x: 60, y: 140, size: 52 },
  bars: { x0: rowStart(TEMPS.length, 115, 84, 0, 1080), step: 115, w: 84, baseY: 800 },
  result: { y: 950, labelX: 100, labelY: 905 },
  stack: { x: 150, y: 1510, w: 200, h: 70, horizontal: true, slots: 4 },
  code: { x: 40, y: 1060, w: 1000, size: 26, lineH: 40 },
  legend: null,
  caption: { y: 1650, size: 44 },
  big: { x: 60, y: 220, size: 52 },
};

export const LayoutContext = createContext<Layout>(LANDSCAPE);
export const useLayout = () => useContext(LayoutContext);
