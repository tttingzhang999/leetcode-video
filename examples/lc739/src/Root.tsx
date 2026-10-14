import { Composition } from "remotion";
import { DailyTemperatures } from "./DailyTemperatures";
import { FPS, TOTAL_FRAMES } from "./timeline";

export const Root = () => (
  <>
    <Composition
      id="Landscape"
      component={DailyTemperatures}
      durationInFrames={TOTAL_FRAMES}
      fps={FPS}
      width={1920}
      height={1080}
      defaultProps={{ portrait: false }}
    />
    <Composition
      id="Portrait"
      component={DailyTemperatures}
      durationInFrames={TOTAL_FRAMES}
      fps={FPS}
      width={1080}
      height={1920}
      defaultProps={{ portrait: true }}
    />
  </>
);
