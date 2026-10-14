import { HtmlInCanvasMotionBlur } from "@remotion/motion-blur";
import {
  Easing,
  interpolate,
  interpolateColors,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { PyLine } from "./highlight";
import { useLayout } from "./layout";
import { Scene, Sfx, Voice } from "./parts";
import { Bars, Block, geo, StackFrame } from "./stage";
import { C, MONO } from "./theme";
import { EVENTS, INTRO_CAPTION, SIM_INTRO, TEMPS, type SimEvent } from "./timeline";
import { LEAD, voiceLine } from "./voice";

const INTRO_VOICE = voiceLine(3, "intro");

const STD = Easing.bezier(0.2, 0, 0, 1);
const DECEL = Easing.bezier(0.05, 0.7, 0.1, 1);
const ACCEL = Easing.bezier(0.3, 0, 1, 1);
const OVER = Easing.bezier(0.175, 0.885, 0.32, 1.275);
const POP_LAND = 20;
const COLOR_FADE = 20;

const tw = (f: number, a: number, b: number, easing: (t: number) => number) =>
  interpolate(f, [a, b], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing,
  });
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const CODE = [
  "result = [0] * len(temperatures)",
  "tmp = []",
  "for i1, temp1 in enumerate(temperatures):",
  "    while tmp and temp1 > temperatures[tmp[-1]]:",
  "        i2 = tmp.pop()",
  "        result[i2] = i1 - i2",
  "    tmp.append(i1)",
  "return result",
];
const LINE_STAGGER = 4;

const findEvent = (
  frame: number,
): { k: number; ev: SimEvent | null; local: number } => {
  if (frame < SIM_INTRO) return { k: -1, ev: null, local: frame };
  const k = EVENTS.findIndex((e) => frame < e.start + e.dur);
  const idx = k === -1 ? EVENTS.length - 1 : k;
  return { k: idx, ev: EVENTS[idx], local: frame - EVENTS[idx].start };
};

const stateAt = (ev: SimEvent | null, local: number) => {
  if (!ev) return { result: TEMPS.map(() => 0), stack: [] as number[] };
  const result =
    ev.kind === "pop" && local >= POP_LAND ? ev.resultAfter : ev.resultBefore;
  const stack =
    ev.kind === "push" || ev.kind === "pop" ? ev.stackAfter : ev.stackBefore;
  return { result, stack };
};

const barColors = (ev: SimEvent | null, result: number[], stack: number[]) =>
  TEMPS.map((_, i) => {
    if (!ev) return C.barIdle;
    if (ev.kind !== "done" && i === ev.i) return C.current;
    if (result[i] > 0) return C.solved;
    if (stack.includes(i)) return C.waiting;
    if (i < ev.i || ev.kind === "done") return C.idle;
    return C.barIdle;
  });

const FlyingBlock = () => {
  const frame = useCurrentFrame();
  const { ev, local } = findEvent(frame);
  if (!ev || ev.kind !== "pop" || ev.j === null) return null;
  const dy =
    local < 4 ? 6 * tw(local, 0, 4, STD) : 6 - 266 * tw(local, 4, 16, ACCEL);
  return (
    <Block
      idx={ev.j}
      pos={ev.stackBefore.length - 1}
      dy={dy}
      opacity={1 - tw(local, 8, 16, STD)}
      border={C.solved}
    />
  );
};

