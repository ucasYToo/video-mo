import "./index.css";
import { Composition } from "remotion";
import { ShortFilm } from "./compositions/ShortFilm/ShortFilm";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="ShortFilm"
        component={ShortFilm}
        durationInFrames={1380}
        fps={30}
        width={1080}
        height={1920}
      />
    </>
  );
};
