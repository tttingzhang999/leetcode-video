import type { CSSProperties, ReactNode } from "react";
import { Audio } from "@remotion/media";
import { Easing, interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { useLayout } from "./layout";
import { PyLine } from "./highlight";
import { C, MONO, SANS } from "./theme";
import { cues } from "./voice";

export const ease = (frame: number, from: number, to: number) =>
  interpolate(frame, [from, to], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.16, 1, 0.3, 1) });

export const Fade = ({ children, delay = 0, y = 24, style }: { children: ReactNode; delay?: number; y?: number; style?: CSSProperties }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, delay, delay + 18);
  return <div style={{ opacity: p, translate: `0px ${(1 - p) * y}px`, ...style }}>{children}</div>;
};

export const Scene = ({ children, title }: { children: ReactNode; title?: string }) => {
  const { title: t } = useLayout();
  return (
    <div style={{ position: "absolute", inset: 0, background: C.bg, color: C.text, fontFamily: SANS }}>
      {title && <Fade style={{ position: "absolute", left: t.x, right: t.x, top: t.y, fontSize: t.size, fontWeight: 700 }}>{title}</Fade>}
      {children}
    </div>
  );
};

export const Caption = ({ children, delay = 0 }: { children: ReactNode; delay?: number }) => {
  const { caption } = useLayout();
  return (
    <Fade delay={delay} y={16} style={{ position: "absolute", left: 0, right: 0, top: caption.y, padding: "0 50px", textAlign: "center", fontSize: caption.size, fontWeight: 600 }}>
      {children}
    </Fade>
  );
};

export const CodeLines = ({ lines, greenLine, fontSize }: { lines: string[]; greenLine?: number; fontSize: number }) => (
  <div style={{ background: C.panel, border: `2px solid ${C.border}`, borderRadius: 16, padding: "20px 24px", fontFamily: MONO, fontSize }}>
    {lines.map((l, k) => (
      <div key={k} style={{ whiteSpace: "pre", lineHeight: 1.6, padding: "0 8px", borderRadius: 6, color: k === greenLine ? C.good : C.text, background: k === greenLine ? `${C.good}22` : "transparent" }}>
        {k === greenLine ? l : <PyLine text={l} />}
      </div>
    ))}
  </div>
);

export const SFX_VOLUME = 0.6;
// Sharp sounds sit lowest: emphasis comes from timbre, never loudness.
const SFX_GAIN: Record<string, number> = { ding: 0.75, chime: 0.7 };

export const Sfx = ({ from, name }: { from: number; name: string }) => {
  const { fps } = useVideoConfig();
  return (
    <Sequence from={from} durationInFrames={2 * fps} premountFor={fps}>
      <Audio src={staticFile(`sfx/${name}.wav`)} volume={SFX_VOLUME * (SFX_GAIN[name] ?? 1)} />
    </Sequence>
  );
};

export const VOICE_VOLUME = 1;

export const Voice = ({ from, file }: { from: number; file: string }) => {
  const { fps } = useVideoConfig();
  return (
    <Sequence from={from} premountFor={fps}>
      <Audio src={staticFile(file)} volume={VOICE_VOLUME} />
    </Sequence>
  );
};

export const SceneVoice = ({ scene }: { scene: number }) => (
  <>
    {cues(scene).map((c) => (
      <Voice key={c.key} from={c.start} file={c.file} />
    ))}
  </>
);
