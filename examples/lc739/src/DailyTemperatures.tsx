import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { Audio } from "@remotion/media";
import { AbsoluteFill, interpolate, staticFile, useVideoConfig } from "remotion";
import { Complexity, KeyPoint, Problem, Title } from "./Scenes";
import { Simulation } from "./Simulation";
import { LANDSCAPE, LayoutContext, PORTRAIT } from "./layout";
import { C } from "./theme";
import { EVENTS, SCENES, SIM_INTRO, TOTAL_FRAMES, TRANSITION } from "./timeline";
import { cues, LEAD, lineFrames } from "./voice";

const BGM = "music/lofi-1.mp3";
const MUSIC_VOLUME = 0.25;
const SPEECH_DUCK = 0.5;
const DUCK_RAMP = 6;
const CLAMP = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const lengths = [SCENES.title, SCENES.problem, SCENES.sim, SCENES.keyPoint, SCENES.complexity];
const sceneStart = (n: number) => lengths.slice(0, n - 1).reduce((a, b) => a + b, 0) - (n - 1) * TRANSITION;
const SIM_START = sceneStart(3);
const SPEECH: [number, number][] = [
  ...[1, 2, 4, 5].flatMap((n) => cues(n).map((c): [number, number] => [sceneStart(n) + c.start, sceneStart(n) + c.start + c.frames])),
  [SIM_START + LEAD, SIM_START + SIM_INTRO],
  ...EVENTS.filter((e) => e.voice).map((e): [number, number] => [SIM_START + e.start, SIM_START + e.start + lineFrames(e.voice!)]),
];

const musicVolume = (f: number) => {
  const speaking = Math.max(0, ...SPEECH.map(([a, b]) => interpolate(f, [a - DUCK_RAMP, a, b, b + DUCK_RAMP], [0, 1, 1, 0], CLAMP)));
  return MUSIC_VOLUME * (1 - (1 - SPEECH_DUCK) * speaking) * interpolate(f, [TOTAL_FRAMES - 30, TOTAL_FRAMES], [1, 0], CLAMP);
};

export const DailyTemperatures = ({ portrait }: { portrait: boolean }) => {
  const { fps } = useVideoConfig();
  return (
    <LayoutContext.Provider value={portrait ? PORTRAIT : LANDSCAPE}>
    <AbsoluteFill style={{ background: C.bg }}>
      <Audio src={staticFile(BGM)} volume={musicVolume} />
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={SCENES.title} premountFor={fps}>
          <Title />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: TRANSITION })} />
        <TransitionSeries.Sequence durationInFrames={SCENES.problem} premountFor={fps}>
          <Problem />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={linearTiming({ durationInFrames: TRANSITION })} />
        <TransitionSeries.Sequence durationInFrames={SCENES.sim} premountFor={fps}>
          <Simulation />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: TRANSITION })} />
        <TransitionSeries.Sequence durationInFrames={SCENES.keyPoint} premountFor={fps}>
          <KeyPoint />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={linearTiming({ durationInFrames: TRANSITION })} />
        <TransitionSeries.Sequence durationInFrames={SCENES.complexity} premountFor={fps}>
          <Complexity />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
    </LayoutContext.Provider>
  );
};
