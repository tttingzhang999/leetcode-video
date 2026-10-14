import { useLayout, type Layout } from "./layout";
import { C, MONO } from "./theme";
import { TEMPS } from "./timeline";


export const geo = (L: Layout) => {
  const barX = (i: number) => L.bars.x0 + i * L.bars.step;
  const barH = (t: number) => (t - 62) * 26;
  const barTop = (i: number) => L.bars.baseY - barH(TEMPS[i]);
  const block = (pos: number) =>
    L.stack.horizontal
      ? { x: L.stack.x + pos * (L.stack.w + 12), y: L.stack.y }
      : { x: L.stack.x, y: L.stack.y - (pos + 1) * (L.stack.h + 8) };
  return { barX, barH, barTop, block };
};

export const useGeo = () => geo(useLayout());

export const Bars = ({ colors, glows }: { colors: string[]; glows: number[] }) => {
  const L = useLayout();
  const { barX, barH, barTop } = geo(L);
  return (
    <svg width={L.w} height={L.h} style={{ position: "absolute", inset: 0 }}>
      <line x1={L.bars.x0 - 30} x2={barX(TEMPS.length - 1) + L.bars.w + 30} y1={L.bars.baseY} y2={L.bars.baseY} stroke={C.border} strokeWidth={3} />
      {TEMPS.map((t, i) => (
        <g key={i}>
          <defs>
            <linearGradient id={`bar${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={colors[i]} />
              <stop offset="1" stopColor={colors[i]} stopOpacity={0.4} />
            </linearGradient>
          </defs>
          <rect x={barX(i)} y={barTop(i)} width={L.bars.w} height={barH(t)} rx={10} fill={`url(#bar${i})`} style={{ filter: glows[i] > 0 ? `drop-shadow(0 0 ${18 * glows[i]}px ${colors[i]})` : undefined }} />
          <rect x={barX(i) + 6} y={barTop(i)} width={L.bars.w - 12} height={2} rx={1} fill="#fff" opacity={0.35} />
          <text x={barX(i) + L.bars.w / 2} y={barTop(i) - 14} textAnchor="middle" fill={C.text} fontSize={28} fontFamily={MONO}>{t}</text>
          <text x={barX(i) + L.bars.w / 2} y={L.bars.baseY + 36} textAnchor="middle" fill={C.dim} fontSize={22} fontFamily={MONO}>{`i=${i}`}</text>
        </g>
      ))}
    </svg>
  );
};

export const StackFrame = () => {
  const L = useLayout();
  const s = L.stack;
  const line = `4px solid ${C.border}`;
  if (s.horizontal) {
    const len = s.slots * (s.w + 12) + 10;
    return (
      <>
        <div style={{ position: "absolute", left: s.x - 14, top: s.y - 12, width: len, height: s.h + 24, borderTop: line, borderBottom: line, borderLeft: line, borderRadius: "14px 0 0 14px" }} />
        <div style={{ position: "absolute", left: 30, top: s.y + s.h / 2 - 18, fontSize: 30, color: C.dim, fontFamily: MONO }}>tmp</div>
      </>
    );
  }
  const topY = s.y - (s.slots + 1) * (s.h + 8);
  return (
    <>
      <div style={{ position: "absolute", left: s.x - 14, top: topY - 10, width: s.w + 28, height: s.y - topY + 20, borderLeft: line, borderRight: line, borderBottom: line, borderRadius: "0 0 14px 14px" }} />
      <div style={{ position: "absolute", left: s.x, top: s.y + 20, width: s.w, textAlign: "center", fontSize: 26, color: C.dim, fontFamily: MONO }}>tmp</div>
    </>
  );
};

export const Block = ({ idx, pos, dy = 0, opacity = 1, scale = 1, border = C.waiting }: { idx: number; pos: number; dy?: number; opacity?: number; scale?: number; border?: string }) => {
  const L = useLayout();
  const { x, y } = geo(L).block(pos);
  return (
    <div style={{
      position: "absolute", left: x, top: y + dy, width: L.stack.w, height: L.stack.h, borderRadius: 10, opacity, scale: `${scale}`,
      background: C.blockBg, border: `3px solid ${border}`, display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: MONO, fontSize: 26, color: C.text,
    }}>{`i=${idx} · ${TEMPS[idx]}°`}</div>
  );
};