const Code = ({
  frame,
  line,
  prevLine,
  local,
}: {
  frame: number;
  line: number | null;
  prevLine: number | null;
  local: number;
}) => {
  const { code } = useLayout();
  const heights = CODE.map((_, k) => {
    const g = tw(frame, k * LINE_STAGGER, k * LINE_STAGGER + 18, DECEL);
    return { g, h: code.lineH };
  });
  const lineTop = (k: number) =>
    heights.slice(0, k).reduce((sum, x) => sum + x.h, 0);
  const hlTop =
    line === null
      ? null
      : lerp(lineTop(prevLine ?? line), lineTop(line), tw(local, 0, 8, STD));
  return (
    <div
      style={{
        position: "absolute",
        left: code.x,
        top: code.y,
        width: code.w,
        background: C.panel,
        border: `2px solid ${C.border}`,
        borderRadius: 16,
        padding: "20px 24px",
        fontFamily: MONO,
        fontSize: code.size,
      }}
    >
      <div style={{ position: "relative" }}>
        {hlTop !== null && (
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: hlTop,
              height: code.lineH,
              borderRadius: 6,
              background: C.codeHl,
            }}
          />
        )}
        {CODE.map((text, k) => (
          <div
            key={k}
            style={{
              position: "relative",
              height: heights[k].h,
              opacity: heights[k].g,
              translate: `${(1 - heights[k].g) * -24}px 0px`,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                whiteSpace: "pre",
                lineHeight: `${code.lineH}px`,
                padding: "0 8px",
                color: C.text,
                fontWeight: k === line ? 700 : 400,
              }}
            >
              <PyLine text={text} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const SoundTrack = () => (
  <>
    {EVENTS.flatMap((e) => {
      if (e.kind === "compare")
        return [<Sfx key={`c${e.start}`} from={e.start} name="mouse-click" />];
      if (e.kind === "pop")
        return [
          <Sfx key={`w${e.start}`} from={e.start + 4} name="whoosh" />,
          <Sfx key={`d${e.start}`} from={e.start + POP_LAND} name="ding" />,
        ];
      if (e.kind === "push")
        return [<Sfx key={`s${e.start}`} from={e.start + 12} name="switch" />];
      return [];
    })}
  </>
);

const BIG_BLUR = 12;
const lastPopBefore = (frame: number) =>
  EVENTS.filter((e) => e.kind === "pop" && frame >= e.start + POP_LAND).at(-1);

const bigText = (e: SimEvent | undefined) =>
  e && e.j !== null
    ? `answer[${e.j}] = ${e.i} − ${e.j} = ${e.i - e.j}`
    : "answer = ?";

const BigNumber = ({ frame }: { frame: number }) => {
  const { big } = useLayout();
  const cur = lastPopBefore(frame);
  const since = cur ? frame - cur.start - POP_LAND : Infinity;
  const prev = cur ? lastPopBefore(cur.start + POP_LAND - 1) : undefined;
  const t = tw(since, 0, BIG_BLUR, STD);
  const style = (o: number) => ({
    position: "absolute" as const,
    left: big.x,
    top: big.y,
    fontFamily: MONO,
    fontSize: big.size,
    fontWeight: 700,
    color: C.current,
    opacity: o,
    filter: `blur(${(1 - o) * 10}px)`,
  });
  return (
    <>
      {t < 1 && <div style={style(1 - t)}>{bigText(prev)}</div>}
      <div style={style(t)}>{bigText(cur)}</div>
    </>
  );
};

const AmbientGlow = ({ frame }: { frame: number }) => {
  const x = 50 + 20 * Math.sin(frame / 150);
  const y = 40 + 12 * Math.cos(frame / 170);
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: `radial-gradient(circle at ${x}% ${y}%, ${C.ambient}, transparent 55%)`,
      }}
    />
  );
};

