import { FPS, GAP, LEAD, lineFrames, sceneLength, voiceLine, type VoiceLine } from "./voice";

export { FPS };
export const TEMPS = [73, 74, 75, 71, 69, 72, 76, 73];
export const ANSWER = [1, 1, 4, 2, 1, 1, 0, 0];

export type EventKind = "visit" | "compare" | "pop" | "push" | "done";

export type SimEvent = {
  kind: EventKind;
  i: number;
  j: number | null;
  warmer: boolean;
  stackBefore: number[];
  stackAfter: number[];
  resultBefore: number[];
  resultAfter: number[];
  line: number;
  label: string;
  caption: string;
  voice: VoiceLine | null;
  start: number;
  dur: number;
};

const SIM_SCENE = 3;
const INTRO = voiceLine(SIM_SCENE, "intro");
export const INTRO_CAPTION = INTRO?.subtitle ?? "";
export const SIM_INTRO = Math.max(45, INTRO ? LEAD + lineFrames(INTRO) + GAP : 0);
const DUR: Record<EventKind, number> = { visit: 16, compare: 24, pop: 57, push: 22, done: 60 };
const HOLD: Record<number, number> = { 21: 20, 28: 30 };

type Draft = Omit<SimEvent, "start" | "dur" | "caption" | "voice">;

const buildDrafts = (): Draft[] => {
  const drafts: Draft[] = [];
  let stack: number[] = [];
  let result = TEMPS.map(() => 0);
  const add = (d: Omit<Draft, "stackBefore" | "resultBefore" | "stackAfter" | "resultAfter">, stackAfter: number[], resultAfter: number[]) => {
    drafts.push({ ...d, stackBefore: stack, resultBefore: result, stackAfter, resultAfter });
    stack = stackAfter;
    result = resultAfter;
  };

  TEMPS.forEach((t, i) => {
    add({ kind: "visit", i, j: null, warmer: false, line: 2, label: `走到 ${i}` }, stack, result);
    while (stack.length > 0) {
      const top = stack[stack.length - 1];
      const warmer = t > TEMPS[top];
      add({ kind: "compare", i, j: top, warmer, line: 3, label: `比較 ${warmer ? "✓" : "✗"}` }, stack, result);
      if (!warmer) break;
      add(
        { kind: "pop", i, j: top, warmer, line: 5, label: `pop ${top}` },
        stack.slice(0, -1),
        result.map((v, k) => (k === top ? i - top : v)),
      );
    }
    add({ kind: "push", i, j: null, warmer: false, line: 6, label: `push ${i}` }, [...stack, i], result);
  });
  add({ kind: "done", i: TEMPS.length - 1, j: null, warmer: false, line: 7, label: "結束" }, stack, result);
  return drafts;
};

// A line plays over its step and the silent steps after it; only if the line is longer
// than that group does its own step stretch. A silent step keeps the previous caption.
const withTiming = (drafts: Draft[]): SimEvent[] => {
  const voices = drafts.map((_, k) => voiceLine(SIM_SCENE, String(k + 1)));
  const base = drafts.map((d, k) => DUR[d.kind] + (HOLD[k + 1] ?? 0));
  const silentAfter = (k: number) => {
    const next = voices.findIndex((v, j) => j > k && v);
    return base.slice(k + 1, next === -1 ? base.length : next).reduce((a, b) => a + b, 0);
  };
  const durs = base.map((b, k) => (voices[k] ? Math.max(b, lineFrames(voices[k]) + GAP - silentAfter(k)) : b));
  const starts = durs.map((_, k) => SIM_INTRO + durs.slice(0, k).reduce((a, b) => a + b, 0));
  let caption = INTRO_CAPTION;
  return drafts.map((d, k) => {
    caption = voices[k]?.subtitle ?? caption;
    return { ...d, caption, voice: voices[k], start: starts[k], dur: durs[k] };
  });
};

export const EVENTS = withTiming(buildDrafts());
const last = EVENTS[EVENTS.length - 1];
export const SIM_FRAMES = last.start + last.dur;

export const SCENES = {
  title: sceneLength(1),
  problem: sceneLength(2),
  sim: SIM_FRAMES,
  keyPoint: sceneLength(4),
  complexity: sceneLength(5),
};

export const TRANSITION = 15;
export const TOTAL_FRAMES = Object.values(SCENES).reduce((a, b) => a + b, 0) - 4 * TRANSITION;
