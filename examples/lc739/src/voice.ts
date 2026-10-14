import manifest from "./voice.json";

export const FPS = 30;
export const LEAD = 18; // first line starts after the incoming transition
export const GAP = 10; // pause after every line
const TAIL = 20; // last line to scene end; longer than the outgoing transition
const SETTLE = 80; // last cue to scene end, so the cue's animation can finish

export type VoiceLine = {
  key: string;
  file: string;
  ms: number;
  subtitle: string;
};
export type Cue = VoiceLine & { start: number; frames: number };

const scenes = manifest.scenes as Record<string, VoiceLine[]>;

export const lineFrames = (l: VoiceLine) => Math.ceil((l.ms / 1000) * FPS);
export const voiceLine = (scene: number, key: string) =>
  (scenes[String(scene)] ?? []).find((l) => l.key === key) ?? null;

// Lines of a scene played back to back from LEAD; start is relative to the scene.
export const cues = (scene: number): Cue[] => {
  let t = LEAD;
  return (scenes[String(scene)] ?? []).map((l) => {
    const c = { ...l, start: t, frames: lineFrames(l) };
    t += c.frames + GAP;
    return c;
  });
};

export const sceneLength = (scene: number, min = 2 * FPS) => {
  const last = cues(scene).at(-1);
  return last
    ? Math.max(min, last.start + last.frames + TAIL, last.start + SETTLE)
    : min;
};
