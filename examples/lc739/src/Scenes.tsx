import type { ReactNode } from "react";
import { measureText } from "@remotion/layout-utils";
import { Highlight } from "@remotion/rough-notation";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { CodeLines, ease, Fade, Scene, SceneVoice, Sfx } from "./parts";
import { cues } from "./voice";
import { rowStart, useLayout } from "./layout";
import { C, MONO } from "./theme";
import { ANSWER, TEMPS } from "./timeline";

const CLAMP = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export const Title = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 14 } });
  const { portrait } = useLayout();
  return (
    <Scene>
      <Sfx from={0} name="swell" />
      <SceneVoice scene={1} />
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 28 }}>
        <div style={{ fontFamily: MONO, fontSize: 40, color: C.current, opacity: s }}>LeetCode 739</div>
        <div style={{ fontSize: portrait ? 130 : 110, fontWeight: 800, textAlign: "center", lineHeight: 1.1, maxWidth: portrait ? 900 : undefined, scale: `${0.85 + 0.15 * s}`, opacity: s }}>Daily Temperatures</div>
      </div>
    </Scene>
  );
};

const CELL_STEP = 118;
const CELL_W = 100;
const LABEL_GAP = 20;
const cells = (portrait: boolean) => {
  const label = portrait ? 0 : measureText({ text: "temperatures", fontFamily: MONO, fontSize: 30 }).width + LABEL_GAP;
  const x0 = rowStart(TEMPS.length, CELL_STEP, CELL_W, label, portrait ? 1080 : 1920);
  return { x0, cellX: (i: number) => x0 + i * CELL_STEP, tempY: portrait ? 480 : 280, ansY: portrait ? 720 : 440 };
};

const Cell = ({ i, y, v, color, appear, flashAt }: { i: number; y: number; v: number; color: string; appear: number; flashAt?: number }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - appear, fps, config: { damping: 14 } });
  const { cellX } = cells(useLayout().portrait);
  const flash = flashAt === undefined ? 0 : interpolate(frame - flashAt, [0, 6, 24], [0, 1, 0], CLAMP);
  return (
    <div style={{
      position: "absolute", left: cellX(i), top: y, width: CELL_W, height: 90, borderRadius: 12, border: `3px solid ${color}`,
      display: "flex", alignItems: "center", justifyContent: "center", fontFamily: MONO, fontSize: 40, color, opacity: s,
      scale: `${(0.5 + 0.5 * s) * (1 + 0.15 * flash)}`, boxShadow: `0 0 ${flash * 36}px ${flash * 10}px ${color}`,
    }}>{v}</div>
  );
};

export const Problem = () => {
  const [s1, s2, s3] = cues(2).map((c) => c.start);
  const frame = useCurrentFrame();
  const L = useLayout();
  const { x0: CELL_X0, cellX, tempY: TEMP_Y, ansY: ANS_Y } = cells(L.portrait);
  const arc = ease(frame, s2, s2 + 25);
  const x1 = cellX(2) + CELL_W / 2;
  const x2 = cellX(6) + CELL_W / 2;
  const label = { fontFamily: MONO, fontSize: 30, color: C.dim, position: "absolute", width: 280, textAlign: "right" } as const;
  return (
    <Scene title="題目：要等幾天才會更暖？">
      <SceneVoice scene={2} />
      <Sfx from={s1 - 8} name="tick" />
      <Sfx from={s2} name="pop-soft" />
      <Sfx from={s2 + 30} name="tick" />
      <Sfx from={s3 + 20} name="marker" />
      <div style={L.portrait ? { ...label, textAlign: "left", left: CELL_X0, top: TEMP_Y - 60 } : { ...label, left: CELL_X0 - 300, top: TEMP_Y + 26 }}>temperatures</div>
      <div style={L.portrait ? { ...label, textAlign: "left", left: CELL_X0, top: ANS_Y - 60 } : { ...label, left: CELL_X0 - 300, top: ANS_Y + 26 }}>answer</div>
      {TEMPS.map((t, i) => (
        <Cell key={`t${i}`} i={i} y={TEMP_Y} v={t} color={C.waiting} appear={s1 - 8 + i * 4} flashAt={i === 2 || i === 6 ? s2 : undefined} />
      ))}
      <svg width={L.w} height={L.h} style={{ position: "absolute", inset: 0 }}>
        <path d={`M ${x1} ${TEMP_Y - 10} Q ${(x1 + x2) / 2} ${TEMP_Y - 130} ${x2} ${TEMP_Y - 10}`} fill="none" stroke={C.solved} strokeWidth={5} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - arc} />
        <text x={(x1 + x2) / 2} y={TEMP_Y - 80} textAnchor="middle" fill={C.solved} fontSize={32} fontFamily={MONO} opacity={arc}>4 天</text>
      </svg>
      {ANSWER.map((a, i) => (
        <Cell key={`a${i}`} i={i} y={ANS_Y} v={a} color={C.solved} appear={s2 + 30 + i * 4} flashAt={i === 2 ? s2 + 60 : i >= 6 ? s3 : undefined} />
      ))}
      <div style={{ position: "absolute", left: 60, right: 60, top: L.portrait ? 900 : 620, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: L.portrait ? 30 : 18, fontSize: L.portrait ? 40 : 38, lineHeight: 1.5 }}>
        <Fade delay={s1}>
          answer[i] = 第 i 天之後，
          <Highlight color={C.markGold} progress={interpolate(frame, [s3 + 20, s3 + 45], [0, 1], CLAMP)}>第一個更暖</Highlight>
          日子的距離
        </Fade>
        <Fade delay={s2} style={{ color: C.dim }}>第 2 天 75°，要等到第 6 天 76°，所以是 4</Fade>
        <Fade delay={s3} style={{ color: C.dim }}>之後都沒有更暖的日子，就是 0</Fade>
      </div>
    </Scene>
  );
};

