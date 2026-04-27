import "./index.css";
import React from "react";
import { Composition, Still } from "remotion";
import { ShortFilmComposition } from "./compositions/ShortFilmComposition";
import { StoryCover } from "./components/StoryCover";
import type { StoryConfig } from "./types/story";
import type { TimelineData } from "./types/timeline";
import shortFilmStory from "./stories/ShortFilm/story.json";
import shortFilmTimeline from "../public/voiceover/ShortFilm/timeline.json";

const STORIES: Array<{ config: StoryConfig; timeline: TimelineData }> = [
  { config: shortFilmStory as StoryConfig, timeline: shortFilmTimeline as TimelineData },
];

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {STORIES.map(({ config, timeline }) => {
        const { storyId, fps, timing } = config;
        return (
          <React.Fragment key={storyId}>
            <Still
              id={`${storyId}-Cover`}
              component={StoryCover}
              width={1080}
              height={1920}
              defaultProps={{
                title: config.title,
                bgColor: config.style.defaultBgColor,
              }}
            />
            <Composition
              id={storyId}
              component={ShortFilmComposition}
              durationInFrames={timing.titleDuration + timeline.totalFrames + timing.bufferFrames}
              fps={fps}
              width={1080}
              height={1920}
              defaultProps={{ config, timeline }}
            />
          </React.Fragment>
        );
      })}
    </>
  );
};