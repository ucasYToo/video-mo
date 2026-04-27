import "./index.css";
import { Composition, Still } from "remotion";
import { ShortFilm } from "./compositions/ShortFilm/ShortFilm";
import { ShortFilmCover } from "./compositions/ShortFilm/ShortFilmCover";
import timelineRaw from "../public/voiceover/ShortFilm/timeline.json";

const FPS = 30;
const TITLE_DURATION = 60;
const BUFFER_FRAMES = FPS * 3;

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Still
        id="ShortFilm-Cover"
        component={ShortFilmCover}
        width={1080}
        height={1920}
      />
      <Composition
        id="ShortFilm"
        component={ShortFilm}
        durationInFrames={TITLE_DURATION + timelineRaw.totalFrames + BUFFER_FRAMES}
        fps={FPS}
        width={1080}
        height={1920}
      />
    </>
  );
};