const Mini = ({ base, dropFrame }: { base: number[]; dropFrame: number }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const d = spring({ frame: frame - dropFrame, fps, config: { damping: 16 } });
  const all = [...base, 72];
  return (
    <div style={{ display: "flex", flexDirection: "column-reverse", gap: 8, width: 180 }}>
      {all.map((t, k) => {
        const isNew = k === all.length - 1;
        return (
          <div key={k} style={{
            height: 56, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: MONO, fontSize: 28,
            border: `3px solid ${isNew ? C.current : C.waiting}`, background: C.blockBg,
            opacity: isNew ? Math.min(1, d * 1.5) : 1, translate: isNew ? `0px ${(1 - d) * -160}px` : undefined,
          }}>{t}°</div>
        );
      })}
    </div>
  );
};

const CARD_SLOT = 720 + 60;

// A later card's slot opens just before it fades in, so the cards already shown stay centered.
const CardSlot = ({ open, children }: { open: number; children: ReactNode }) =>
  open >= 1 ? <>{children}</> : <div style={{ width: CARD_SLOT * open, overflow: "hidden", display: "flex", justifyContent: "flex-end" }}>{children}</div>;

export const KeyPoint = () => {
  const frame = useCurrentFrame();
  const { portrait } = useLayout();
  const [k1, k2, k3] = cues(4).map((c) => c.start);
  const cards = [
    { title: "情況 1：tmp 空了", desc: "只放一個元素，一定有序", base: [], delay: k1 },
    { title: "情況 2：頂端 ≥ temp1", desc: "底下比上面暖，或一樣暖", base: [76, 73], delay: k2 },
  ];
  return (
    <Scene title="重點：tmp 不用排序，也一定是遞減">
      {cards.map((c) => <Sfx key={c.title} from={c.delay} name="pop-soft" />)}
      {cards.map((c) => <Sfx key={`d${c.title}`} from={c.delay + 30} name="switch" />)}
      <Sfx from={k3 + 25} name="marker" />
      <SceneVoice scene={4} />
      <Fade delay={10} style={{ position: "absolute", left: 0, right: 0, top: portrait ? 330 : 160, display: "flex", justifyContent: "center" }}>
        <CodeLines lines={["while tmp and temp1 > temperatures[tmp[-1]]:", "    tmp.pop()", "tmp.append(i1)"]} greenLine={2} fontSize={portrait ? 27 : 30} />
      </Fade>
      <div style={{ position: "absolute", left: 0, right: 0, top: portrait ? 600 : 430, display: "flex", flexDirection: portrait ? "column" : "row", alignItems: "center", justifyContent: "center", gap: portrait ? 40 : 0 }}>
        {cards.map((c, k) => (
          <CardSlot key={c.title} open={portrait || k === 0 ? 1 : ease(frame, c.delay - 12, c.delay + 6)}>
          <Fade delay={c.delay} y={40}>
            <div style={{ background: C.panel, borderRadius: 18, padding: 32, width: portrait ? 960 : 720, height: portrait ? 360 : 400, display: "flex", gap: 36, alignItems: "flex-end" }}>
              <Mini base={c.base} dropFrame={c.delay + 20} />
              <div style={{ alignSelf: "center" }}>
                <div style={{ fontSize: 34, fontWeight: 700, whiteSpace: "nowrap" }}>{c.title}</div>
                <div style={{ fontSize: 28, color: C.dim, marginTop: 14 }}>{c.desc}</div>
              </div>
            </div>
          </Fade>
          </CardSlot>
        ))}
      </div>
      <Fade delay={k3} style={{ position: "absolute", left: 60, right: 60, top: portrait ? 1450 : 900, textAlign: "center", fontSize: portrait ? 44 : 40, lineHeight: 1.6, color: C.good }}>
        while 會先 pop 掉比較冷的日子，
        <Highlight color={C.markGreen} progress={interpolate(frame, [k3 + 25, k3 + 55], [0, 1], CLAMP)}>排序已經順手做完了</Highlight>
      </Fade>
    </Scene>
  );
};