export const Simulation = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const L = useLayout();
  const { barX, barTop, block } = geo(L);
  const BAR_W = L.bars.w;

  const { k, ev, local } = findEvent(frame);
  const prev = k > 0 ? EVENTS[k - 1] : null;
  const { result, stack } = stateAt(ev, local);
  const prevState = stateAt(prev, prev ? prev.dur : 0);
  const curColors = barColors(ev, result, stack);
  const prevColors = barColors(prev, prevState.result, prevState.stack);
  const fadeEnd = Math.min(COLOR_FADE, ev?.dur ?? COLOR_FADE);
  const colors = curColors.map((c, i) =>
    ev?.kind === "pop" && i === ev.j
      ? interpolateColors(
          local,
          [POP_LAND, POP_LAND + COLOR_FADE],
          [C.waiting, C.solved],
        )
      : interpolateColors(local, [0, fadeEnd], [prevColors[i], c]),
  );
  const fadeT = tw(local, 0, fadeEnd, STD);
  const glows = curColors.map((c, i) =>
    lerp(prevColors[i] === C.current ? 1 : 0, c === C.current ? 1 : 0, fadeT),
  );
  const top = ev?.j ?? null;

  const pointerX = ev
    ? lerp(barX(prev?.i ?? ev.i), barX(ev.i), tw(local, 0, 10, STD))
    : 0;
  const captionStart = ev ? ([...EVENTS.slice(0, k + 1)].reverse().find((e) => e.voice)?.start ?? LEAD) : LEAD;
  const captionIn = tw(frame - captionStart, 0, 8, DECEL);

  return (
    <Scene title="單調遞減堆疊：一步一步跑">
      <AmbientGlow frame={frame} />
      <SoundTrack />
      {INTRO_VOICE && <Voice from={LEAD} file={INTRO_VOICE.file} />}
      {EVENTS.filter((e) => e.voice).map((e) => (
        <Voice key={e.start} from={e.start} file={e.voice!.file} />
      ))}
      <Bars colors={colors} glows={glows} />
      <BigNumber frame={frame} />

      {ev?.kind === "pop" &&
        top !== null &&
        (() => {
          const x1 = barX(top) + BAR_W / 2;
          const x2 = barX(ev.i) + BAR_W / 2;
          const peak = Math.min(barTop(top), barTop(ev.i)) - 120;
          const d = `M ${x1} ${barTop(top) - 50} Q ${(x1 + x2) / 2} ${peak} ${x2} ${barTop(ev.i) - 50}`;
          const draw = tw(local, 6, POP_LAND, STD);
          return (
            <svg
              width={L.w}
              height={L.h}
              style={{ position: "absolute", inset: 0 }}
            >
              <path
                d={d}
                fill="none"
                stroke={C.solved}
                strokeWidth={5}
                strokeLinecap="round"
                pathLength={1}
                strokeDasharray={1}
                strokeDashoffset={1 - draw}
              />
              <text
                x={(x1 + x2) / 2}
                y={peak + 10 - 10 * draw}
                textAnchor="middle"
                fill={C.solved}
                fontSize={30}
                fontFamily={MONO}
                opacity={draw}
              >{`${ev.i} - ${top} = ${ev.i - top} 天`}</text>
            </svg>
          );
        })()}

      {ev && ev.kind !== "done" && (
        <div
          style={{
            position: "absolute",
            left: pointerX - 22,
            top: L.bars.baseY + 52,
            width: BAR_W + 44,
            textAlign: "center",
            color: C.current,
            fontSize: 24,
            fontFamily: MONO,
          }}
        >
          ▲ i1
        </div>
      )}

      <div
        style={{
          position: "absolute",
          left: L.result.labelX,
          top: L.result.labelY,
          fontSize: 24,
          color: C.dim,
          fontFamily: MONO,
        }}
      >
        result
      </div>
      {result.map((v, i) => {
        const setAt =
          ev?.kind === "pop" && i === top && local >= POP_LAND
            ? ev.start + POP_LAND
            : null;
        const pop =
          setAt === null
            ? 1
            : spring({
                frame: frame - setAt,
                fps,
                config: { damping: 9, stiffness: 180 },
              });
        const glow =
          setAt === null
            ? 0
            : interpolate(frame - setAt, [0, 4, 24], [0, 1, 0], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });
        const filled = v > 0;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: barX(i),
              top: L.result.y,
              width: BAR_W,
              height: 64,
              borderRadius: 10,
              border: `3px solid ${filled ? C.solved : C.border}`,
              background: filled ? C.solvedBg : C.panel,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: MONO,
              fontSize: 32,
              color: filled ? C.solved : C.dim,
              scale: `${0.6 + 0.4 * pop}`,
              boxShadow: `0 0 ${glow * 40}px ${glow * 12}px ${C.solved}`,
            }}
          >
            {v}
          </div>
        );
      })}

      <StackFrame />
      {stack.map((idx, pos) => {
        const isTop = pos === stack.length - 1;
        if (ev?.kind === "push" && isTop) {
          return (
            <Block
              key={idx}
              idx={idx}
              pos={pos}
              dy={-120 * (1 - tw(local, 0, 14, OVER))}
              opacity={tw(local, 0, 6, STD)}
            />
          );
        }
        if (ev?.kind === "compare" && isTop) {
          const s = 1 + 0.06 * (tw(local, 0, 3, STD) - tw(local, 3, 6, STD));
          return (
            <Block
              key={idx}
              idx={idx}
              pos={pos}
              scale={s}
              border={
                tw(local, 2, 6, STD) > 0.5
                  ? ev.warmer
                    ? C.good
                    : C.bad
                  : C.waiting
              }
            />
          );
        }
        return <Block key={idx} idx={idx} pos={pos} />;
      })}
      <HtmlInCanvasMotionBlur
        width={width}
        height={height}
        samples={8}
        shutterAngle={180}
      >
        <FlyingBlock />
      </HtmlInCanvasMotionBlur>

      {ev?.kind === "compare" &&
        top !== null &&
        (() => {
          const enter = tw(local, 2, 12, ev.warmer ? OVER : DECEL);
          const shakeT = tw(local, 10, 20, (t) => t);
          const shake =
            ev.warmer || shakeT <= 0 || shakeT >= 1
              ? 0
              : 8 * Math.sin(shakeT * 3 * 2 * Math.PI) * (1 - shakeT);
          return (
            <div
              style={{
                position: "absolute",
                left: block(ev.stackBefore.length - 1).x - 30,
                top:
                  (L.stack.horizontal
                    ? L.stack.y - 54
                    : block(ev.stackBefore.length).y - 40) +
                  (1 - enter) * 16,
                width: L.stack.w + 60,
                textAlign: "center",
                fontFamily: MONO,
                fontSize: 30,
                color: ev.warmer ? C.good : C.bad,
                opacity: Math.min(1, enter),
                translate: `${shake}px 0px`,
              }}
            >{`${TEMPS[ev.i]} > ${TEMPS[top]} ? ${ev.warmer ? "✓" : "✗"}`}</div>
          );
        })()}

      <Code
        frame={frame}
        line={ev?.line ?? null}
        prevLine={prev?.line ?? null}
        local={local}
      />

      {L.legend && (
        <div
          style={{
            position: "absolute",
            left: L.legend.x,
            top: L.legend.y,
            width: 640,
            fontSize: 24,
            color: C.dim,
            lineHeight: 1.9,
          }}
        >
          <div>
            <span style={{ color: C.current }}>■</span> 目前這一天 i1
          </div>
          <div>
            <span style={{ color: C.waiting }}>■</span>{" "}
            在堆疊裡，還在等更暖的一天
          </div>
          <div>
            <span style={{ color: C.solved }}>■</span> 已經找到答案
          </div>
        </div>
      )}

      <div
        key={captionStart}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: L.caption.y,
          padding: "0 50px",
          textAlign: "center",
          fontSize: L.caption.size,
          fontWeight: 600,
          opacity: captionIn,
          translate: `0px ${(1 - captionIn) * 12}px`,
        }}
      >
        {ev ? ev.caption : INTRO_CAPTION}
      </div>
    </Scene>
  );
};