export const Complexity = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { portrait } = useLayout();
  const [c1, c2] = cues(5).map((c) => c.start);
  return (
    <Scene title="複雜度：每一天最多進出堆疊各一次">
      <SceneVoice scene={5} />
      <Sfx from={c1} name="tick" />
      <Sfx from={c1 + 45} name="tick" />
      <Sfx from={c2} name="pop-soft" />
      <Sfx from={c2 + 15} name="pop-soft" />
      <Sfx from={c2 + 60} name="chime" />
      <div style={{ position: "absolute", left: portrait ? 60 : 0, right: portrait ? 60 : 0, top: portrait ? 360 : 200, display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 22 }}>
        {TEMPS.map((_, k) => {
          const inS = spring({ frame: frame - c1 - k * 5, fps, config: { damping: 14 } });
          const outS = ANSWER[k] > 0 ? spring({ frame: frame - c1 - 45 - k * 5, fps, config: { damping: 14 } }) : 0;
          return (
            <div key={k} style={{ width: portrait ? 210 : 150, background: C.panel, borderRadius: 14, padding: 18, textAlign: "center", fontFamily: MONO }}>
              <div style={{ fontSize: 28, color: C.dim }}>{`i=${k}`}</div>
              <div style={{ fontSize: 26, color: C.waiting, opacity: inS, marginTop: 10 }}>push ×1</div>
              <div style={{ fontSize: 26, color: C.solved, opacity: outS, marginTop: 6, height: 34 }}>{ANSWER[k] > 0 ? "pop ×1" : ""}</div>
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: portrait ? 820 : 450, display: "flex", justifyContent: "center", gap: portrait ? 50 : 80 }}>
        {[
          { label: "時間", delay: c2 },
          { label: "空間", delay: c2 + 15 },
        ].map((c) => (
          <Fade key={c.label} delay={c.delay} y={40}>
            <div style={{ background: C.panel, borderRadius: 18, padding: "30px 70px", textAlign: "center", border: `3px solid ${C.text}` }}>
              <div style={{ fontSize: 30, color: C.dim }}>{c.label}</div>
              <div style={{ fontSize: 64, fontFamily: MONO, marginTop: 10 }}>O(n)</div>
            </div>
          </Fade>
        ))}
      </div>
      <div style={{ position: "absolute", left: 60, right: 60, top: portrait ? 1150 : 760, textAlign: "center", fontSize: portrait ? 40 : 34, color: C.dim, lineHeight: 1.8, display: "flex", flexDirection: "column", gap: portrait ? 30 : 0 }}>
        <Fade delay={c2 + 40}>push 總共 n 次，pop 最多 n 次，所以 while 全部加起來是 O(n)</Fade>
        <Fade delay={c2 + 55}>空間最壞情況：溫度一路下降，所有天都留在堆疊</Fade>
      </div>
    </Scene>
  );
};
